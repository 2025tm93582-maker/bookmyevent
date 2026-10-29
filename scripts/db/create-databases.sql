-- BookMyEvent: one database + one user per service (local development only)
-- Run as root:  mysql -u root -p < scripts/db/create-databases.sql

CREATE DATABASE IF NOT EXISTS catalog_db;
CREATE USER IF NOT EXISTS 'catalog_user'@'%' IDENTIFIED BY 'catalog_pass';
GRANT ALL PRIVILEGES ON catalog_db.* TO 'catalog_user'@'%';

CREATE DATABASE IF NOT EXISTS inventory_db;
CREATE USER IF NOT EXISTS 'inventory_user'@'%' IDENTIFIED BY 'inventory_pass';
GRANT ALL PRIVILEGES ON inventory_db.* TO 'inventory_user'@'%';

CREATE DATABASE IF NOT EXISTS booking_db;
CREATE USER IF NOT EXISTS 'booking_user'@'%' IDENTIFIED BY 'booking_pass';
GRANT ALL PRIVILEGES ON booking_db.* TO 'booking_user'@'%';

CREATE DATABASE IF NOT EXISTS payment_db;
CREATE USER IF NOT EXISTS 'payment_user'@'%' IDENTIFIED BY 'payment_pass';
GRANT ALL PRIVILEGES ON payment_db.* TO 'payment_user'@'%';

CREATE DATABASE IF NOT EXISTS notification_db;
CREATE USER IF NOT EXISTS 'notification_user'@'%' IDENTIFIED BY 'notification_pass';
GRANT ALL PRIVILEGES ON notification_db.* TO 'notification_user'@'%';
