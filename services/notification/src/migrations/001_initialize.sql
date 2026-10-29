CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL,
    channel ENUM('EMAIL', 'SMS') NOT NULL,
    recipient VARCHAR(150) NOT NULL,
    template VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_notifications_once (booking_id, template, channel)
);