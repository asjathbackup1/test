const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
pool.getConnection((error, connection) => {
    if (error) {
        console.error('Database connection failed:', error.code || error.name || 'Unknown error');
        return;
    }

    console.log('MySQL database connected successfully.');

    // Return connection to the pool
    connection.release();
});

module.exports = pool;