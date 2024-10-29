CREATE TABLE IF NOT EXISTS calendar_data (
    date DATE NOT NULL,
    category VARCHAR(255) NOT NULL,
    profit INT DEFAULT 0,
    expense INT DEFAULT 0,
    memo TEXT,
    PRIMARY KEY (date, category)
);


CREATE TABLE IF NOT EXISTS monthly_goals (
    category VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    goal_amount INT DEFAULT 0,
    PRIMARY KEY (category, year, month)
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 利益詳細を保存するテーブル
CREATE TABLE profit_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(255),
    date DATE,
    amount INT,
    description VARCHAR(255)
);

-- 支出詳細を保存するテーブル
CREATE TABLE expense_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(255),
    date DATE,
    amount INT,
    description VARCHAR(255)
);
