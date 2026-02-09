DROP DATABASE IF EXISTS authdb;

CREATE DATABASE IF NOT EXISTS authdb;
USE authdb;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  userType ENUM('admin', 'user', 'caregiver') NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  userId INT PRIMARY KEY,
  full_name VARCHAR(255) NULL,
  dob DATE NULL,
  gender VARCHAR(20) NULL,
  phone VARCHAR(30) NULL,
  address VARCHAR(255) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50) NULL,
  phone VARCHAR(30) NOT NULL,
  notes VARCHAR(255) NULL,
  isPrimary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contacts_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS health_medications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  med_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(50) NULL,
  time_of_day TIME NULL,
  notes VARCHAR(255) NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_meds_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Users
INSERT INTO users (name, email, password, userType)
VALUES
('Alice Lim', 'alice@example.com', 'password123', 'user'),
('Bob Tan', 'bob@example.com', 'password123', 'caregiver');

-- User Profiles
INSERT INTO user_profiles (userId, full_name, dob, gender, phone, address)
VALUES
(1, 'Alice Lim', '1990-05-12', 'Female', '91234567', '123 Example St'),
(2, 'Bob Tan', '1985-08-30', 'Male', '98765432', '456 Example Ave');

-- Emergency Contacts
INSERT INTO emergency_contacts (userId, name, relationship, phone, notes, isPrimary)
VALUES
(1, 'Carol Lim', 'Mother', '91239876', 'Lives nearby', 1),
(1, 'David Lim', 'Father', '91234567', '', 0),
(2, 'Eve Tan', 'Spouse', '98761234', '', 1);

-- Health Medications
INSERT INTO health_medications (userId, med_name, dosage, time_of_day, notes, isActive)
VALUES
(1, 'Aspirin', '100mg', '08:00:00', 'Take after breakfast', 1),
(1, 'Vitamin D', '2000 IU', '09:00:00', '', 1),
(2, 'Ibuprofen', '200mg', '12:00:00', 'If headache occurs', 1);