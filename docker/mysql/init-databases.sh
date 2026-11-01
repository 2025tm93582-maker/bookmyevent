#!/bin/bash
set -e

create() {
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS $1;
CREATE USER IF NOT EXISTS '$2'@'%' IDENTIFIED BY '$3';
GRANT ALL PRIVILEGES ON $1.* TO '$2'@'%';
SQL
    echo "created $1 for $2"
}

create catalog_db catalog_user "$CATALOG_DB_PASSWORD"
create inventory_db inventory_user "$INVENTORY_DB_PASSWORD"
create booking_db booking_user "$BOOKING_DB_PASSWORD"
create payment_db payment_user "$PAYMENT_DB_PASSWORD"
create notification_db notification_user "$NOTIFICATION_DB_PASSWORD"
