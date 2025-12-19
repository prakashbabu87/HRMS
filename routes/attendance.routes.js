/**
 * ATTENDANCE ROUTES
 * Handles check-in/out, attendance marking, reports, and summaries
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin, hr, manager } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");

/* ============ ATTENDANCE MANAGEMENT ============ */

// Check-in
router.post("/checkin", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    const today = new Date().toISOString().split('T')[0];
    const [existing] = await c.query(
        "SELECT id FROM attendance WHERE employee_id = ? AND attendance_date = ?",
        [emp.id, today]
    );
    
    if (existing.length > 0) {
        c.end();
        return res.status(400).json({ error: "Already checked in today" });
    }
    
    await c.query("INSERT INTO attendance SET ?", {
        employee_id: emp.id,
        attendance_date: today,
        check_in: new Date(),
        status: 'present'
    });
    c.end();
    res.json({ success: true, message: "Checked in successfully" });
});

// Check-out
router.post("/checkout", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    const today = new Date().toISOString().split('T')[0];
    await c.query(
        "UPDATE attendance SET check_out = ?, total_hours = TIMESTAMPDIFF(HOUR, check_in, ?) WHERE employee_id = ? AND attendance_date = ?",
        [new Date(), new Date(), emp.id, today]
    );
    c.end();
    res.json({ success: true, message: "Checked out successfully" });
});

// My attendance
router.get("/me", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const { startDate, endDate } = req.query;
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM attendance WHERE employee_id = ? AND attendance_date BETWEEN ? AND ? ORDER BY attendance_date DESC",
        [emp.id, startDate || '2020-01-01', endDate || '2099-12-31']
    );
    c.end();
    res.json(r);
});

// Mark attendance (HR/Admin)
router.post("/mark", auth, hr, async (req, res) => {
    const { employee_id, attendance_date, status, check_in, check_out } = req.body;
    const c = await db();
    await c.query("INSERT INTO attendance SET ?", {
        employee_id, attendance_date, status, check_in, check_out
    });
    c.end();
    res.json({ success: true });
});

// Update attendance
router.put("/:id", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE attendance SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ success: true });
});

// Delete attendance
router.delete("/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM attendance WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ success: true });
});

// View daily attendance by date
router.get("/date/:date", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query(
        "SELECT a.*, e.FirstName, e.LastName FROM attendance a LEFT JOIN employees e ON a.employee_id = e.id WHERE a.attendance_date = ?",
        [req.params.date]
    );
    c.end();
    res.json(r);
});

// Employee attendance report
router.get("/employee/:empId", auth, hr, async (req, res) => {
    const { startDate, endDate } = req.query;
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM attendance WHERE employee_id = ? AND attendance_date BETWEEN ? AND ?",
        [req.params.empId, startDate || '2020-01-01', endDate || '2099-12-31']
    );
    c.end();
    res.json(r);
});

// Monthly attendance summary
router.get("/monthly", auth, hr, async (req, res) => {
    const { month, year } = req.query;
    const c = await db();
    const [r] = await c.query(
        `SELECT employee_id, 
                COUNT(*) as total_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days
         FROM attendance 
         WHERE MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
         GROUP BY employee_id`,
        [month, year]
    );
    c.end();
    res.json(r);
});

// Attendance summary per employee
router.get("/summary/:empId", auth, async (req, res) => {
    const { month, year } = req.query;
    const c = await db();
    const [r] = await c.query(
        `SELECT COUNT(*) as total_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days
         FROM attendance 
         WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?`,
        [req.params.empId, month, year]
    );
    c.end();
    res.json(r[0] || {});
});

// Attendance report (legacy endpoint)
router.get("/report", auth, admin, async (req, res) => {
    const { start, end } = req.query;
    const c = await db();
    const [r] = await c.query(
        `SELECT e.FirstName, e.LastName, a.* 
         FROM attendance a 
         JOIN employees e ON a.employee_id = e.id 
         WHERE a.attendance_date BETWEEN ? AND ?`,
        [start || '2020-01-01', end || '2099-12-31']
    );
    c.end();
    res.json(r);
});

// Basic attendance endpoint (legacy)
router.post("/", auth, async (req, res) => {
    const c = await db();
    await c.query("INSERT INTO attendance SET ?", req.body);
    c.end();
    res.json({ success: true });
});

module.exports = router;
