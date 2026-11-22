require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const createTeacher = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected.");

        const existingTeacher = await User.findOne({
            email: process.env.TEACHER_EMAIL
        });

        if (existingTeacher) {
            console.log("Teacher account already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash(
            process.env.TEACHER_PASSWORD,
            10
        );

        const teacher = await User.create({
            name: process.env.TEACHER_NAME,
            email: process.env.TEACHER_EMAIL,
            password: hashedPassword,
            role: "teacher"
        });

        console.log("Teacher created successfully!");
        console.log("Email:", teacher.email);
        console.log("Role:", teacher.role);

    } catch (error) {
        console.error("Error creating teacher:", error.message);
    } finally {
        await mongoose.disconnect();
    }
};

createTeacher();