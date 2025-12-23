const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin } = require("../middleware/auth");

// Generic master creation helper
const createMasterRoutes = (route, table, col) => {
    router.get(`/${route}`, auth, async (req, res) => {
        const c = await db();
        const [r] = await c.query(`SELECT * FROM ${table}`);
        c.end();
        res.json(r);
    });
    
    router.post(`/${route}`, auth, admin, async (req, res) => {
        const c = await db();
        await c.query(`INSERT INTO ${table}(${col}) VALUES(?)`, [req.body[col]]);
        c.end();
        res.json({ message: `${route} created` });
    });
};

// Create routes for all master tables
createMasterRoutes("locations", "locations", "name");
createMasterRoutes("departments", "departments", "name");
createMasterRoutes("designations", "designations", "name");
createMasterRoutes("business-units", "business_units", "name");
createMasterRoutes("legal-entities", "legal_entities", "name");
createMasterRoutes("cost-centers", "cost_centers", "code");
createMasterRoutes("sub-departments", "sub_departments", "name");
createMasterRoutes("bands", "bands", "name");
createMasterRoutes("pay-grades", "pay_grades", "name");
createMasterRoutes("leave-plans", "leave_plans", "name");
// Shift policies handled separately due to enhanced fields
createMasterRoutes("weekly-off-policies", "weekly_off_policies", "name");
createMasterRoutes("attendance-policies", "attendance_policies", "name");
createMasterRoutes("attendance-capture-schemes", "attendance_capture_schemes", "name");
createMasterRoutes("holiday-lists", "holiday_lists", "name");
createMasterRoutes("expense-policies", "expense_policies", "name");

// Enhanced Shift Policies Route
router.get("/shift-policies", auth, async (req, res) => {
    try {
        const c = await db();
        const [rows] = await c.query(`
            SELECT id, name, shift_type, start_time, end_time, 
                   break_duration_minutes, timezone, description, is_active,
                   created_at, updated_at
            FROM shift_policies 
            ORDER BY is_active DESC, name ASC
        `);
        c.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/shift-policies", auth, admin, async (req, res) => {
    try {
        const { name, shift_type, start_time, end_time, break_duration_minutes, timezone, description, is_active } = req.body;
        
        if (!name || !start_time || !end_time) {
            return res.status(400).json({ error: "Name, start_time, and end_time are required" });
        }
        
        const c = await db();
        const [result] = await c.query(`
            INSERT INTO shift_policies 
            (name, shift_type, start_time, end_time, break_duration_minutes, timezone, description, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name,
            shift_type || 'general',
            start_time,
            end_time,
            break_duration_minutes || 60,
            timezone || 'UTC',
            description || null,
            is_active !== undefined ? is_active : 1
        ]);
        c.end();
        res.json({ message: "Shift policy created", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put("/shift-policies/:id", auth, admin, async (req, res) => {
    try {
        const { name, shift_type, start_time, end_time, break_duration_minutes, timezone, description, is_active } = req.body;
        const c = await db();
        
        const updates = [];
        const values = [];
        
        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (shift_type !== undefined) { updates.push('shift_type = ?'); values.push(shift_type); }
        if (start_time !== undefined) { updates.push('start_time = ?'); values.push(start_time); }
        if (end_time !== undefined) { updates.push('end_time = ?'); values.push(end_time); }
        if (break_duration_minutes !== undefined) { updates.push('break_duration_minutes = ?'); values.push(break_duration_minutes); }
        if (timezone !== undefined) { updates.push('timezone = ?'); values.push(timezone); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
        
        if (updates.length === 0) {
            c.end();
            return res.status(400).json({ error: "No fields to update" });
        }
        
        values.push(req.params.id);
        await c.query(`UPDATE shift_policies SET ${updates.join(', ')} WHERE id = ?`, values);
        c.end();
        res.json({ message: "Shift policy updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
