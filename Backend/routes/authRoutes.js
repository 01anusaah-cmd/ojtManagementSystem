const express = require("express");

const {
    register,
    login
} = require("../controllers/authControllers");

const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected route: get current user
router.get("/me", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json(user);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get user."
        });
    }
});

// Teacher-only test route
router.get(
    "/teacher-test",
    protect,
    authorizeRoles("teacher"),
    (req, res) => {
        res.json({
            message: "Teacher access granted!",
            user: req.user
        });
    }
);

// Student-only test route
router.get(
    "/student-test",
    protect,
    authorizeRoles("student"),
    (req, res) => {
        res.json({
            message: "Student access granted!",
            user: req.user
        });
    }
);

module.exports = router;