-- Create Database
CREATE DATABASE retail_db;

-- Connect to Database
\c retail_db

-- Create Tables
CREATE TABLE sales (
  c1 INT,
  c2 TEXT,
  c3 FLOAT,
  cust_id INT,
  prod_id INT,
  reg_id INT
);

CREATE TABLE customers (
  id INT PRIMARY KEY,
  name TEXT,
  email TEXT
);

CREATE TABLE products (
  p1 INT PRIMARY KEY,
  p2 TEXT,
  price FLOAT
);

CREATE TABLE regions (
  r1 INT PRIMARY KEY,
  r2 TEXT
);

-- Insert Sample Data (Dirty, Complex)
INSERT INTO sales (c1, c2, c3, cust_id, prod_id, reg_id) VALUES
(1, '2025-01-15', 100.50, 1, 1, 1),
(1, '15/01/2025', NULL, 2, 2, 2), -- Duplicate c1, NULL revenue
(3, '2025-02-01', -50.00, 3, 3, 3), -- Negative revenue
(4, NULL, 200.75, 4, 4, 4),
(5, '2025-03-10', 150.25, 1, 5, 5);

INSERT INTO customers (id, name, email) VALUES
(1, 'John Doe', 'john.doe@example.com'),
(2, 'jane smith', NULL), -- Missing email
(3, NULL, 'invalid.email'), -- Missing name
(4, 'Alice Brown', 'alice@company.com'),
(5, 'bob', 'bob@xyz.com');

INSERT INTO products (p1, p2, price) VALUES
(1, 'Laptop', 999.99),
(2, 'Phone', NULL), -- Missing price
(3, 'Tablet', -100.00), -- Negative price
(4, 'Laptop', 999.99), -- Duplicate product
(5, NULL, 499.99); -- Missing name

INSERT INTO regions (r1, r2) VALUES
(1, 'North'),
(2, 'south'), -- Inconsistent case
(3, NULL), -- Missing name
(4, 'West'),
(5, 'East');

-- Add more data for complexity (500+ rows)
DO $$
BEGIN
  FOR i IN 6..500 LOOP
    INSERT INTO sales (c1, c2, c3, cust_id, prod_id, reg_id)
    VALUES (
      i,
      '2025-' || LPAD((RANDOM() * 12 + 1)::INT::TEXT, 2, '0') || '-' || LPAD((RANDOM() * 28 + 1)::INT::TEXT, 2, '0'),
      RANDOM() * 1000 - 100, -- Some negative, some NULL
      (RANDOM() * 5 + 1)::INT,
      (RANDOM() * 5 + 1)::INT,
      (RANDOM() * 5 + 1)::INT
    );
  END LOOP;
END $$;