/**
 * NOTIFICATION ROUTES
 * Handles user notifications and alerts
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");

/* ============ NOTIFICATION MANAGEMENT ============ */

// Get my notifications
router.get("/", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM notifications WHERE employee_id = ? ORDER BY created_at DESC LIMIT 50",
        [emp.id]
    );
    c.end();
    res.json(r);
});

// Mark notification as read
router.post("/mark-read/:id", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    await c.query(
        "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND employee_id = ?",
        [req.params.id, emp.id]
    );
    c.end();
    res.json({ success: true });
});

// Mark all as read
router.post("/mark-all-read", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    await c.query(
        "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE employee_id = ? AND is_read = 0",
        [emp.id]
    );
    c.end();
    res.json({ success: true });
});

// Delete notification
router.delete("/:id", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    await c.query("DELETE FROM notifications WHERE id = ? AND employee_id = ?", [req.params.id, emp.id]);
    c.end();
    res.json({ success: true });
});

// Get unread count
router.get("/unread/count", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    const [r] = await c.query(
        "SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND is_read = 0",
        [emp.id]
    );
    c.end();
    res.json({ count: r[0]?.count || 0 });
});

module.exports = router;
