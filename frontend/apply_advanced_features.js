const mysql = require("mysql2/promise");
require("dotenv").config();

async function applyAdvancedFeatures() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "railway_system",
    multipleStatements: true,
  });

  try {
    console.log("1. Creating Audit Log Table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        action_type VARCHAR(20),
        table_name VARCHAR(50),
        record_id VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("2. Creating Audit Triggers...");
    await connection.query(`DROP TRIGGER IF EXISTS after_ticket_insert;`);
    await connection.query(`
      CREATE TRIGGER after_ticket_insert
      AFTER INSERT ON ticket
      FOR EACH ROW
      BEGIN
        INSERT INTO audit_log (action_type, table_name, record_id, description)
        VALUES ('INSERT', 'ticket', CAST(NEW.pnr AS CHAR), CONCAT('New booking created by ', NEW.username));
      END;
    `);

    await connection.query(`DROP TRIGGER IF EXISTS after_passenger_update;`);
    await connection.query(`
      CREATE TRIGGER after_passenger_update
      AFTER UPDATE ON passenger
      FOR EACH ROW
      BEGIN
        IF OLD.status != NEW.status THEN
          INSERT INTO audit_log (action_type, table_name, record_id, description)
          VALUES ('UPDATE', 'passenger', CAST(NEW.passenger_id AS CHAR), CONCAT('Status changed from ', OLD.status, ' to ', NEW.status));
        END IF;
      END;
    `);

    console.log("3. Adding CHECK Constraints (ignoring if they already exist)...");
    try {
      await connection.query(`ALTER TABLE passenger ADD CONSTRAINT chk_age CHECK (age > 0 AND age <= 120)`);
      await connection.query(`ALTER TABLE passenger ADD CONSTRAINT chk_gender CHECK (gender IN ('M', 'F', 'O'))`);
      await connection.query(`ALTER TABLE ticket ADD CONSTRAINT chk_date CHECK (date_of_travel >= '2024-01-01')`);
    } catch (e) {
      console.log("   Constraints might already exist. Skipping...");
    }

    console.log("4. Creating Calculate_Fare Function...");
    await connection.query(`DROP FUNCTION IF EXISTS Calculate_Fare;`);
    await connection.query(`
      CREATE FUNCTION Calculate_Fare(
          p_train_no INT,
          p_class_id VARCHAR(3),
          p_boarding INT,
          p_dest INT
      ) RETURNS INT DETERMINISTIC
      BEGIN
          DECLARE v_fixed INT DEFAULT 0;
          DECLARE v_dist_charge INT DEFAULT 0;
          DECLARE v_dist_board INT DEFAULT 0;
          DECLARE v_dist_dest INT DEFAULT 0;
          DECLARE v_fare INT DEFAULT 0;
          
          -- Get charges
          SELECT fixed_charge, distance_charge INTO v_fixed, v_dist_charge
          FROM train_fare
          WHERE train_no = p_train_no AND class_id = p_class_id LIMIT 1;
          
          -- Get distances
          SELECT distance_from_origin INTO v_dist_board
          FROM route WHERE train_no = p_train_no AND station_id = p_boarding LIMIT 1;
          
          SELECT distance_from_origin INTO v_dist_dest
          FROM route WHERE train_no = p_train_no AND station_id = p_dest LIMIT 1;
          
          SET v_fare = v_fixed + (v_dist_charge * ABS(v_dist_dest - v_dist_board));
          
          RETURN v_fare;
      END;
    `);

    console.log("5. Creating Cancel_Passenger Stored Procedure...");
    await connection.query(`DROP PROCEDURE IF EXISTS Cancel_Passenger;`);
    await connection.query(`
      CREATE PROCEDURE Cancel_Passenger(IN p_passenger_id INT)
      BEGIN
          DECLARE v_pnr BIGINT;
          DECLARE v_status VARCHAR(8);
          DECLARE v_train_no INT;
          DECLARE v_class_id VARCHAR(3);
          DECLARE v_date DATE;
          DECLARE v_seat_no INT;
          DECLARE v_coach_no VARCHAR(3);
          
          DECLARE v_waiting_passenger_id INT;
          
          -- 1. Get info about the passenger being cancelled
          SELECT p.pnr, p.status INTO v_pnr, v_status
          FROM passenger p WHERE p.passenger_id = p_passenger_id;
          
          IF v_status = 'CNF' THEN
              -- Get their seat
              SELECT seat_no, coach_no, train_no INTO v_seat_no, v_coach_no, v_train_no
              FROM booked_seat WHERE passenger_id = p_passenger_id LIMIT 1;
              
              -- Get class and date
              SELECT class_id, date_of_travel INTO v_class_id, v_date
              FROM ticket WHERE pnr = v_pnr;
              
              -- Delete the seat
              DELETE FROM booked_seat WHERE passenger_id = p_passenger_id;
              
              -- Mark as CANCELLED
              UPDATE passenger SET status = 'CAN' WHERE passenger_id = p_passenger_id;
              
              -- 2. Find next waitlisted passenger for the same train, class, and date
              SELECT iw.passenger_id INTO v_waiting_passenger_id
              FROM inwaiting iw
              JOIN ticket t ON iw.pnr = t.pnr
              WHERE t.train_no = v_train_no AND t.class_id = v_class_id AND t.date_of_travel = v_date
              ORDER BY iw.waiting_no ASC
              LIMIT 1;
              
              -- 3. If a waiting passenger exists, confirm them
              IF v_waiting_passenger_id IS NOT NULL THEN
                  -- Assign the freed seat
                  INSERT INTO booked_seat (train_no, seat_no, coach_no, pnr, passenger_id)
                  SELECT v_train_no, v_seat_no, v_coach_no, iw.pnr, v_waiting_passenger_id
                  FROM inwaiting iw WHERE iw.passenger_id = v_waiting_passenger_id;
                  
                  -- Remove from inwaiting
                  DELETE FROM inwaiting WHERE passenger_id = v_waiting_passenger_id;
                  
                  -- Update status
                  UPDATE passenger SET status = 'CNF' WHERE passenger_id = v_waiting_passenger_id;
              END IF;
              
          ELSEIF v_status = 'WL' THEN
              -- Just remove from waitlist and mark as cancelled
              DELETE FROM inwaiting WHERE passenger_id = p_passenger_id;
              UPDATE passenger SET status = 'CAN' WHERE passenger_id = p_passenger_id;
          END IF;
          
      END;
    `);

    console.log("6. Dynamically replacing Foreign Keys to ON DELETE CASCADE...");
    const dbName = process.env.DB_NAME || "railway_system";
    
    // Function to replace FK
    const replaceFK = async (table, refTable, columnName) => {
      const [rows] = await connection.query(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME = ? AND COLUMN_NAME = ?
      `, [dbName, table, refTable, columnName]);

      if (rows.length > 0) {
        const constraintName = rows[0].CONSTRAINT_NAME;
        console.log(`   Dropping ${constraintName} on ${table}...`);
        await connection.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${constraintName}`);
        
        console.log(`   Adding new cascade FK to ${table} for ${columnName}...`);
        await connection.query(`
          ALTER TABLE ${table} 
          ADD CONSTRAINT fk_${table}_${columnName}_cascade 
          FOREIGN KEY (${columnName}) REFERENCES ${refTable}(${columnName === 'start_station_code' || columnName === 'end_station_code' || columnName === 'boarding_station' || columnName === 'destination_station' ? 'station_id' : columnName}) 
          ON DELETE CASCADE
        `);
      }
    };

    try {
      // Modify a few key ones to demonstrate cascading (e.g., deleting a train cascades to routes and classes)
      await replaceFK('route', 'train', 'train_no');
      await replaceFK('class_info', 'train', 'train_no');
      await replaceFK('ticket', 'train', 'train_no');
      console.log("   Cascade deletions applied successfully!");
    } catch (e) {
      console.log("   Error applying cascades (possibly already applied).", e.message);
    }

    console.log("🎉 All Advanced DBMS Features applied to the database!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error applying features:", error);
    process.exit(1);
  }
}

applyAdvancedFeatures();
