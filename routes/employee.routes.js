/**
 * EMPLOYEE ROUTES
 * Handles all employee CRUD operations, search, and management
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin, hr, manager } = require("../middleware/auth");
const { findEmployeeByUserId } = require("../utils/helpers");

/* ============ EMPLOYEE MASTER ============ */

// Get all employees with pagination & filters
router.get("/", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM employees ORDER BY id DESC");
    c.end();
    res.json(r);
});

// Create new employee
router.post("/", auth, admin, async (req, res) => {
    const c = await db();
    const data = { ...req.body, created_at: new Date() };
    const [result] = await c.query("INSERT INTO employees SET ?", data);
    c.end();
    res.json({ id: result.insertId, ...data });
});

// Get single employee
router.get("/:id", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM employees WHERE id = ?", [req.params.id]);
    c.end();
    res.json(r[0] || null);
});

// Update employee
router.put("/:id", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE employees SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ success: true });
});

// Delete employee
router.delete("/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM employees WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ success: true });
});

// Deactivate employee
router.put("/:id/deactivate", auth, hr, async (req, res) => {
    const c = await db();
    await c.query("UPDATE employees SET status = 'inactive' WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ success: true });
});

// Get reporting manager's team
router.get("/reporting/:managerId", auth, manager, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM employees WHERE reporting_manager_id = ?", [req.params.managerId]);
    c.end();
    res.json(r);
});

// Employee search
router.get("/search/query", auth, async (req, res) => {
    const q = req.query.q || "";
    const c = await db();
    const [r] = await c.query(
        "SELECT * FROM employees WHERE FirstName LIKE ? OR LastName LIKE ? OR WorkEmail LIKE ? LIMIT 20",
        [`%${q}%`, `%${q}%`, `%${q}%`]
    );
    c.end();
    res.json(r);
});

/* ============ EMPLOYEE PROFILE ============ */

// Get my profile
router.get("/profile/me", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    const [rows] = await c.query("SELECT * FROM employees WHERE id = ?", [emp.id]);
    c.end();
    
    if (rows.length === 0) return res.status(404).json({ error: "Profile not found" });
    res.json(rows[0]);
});

// Update my profile
router.put("/profile/me", auth, async (req, res) => {
    const emp = await findEmployeeByUserId(req.user.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    
    const c = await db();
    await c.query("UPDATE employees SET ? WHERE id = ?", [req.body, emp.id]);
    c.end();
    res.json({ success: true });
});

module.exports = router;
