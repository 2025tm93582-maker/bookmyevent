# BookMyEvent — Event Ticketing Microservices

Scalable Services (SE ZG583) — Assignment 1

| Service      | Port | Database        | Owner |
| ------------ | ---- | --------------- | ----- |
| catalog      | 3001 | catalog_db      |       |
| inventory    | 3002 | inventory_db    |       |
| booking      | 3003 | booking_db      |       |
| payment      | 3004 | payment_db      |       |
| notification | 3005 | notification_db |       |

## Catalog service setup

Create the local catalog environment file from the checked-in template:

```bash
cp services/catalog/.env.example services/catalog/.env
```

The values in the template match the catalog database user created by
[`scripts/db/create-databases.sql`](scripts/db/create-databases.sql). Start the
service from its directory so `dotenv` loads the local environment file:

```bash
cd services/catalog
npm install
npm run dev
```
