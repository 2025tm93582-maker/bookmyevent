CREATE TABLE IF NOT EXISTS bookings (
    id CHAR(36) PRIMARY KEY,
    show_id INT NOT NULL,
    customer_email VARCHAR(150) NOT NULL,
    seats JSON NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status ENUM('PENDING', 'SEATS_HELD', 'PAID', 'CONFIRMED', 'COMPENSATING', 'FAILED', 'REJECTED', 'CANCELLED') NOT NULL,
    hold_id CHAR(36) NULL,
    payment_id CHAR(36) NULL,
    failure_reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saga_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id CHAR(36) NOT NULL,
    step VARCHAR(40) NOT NULL,
    outcome ENUM('OK', 'FAILED', 'SKIPPED') NOT NULL,
    detail VARCHAR(255) NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_saga_steps_booking (booking_id)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
    idem_key VARCHAR(64) PRIMARY KEY,
    request_hash CHAR(64) NOT NULL,
    status ENUM('IN_PROGRESS', 'COMPLETED') NOT NULL,
    response_code INT NULL,
    response_body JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);