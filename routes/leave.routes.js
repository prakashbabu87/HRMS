/**
 * LEAVE ROUTES
 * Handles leave applications, approvals, types, and balance
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin, hr } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");

/* ============ LEAVE MANAGEMENT ============ */

// Get all leaves
router.get("/", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM leaves ORDER BY id DESC");
    c.end();
    res.json(r);
});

// Apply leave
router.post("/", auth, async (req, res) => {
    const c = await db();
    const data = { ...req.body, applied_at: new Date() };
    const [result] = await c.query("INSERT INTO leaves SET ?", data);
    c.end();
    res.json({ id: result.insertId });
});

// Apply leave (alternate endpoint)
router.post("/apply", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const { leave_type, start_date, end_date, reason } = req.body;
    const c = await db();
    const [result] = await c.query("INSERT INTO leaves SET ?", {
        employee_id: emp.id,
        leave_type,
        start_date,
        end_date,
        reason,
        status: 'pending',
        applied_at: new Date()
    });
    c.end();
    res.json({ id: result.insertId, success: true });
});

// Update leave status
router.put("/:id", auth, admin, async (req, res) => {
    const { status } = req.body;
    const c = await db();
    await c.query("UPDATE leaves SET status = ? WHERE id = ?", [status, req.params.id]);
    c.end();
    res.json({ success: true });
});

// My leaves
router.get("/my", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    const [r] = await c.query("SELECT * FROM leaves WHERE employee_id = ? ORDER BY applied_at DESC", [emp.id]);
    c.end();
    res.json(r);
});

// Cancel leave
router.put("/cancel/:leaveId", auth, async (req, res) => {
    const c = await db();
    await c.query("UPDATE leaves SET status = 'cancelled' WHERE id = ?", [req.params.leaveId]);
    c.end();
    res.json({ success: true });
});

// Pending leaves (HR)
router.get("/pending", auth, hr, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM leaves WHERE status = 'pending' ORDER BY applied_at ASC");
    c.end();
    res.json(r);
});

// Approve leave
router.put("/approve/:leaveId", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE leaves SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?", 
        [req.user.id, req.params.leaveId]);
    c.end();
    res.json({ success: true });
});

// Reject leave
router.put("/reject/:leaveId", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE leaves SET status = 'rejected', approved_by = ?, approved_at = NOW() WHERE id = ?",
        [req.user.id, req.params.leaveId]);
    c.end();
    res.json({ success: true });
});

/* ============ LEAVE TYPES ============ */

// Create leave type
router.post("/types", auth, admin, async (req, res) => {
    const { name, days_allowed, description } = req.body;
    const c = await db();
    const [result] = await c.query("INSERT INTO leave_types SET ?", { name, days_allowed, description });
    c.end();
    res.json({ id: result.insertId, success: true });
});

// Get all leave types
router.get("/types", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM leave_types");
    c.end();
    res.json(r);
});

// Update leave type
router.put("/types/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE leave_types SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ success: true });
});

// Delete leave type
router.delete("/types/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM leave_types WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ success: true });
});

/* ============ LEAVE BALANCE ============ */

// Get leave balance
router.get("/balance/:employee_id", auth, async (req, res) => {
    const c = await db();
    const [leaves] = await c.query(
        "SELECT leave_type, COUNT(*) as used FROM leaves WHERE employee_id = ? AND status = 'approved' GROUP BY leave_type",
        [req.params.employee_id]
    );
    
    const [types] = await c.query("SELECT name, days_allowed FROM leave_types");
    c.end();
    
    const balance = types.map(t => {
        const used = leaves.find(l => l.leave_type === t.name);
        return {
            leave_type: t.name,
            total: t.days_allowed,
            used: used ? used.used : 0,
            remaining: t.days_allowed - (used ? used.used : 0)
        };
    });
    
    res.json(balance);
});

module.exports = router;
