const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
    {
        studentId: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 50
        },

        program: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        className: {
            type: String,
            trim: true,
            maxlength: 100
        },

        rollNo: {
            type: Number,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Roll number must be a whole number."
            }
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 32
        }
    },
    {
        _id: false
    }
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["student", "teacher"],
            required: true,
            default: "student"
        },

        studentProfile: {
            type: studentProfileSchema,
            default: undefined
        }
    },
    {
        timestamps: true
    }
);

userSchema.index(
    { "studentProfile.studentId": 1 },
    {
        unique: true,
        partialFilterExpression: {
            "studentProfile.studentId": { $type: "string" }
        }
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;