const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        rollNo: {
            type: Number,
            required: true
        },

        className: {
            type: String,
            required: true
        },

        phone: {
            type: String
        },

        email: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Student", studentSchema);