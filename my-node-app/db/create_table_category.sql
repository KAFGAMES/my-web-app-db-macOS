SET NAMES utf8mb4;


CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position INT NOT NULL
);

INSERT INTO categories (name, position) VALUES
('web3収益', 1),
('ブログ収益', 2),
('バイト収益', 3),
('食費', 4),
('交際費', 5),
('税金', 6),
('経費', 7),
('娯楽費', 8),
('合計', 9);
