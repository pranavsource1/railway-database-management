-- Railway Management System Database - MySQL Compatible
-- All data properly formatted for MySQL

/* ========  TABLE CREATION  ===================== */

CREATE TABLE station(
  station_id INT PRIMARY KEY,
  station_name VARCHAR(20),
  station_type VARCHAR(10)
);

CREATE TABLE train(
  train_no INT PRIMARY KEY,
  train_name VARCHAR(20),
  start_time DATETIME,
  end_time DATETIME,
  start_station_code INT,
  end_station_code INT,
  FOREIGN KEY(start_station_code) REFERENCES station(station_id),
  FOREIGN KEY(end_station_code) REFERENCES station(station_id)
);

CREATE TABLE route(
  route_id INT,
  sequence_no INT,
  train_no INT,
  station_id INT,
  arrival_time DATETIME,
  departure_time DATETIME,
  distance_from_origin INT,
  FOREIGN KEY(train_no) REFERENCES train(train_no),
  FOREIGN KEY(station_id) REFERENCES station(station_id),
  PRIMARY KEY(route_id, sequence_no)
);

CREATE TABLE class_info(
  class_id VARCHAR(3),
  train_no INT,
  seats_per_coach INT,
  FOREIGN KEY(train_no) REFERENCES train(train_no),
  PRIMARY KEY(class_id, train_no)
);

CREATE TABLE train_fare(
  train_no INT,
  class_id VARCHAR(3),
  fixed_charge INT,
  distance_charge INT,
  FOREIGN KEY(class_id, train_no) REFERENCES class_info(class_id, train_no),
  PRIMARY KEY(train_no, class_id)
);

CREATE TABLE coach(
  coach_no VARCHAR(3),
  train_no INT,
  class_id VARCHAR(3),
  FOREIGN KEY(class_id, train_no) REFERENCES class_info(class_id, train_no),
  PRIMARY KEY(coach_no, train_no)
);

CREATE TABLE login_details(
  username VARCHAR(15) PRIMARY KEY,
  name VARCHAR(20),
  mobile_number BIGINT,
  password VARCHAR(255)
);

CREATE TABLE ticket(
  pnr BIGINT PRIMARY KEY,
  date_of_travel DATE,
  boarding_station INT,
  destination_station INT,
  train_no INT,
  username VARCHAR(15),
  class_id VARCHAR(3),
  FOREIGN KEY(boarding_station) REFERENCES station(station_id),
  FOREIGN KEY(destination_station) REFERENCES station(station_id),
  FOREIGN KEY(username) REFERENCES login_details(username),
  FOREIGN KEY(class_id, train_no) REFERENCES class_info(class_id, train_no)
);

CREATE TABLE payment(
  payment_id INT PRIMARY KEY,
  pnr BIGINT,
  payment_date DATE,
  payment_mode VARCHAR(20),
  FOREIGN KEY(pnr) REFERENCES ticket(pnr)
);

CREATE TABLE passenger(
  passenger_id INT PRIMARY KEY,
  pnr BIGINT,
  name VARCHAR(20),
  age INT,
  gender VARCHAR(1),
  mobile_no BIGINT,
  status VARCHAR(8),
  FOREIGN KEY(pnr) REFERENCES ticket(pnr)
);

CREATE TABLE inwaiting(
  pnr BIGINT NOT NULL,
  waiting_no INT,
  passenger_id INT NOT NULL,
  FOREIGN KEY(passenger_id) REFERENCES passenger(passenger_id),
  PRIMARY KEY(pnr, waiting_no)
);

CREATE TABLE booked_seat(
  train_no INT,
  seat_no INT,
  coach_no VARCHAR(3),
  pnr BIGINT NOT NULL,
  passenger_id INT NOT NULL,
  FOREIGN KEY(passenger_id) REFERENCES passenger(passenger_id),
  FOREIGN KEY(coach_no, train_no) REFERENCES coach(coach_no, train_no),
  PRIMARY KEY(train_no, seat_no, coach_no)
);

/* ========  DATA INSERTION  ============ */

/* STATION */
INSERT INTO station VALUES
(1, 'Thrissur', 'junction'),
(2, 'Ernakulam', 'junction'),
(3, 'Kollam', 'junction'),
(4, 'Chennai', 'central'),
(5, 'Coimbatore', 'junction'),
(6, 'Madurai', 'junction');

/* TRAIN */
INSERT INTO train VALUES
(18046, 'Malabar Exp', '2025-03-01 11:20:00', '2025-03-02 10:00:00', 1, 3),
(12230, 'Pandian Exp', '2025-03-01 03:20:00', '2025-03-02 05:00:00', 4, 6);

/* ROUTE */
INSERT INTO route VALUES
(1, 1, 18046, 1, '2025-03-01 11:00:00', '2025-03-01 11:20:00', 0),
(1, 2, 18046, 2, '2025-03-01 22:00:00', '2025-03-01 22:10:00', 300),
(1, 3, 18046, 3, '2025-03-02 10:00:00', '2025-03-02 10:20:00', 1000),
(2, 1, 12230, 4, '2025-03-01 03:00:00', '2025-03-01 03:20:00', 0),
(2, 2, 12230, 5, '2025-03-01 17:00:00', '2025-03-01 17:15:00', 500),
(2, 3, 12230, 6, '2025-03-02 05:00:00', '2025-03-02 05:20:00', 1300);

/* CLASS_INFO */
INSERT INTO class_info VALUES
('2AC', 18046, 5),
('3AC', 18046, 5),
('S', 18046, 5),
('G', 18046, 5),
('2AC', 12230, 5),
('3AC', 12230, 5),
('S', 12230, 5);

/* TRAIN_FARE */
INSERT INTO train_fare VALUES
(18046, '2AC', 400, 18),
(18046, '3AC', 300, 15),
(18046, 'S', 200, 12),
(18046, 'G', 50, 10),
(12230, '2AC', 400, 22),
(12230, '3AC', 300, 20),
(12230, 'S', 200, 15);

/* COACH */
INSERT INTO coach VALUES
('A1', 18046, '2AC'),
('A2', 18046, '2AC'),
('B1', 18046, '3AC'),
('S1', 18046, 'S'),
('G1', 18046, 'G'),
('A1', 12230, '2AC'),
('B1', 12230, '3AC'),
('S1', 12230, 'S');

/* LOGIN_DETAILS */
INSERT INTO login_details VALUES
('thr_user1', 'Hari', 9387456109, 'pass123'),
('thr_user2', 'Asha', 9447765432, 'pass456'),
('thr_user3', 'Manu', 9061234567, 'pass789'),
('thr_user4', 'Devi', 9846123456, 'pass101'),
('thr_user5', 'Raju', 9895012345, 'pass102'),
('thr_user6', 'Saji', 9745123456, 'pass103'),
('thr_user7', 'Mini', 8086123456, 'pass104');

/* TICKET */
INSERT INTO ticket VALUES
(5122543278, '2025-03-01', 1, 3, 18046, 'thr_user1', '3AC'),
(5122543279, '2025-03-01', 1, 3, 18046, 'thr_user1', '2AC'),
(5122543280, '2025-03-01', 2, 3, 18046, 'thr_user3', '2AC'),
(5122543281, '2025-03-01', 1, 2, 18046, 'thr_user4', 'S'),
(5122543282, '2025-03-01', 1, 2, 18046, 'thr_user4', 'G'),
(5122543288, '2025-03-01', 1, 2, 18046, 'thr_user2', 'G'),
(5122543283, '2025-03-01', 4, 6, 12230, 'thr_user2', '3AC'),
(5122543284, '2025-03-01', 4, 5, 12230, 'thr_user5', '2AC'),
(5122543285, '2025-03-01', 5, 6, 12230, 'thr_user2', '2AC'),
(5122543286, '2025-03-01', 4, 6, 12230, 'thr_user6', '2AC'),
(5122543287, '2025-03-01', 5, 6, 12230, 'thr_user7', 'S');

/* PAYMENT */
INSERT INTO payment VALUES
(21211, 5122543278, '2025-03-01', 'Debit'),
(21212, 5122543279, '2025-03-01', 'Debit'),
(21213, 5122543280, '2025-03-01', 'UPI'),
(21214, 5122543281, '2025-03-01', 'Debit'),
(21215, 5122543282, '2025-03-01', 'UPI'),
(21216, 5122543283, '2025-03-01', 'UPI'),
(21217, 5122543284, '2025-03-01', 'Debit'),
(21218, 5122543285, '2025-03-01', 'UPI'),
(21219, 5122543286, '2025-03-01', 'Debit'),
(21220, 5122543287, '2025-03-01', 'UPI'),
(21221, 5122543288, '2025-03-01', 'Debit');

/* PASSENGER */
INSERT INTO passenger VALUES
(1, 5122543278, 'Arjun', 24, 'M', 9447700001, 'CNF'),
(2, 5122543278, 'Anu', 21, 'F', 9447700002, 'CNF'),
(3, 5122543279, 'Mohan', 65, 'M', 9447700003, 'CNF'),
(4, 5122543279, 'Isha', 16, 'F', 9447700004, 'CNF'),
(5, 5122543280, 'Lekha', 60, 'F', 9447700005, 'CNF'),
(6, 5122543281, 'Soman', 50, 'M', 9447700006, 'CNF'),
(7, 5122543282, 'Gopi', 22, 'M', 9447700007, 'CNF'),
(8, 5122543283, 'Divya', 29, 'F', 9447700008, 'CNF'),
(9, 5122543284, 'Kiran', 34, 'M', 9447700009, 'CNF'),
(10, 5122543285, 'Neha', 28, 'F', 9447700010, 'CNF'),
(11, 5122543286, 'Ravi', 60, 'M', 9447700011, 'CNF'),
(12, 5122543287, 'Sony', 55, 'F', 9447700012, 'CNF'),
(13, 5122543288, 'Vivek', 40, 'M', 9447700013, 'CNF');

/* INWAITING */
INSERT INTO inwaiting VALUES
(5122543278, 1, 1),
(5122543279, 1, 3),
(5122543282, 1, 7),
(5122543283, 1, 8);

/* BOOKED_SEAT */
INSERT INTO booked_seat VALUES
(18046, 1, 'A1', 5122543278, 1),
(18046, 1, 'A2', 5122543278, 2),
(18046, 2, 'A1', 5122543279, 3),
(18046, 2, 'A2', 5122543279, 4),
(18046, 3, 'A1', 5122543280, 5),
(18046, 4, 'S1', 5122543281, 6),
(18046, 5, 'G1', 5122543282, 7),
(12230, 1, 'B1', 5122543283, 8),
(12230, 2, 'A1', 5122543284, 9),
(12230, 3, 'A1', 5122543285, 10),
(12230, 4, 'A1', 5122543286, 11),
(12230, 5, 'S1', 5122543287, 12),
(18046, 6, 'G1', 5122543288, 13);
