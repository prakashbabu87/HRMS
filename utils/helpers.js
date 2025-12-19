const { db } = require("../config/database");

// Helper: find employee record for a given user id by matching username to WorkEmail or EmployeeNumber
async function findEmployeeByUserId(userId) {
    const c = await db();
    try {
        const [u] = await c.query("SELECT username FROM users WHERE id = ?", [userId]);
        if (!u || !u.length) return null;
        const username = u[0].username;
        const [emp] = await c.query("SELECT * FROM employees WHERE WorkEmail = ? OR EmployeeNumber = ? LIMIT 1", [username, username]);
        if (!emp || !emp.length) return null;
        return emp[0];
    } finally {
        c.end();
    }
}

function toMySQLDateTime(val) {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

// Helper: get or create master record and return id
async function getOrCreateMaster(conn, table, column, value) {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const val = String(value).trim();
    const [rows] = await conn.query(`SELECT id FROM \`${table}\` WHERE \`${column}\` = ? LIMIT 1`, [val]);
    if (rows.length) return rows[0].id;
    const [res] = await conn.query(`INSERT INTO \`${table}\` (\`${column}\`) VALUES (?)`, [val]);
    return res.insertId;
}

module.exports = { findEmployeeByUserId, toMySQLDateTime, getOrCreateMaster };
