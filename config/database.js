const mysql = require("mysql2/promise");

const DB = {
    host: "localhost",
    user: "root",
    password: "root",
    database: "hrms_db_new",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let __pool = null;

async function db() {
    if (!__pool) __pool = mysql.createPool(DB);
    const conn = await __pool.getConnection();
    // If this is a pooled connection, make c.end() behave like release()
    try {
        if (conn && typeof conn.release === 'function') {
            conn.end = async () => {
                try { conn.release(); } catch (e) { /* ignore */ }
            };
        }
    } catch (e) { }
    return conn;
}

module.exports = { DB, db };
