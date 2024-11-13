CREATE TABLE favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    profit DECIMAL(10, 2) DEFAULT 0,
    expense DECIMAL(10, 2) DEFAULT 0,
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
