const express = require("express");
const router = express.Router();
const pool = require("../config");

// ============================================================
// 1. GET /stations - List all stations
// ============================================================
router.get("/stations", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM station ORDER BY station_name",
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching stations:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 2. GET /trains/search - Search trains between two stations
// ============================================================
router.get("/trains/search", async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Both from and to station IDs are required",
        });
    }

    // Find trains that stop at both stations with correct ordering
    const [trains] = await pool.query(
      `SELECT t.train_no, t.train_name,
              r1.departure_time AS departure_time,
              r2.arrival_time AS arrival_time,
              s1.station_name AS from_station,
              s2.station_name AS to_station,
              ABS(r2.distance_from_origin - r1.distance_from_origin) AS distance
       FROM train t
       JOIN route r1 ON t.train_no = r1.train_no
       JOIN route r2 ON t.train_no = r2.train_no
       JOIN station s1 ON r1.station_id = s1.station_id
       JOIN station s2 ON r2.station_id = s2.station_id
       WHERE r1.station_id = ? AND r2.station_id = ? AND r1.sequence_no < r2.sequence_no`,
      [from, to],
    );

    // For each train, get class info with fare and seat availability
    for (const train of trains) {
      const [classes] = await pool.query(
        `SELECT ci.class_id,
                tf.fixed_charge,
                tf.distance_charge,
                ci.seats_per_coach,
                (tf.fixed_charge + tf.distance_charge * ?) AS fare,
                COUNT(DISTINCT c.coach_no) AS coach_count
         FROM class_info ci
         JOIN train_fare tf ON ci.class_id = tf.class_id AND ci.train_no = tf.train_no
         LEFT JOIN coach c ON ci.class_id = c.class_id AND ci.train_no = c.train_no
         WHERE ci.train_no = ?
         GROUP BY ci.class_id, tf.fixed_charge, tf.distance_charge, ci.seats_per_coach`,
        [train.distance, train.train_no],
      );

      for (const cls of classes) {
        const totalSeats = cls.coach_count * cls.seats_per_coach;

        const [bookedResult] = await pool.query(
          `SELECT COUNT(*) AS booked_count
           FROM booked_seat bs
           JOIN coach c ON bs.coach_no = c.coach_no AND bs.train_no = c.train_no
           WHERE bs.train_no = ? AND c.class_id = ?`,
          [train.train_no, cls.class_id],
        );

        const bookedSeats = bookedResult[0].booked_count;
        cls.total_seats = totalSeats;
        cls.booked_seats = bookedSeats;
        cls.available_seats = totalSeats - bookedSeats;
      }

      train.classes = classes.map((cls) => ({
        class_id: cls.class_id,
        fare: cls.fare,
        total_seats: cls.total_seats,
        booked_seats: cls.booked_seats,
        available_seats: cls.available_seats,
      }));
    }

    res.json({ success: true, data: trains });
  } catch (error) {
    console.error("Error searching trains:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 3. GET /trains/:trainNo/route - Get route for a train
// ============================================================
router.get("/trains/:trainNo/route", async (req, res) => {
  try {
    const { trainNo } = req.params;

    const [rows] = await pool.query(
      `SELECT r.*, s.station_name
       FROM route r
       JOIN station s ON r.station_id = s.station_id
       WHERE r.train_no = ?
       ORDER BY r.sequence_no`,
      [trainNo],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching route:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 4. GET /pnr/:pnr - PNR status enquiry
// ============================================================
router.get("/pnr/:pnr", async (req, res) => {
  try {
    const { pnr } = req.params;

    // Get ticket info with train and station names
    const [ticketRows] = await pool.query(
      `SELECT t.pnr, t.train_no, tr.train_name, t.date_of_travel,
              s1.station_name AS boarding_station_name,
              s2.station_name AS destination_station_name,
              t.class_id, t.username
       FROM ticket t
       JOIN train tr ON t.train_no = tr.train_no
       JOIN station s1 ON t.boarding_station = s1.station_id
       JOIN station s2 ON t.destination_station = s2.station_id
       WHERE t.pnr = ?`,
      [pnr],
    );

    if (ticketRows.length === 0) {
      return res.status(404).json({ success: false, error: "PNR not found" });
    }

    const ticket = ticketRows[0];

    // Get passengers with seat assignments and waiting numbers
    const [passengers] = await pool.query(
      `SELECT p.passenger_id, p.name, p.age, p.gender, p.mobile_no, p.status,
              bs.seat_no, bs.coach_no,
              iw.waiting_no
       FROM passenger p
       LEFT JOIN booked_seat bs ON p.passenger_id = bs.passenger_id AND bs.pnr = p.pnr
       LEFT JOIN inwaiting iw ON p.passenger_id = iw.passenger_id AND iw.pnr = p.pnr
       WHERE p.pnr = ?`,
      [pnr],
    );

    // Get payment info
    const [paymentRows] = await pool.query(
      `SELECT payment_id, payment_date, payment_mode
       FROM payment
       WHERE pnr = ?`,
      [pnr],
    );

    // Calculate fare using the new MySQL Stored Function
    const [fareRows] = await pool.query(
      `SELECT Calculate_Fare(?, ?, boarding_station, destination_station) AS fare
       FROM ticket WHERE pnr = ?`,
      [ticket.train_no, ticket.class_id, pnr],
    );

    let fare = 0;
    if (fareRows.length > 0 && fareRows[0].fare) {
      fare = fareRows[0].fare;
    }

    const payment =
      paymentRows.length > 0
        ? { ...paymentRows[0], amount: fare * passengers.length }
        : null;

    res.json({
      success: true,
      data: {
        pnr: ticket.pnr,
        train_no: ticket.train_no,
        train_name: ticket.train_name,
        date_of_travel: ticket.date_of_travel,
        boarding_station_name: ticket.boarding_station_name,
        destination_station_name: ticket.destination_station_name,
        class_id: ticket.class_id,
        username: ticket.username,
        passengers: passengers.map((p) => ({
          passenger_id: p.passenger_id,
          name: p.name,
          age: p.age,
          gender: p.gender,
          mobile_no: p.mobile_no,
          status: p.status,
          seat_no: p.seat_no || null,
          coach_no: p.coach_no || null,
          waiting_no: p.waiting_no || null,
        })),
        payment,
        fare,
      },
    });
  } catch (error) {
    console.error("Error fetching PNR status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 5. POST /auth/login - User login
// ============================================================
router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Username and password are required" });
    }

    const [rows] = await pool.query(
      "SELECT username, name, mobile_number FROM login_details WHERE username = ? AND password = ?",
      [username, password],
    );

    if (rows.length === 0) {
      return res.json({
        success: false,
        error: "Invalid username or password",
      });
    }

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 6. POST /auth/register - User registration
// ============================================================
router.post("/auth/register", async (req, res) => {
  try {
    const { username, name, mobile_number, password } = req.body;

    if (!username || !name || !mobile_number || !password) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required" });
    }

    // Check if username already exists
    const [existing] = await pool.query(
      "SELECT username FROM login_details WHERE username = ?",
      [username],
    );

    if (existing.length > 0) {
      return res.json({ success: false, error: "Username already exists" });
    }

    await pool.query("INSERT INTO login_details VALUES (?, ?, ?, ?)", [
      username,
      name,
      mobile_number,
      password,
    ]);

    res.json({ success: true, message: "Registration successful" });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 7. POST /booking/create - Create a new booking (TRANSACTION)
// ============================================================
router.post("/booking/create", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      train_no,
      class_id,
      boarding_station,
      destination_station,
      date_of_travel,
      username,
      passengers,
      payment_mode,
    } = req.body;

    if (
      !train_no ||
      !class_id ||
      !boarding_station ||
      !destination_station ||
      !date_of_travel ||
      !username ||
      !passengers ||
      !payment_mode
    ) {
      connection.release();
      return res
        .status(400)
        .json({ success: false, error: "All fields are required" });
    }

    // a. Generate PNR
    const pnr = Math.floor(1000000000 + Math.random() * 9000000000);

    // b. Calculate fare per passenger using the MySQL Function!
    const [fareInfo] = await connection.query(
      `SELECT Calculate_Fare(?, ?, ?, ?) AS fare`,
      [train_no, class_id, boarding_station, destination_station],
    );

    if (fareInfo.length === 0 || !fareInfo[0].fare) {
      await connection.rollback();
      connection.release();
      return res
        .status(400)
        .json({
          success: false,
          error: "Invalid train/class/station combination",
        });
    }

    const farePerPassenger = fareInfo[0].fare;

    // c. Insert ticket
    await connection.query(
      "INSERT INTO ticket (pnr, date_of_travel, boarding_station, destination_station, train_no, username, class_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        pnr,
        date_of_travel,
        boarding_station,
        destination_station,
        train_no,
        username,
        class_id,
      ],
    );

    // d. Get max passenger_id
    const [maxIdResult] = await connection.query(
      "SELECT COALESCE(MAX(passenger_id), 0) AS max_id FROM passenger",
    );
    const maxId = maxIdResult[0].max_id;

    // e. Calculate available seats
    const [seatInfo] = await connection.query(
      `SELECT COUNT(DISTINCT c.coach_no) AS coach_count, ci.seats_per_coach
       FROM coach c
       JOIN class_info ci ON c.class_id = ci.class_id AND c.train_no = ci.train_no
       WHERE c.train_no = ? AND c.class_id = ?
       GROUP BY ci.seats_per_coach`,
      [train_no, class_id],
    );

    let availableSeats = 0;
    let seatsPerCoach = 0;
    if (seatInfo.length > 0) {
      seatsPerCoach = seatInfo[0].seats_per_coach;
      const totalSeats = seatInfo[0].coach_count * seatsPerCoach;

      const [bookedCount] = await connection.query(
        `SELECT COUNT(*) AS booked
         FROM booked_seat bs
         JOIN coach c ON bs.coach_no = c.coach_no AND bs.train_no = c.train_no
         WHERE bs.train_no = ? AND c.class_id = ?`,
        [train_no, class_id],
      );

      availableSeats = totalSeats - bookedCount[0].booked;
    }

    // Get all coaches for this train+class (for seat assignment)
    const [coaches] = await connection.query(
      "SELECT coach_no FROM coach WHERE train_no = ? AND class_id = ? ORDER BY coach_no",
      [train_no, class_id],
    );

    // f. Process each passenger
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      const passengerId = maxId + 1 + i;

      if (availableSeats > 0) {
        // Confirmed
        const status = "CNF";
        availableSeats--;

        await connection.query(
          "INSERT INTO passenger (passenger_id, pnr, name, age, gender, mobile_no, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [passengerId, pnr, p.name, p.age, p.gender, p.mobile_no, status],
        );

        // Find next available seat
        let seatAssigned = false;
        for (const coach of coaches) {
          if (seatAssigned) break;

          // Get booked seat numbers for this coach
          const [bookedSeats] = await connection.query(
            "SELECT seat_no FROM booked_seat WHERE train_no = ? AND coach_no = ? ORDER BY seat_no",
            [train_no, coach.coach_no],
          );

          const bookedSeatNos = new Set(bookedSeats.map((s) => s.seat_no));

          for (let seatNo = 1; seatNo <= seatsPerCoach; seatNo++) {
            if (!bookedSeatNos.has(seatNo)) {
              await connection.query(
                "INSERT INTO booked_seat (train_no, seat_no, coach_no, pnr, passenger_id) VALUES (?, ?, ?, ?, ?)",
                [train_no, seatNo, coach.coach_no, pnr, passengerId],
              );
              seatAssigned = true;
              break;
            }
          }
        }
      } else {
        // Waitlisted
        const status = "WL";

        await connection.query(
          "INSERT INTO passenger (passenger_id, pnr, name, age, gender, mobile_no, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [passengerId, pnr, p.name, p.age, p.gender, p.mobile_no, status],
        );

        // Get next waiting number
        const [waitResult] = await connection.query(
          "SELECT COALESCE(MAX(waiting_no), 0) + 1 AS next_waiting FROM inwaiting WHERE pnr = ?",
          [pnr],
        );

        await connection.query(
          "INSERT INTO inwaiting (pnr, waiting_no, passenger_id) VALUES (?, ?, ?)",
          [pnr, waitResult[0].next_waiting, passengerId],
        );
      }
    }

    // g. Generate payment_id
    const [paymentIdResult] = await connection.query(
      "SELECT COALESCE(MAX(payment_id), 0) + 1 AS next_id FROM payment",
    );
    const paymentId = paymentIdResult[0].next_id;

    // h. Total fare
    const totalFare = farePerPassenger * passengers.length;

    // i. Insert payment
    await connection.query(
      "INSERT INTO payment (payment_id, pnr, payment_date, payment_mode) VALUES (?, ?, CURDATE(), ?)",
      [paymentId, pnr, payment_mode],
    );

    // j. Commit
    await connection.commit();

    res.json({
      success: true,
      pnr,
      payment_id: paymentId,
      total_fare: totalFare,
      message: "Booking confirmed!",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating booking:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

// ============================================================
// 8. GET /user/:username/bookings - Get bookings for a user
// ============================================================
router.get("/user/:username/bookings", async (req, res) => {
  try {
    const { username } = req.params;

    const [tickets] = await pool.query(
      `SELECT t.pnr, t.train_no, tr.train_name, t.date_of_travel,
              s1.station_name AS boarding_station_name,
              s2.station_name AS destination_station_name,
              t.class_id,
              pay.payment_mode
       FROM ticket t
       JOIN train tr ON t.train_no = tr.train_no
       JOIN station s1 ON t.boarding_station = s1.station_id
       JOIN station s2 ON t.destination_station = s2.station_id
       LEFT JOIN payment pay ON t.pnr = pay.pnr
       WHERE t.username = ?
       ORDER BY t.pnr DESC`,
      [username],
    );

    // For each ticket, get passengers
    for (const ticket of tickets) {
      const [passengers] = await pool.query(
        "SELECT name, age, gender, status FROM passenger WHERE pnr = ?",
        [ticket.pnr],
      );
      ticket.passengers = passengers;
    }

    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 9. GET /admin/stats - Dashboard statistics
// ============================================================
router.get("/admin/stats", async (req, res) => {
  try {
    const [trainCount] = await pool.query(
      "SELECT COUNT(*) AS count FROM train",
    );
    const [stationCount] = await pool.query(
      "SELECT COUNT(*) AS count FROM station",
    );
    const [passengerCount] = await pool.query(
      "SELECT COUNT(*) AS count FROM passenger",
    );
    const [ticketCount] = await pool.query(
      "SELECT COUNT(*) AS count FROM ticket",
    );
    const [confirmedCount] = await pool.query(
      "SELECT COUNT(*) AS count FROM passenger WHERE status = 'CNF'",
    );
    const [waitlistedCount] = await pool.query(
      "SELECT COUNT(*) AS count FROM passenger WHERE status = 'WL'",
    );

    const [paymentModes] = await pool.query(
      "SELECT payment_mode AS mode, COUNT(*) AS count FROM payment GROUP BY payment_mode",
    );

    const [classDistribution] = await pool.query(
      "SELECT class_id, COUNT(*) AS count FROM ticket GROUP BY class_id",
    );

    // Calculate total revenue
    const [revenueResult] = await pool.query(
      `SELECT COALESCE(SUM(tf.fixed_charge + tf.distance_charge * ABS(r2.distance_from_origin - r1.distance_from_origin)), 0) AS total_revenue
       FROM ticket t
       JOIN train_fare tf ON t.train_no = tf.train_no AND t.class_id = tf.class_id
       JOIN route r1 ON t.train_no = r1.train_no AND t.boarding_station = r1.station_id
       JOIN route r2 ON t.train_no = r2.train_no AND t.destination_station = r2.station_id`,
    );

    res.json({
      success: true,
      data: {
        total_trains: trainCount[0].count,
        total_stations: stationCount[0].count,
        total_passengers: passengerCount[0].count,
        total_tickets: ticketCount[0].count,
        confirmed_count: confirmedCount[0].count,
        waitlisted_count: waitlistedCount[0].count,
        total_revenue: revenueResult[0].total_revenue,
        payment_modes: paymentModes,
        class_distribution: classDistribution,
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 10. GET /admin/trains - List all trains (admin)
// ============================================================
router.get("/admin/trains", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, s1.station_name AS from_station, s2.station_name AS to_station
       FROM train t
       JOIN station s1 ON t.start_station_code = s1.station_id
       JOIN station s2 ON t.end_station_code = s2.station_id
       ORDER BY t.train_no`,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching trains:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 11. GET /admin/passengers - List all passengers (admin)
// ============================================================
router.get("/admin/passengers", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, t.train_no, tr.train_name
       FROM passenger p
       JOIN ticket t ON p.pnr = t.pnr
       JOIN train tr ON t.train_no = tr.train_no
       ORDER BY p.passenger_id`,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching passengers:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 12. GET /admin/bookings - List all bookings (admin)
// ============================================================
router.get("/admin/bookings", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.pnr, t.username, t.train_no, tr.train_name,
              s1.station_name AS from_station, s2.station_name AS to_station,
              t.date_of_travel, t.class_id, pay.payment_mode,
              (SELECT COUNT(*) FROM passenger p WHERE p.pnr = t.pnr) AS passenger_count
       FROM ticket t
       JOIN train tr ON t.train_no = tr.train_no
       JOIN station s1 ON t.boarding_station = s1.station_id
       JOIN station s2 ON t.destination_station = s2.station_id
       LEFT JOIN payment pay ON t.pnr = pay.pnr
       ORDER BY t.pnr DESC`,
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 13. POST /booking/cancel - Cancel passenger (STORED PROCEDURE)
// ============================================================
router.post("/booking/cancel", async (req, res) => {
  try {
    const { passenger_id } = req.body;
    if (!passenger_id) {
      return res.status(400).json({ success: false, error: "passenger_id required" });
    }

    // Call the Stored Procedure to handle the cancellation & waitlist upgrade
    await pool.query("CALL Cancel_Passenger(?)", [passenger_id]);

    res.json({ success: true, message: "Passenger cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling passenger:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 14. GET /admin/audit - List all audit logs (admin)
// ============================================================
router.get("/admin/audit", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
