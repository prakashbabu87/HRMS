const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/constants");

const auth = (req, res, next) => {
    try {
        const t = req.headers.authorization?.split(" ")[1];
        if (!t) return res.status(401).json({ error: "Missing token" });
        req.user = jwt.verify(t, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
};

const admin = (req, res, next) => {
    if (req.user.role !== "admin")
        return res.status(403).json({ error: "Admin only" });
    next();
};

const roleAuth = (allowedRoles) => (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: `Access denied. Required roles: ${allowedRoles.join(', ')}` });
    }
    next();
};

const hr = (req, res, next) => {
    if (!['admin', 'hr'].includes(req.user.role))
        return res.status(403).json({ error: "HR/Admin only" });
    next();
};

const manager = (req, res, next) => {
    if (!['admin', 'hr', 'manager'].includes(req.user.role))
        return res.status(403).json({ error: "Manager/HR/Admin only" });
    next();
};

module.exports = { auth, admin, roleAuth, hr, manager };
