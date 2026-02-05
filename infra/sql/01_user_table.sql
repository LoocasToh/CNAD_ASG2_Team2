CREATE DATABASE IF NOT EXISTS authdb;
USE authdb;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  userType ENUM('user', 'caregiver') NOT NULL
);

INSERT INTO users (name, email, password, userType)
VALUES ('admin', 'admin@example.com', '$2a$10$Stc3hhatnvc45ZqolKrz1O1zRdrT.J28loausQzU2ImdTDDD0509e', 'admin');

INSERT INTO users (name, email, password, userType)
VALUES ('caregiver', 'care@example.com', '$2a$10$Stc3hhatnvc45ZqolKrz1O1zRdrT.J28loausQzU2ImdTDDD0509e', 'caregiver');

INSERT INTO users (name, email, password, userType)
VALUES ('pwid', 'pwid@example.com', '$2a$10$Stc3hhatnvc45ZqolKrz1O1zRdrT.J28loausQzU2ImdTDDD0509e', 'pwid');