#!/bin/bash
cd "$(dirname "$0")/../.."

check() {
    date
    echo "booking_user can see only its own database:"
    mysql -u booking_user -pbooking_pass -h 127.0.0.1 -e "SHOW DATABASES;"
    echo
    echo "booking_user tries to open inventory_db (should be denied):"
    mysql -u booking_user -pbooking_pass -h 127.0.0.1 -e "USE inventory_db;"
    echo
    echo "inventory_user tries to read payment_db (should be denied):"
    mysql -u inventory_user -pinventory_pass -h 127.0.0.1 -e "SELECT COUNT(*) FROM payment_db.payments;"
}

check 2>&1 | grep -v "Using a password" | tee evidence/tests/db-isolation.txt
