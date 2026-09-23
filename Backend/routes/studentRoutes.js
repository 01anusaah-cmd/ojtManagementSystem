const express = require("express");
const mongoose = require("mongoose");
const Student = require("../models/Student");

const router = express.Router();


// CREATE - Add a new student
// POST /api/students

router.post("/", async (req, res) => {
    try {
        const student = new Student({
            name: req.body.name,
            rollNo: req.body.rollNo,
            className: req.body.className,
            phone: req.body.phone,
            email: req.body.email
        });

        const savedStudent = await student.save();

        res.status(201).json(savedStudent);

    } catch (error) {
        res.status(400).json({
            message: "Failed to add student",
            error: error.message
        });
    }
});


// READ - Get all students
// GET /api/students

router.get("/", async (req, res) => {
    try {
        const students = await Student.find();

        res.status(200).json(students);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get students",
            error: error.message
        });
    }
});


// READ - Get one student
// GET /api/students/:id

router.get("/:id", async (req, res) => {
    try {

        // Check whether the ID is valid
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json(student);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get student",
            error: error.message
        });
    }
});


// UPDATE - Update a student
// PUT /api/students/:id

router.put("/:id", async (req, res) => {
    try {

        // Check whether the ID is valid
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const updatedStudent = await Student.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                rollNo: req.body.rollNo,
                className: req.body.className,
                phone: req.body.phone,
                email: req.body.email
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedStudent) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json(updatedStudent);

    } catch (error) {
        res.status(400).json({
            message: "Failed to update student",
            error: error.message
        });
    }
});


// DELETE - Delete a student
// DELETE /api/students/:id

router.delete("/:id", async (req, res) => {
    try {

        // Check whether the ID is valid
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid student ID"
            });
        }

        const deletedStudent = await Student.findByIdAndDelete(
            req.params.id
        );

        if (!deletedStudent) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        res.status(200).json({
            message: "Student deleted successfully",
            student: deletedStudent
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to delete student",
            error: error.message
        });
    }
});


module.exports = router;