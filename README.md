# AgriSmartSL

This repository contains the interim AgriSmartSL Intelligent Agriculture Advisory System project. The application is in the `AgriSmartSL New` folder.

## Download and run

### Requirements

- Node.js 18 or newer and npm
- Docker Desktop or Docker Engine, running
- Internet access for the first dependency install and weather services
- An OpenWeatherMap API key for live weather (optional; the application can start without it)

### Option A: Download ZIP from GitHub

1. Open [the project repository](https://github.com/asjathbackup1/test).
2. Select **Code → Download ZIP**, then extract the ZIP.
3. Open a terminal in the extracted `test` folder.
4. Run:

   ```bash
   cd "AgriSmartSL New"
   npm install
   npm run start:local
   ```

### Option B: Clone with Git

```bash
git clone https://github.com/asjathbackup1/test.git
cd test/"AgriSmartSL New"
npm install
npm run start:local
```

`npm run start:local` starts or reuses a local MySQL 8 Docker container, creates the local database password in the ignored `.env` file when needed, applies the schema and seed data, and starts the web app. The database is stored in a Docker volume and is preserved when the web app stops.

When the server is running:

- On a local computer, open <http://localhost:3000>.
- In GitHub Codespaces, open port **3000** in the **Ports** tab and use its forwarded URL.

Create a farmer account from the registration page to try the farmer features. Use a new email, select a listed Sri Lankan district, and set a password of at least eight characters.

Stop the web app with **Ctrl+C**. To stop the database container separately, run `docker stop agrismart-mysql`. The next `npm run start:local` starts the existing container again.

## Weather API setup

To enable live weather, copy `AgriSmartSL New/.env.example` to `AgriSmartSL New/.env` if `.env` does not already exist. Set `OPENWEATHER_API_KEY` in `.env`, then restart the app. Do not share or commit `.env`. The app can start without a weather key, but live weather requests will not work.

## Database and commands

The one-command startup runs these automatically:

```bash
npm run db:setup
npm run db:seed
```

Useful commands, run from `AgriSmartSL New`:

```bash
npm test          # Recommendation-engine unit tests
npm run evaluate   # Illustrative scenarios; not expert-validated accuracy
npm run db:setup   # Apply database schema/migration manually
npm run db:seed    # Insert district and crop seed records
```

## Project documents

The `AgriSmartSL New/Project_Documents` folder contains the original report, updated report, and detailed project tutorial, each in PDF and Word formats. The tutorial describes the technology stack, file purposes, routes, database, startup steps, tests, and known limitations.

## Important limitations

- Seeded crop requirements are provisional and have not been verified by an agricultural officer. This is decision-support software, not authoritative farming advice.
- The rainfall scoring currently compares short-term forecast rainfall with seasonal requirement ranges; the periods do not align and the score needs correction and expert validation before practical use.
- A production-ready admin account bootstrap has not been provided. Do not run any legacy admin setup scripts if present; they may contain hardcoded credentials.
- Keep all API keys and database credentials private. Rotate any credentials that have been exposed.
