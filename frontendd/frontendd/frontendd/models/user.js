const mongoose = require('./db');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: { 
        type: String, 
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    phone: String,
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    preferences: {
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: false
            },
            push: {
                type: Boolean,
                default: true
            }
        },
        units: {
            weight: {
                type: String,
                enum: ['kg', 'lbs'],
                default: 'lbs'
            },
            temperature: {
                type: String,
                enum: ['celsius', 'fahrenheit'],
                default: 'fahrenheit'
            }
        },
        language: {
            type: String,
            default: 'en'
        }
    },
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'premium', 'veterinarian'],
            default: 'free'
        },
        startDate: Date,
        endDate: Date,
        isActive: {
            type: Boolean,
            default: true
        }
    },
    profileImage: String,
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    loginCount: {
        type: Number,
        default: 0
    },
    lastWeeklyReport: {
        type: Date,
        default: null
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
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for better query performance
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);
module.exports = User;