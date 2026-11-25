const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const formatUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentProfile: user.studentProfile
        ? {
            studentId: user.studentProfile.studentId,
            program: user.studentProfile.program,
            className: user.studentProfile.className,
            rollNo: user.studentProfile.rollNo,
            phone: user.studentProfile.phone
        }
        : undefined
});

// REGISTER STUDENT
const register = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            studentId,
            program,
            className,
            rollNo,
            phone
        } = req.body || {};

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password ||
            typeof studentId !== "string" ||
            !studentId.trim() ||
            typeof program !== "string" ||
            !program.trim()
        ) {
            return res.status(400).json({
                message: "Name, email, password, student ID, and program are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters."
            });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedStudentId = studentId.trim().toLowerCase();
        const normalizedProgram = program.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                message: "A valid email address is required."
            });
        }

        if (normalizedStudentId.length > 50 || normalizedProgram.length > 100) {
            return res.status(400).json({
                message: "Student ID must be at most 50 characters and program at most 100 characters."
            });
        }

        const normalizedClassName = className === undefined || className === null
            ? ""
            : typeof className === "string"
                ? className.trim()
                : null;
        const normalizedPhone = phone === undefined || phone === null
            ? ""
            : typeof phone === "string"
                ? phone.trim()
                : null;

        if (normalizedClassName === null || normalizedPhone === null) {
            return res.status(400).json({
                message: "Class and phone must be text when provided."
            });
        }

        if (normalizedClassName.length > 100 || normalizedPhone.length > 32) {
            return res.status(400).json({
                message: "Class must be at most 100 characters and phone at most 32 characters."
            });
        }

        let normalizedRollNo;
        if (rollNo !== undefined && rollNo !== null && rollNo !== "") {
            if (
                typeof rollNo !== "number" ||
                !Number.isInteger(rollNo) ||
                rollNo < 1
            ) {
                return res.status(400).json({
                    message: "Roll number must be a positive whole number."
                });
            }
            normalizedRollNo = rollNo;
        }

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered."
            });
        }

        const existingStudentId = await User.findOne({
            "studentProfile.studentId": normalizedStudentId
        }).select("_id");

        if (existingStudentId) {
            return res.status(409).json({
                message: "Student ID already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role: "student",
            studentProfile: {
                studentId: normalizedStudentId,
                program: normalizedProgram,
                className: normalizedClassName || undefined,
                rollNo: normalizedRollNo,
                phone: normalizedPhone || undefined
            }
        });

        res.status(201).json({
            message: "Student registered successfully!",
            user: formatUser(user)
        });

    } catch (error) {
        if (error.code === 11000) {
            const duplicateFields = error.keyPattern || {};

            if (duplicateFields["studentProfile.studentId"]) {
                return res.status(409).json({
                    message: "Student ID already registered."
                });
            }

            if (duplicateFields.email) {
                return res.status(409).json({
                    message: "Email already registered."
                });
            }
        }

        res.status(500).json({
            message: "Registration failed.",
            error: error.message
        });
    }
};

// LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Compare entered password with hashed password
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        // Send token and user information
        res.status(200).json({
            message: "Login successful!",
            token,
            user: formatUser(user)
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed.",
            error: error.message
        });
    }
};

module.exports = {
    register,
    login
};