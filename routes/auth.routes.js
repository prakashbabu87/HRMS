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

// Check employee by email
router.get("/employee/check", async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email parameter required" });

    const c = await db();
    try {
        const [emp] = await c.query(
            "SELECT e.id, e.EmployeeNumber, e.FullName, e.WorkEmail, d.name as Designation, dept.name as Department, l.name as Location, e.EmploymentStatus FROM employees e LEFT JOIN designations d ON e.DesignationId = d.id LEFT JOIN departments dept ON e.DepartmentId = dept.id LEFT JOIN locations l ON e.LocationId = l.id WHERE e.WorkEmail = ?",
            [email]
        );
        c.end();

        if (!emp.length) {
            return res.status(404).json({ 
                found: false,
                message: "Employee not found with this email" 
            });
        }

        // Check if user account exists
        const c2 = await db();
        const [user] = await c2.query("SELECT id, username, role FROM users WHERE username = ?", [email]);
        c2.end();

        res.json({
            found: true,
            employee: emp[0],
            hasUserAccount: user.length > 0,
            userInfo: user.length > 0 ? user[0] : null
        });
    } catch (err) {
        c.end();
        console.error('employee check error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Set password and create user account
router.post("/user/create", async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const c = await db();
    try {
        // Check if employee exists
        const [emp] = await c.query(
            "SELECT id, EmployeeNumber, FullName, WorkEmail FROM employees WHERE WorkEmail = ?",
            [email]
        );

        if (!emp.length) {
            c.end();
            return res.status(404).json({ error: "Employee not found with this email" });
        }

        // Check if user already exists
        const [existingUser] = await c.query("SELECT id FROM users WHERE username = ?", [email]);
        if (existingUser.length > 0) {
            c.end();
            return res.status(409).json({ error: "User account already exists for this email" });
        }

        // Create user account
        const hash = await bcrypt.hash(password, 10);
        const userRole = role || 'employee';
        const fullName = emp[0].FullName || 'Employee';

        await c.query(
            "INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
            [email, hash, userRole, fullName]
        );

        c.end();
        res.json({ 
            message: "User account created successfully",
            employee: {
                id: emp[0].id,
                employeeNumber: emp[0].EmployeeNumber,
                fullName: emp[0].FullName,
                email: emp[0].WorkEmail
            },
            user: {
                username: email,
                role: userRole
            }
        });
    } catch (err) {
        c.end();
        console.error('user create error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get all users (for admin)
router.get("/users", auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
        return res.status(403).json({ error: "Access denied. Admin or HR role required." });
    }

    const c = await db();
    try {
        const [users] = await c.query(
            "SELECT u.id, u.username, u.role, u.full_name, u.created_at, e.id as employee_id, e.EmployeeNumber, e.EmploymentStatus FROM users u LEFT JOIN employees e ON u.username = e.WorkEmail ORDER BY u.created_at DESC"
        );
        c.end();
        res.json({ users });
    } catch (err) {
        c.end();
        console.error('get users error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get user by ID
router.get("/users/:id", auth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && req.user.id !== parseInt(req.params.id)) {
        return res.status(403).json({ error: "Access denied" });
    }

    const c = await db();
    try {
        const [users] = await c.query(
            "SELECT u.id, u.username, u.role, u.full_name, u.created_at, u.updated_at, e.id as employee_id, e.EmployeeNumber, e.FullName as emp_full_name, e.EmploymentStatus FROM users u LEFT JOIN employees e ON u.username = e.WorkEmail WHERE u.id = ?",
            [req.params.id]
        );
        c.end();

        if (!users.length) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ user: users[0] });
    } catch (err) {
        c.end();
        console.error('get user error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update user role
router.put("/users/:id/role", auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const { role } = req.body;
    if (!role || !['admin', 'employee', 'hr', 'manager'].includes(role)) {
        return res.status(400).json({ error: "Valid role required (admin, employee, hr, manager)" });
    }

    const c = await db();
    try {
        await c.query("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);
        c.end();
        res.json({ message: "User role updated successfully" });
    } catch (err) {
        c.end();
        console.error('update user role error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Delete user
router.delete("/users/:id", auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const c = await db();
    try {
        await c.query("DELETE FROM users WHERE id = ?", [req.params.id]);
        c.end();
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        c.end();
        console.error('delete user error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Make user HR
router.post("/users/:id/make-hr", auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const c = await db();
    try {
        const [user] = await c.query("SELECT id, username, role FROM users WHERE id = ?", [req.params.id]);
        if (!user.length) {
            c.end();
            return res.status(404).json({ error: "User not found" });
        }

        await c.query("UPDATE users SET role = 'hr' WHERE id = ?", [req.params.id]);
        c.end();
        res.json({ 
            message: "User promoted to HR successfully",
            user: {
                id: user[0].id,
                username: user[0].username,
                previousRole: user[0].role,
                newRole: 'hr'
            }
        });
    } catch (err) {
        c.end();
        console.error('make hr error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Make user Manager
router.post("/users/:id/make-manager", auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const c = await db();
    try {
        const [user] = await c.query("SELECT id, username, role FROM users WHERE id = ?", [req.params.id]);
        if (!user.length) {
            c.end();
            return res.status(404).json({ error: "User not found" });
        }

        await c.query("UPDATE users SET role = 'manager' WHERE id = ?", [req.params.id]);
        c.end();
        res.json({ 
            message: "User promoted to Manager successfully",
            user: {
                id: user[0].id,
                username: user[0].username,
                previousRole: user[0].role,
                newRole: 'manager'
            }
        });
    } catch (err) {
        c.end();
        console.error('make manager error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Make user Admin
router.post("/users/:id/make-admin", auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const c = await db();
    try {
        const [user] = await c.query("SELECT id, username, role FROM users WHERE id = ?", [req.params.id]);
        if (!user.length) {
            c.end();
            return res.status(404).json({ error: "User not found" });
        }

        await c.query("UPDATE users SET role = 'admin' WHERE id = ?", [req.params.id]);
        c.end();
        res.json({ 
            message: "User promoted to Admin successfully",
            user: {
                id: user[0].id,
                username: user[0].username,
                previousRole: user[0].role,
                newRole: 'admin'
            }
        });
    } catch (err) {
        c.end();
        console.error('make admin error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Demote user to Employee
router.post("/users/:id/make-employee", auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const c = await db();
    try {
        const [user] = await c.query("SELECT id, username, role FROM users WHERE id = ?", [req.params.id]);
        if (!user.length) {
            c.end();
            return res.status(404).json({ error: "User not found" });
        }

        await c.query("UPDATE users SET role = 'employee' WHERE id = ?", [req.params.id]);
        c.end();
        res.json({ 
            message: "User role changed to Employee",
            user: {
                id: user[0].id,
                username: user[0].username,
                previousRole: user[0].role,
                newRole: 'employee'
            }
        });
    } catch (err) {
        c.end();
        console.error('make employee error', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Bulk role update
router.post("/users/bulk-role-update", auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const { updates } = req.body;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: "Updates array required with format: [{userId: 1, role: 'hr'}, ...]" });
    }

    const c = await db();
    try {
        const results = [];
        for (const update of updates) {
            const { userId, role } = update;
            if (!userId || !role || !['admin', 'hr', 'manager', 'employee'].includes(role)) {
                results.push({ userId, success: false, error: "Invalid userId or role" });
                continue;
            }

            try {
                await c.query("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
                results.push({ userId, success: true, role });
            } catch (err) {
                results.push({ userId, success: false, error: err.message });
            }
        }

        c.end();
        const successCount = results.filter(r => r.success).length;
        res.json({ 
            message: `${successCount} of ${updates.length} users updated successfully`,
            results 
        });
    } catch (err) {
        c.end();
        console.error('bulk role update error', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
