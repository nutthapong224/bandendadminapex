const mysql = require('mysql2');
const dotenv = require('dotenv');
const winston = require('winston');

dotenv.config();

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/db-connection.log' }) // Ensure logs folder exists
  ],
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Function to test database connection
const testConnection = (retries = 5) => {
  pool.getConnection((err, connection) => {
    if (err) {
      logger.error(`Database connection failed: ${err.message}`);
      if (retries === 0) {
        return;
      }
      logger.info(`Retrying connection... (${retries} retries left)`);
      setTimeout(() => testConnection(retries - 1), 5000); // Retry after 5 seconds
    } else {
      logger.info('Database connected successfully');
      connection.release(); // Release connection back to the pool
    }
  });
};

// Start testing the connection
testConnection();

module.exports = pool.promise(); // Export pool with promise support
