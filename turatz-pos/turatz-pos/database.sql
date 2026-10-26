CREATE DATABASE IF NOT EXISTS turatz_pos CHARACTER SET utf8mb4;
USE turatz_pos;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(40) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin','Cashier') NOT NULL DEFAULT 'Cashier',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id VARCHAR(10) PRIMARY KEY,              -- unique product ID, e.g. CS2A
  name VARCHAR(80) NOT NULL,
  category VARCHAR(30) NOT NULL,
  price DECIMAL(8,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  options VARCHAR(120) NULL                -- e.g. Strawberry,Lychee,Lemon (optional)
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no INT NOT NULL UNIQUE,
  user_id INT NOT NULL,
  order_type ENUM('Dine in','To go') NOT NULL,
  payment_method ENUM('Cash','E-Wallet') NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  change_due DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id VARCHAR(10) NOT NULL,         -- snapshot, so erasing a product keeps old records
  name VARCHAR(80) NOT NULL,
  category VARCHAR(30) NOT NULL,
  opt VARCHAR(30) NULL,
  qty INT NOT NULL,
  unit_price DECIMAL(8,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Ready-made accounts (change these passwords after your first login)
-- admin / admin123  (Admin)      cashier / cashier123  (Cashier)
INSERT INTO users (username,email,password_hash,role) VALUES
('admin','admin@turatz.local','$2b$12$rStzUlWSBjxwnLhUPFNxBOknXOiuGZAnOnbg9eO4m6uIYjTeLHAFe','Admin'),
('cashier','cashier@turatz.local','$2b$12$TghTh0LyU8kom/a6SmAMD.dVpZR8XkxVi/C2DdeO02WoXfmnULQAe','Cashier');

INSERT INTO products (id,name,category,price,stock,options) VALUES
('CS2A','Americano','Classic Brew',65,50,NULL),
('CS2C','Cafe Latte','Classic Brew',79,50,NULL),
('CS2S','Spanish Latte','Classic Brew',95,50,NULL),
('CS2H','Hazelnut','Classic Brew',95,50,NULL),
('CS2F','French Vanilla','Classic Brew',95,50,NULL),
('CS2L','Caramel','Classic Brew',99,50,NULL),
('CS2T','Salted Caramel','Classic Brew',99,50,NULL),
('SB3W','White Beard (White Chocolate Mocha Latte)','Signature Brew',119,50,NULL),
('SB3I','Black Beard (Iced Chocolate Latte)','Signature Brew',119,50,NULL),
('SB3O','Golden Lion Shiki (Iced Caramel Macchiato)','Signature Brew',119,50,NULL),
('MS4C','Choco Milk','Milk Series',89,50,NULL),
('MS4S','Strawberry Milk','Milk Series',89,50,NULL),
('MS4B','Blueberry Milk','Milk Series',89,50,NULL),
('MS4O','Oreo Milk','Milk Series',89,50,NULL),
('MA6M','Matcha Latte','Matcha Series',99,50,NULL),
('MA6S','Strawberry Matcha','Matcha Series',105,50,NULL),
('MA6B','Blueberry Matcha','Matcha Series',105,50,NULL),
('MA6O','Oreo Matcha','Matcha Series',109,50,NULL),
('REFS','Soda Series','Refresher',79,50,'Strawberry,Lychee,Lemon'),
('REFY','Yakult Series','Refresher',89,50,'Strawberry,Lychee,Lemon'),
('REFA','Yakult Soda','Refresher',95,50,'Strawberry,Lychee,Lemon');
