/**
 * ANNOUNCEMENT ROUTES
 * Handles company announcements and notifications
 */

const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { auth, admin } = require("../middleware/auth");

/* ============ ANNOUNCEMENT MANAGEMENT ============ */

// Get all announcements
router.get("/", auth, async (req, res) => {
    const c = await db();
    const [r] = await c.query("SELECT * FROM announcements ORDER BY created_at DESC");
    c.end();
    res.json(r);
});

// Create announcement
router.post("/", auth, admin, async (req, res) => {
    const { title, message, priority } = req.body;
    const c = await db();
    const [result] = await c.query(
        "INSERT INTO announcements (title, message, priority, created_by, created_at) VALUES (?, ?, ?, ?, NOW())",
        [title, message, priority || 'normal', req.user.id]
    );
    c.end();
    res.json({ id: result.insertId, success: true });
});

// Update announcement
router.put("/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("UPDATE announcements SET ? WHERE id = ?", [req.body, req.params.id]);
    c.end();
    res.json({ success: true });
});

// Delete announcement
router.delete("/:id", auth, admin, async (req, res) => {
    const c = await db();
    await c.query("DELETE FROM announcements WHERE id = ?", [req.params.id]);
    c.end();
    res.json({ success: true });
});

module.exports = router;
