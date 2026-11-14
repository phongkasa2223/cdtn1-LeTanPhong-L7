# Deployment Guide

Customer Data Quality service (flow L7, Mekong Mobile). The whole system (web app, API and MariaDB database) runs from **two commands** with Docker Compose. This guide was followed on a clean clone before submission (results in [`test-report.md`](test-report.md) and the screenshots in the report PDF).

## 1. Requirements

| Item | Requirement |
| :--- | :--- |
| Operating system | Windows 10/11, macOS or Linux. Tested on Windows 11 with Docker Desktop (Docker Engine 29.9, Compose v5.6); the images are Linux. |
| Software | Docker Engine 24 or newer **with the Compose v2 plugin** (`docker compose version` must work), and Git. Node.js and a database server are **not** needed on the host. |
| Resources | About 1.5 GB of free disk (images: app 263 MB, MariaDB 459 MB, plus build cache) and 2 GB of RAM available to Docker. |
| Network | Internet access on the first build (pulls `node:24-alpine`, `mariadb:10.11` and the npm packages). |
| Ports | Host port **3000** must be free (change it with `APP_PORT`). The database port is **not** published to the host. |

## 2. Setup steps

1. Get the code at the release tag: `git clone --branch v1.0 https://github.com/phongkasa2223/cdtn1-LeTanPhong-L7.git`
2. Enter the folder: `cd cdtn1-LeTanPhong-L7`
3. Create the configuration file (Windows `cmd`: `copy .env.example .env`): `cp .env.example .env`
4. Build and start everything: `docker compose up -d --build`
5. Open `http://localhost:3000` in a browser. The first build takes a few minutes; later starts take about 30 seconds.

Steps 3 and 4 are the only two commands needed to run the system. To stop it keeping the data, run `docker compose down`; to stop it and delete the database, run `docker compose down -v`.

## 3. Environment variables

All variables are in `.env.example` with sample values that work as they are. **The sample password and JWT key are public in the repository: change them before any real use.** Under Docker, `docker-compose.yml` overrides `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `PORT` so that the two containers always agree.

| Name | Meaning | Sample value | Required |
| :--- | :--- | :--- | :---: |
| `DB_PASSWORD` | Password of the application database user `mekong` (also given to MariaDB on first start) | `mau-doi-mat-khau-db-truoc-khi-dung` | yes |
| `JWT_SECRET` | Key that signs login tokens, at least 16 characters | `mau-doi-khoa-jwt-truoc-khi-dung-0123456789` | yes |
| `JWT_EXPIRES_IN` | Token lifetime in seconds | `3600` | no |
| `APP_PORT` | Host port that opens the app (`http://localhost:APP_PORT`) | `3000` | no (default 3000) |
| `SEED_DEMO_DATA` | `true`: load the demo data at every app start; `false`: skip it | `true` | no |
| `LOG_LEVEL` | Minimum log level: `debug`, `info`, `warn`, `error` | `info` | no |
| `DB_POOL_MAX` | Maximum database connections | `10` | no |
| `DB_TZ_OFFSET` | Time zone attached to times read from the database | `+07:00` | no |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | Database location and names. Used only when running **without** Docker (`127.0.0.1`, `3306`, `mekong_dq`, `mekong`); Docker forces `db`, `3306`, `mekong_dq`, `mekong` | as listed | no |
| `DB_ADMIN_USER`, `DB_ADMIN_PASSWORD` | Database admin account for `npm run db:setup` when running without Docker | `root`, empty | no |
| `PORT` | API port inside the process (Docker forces `3000`) | `3000` | no |
| `TEST_DB_NAME` | Test database for `npm test`; must end in `_test` | `mekong_dq_test` (commented out) | no |
| `E2E_BASE_URL`, `E2E_PASSWORD` | Only for `npm run e2e` | commented out | no |

## 4. Sample data

- **How it is loaded.** At every start, `scripts/docker-start.js` waits for the database, runs `migrations/*.sql` (6 tables) and, unless `SEED_DEMO_DATA=false`, runs `seeds/001_demo.sql`. Both are safe to repeat: the seed uses fixed ids and `ON DUPLICATE KEY UPDATE`, so running it again never duplicates rows (it does reset the demo rows to their original values).
- **Record counts to cross-check** (`docker compose exec app npm run db:count`): `app_user` 3, `customer` 12, `import_batch` 2, `stg_customer` 2, `dq_result` 1, `duplicate_pair` 2.
- **Demo accounts** (sample password `Demo@123`, for demonstration only): `nv.lan` (data staff, store CH01), `nv.minh` (data staff, store CH02), `ql.hung` (data manager).
- **Load again by hand:** `docker compose exec app npm run seed` (the counts above stay the same).
- **Bigger test file (optional).** Generate 3,000 fake rows inside the container and copy them out: `docker compose exec app node scripts/gen-sample-csv.js 3000 /tmp/customers_raw.csv`, then `mkdir -p data`, then `docker compose cp app:/tmp/customers_raw.csv ./data/customers_raw.csv`. Import it as `nv.lan` (screen **Nhập file**, source Retail). On an empty database the result is: 3,000 rows, 2,610 valid, 390 error records, 2,481 new customers, 129 rows attached to existing customers, 149 new duplicate pairs, in about half a second.

## 5. Verify it works

Run these in the repository folder after `docker compose up -d --build` has finished.

| # | Command | Expected result |
| :---: | :--- | :--- |
| 1 | `docker compose ps` | Two services, `db` and `app`, both with status `Up ... (healthy)`; `db` shows `3306/tcp` only (not published), `app` shows `0.0.0.0:3000->3000/tcp` |
| 2 | `curl -s http://localhost:3000/health` | `{"status":"ok","db":"ok"}` |
| 3 | `curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"nv.lan","password":"Demo@123"}'` | JSON with `accessToken`, `"expiresIn":3600` and `"role":"DATA_STAFF"` |
| 4 | Open `http://localhost:3000` | Login page titled "Chất lượng dữ liệu khách hàng"; log in as `nv.lan` / `Demo@123` |
| 5 | `docker compose exec app npm test` | Ends with `tests 125`, `pass 125`, `fail 0` (about 10 seconds) |
| 6 | `docker compose exec app npm run db:count` | The counts in section 4 |
| 7 | `docker compose exec app npm run seed`, then command 6 again | `OK  seeds/001_demo.sql`, and the counts are unchanged |

Troubleshooting:

| Symptom | Cause and fix |
| :--- | :--- |
| `port is already allocated` or the app does not open | Port 3000 is in use. Set `APP_PORT=3001` (any free port) in `.env`, run `docker compose up -d` again, and open `http://localhost:3001`. |
| `Thiếu DB_PASSWORD trong .env` when starting | The `.env` file is missing. Run step 3. |
| `app` stays `unhealthy` or restarts | Read `docker compose logs app`. `Access denied` means `DB_PASSWORD` was changed after the first start: MariaDB creates its user only on an empty volume, so run `docker compose down -v` and start again. |
| Start from scratch | `docker compose down -v`, then step 4. |
| Windows: script or `.env` errors about `\r` | Files were converted to CRLF. The repository's `.gitattributes` keeps LF; clone again after installing Git with default settings. |
