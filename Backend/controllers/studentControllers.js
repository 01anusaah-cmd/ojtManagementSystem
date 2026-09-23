const Student = require("../models/Student");

// CREATE - Add a new student
// POST /api/students
const createStudent = async (req, res) => {
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
};

module.exports = {
    createStudent
};