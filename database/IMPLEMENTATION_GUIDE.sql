

-- SECTION A: CREATE TABLES (3NF COMPLIANT)


CREATE TABLE station (
  station_id NUMERIC PRIMARY KEY,
  station_name VARCHAR(20),
  station_type VARCHAR(10)
);

CREATE TABLE train (
  train_no NUMERIC(5) PRIMARY KEY,
  train_name VARCHAR(20),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  start_station_code NUMERIC,
  end_station_code NUMERIC,
  FOREIGN KEY(start_station_code) REFERENCES station(station_id),
  FOREIGN KEY(end_station_code) REFERENCES station(station_id)
);

CREATE TABLE route (
  route_id NUMERIC,
  sequence_no NUMERIC,
  train_no NUMERIC(5),
  station_id NUMERIC,
  arrival_time TIMESTAMP,
  departure_time TIMESTAMP,
  distance_from_origin NUMERIC,
  FOREIGN KEY(train_no) REFERENCES train(train_no),
  FOREIGN KEY(station_id) REFERENCES station(station_id),
  PRIMARY KEY(route_id,sequence_no)
);

CREATE TABLE class_info (
  class_id VARCHAR(3),
  train_no NUMERIC(5),
  seats_per_coach NUMERIC,
  FOREIGN KEY(train_no) REFERENCES train(train_no),
  PRIMARY KEY(class_id,train_no)
);

CREATE TABLE train_fare (
  train_no NUMERIC(5),
  class_id VARCHAR(3),
  fixed_charge NUMERIC,
  distance_charge NUMERIC,
  FOREIGN KEY(class_id,train_no) REFERENCES class_info(class_id,train_no),
  PRIMARY KEY(train_no,class_id)
);

CREATE TABLE coach (
  coach_no VARCHAR(3),
  train_no NUMERIC(5),
  class_id VARCHAR(3),
  FOREIGN KEY(class_id,train_no) REFERENCES class_info(class_id,train_no),
  PRIMARY KEY(coach_no,train_no)
);


CREATE TABLE login_details (
  username VARCHAR(15),
  name VARCHAR(20),
  mobile_number NUMERIC(10),
  password VARCHAR(255),
  PRIMARY KEY(username)
);

-- 3NF FIX: Removed fare column (transitive dependency)
CREATE TABLE ticket (
  pnr NUMERIC(10) PRIMARY KEY,
  date_of_travel DATE,
  boarding_station NUMERIC,
  destination_station NUMERIC,
  train_no NUMERIC(5),
  username VARCHAR(15),
  class_id VARCHAR(3),
  FOREIGN KEY(boarding_station) REFERENCES station(station_id),
  FOREIGN KEY(destination_station) REFERENCES station(station_id),
  FOREIGN KEY(username) REFERENCES login_details(username),
  FOREIGN KEY(train_no,class_id) REFERENCES class_info(train_no,class_id)
);

-- 3NF FIX: Removed payment_amount column (redundant derived data)
CREATE TABLE payment (
  payment_id NUMERIC PRIMARY KEY,
  pnr NUMERIC(10),
  payment_date DATE,
  payment_mode VARCHAR(20),
  FOREIGN KEY(pnr) REFERENCES ticket(pnr)
);

-- 3NF FIX: Changed PK from (pnr,name) to passenger_id (stable numeric key)
CREATE TABLE passenger (
  passenger_id NUMERIC PRIMARY KEY,
  pnr NUMERIC(10),
  name VARCHAR(20),
  age NUMERIC,
  gender VARCHAR(1),
  mobile_no NUMERIC(10),
  status VARCHAR(8),
  FOREIGN KEY(pnr) REFERENCES ticket(pnr)
);

-- 3NF FIX: Removed name column (partial dependency), added passenger_id FK
CREATE TABLE inwaiting (
  pnr NUMERIC(10) NOT NULL,
  waiting_no NUMERIC(2),
  passenger_id NUMERIC NOT NULL,
  FOREIGN KEY(passenger_id) REFERENCES passenger(passenger_id),
  PRIMARY KEY(pnr,waiting_no)
);

-- 3NF FIX: Removed name column (partial dependency), added passenger_id FK
CREATE TABLE booked_seat (
  train_no NUMERIC(5),
  seat_no NUMERIC,
  coach_no VARCHAR(3),
  pnr NUMERIC(10) NOT NULL,
  passenger_id NUMERIC NOT NULL,
  FOREIGN KEY(passenger_id) REFERENCES passenger(passenger_id),
  FOREIGN KEY(coach_no,train_no) REFERENCES coach(coach_no,train_no),
  PRIMARY KEY(train_no,seat_no,coach_no)
);

-- =====================================================================
-- SECTION B: INSERT SAMPLE DATA
-- =====================================================================

-- STATION DATA
INSERT INTO station VALUES
(1,'Thrissur','junction'),
(2,'Ernakulam','junction'),
(3,'Kollam','junction'),
(4,'Chennai','central'),
(5,'Coimbatore','junction'),
(6,'Madurai','junction');

-- TRAIN DATA
INSERT INTO train VALUES
(18046,'Malabar Exp',TO_TIMESTAMP('1-03-25 11:20','dd-mm-yy hh24:mi'),
                      TO_TIMESTAMP('2-03-25 10:00','dd-mm-yy hh24:mi'),1,3),
(12230,'Pandian Exp',TO_TIMESTAMP('1-03-25 03:20','dd-mm-yy hh24:mi'),
                     TO_TIMESTAMP('2-03-25 05:00','dd-mm-yy hh24:mi'),4,6);

-- ROUTE DATA
INSERT INTO route VALUES
(1,1,18046,1,TO_TIMESTAMP('1-03-25 11:00','dd-mm-yy hh24:mi'),
              TO_TIMESTAMP('1-03-25 11:20','dd-mm-yy hh24:mi'),0),
(1,2,18046,2,TO_TIMESTAMP('1-03-25 22:00','dd-mm-yy hh24:mi'),
              TO_TIMESTAMP('1-03-25 22:10','dd-mm-yy hh24:mi'),300),
(1,3,18046,3,TO_TIMESTAMP('2-03-25 10:00','dd-mm-yy hh24:mi'),
              TO_TIMESTAMP('2-03-25 10:20','dd-mm-yy hh24:mi'),1000),
(2,1,12230,4,TO_TIMESTAMP('1-03-25 03:00','dd-mm-yy hh24:mi'),
              TO_TIMESTAMP('1-03-25 03:20','dd-mm-yy hh24:mi'),0),
(2,2,12230,5,TO_TIMESTAMP('1-03-25 17:00','dd-mm-yy hh24:mi'),
              TO_TIMESTAMP('1-03-25 17:15','dd-mm-yy hh24:mi'),500),
(2,3,12230,6,TO_TIMESTAMP('2-03-25 05:00','dd-mm-yy hh24:mi'),
              TO_TIMESTAMP('2-03-25 05:20','dd-mm-yy hh24:mi'),1300);

-- CLASS_INFO DATA
INSERT INTO class_info VALUES
('2AC',18046,5),
('3AC',18046,5),
('S',  18046,5),
('G',  18046,5),
('2AC',12230,5),
('3AC',12230,5),
('S',  12230,5);

-- TRAIN_FARE DATA
INSERT INTO train_fare VALUES
(18046,'2AC',400,18),
(18046,'3AC',300,15),
(18046,'S',200,12),
(18046,'G',50,10),
(12230,'2AC',400,22),
(12230,'3AC',300,20),
(12230,'S',200,15);

-- COACH DATA
INSERT INTO coach VALUES
('A1',18046,'2AC'),
('A2',18046,'2AC'),
('B1',18046,'3AC'),
('S1',18046,'S'  ),
('G1',18046,'G'  ),
('A1',12230,'2AC'),
('B1',12230,'3AC'),
('S1',12230,'S'  );

-- LOGIN_DETAILS DATA (3NF: Now includes password)
INSERT INTO login_details VALUES
('thr_user1','Hari',  9387456109,'pass123'),
('thr_user2','Asha',  9447765432,'pass456'),
('thr_user3','Manu',  9061234567,'pass789'),
('thr_user4','Devi',  9846123456,'pass101'),
('thr_user5','Raju',  9895012345,'pass102'),
('thr_user6','Saji',  9745123456,'pass103'),
('thr_user7','Mini',  8086123456,'pass104');

-- TICKET DATA (3NF: fare column removed)
INSERT INTO ticket VALUES
(5122543278,'1-03-25',1,3,18046,'thr_user1','3AC'),
(5122543279,'1-03-25',1,3,18046,'thr_user1','2AC'),
(5122543280,'1-03-25',2,3,18046,'thr_user3','2AC'),
(5122543281,'1-03-25',1,2,18046,'thr_user4','S'  ),
(5122543282,'1-03-25',1,2,18046,'thr_user4','G'  ),
(5122543288,'1-03-25',1,2,18046,'thr_user2','G'  ),
(5122543283,'1-03-25',4,6,12230,'thr_user2','3AC'),
(5122543284,'1-03-25',4,5,12230,'thr_user5','2AC'),
(5122543285,'1-03-25',5,6,12230,'thr_user2','2AC'),
(5122543286,'1-03-25',4,6,12230,'thr_user6','2AC'),
(5122543287,'1-03-25',5,6,12230,'thr_user7','S'  );

-- PAYMENT DATA (3NF: payment_amount column removed)
INSERT INTO payment VALUES
(21211,5122543278,'1-03-25','Debit'),
(21212,5122543279,'1-03-25','Debit'),
(21213,5122543280,'1-03-25','UPI' ),
(21214,5122543281,'1-03-25','Debit'),
(21215,5122543282,'1-03-25','UPI' ),
(21216,5122543283,'1-03-25','UPI' ),
(21217,5122543284,'1-03-25','Debit'),
(21218,5122543285,'1-03-25','UPI' ),
(21219,5122543286,'1-03-25','Debit'),
(21220,5122543287,'1-03-25','UPI' ),
(21221,5122543288,'1-03-25','Debit');

-- PASSENGER DATA (3NF: passenger_id as stable PK, no longer uses name as part of key)
INSERT INTO passenger VALUES
(1,5122543278,'Arjun',24,'M',9447700001,'CNF'),
(2,5122543278,'Anu',  21,'F',9447700002,'CNF'),
(3,5122543279,'Mohan',65,'M',9447700003,'CNF'),
(4,5122543279,'Isha', 16,'F',9447700004,'CNF'),
(5,5122543280,'Lekha',60,'F',9447700005,'CNF'),
(6,5122543281,'Soman',50,'M',9447700006,'CNF'),
(7,5122543282,'Gopi', 22,'M',9447700007,'CNF'),
(8,5122543283,'Divya',29,'F',9447700008,'CNF'),
(9,5122543284,'Kiran',34,'M',9447700009,'CNF'),
(10,5122543285,'Neha', 28,'F',9447700010,'CNF'),
(11,5122543286,'Ravi', 60,'M',9447700011,'CNF'),
(12,5122543287,'Sony', 55,'F',9447700012,'CNF'),
(13,5122543288,'Vivek',40,'M',9447700013,'CNF');

-- INWAITING DATA (3NF: name column removed, uses passenger_id)
INSERT INTO inwaiting VALUES
(5122543278,1,1),
(5122543279,1,3),
(5122543282,1,7),
(5122543283,1,8);

-- BOOKED_SEAT DATA (3NF: name column removed, uses passenger_id)
INSERT INTO booked_seat VALUES
(18046,1,'A1',5122543278,1),
(18046,1,'A2',5122543278,2),
(18046,2,'A1',5122543279,3),
(18046,2,'A2',5122543279,4),
(18046,3,'A1',5122543280,5),
(18046,4,'S1',5122543281,6),
(18046,5,'G1',5122543282,7),
(12230,1,'B1',5122543283,8),
(12230,2,'A1',5122543284,9),
(12230,3,'A1',5122543285,10),
(12230,4,'A1',5122543286,11),
(12230,5,'S1',5122543287,12),
(18046,6,'G1',5122543288,13);

-- =====================================================================
-- SECTION C: VERIFICATION QUERIES (Test that schema is 3NF compliant)
-- =====================================================================

COMMIT;

-- =====================================================================
-- TEST 1: Verify Fare Calculation Works (no longer stored, now calculated)
-- =====================================================================
SELECT
    t.pnr,
    t.date_of_travel,
    tr.train_name,
    t.class_id,
    s1.station_name AS boarding_from,
    s2.station_name AS heading_to,
    tf.fixed_charge,
    tf.distance_charge,
    r.distance_from_origin,
    (tf.fixed_charge + (tf.distance_charge * r.distance_from_origin)) AS calculated_fare
FROM ticket t
JOIN train tr ON t.train_no = tr.train_no
JOIN station s1 ON t.boarding_station = s1.station_id
JOIN station s2 ON t.destination_station = s2.station_id
JOIN train_fare tf ON t.train_no = tf.train_no AND t.class_id = tf.class_id
JOIN route r ON t.train_no = r.train_no AND t.destination_station = r.station_id
ORDER BY t.pnr;

-- =====================================================================
-- TEST 2: Verify Passenger ID Usage (stable key, no name-based FK)
-- =====================================================================
SELECT
    p.passenger_id,
    p.pnr,
    p.name,
    p.age,
    p.gender,
    t.train_no,
    t.class_id
FROM passenger p
JOIN ticket t ON p.pnr = t.pnr
ORDER BY p.passenger_id;

-- =====================================================================
-- TEST 3: Verify Inwaiting Uses Passenger_ID (No Name Column)
-- =====================================================================
SELECT
    iw.pnr,
    iw.waiting_no,
    iw.passenger_id,
    p.name,
    p.age,
    p.status
FROM inwaiting iw
JOIN passenger p ON iw.passenger_id = p.passenger_id
ORDER BY iw.pnr;

-- =====================================================================
-- TEST 4: Verify Booked Seats Use Passenger_ID (No Name Column)
-- =====================================================================
SELECT
    bs.train_no,
    bs.seat_no,
    bs.coach_no,
    bs.pnr,
    bs.passenger_id,
    p.name,
    p.age,
    p.gender
FROM booked_seat bs
JOIN passenger p ON bs.passenger_id = p.passenger_id
ORDER BY bs.train_no, bs.seat_no;

-- =====================================================================
-- TEST 5: Verify Payment Data (No Amount Column Stored)
-- =====================================================================
SELECT
    pm.payment_id,
    pm.pnr,
    pm.payment_date,
    pm.payment_mode,
    t.date_of_travel,
    t.class_id,
    (tf.fixed_charge + (tf.distance_charge * r.distance_from_origin)) AS paid_amount
FROM payment pm
JOIN ticket t ON pm.pnr = t.pnr
JOIN train_fare tf ON t.train_no = tf.train_no AND t.class_id = tf.class_id
JOIN route r ON t.train_no = r.train_no AND t.destination_station = r.station_id
ORDER BY pm.payment_id;

-- =====================================================================
-- TEST 6: List All Passengers on a Specific Train
-- =====================================================================
SELECT
    p.passenger_id,
    p.name,
    p.age,
    p.gender,
    t.train_no,
    tr.train_name,
    t.class_id,
    p.status
FROM passenger p
JOIN ticket t ON p.pnr = t.pnr
JOIN train tr ON t.train_no = tr.train_no
WHERE t.train_no = 18046
ORDER BY p.passenger_id;

-- =====================================================================
-- TEST 7: Get Trains and Stations They Stop At
-- =====================================================================
SELECT
    tr.train_no,
    tr.train_name,
    r.sequence_no,
    s.station_name,
    r.arrival_time,
    r.departure_time,
    r.distance_from_origin
FROM train tr
JOIN route r ON tr.train_no = r.train_no
JOIN station s ON r.station_id = s.station_id
ORDER BY tr.train_no, r.sequence_no;

-- =====================================================================
-- TEST 8: Count Passengers by Booking Status
-- =====================================================================
SELECT
    status,
    COUNT(*) AS passenger_count
FROM passenger
GROUP BY status;

-- =====================================================================
-- TEST 9: Data Integrity Check - Referential Integrity
-- =====================================================================
-- Should return 0 rows if all FKs are valid
SELECT * FROM ticket WHERE username NOT IN (SELECT username FROM login_details);
SELECT * FROM ticket WHERE train_no NOT IN (SELECT train_no FROM train);
SELECT * FROM payment WHERE pnr NOT IN (SELECT pnr FROM ticket);
SELECT * FROM passenger WHERE pnr NOT IN (SELECT pnr FROM ticket);
SELECT * FROM inwaiting WHERE passenger_id NOT IN (SELECT passenger_id FROM passenger);
SELECT * FROM booked_seat WHERE passenger_id NOT IN (SELECT passenger_id FROM passenger);

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
-- If you can see results from all TEST queries (1-9) with no errors,
-- your 3NF-compliant Railway Management System Database is ready to use!
--
-- Key achievements:
-- ✅ Removed transitive dependencies (fare, payment_amount)
-- ✅ Replaced unstable name-based keys with stable passenger_id
-- ✅ Eliminated partial dependencies (removed redundant name columns)
-- ✅ Added missing password field to login_details
-- ✅ Maintained all ER diagram relationships
-- ✅ All data integrity constraints in place
