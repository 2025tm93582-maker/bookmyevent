CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(30) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    venue VARCHAR(150) NOT NULL,
    starts_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE TABLE IF NOT EXISTS show_prices (
    show_id INT NOT NULL,
    tier VARCHAR(20) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (show_id, tier),
    FOREIGN KEY (show_id) REFERENCES shows(id)
);