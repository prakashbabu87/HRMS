/**
 * SUPPORT ROUTES
 * Handles support tickets and helpdesk
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, hr } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");

/* ============ SUPPORT TICKET MANAGEMENT ============ */

// Create support ticket
router.post("/", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const { subject, description, priority, category } = req.body;
    const c = await db();
    const [result] = await c.query(
        "INSERT INTO support_tickets (employee_id, subject, description, priority, category, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', NOW())",
        [emp.id, subject, description, priority || 'medium', category || 'general']
    );
    c.end();
    res.json({ id: result.insertId, success: true });
});

// Get all support tickets
router.get("/", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT st.*, e.FirstName, e.LastName FROM support_tickets st LEFT JOIN employees e ON st.employee_id = e.id ORDER BY st.created_at DESC"
    );
    c.end();
    res.json(r);
});

// Get my tickets
router.get("/my", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    const [r] = await c.query("SELECT * FROM support_tickets WHERE employee_id = ? ORDER BY created_at DESC", [emp.id]);
    c.end();
    res.json(r);
});

// Update ticket status
router.put("/:id", auth, hr, async (req, res) => {
    const { status, response } = req.body;
    const c = await db();
    await c.query(
        "UPDATE support_tickets SET status = ?, response = ?, resolved_by = ?, resolved_at = NOW() WHERE id = ?",
        [status, response, req.user.id, req.params.id]
    );
    c.end();
    res.json({ success: true });
});

// Close ticket
router.put("/:id/close", auth, hr, async (req, res) => {
    const c = await db();
    await c.query(
        "UPDATE support_tickets SET status = 'closed', resolved_by = ?, resolved_at = NOW() WHERE id = ?",
        [req.user.id, req.params.id]
    );
    c.end();
    res.json({ success: true });
});

module.exports = router;
