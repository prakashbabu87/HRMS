/**
 * TIMESHEET ROUTES
 * Handles timesheet submission, approval, and management
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, hr, manager } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");

/* ============ TIMESHEET MANAGEMENT ============ */

// Submit timesheet
router.post("/", auth, async (req, res) => {
    const c = await db();
    await c.query("INSERT INTO timesheets SET ?", req.body);
    c.end();
    res.json({ success: true });
});

// Get all timesheets
router.get("/", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM timesheets ORDER BY date DESC");
    c.end();
    res.json(r);
});

// Approve timesheet
router.put("/:id/approve", auth, manager, async (req, res) => {
    const c = await db();
    await c.query("UPDATE timesheets SET status = 'approved', approved_by = ? WHERE id = ?", [req.user.id, req.params.id]);
    c.end();
    res.json({ success: true });
});

// Reject timesheet
router.put("/:id/reject", auth, manager, async (req, res) => {
    const c = await db();
    await c.query("UPDATE timesheets SET status = 'rejected', rejected_reason = ? WHERE id = ?", [req.body.reason, req.params.id]);
    c.end();
    res.json({ success: true });
});

// My timesheets
router.get("/me", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const { startDate, endDate } = req.query;
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM timesheets WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC",
        [emp.id, startDate || '2020-01-01', endDate || '2099-12-31']
    );
    c.end();
    res.json(r);
});

// Employee timesheets (manager)
router.get("/employee/:empId", auth, manager, async (req, res) => {
    const { startDate, endDate } = req.query;
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM timesheets WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC",
        [req.params.empId, startDate || '2020-01-01', endDate || '2099-12-31']
    );
    c.end();
    res.json(r);
});

// All timesheets (HR)
router.get("/all", auth, hr, async (req, res) => {
    const { status, startDate, endDate } = req.query;
    const c = await db();
    let query = "SELECT t.*, e.FirstName, e.LastName FROM timesheets t LEFT JOIN employees e ON t.employee_id = e.id WHERE 1=1";
    const params = [];
    
    if (status) {
        query += " AND t.status = ?";
        params.push(status);
    }
    if (startDate) {
        query += " AND t.date >= ?";
        params.push(startDate);
    }
    if (endDate) {
        query += " AND t.date <= ?";
        params.push(endDate);
    }
    
    query += " ORDER BY t.date DESC";
    
    const [r] = await c.query(query, params);
    c.end();
    res.json(r);
});

module.exports = router;
