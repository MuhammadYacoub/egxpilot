// /data/db.js
require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('✔️ DB Connected from db.js');
    return pool;
  })
  .catch(err => {
    console.error('❌ DB Connection Failed:', err);
    throw err;
  });

module.exports = {
  sql,
  poolPromise
};
