CREATE TABLE IF NOT EXISTS payments (
    id CHAR(36) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency CHAR(3) NOT NULL,
    status ENUM('SUCCEEDED', 'DECLINED', 'REFUNDED') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refunded_at TIMESTAMP NULL,
    UNIQUE KEY uq_payments_booking (booking_id)
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
    idem_key VARCHAR(64) PRIMARY KEY,
    request_hash CHAR(64) NOT NULL,
    status ENUM('IN_PROGRESS', 'COMPLETED') NOT NULL,
    response_code INT NULL,
    response_body JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);