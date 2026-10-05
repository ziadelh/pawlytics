const mongoose = require('./db');

const dogSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    breed: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        required: true,
        min: 0,
        max: 30
    },
    weight: {
        type: Number,
        min: 0.1,
        max: 200
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'unknown']
    },
    color: String,
    microchipId: String,
    profileImage: String,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    medicalHistory: [{
        date: {
            type: Date,
            default: Date.now
        },
        condition: String,
        treatment: String,
        vet: String,
        notes: String
    }],
    vaccinations: [{
        name: String,
        date: Date,
        nextDue: Date,
        vet: String
    }],
    allergies: [String],
    medications: [{
        name: String,
        dosage: String,
        frequency: String,
        startDate: Date,
        endDate: Date
    }],
    emergencyContact: {
        vetName: String,
        vetPhone: String,
        vetAddress: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
dogSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Dog = mongoose.model('Dog', dogSchema);
module.exports = Dog;
