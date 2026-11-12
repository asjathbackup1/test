const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

let stage = 'connecting to MySQL';

async function main() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'agrismartsl_new';

  const adminConnection = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    multipleStatements: true,
  });

  stage = 'creating the database';
  await adminConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await adminConnection.end();

  const connection = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    multipleStatements: true,
  });

  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const migrationSql = fs.readFileSync(path.join(__dirname, 'migration_v2.sql'), 'utf8');

  stage = 'creating the schema';
  await connection.query(schemaSql);
  stage = 'applying the migration';
  await connection.query(migrationSql);

  console.log(`Database setup completed for ${dbName}.`);
  await connection.end();
}

main().catch((error) => {
  console.error(
    `Database setup failed while ${stage}:`,
    error.sqlMessage || error.code || error.name || 'Unknown error'
  );
  process.exit(1);
});
