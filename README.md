# E-commerce concurrency simulation (Node.js + Express + PostgreSQL + Prisma 6)

This project simulates 500 customer workers performing user/product CRUD operations and purchases against a PostgreSQL database. Each successful business operation and purchase failure is logged transactionally in `ActivityLog`.

## Requirements

- Node.js 20 or newer
- PostgreSQL 15 or newer
- npm
- Windows Git Bash, PowerShell, or another terminal

## Important Prisma compatibility note

This project intentionally pins both `prisma` and `@prisma/client` to `6.19.0`.

- Do not add a `prisma.config.ts` file.
- The connection URL belongs in `prisma/schema.prisma` under `datasource db`.
- Do not use Prisma 7/8 migration commands with this project.

## 1. Install dependencies

From the project root:

```bash
npm install
```

## 2. Configure the database

Copy `.env.example` to `.env` and update `YOUR_PASSWORD`:

```bash
cp .env.example .env
```

Create the PostgreSQL database:

```sql
CREATE DATABASE ecommerce_simulator;
```

The database URL in `.env` must point to this database.

## 3. Generate Prisma Client and run migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

If you have already created the initial migration, use:

```bash
npx prisma migrate dev
```

## 4. Seed initial data

```bash
npm run seed
```

By default this creates 500 users and 50,000 products. Seeding uses batches.

## 5. Start the API

```bash
npm run dev
```

The server listens on `http://127.0.0.1:5000`.

## 6. Control the simulation

Start:

```bash
curl -X POST http://127.0.0.1:5000/simulation/start
```

Status:

```bash
curl http://127.0.0.1:5000/simulation/status
```

Stop:

```bash
curl -X POST http://127.0.0.1:5000/simulation/stop
```

You can also stop the server with Ctrl+C.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | API health |
| GET | `/simulation/status` | Simulation status |
| POST | `/simulation/start` | Start workers |
| POST | `/simulation/stop` | Stop workers |

## Database tables

- `User`
- `Product`
- `Order`
- `OrderItem`
- `ActivityLog`

## Important operational notes

1. The 500 worker identities are selected from the oldest active users and protected from the simulated user-delete operation. Seed the database before starting the simulation.
2. Product deletion is a soft delete so historical order references remain valid.
3. Inventory deduction uses a conditional atomic SQL update inside a transaction. Competing buyers cannot both decrement stock below zero.
4. Purchase order, order item, stock deduction, and success activity log are committed together. Failed purchase attempts are logged too.
5. The database-size guard measures PostgreSQL database size using `pg_database_size()`. It does **not** measure free space on the Windows drive or guarantee the drive cannot fill. Monitor physical disk space separately and keep PostgreSQL backups.
6. The 500 workers are concurrent asynchronous tasks in one Node.js process, not 500 OS processes or 500 CPU threads.
7. This is a functional simulation baseline, not a production load-testing platform. Test with a smaller worker count and inspect database resource usage before long runs.
8. If you change `SIMULATION_USERS`, ensure `INITIAL_USERS` is at least as large. The current worker-pool initialization protects the first 500 oldest active users; adjust the pool logic if you change the worker count above 500.
9. The simulator currently runs in one Node.js process. Do not run multiple copies against the same database unless you intentionally want multiple simulations.

## Useful SQL checks

```sql
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Product";
SELECT COUNT(*) FROM "Order";
SELECT COUNT(*) FROM "ActivityLog";

SELECT type, COUNT(*)
FROM "ActivityLog"
GROUP BY type
ORDER BY COUNT(*) DESC;

SELECT DATE("createdAt") AS sales_date,
       COUNT(*) AS total_orders,
       SUM("totalAmount") AS revenue
FROM "Order"
WHERE status = 'COMPLETED'
GROUP BY DATE("createdAt")
ORDER BY sales_date;
```
