const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../config/database");
const { JWT_SECRET } = require("../config/constants");
const { auth } = require("../middleware/auth");

// LOGIN
router.post("/login", async (req, res) => {
    const c = await db();
    const [u] = await c.query("SELECT * FROM users WHERE username=?", [req.body.username]);
    c.end();
    if (!u.length) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(req.body.password, u[0].password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
        { id: u[0].id, role: u[0].role },
        JWT_SECRET,
        { expiresIn: "8h" }
    );

    res.json({
        token,
        user: { id: u[0].id, username: u[0].username, role: u[0].role }
    });
});

// Logout
router.post("/logout", auth, (req, res) => {
    res.json({ message: "Logged out successfully. Please discard token client-side." });
});

// Refresh token
router.post("/refresh-token", auth, (req, res) => {
    const newToken = jwt.sign(
        { id: req.user.id, role: req.user.role },
        JWT_SECRET,
        { expiresIn: "8h" }
    );
    res.json({ token: newToken });
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
    res.json({
        message: "Password reset link sent (email mock)",
        token: "RESET-TOKEN-MOCK"
    });
});

// Request password reset
router.post("/password/reset/request", async (req, res) => {
    const { username } = req.body;
    const c = await db();
    const [u] = await c.query("SELECT id FROM users WHERE username = ?", [username]);
    c.end();
    if (!u.length) return res.status(404).json({ error: "User not found" });
    const token = jwt.sign({ userId: u[0].id, type: "reset" }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ message: "Reset link sent (mock email)", token });
});

// Confirm password reset
router.post("/password/reset/confirm", async (req, res) => {
    const { token, password } = req.body;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const hash = await bcrypt.hash(password, 10);
        const c = await db();
        await c.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, decoded.userId]);
        c.end();
        res.json({ message: "Password reset successfully" });
    } catch {
        res.status(400).json({ error: "Invalid or expired token" });
    }
});

// Send password setup link
router.post("/password/setup/send/:empId", auth, async (req, res) => {
    const c = await db();
    const [emp] = await c.query("SELECT id, WorkEmail FROM employees WHERE id = ?", [req.params.empId]);
    c.end();
    if (!emp.length) return res.status(404).json({ error: "Employee not found" });
    const token = jwt.sign({ empId: req.params.empId, type: "setup" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ message: "Setup link sent to email (mock)", token });
});

// Validate password setup token
router.get("/password/setup/validate", async (req, res) => {
    try {
        const decoded = jwt.verify(req.query.token, JWT_SECRET);
        res.json({ valid: true, empId: decoded.empId });
    } catch {
        res.status(400).json({ error: "Invalid or expired token" });
    }
});

// Create password for new employee
router.post("/password/create", async (req, res) => {
    const { employee_id, password } = req.body;
    if (!employee_id || !password) return res.status(400).json({ error: "Employee ID and password required" });

    const c = await db();
    try {
        let emp;
        if (/^\d+$/.test(String(employee_id))) {
            const [rows] = await c.query("SELECT WorkEmail, FullName FROM employees WHERE id = ?", [employee_id]);
            emp = rows;
        } else {
            const [rows] = await c.query("SELECT WorkEmail, FullName FROM employees WHERE WorkEmail = ?", [employee_id]);
            emp = rows;
        }
        if (!emp || !emp.length) { c.end(); return res.status(404).json({ error: "Employee not found" }); }

        const hash = await bcrypt.hash(password, 10);
        const username = emp[0].WorkEmail;
        const fullName = emp[0].FullName || 'Employee';
        const role = 'employee';

        await c.query(
            "INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), full_name = VALUES(full_name)",
            [username, hash, role, fullName]
        );

        c.end();
        res.json({ message: "Password set successfully" });
    } catch (err) {
        c.end();
        console.error('password create error', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
