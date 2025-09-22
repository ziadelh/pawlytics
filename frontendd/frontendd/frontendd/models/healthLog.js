const mongoose = require('./db');

const healthLogSchema = new mongoose.Schema({
    dog: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dog',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    symptoms: {
        text: String,
        severity: {
            type: String,
            enum: ['mild', 'moderate', 'severe', 'critical', 'unknown'],
            default: 'unknown'
        },
        duration: String, 
        frequency: String 
    },
    files: {
        images: [{
            filename: String,
            originalName: String,
            path: String,
            size: Number,
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],
        audio: [{
            filename: String,
            originalName: String,
            path: String,
            size: Number,
            duration: Number, 
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],
    },
    aiAnalysis: {
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        results: {
            diagnosis: String,
            confidence: Number, 
            recommendations: [String],
            urgency: {
                type: String,
                enum: ['low', 'medium', 'high', 'emergency'],
                default: 'low'
            },
            suggestedActions: [String],
            vetRecommendation: Boolean,
            processedAt: Date
        },
        modelVersion: String,
        processingTime: Number 
    },
    vetNotes: {
        reviewed: {
            type: Boolean,
            default: false
        },
        vetName: String,
        vetComments: String,
        followUpRequired: Boolean,
        reviewedAt: Date
    },
    status: {
        type: String,
        enum: ['active', 'resolved', 'monitoring', 'escalated'],
        default: 'active'
    },
    tags: [String], 
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
healthLogSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for better query performance
healthLogSchema.index({ dog: 1, createdAt: -1 });
healthLogSchema.index({ owner: 1, createdAt: -1 });
healthLogSchema.index({ 'aiAnalysis.status': 1 });

const HealthLog = mongoose.model('HealthLog', healthLogSchema);
module.exports = HealthLog;