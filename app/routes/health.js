const express = require('express');
const { upload, compressImage, generateThumbnail, getFileDuration } = require('../utils/fileHandler');
const { validateFileUpload } = require('../middleware/security');
const HealthLog = require('../models/healthLog');
const Dog = require('../models/dog');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const router = express.Router();

const { requireAuth } = require('../middleware/security');

// Submit health analysis request
router.post('/analyze', requireAuth, upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'audio', maxCount: 3 },
]), validateFileUpload, async (req, res) => {
    try {
        const { 
            dogId, 
            symptoms, 
            breed,
            age,
            sex,
            severity = 'unknown',
            duration = 'unknown',
            frequency = 'unknown'
        } = req.body;
        
        console.log('Health analysis request received for dog:', dogId);
        const dog = await Dog.findOne({ 
            _id: dogId, 
            owner: req.session.user._id 
        });
        
        if (!dog) {
            return res.status(404).json({ error: 'Dog not found or access denied' });
        }

        // Process uploaded files
        const processedFiles = {
            images: [],
            audio: [],
        };

        // Process images
        if (req.files && req.files.images) {
            for (const file of req.files.images) {
                processedFiles.images.push({
                    filename: file.filename,
                    originalName: file.originalname,
                    path: file.path,
                    size: file.size
                });
            }
        }

        // Process audio files
        if (req.files && req.files.audio) {
            for (const file of req.files.audio) {
                const duration = await getFileDuration(file.path);
                
                processedFiles.audio.push({
                    filename: file.filename,
                    originalName: file.originalname,
                    path: file.path,
                    size: file.size,
                    duration: Math.round(duration)
                });
            }
        }


        // Create health log entry
        const healthLog = new HealthLog({
            dog: dogId,
            owner: req.session.user._id,
            symptoms: {
                text: symptoms,
                severity,
                duration,
                frequency
            },
            files: processedFiles,
            aiAnalysis: {
                status: 'pending'
            }
        });

        await healthLog.save();

        setTimeout(async () => {
            try {
                healthLog.aiAnalysis.status = 'processing';
                await healthLog.save();
                
                // Check if AI service is available first
                let aiServiceAvailable = false;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    
                    const healthCheck = await fetch('http://localhost:5002/health', { 
                        method: 'GET',
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    aiServiceAvailable = healthCheck.ok;
                    console.log('AI service health check:', healthCheck.ok ? 'Available' : 'Not available');
                } catch (error) {
                    console.log('AI service not available, proceeding with basic analysis:', error.message);
                    aiServiceAvailable = false;
                }
                
                // Call AI service for text analysis
                let textAnalysis = null;
                if (symptoms && aiServiceAvailable) {
                    try {
                        console.log('Calling AI service for text analysis...');
                        const textResponse = await fetch('http://localhost:5002/analyze/text', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                symptom_text: symptoms,
                                breed: breed,
                                age: age,
                                sex: sex
                            })
                        });
                        
                        if (!textResponse.ok) {
                            const errorText = await textResponse.text();
                            console.error('AI text analysis failed:', textResponse.status, textResponse.statusText, errorText);
                            textAnalysis = { error: 'Text analysis failed', details: errorText };
                        } else {
                            textAnalysis = await textResponse.json();
                            console.log('Text analysis response:', JSON.stringify(textAnalysis, null, 2));
                        }
                    } catch (error) {
                        console.error('Error in text analysis:', error);
                        textAnalysis = { error: 'Text analysis failed', details: error.message };
                    }
                } else if (symptoms && !aiServiceAvailable) {
                    textAnalysis = {
                        data: {
                            predictions: [{
                                disease: 'General Health Assessment',
                                confidence: 0.5,
                                treatments: ['Monitor symptoms closely', 'Consult veterinarian if symptoms persist', 'Keep detailed symptom log'],
                                severity: 1
                            }],
                            urgent_care: false,
                            severity: { level: 'low', score: 1 }
                        }
                    };
                    console.log('Using basic analysis - AI service not available');
                }
                
                // Call AI service for image analysis
                let imageAnalysis = null;
                if (processedFiles.images && processedFiles.images.length > 0 && aiServiceAvailable) {
                    try {
                        console.log('Processing image file:', processedFiles.images[0]);
                        
                        // Check if file exists
                        if (!fs.existsSync(processedFiles.images[0].path)) {
                            console.error('Image file does not exist:', processedFiles.images[0].path);
                            imageAnalysis = { error: 'Image file not found' };
                        } else {
                            // Read the image file as buffer
                            const imageBuffer = fs.readFileSync(processedFiles.images[0].path);
                            
                            const imageFormData = new FormData();
                            imageFormData.append('image', imageBuffer, {
                                filename: processedFiles.images[0].originalName || 'image.jpg',
                                contentType: 'image/jpeg'
                            });
                            if (symptoms) imageFormData.append('symptoms', symptoms);
                            
                            console.log('Sending image to AI service...');
                            const imageResponse = await axios.post('http://localhost:5002/analyze/image', imageFormData, {
                                headers: {
                                    ...imageFormData.getHeaders()
                                }
                            });
                            
                            if (imageResponse.status !== 200) {
                                console.error('AI image analysis failed:', imageResponse.status, imageResponse.statusText, imageResponse.data);
                                imageAnalysis = { error: 'Image analysis failed', details: imageResponse.data };
                            } else {
                                imageAnalysis = imageResponse.data;
                                console.log('Image analysis response:', JSON.stringify(imageAnalysis, null, 2));
                            }
                        }
                    } catch (error) {
                        console.error('Error in image analysis:', error);
                        imageAnalysis = { error: 'Image analysis failed', details: error.message };
                    }
                } else if (processedFiles.images && processedFiles.images.length > 0 && !aiServiceAvailable) {
                    imageAnalysis = {
                        data: {
                            medical_advice: {
                                diagnosis: 'Image Analysis Unavailable',
                                confidence: 0.3,
                                treatments: ['AI service not available', 'Please consult a veterinarian for image analysis'],
                                is_emergency: false
                            }
                        }
                    };
                    console.log('Using basic image analysis - AI service not available');
                } else {
                    console.log('No image files to process');
                }
                
                // Call AI service for audio analysis
                let audioAnalysis = null;
                if (processedFiles.audio && processedFiles.audio.length > 0 && aiServiceAvailable) {
                    try {
                        console.log('Processing audio file:', processedFiles.audio[0]);
                        
                        if (!fs.existsSync(processedFiles.audio[0].path)) {
                            console.error('Audio file does not exist:', processedFiles.audio[0].path);
                            audioAnalysis = { error: 'Audio file not found' };
                        } else {
                            // Read the audio file as buffer
                            const audioBuffer = fs.readFileSync(processedFiles.audio[0].path);
                            
                            const audioFormData = new FormData();
                            audioFormData.append('audio', audioBuffer, {
                                filename: processedFiles.audio[0].originalName || 'audio.wav',
                                contentType: 'audio/wav'
                            });
                            
                            console.log('Sending audio to AI service...');
                            const audioResponse = await axios.post('http://localhost:5002/analyze/audio', audioFormData, {
                                headers: {
                                    ...audioFormData.getHeaders()
                                }
                            });
                            
                            if (audioResponse.status !== 200) {
                                console.error('AI audio analysis failed:', audioResponse.status, audioResponse.statusText, audioResponse.data);
                                audioAnalysis = { error: 'Audio analysis failed', details: audioResponse.data };
                            } else {
                                audioAnalysis = audioResponse.data;
                                console.log('Audio analysis response:', JSON.stringify(audioAnalysis, null, 2));
                            }
                        }
                    } catch (error) {
                        console.error('Error in audio analysis:', error);
                        audioAnalysis = { error: 'Audio analysis failed', details: error.message };
                    }
                } else if (processedFiles.audio && processedFiles.audio.length > 0 && !aiServiceAvailable) {
                    audioAnalysis = {
                        data: {
                            predictions: [{
                                disease: 'Audio Analysis Unavailable',
                                confidence: 0.3
                            }]
                        }
                    };
                    console.log('Using basic audio analysis - AI service not available');
                } else {
                    console.log('No audio files to process');
                }
                
                // Process and combine results 
                const recommendations = [];
                const suggestedActions = [];
                let urgency = 'low';
                let primaryDiagnosis = 'Unknown';
                let confidence = 0;
                
                if (textAnalysis && !textAnalysis.error && textAnalysis.data) {
                    console.log('Processing successful text analysis results');
                    const textData = textAnalysis.data;
                    if (textData.predictions && textData.predictions.length > 0) {
                        const topPrediction = textData.predictions[0];
                        primaryDiagnosis = topPrediction.disease;
                        confidence = topPrediction.confidence;
                        console.log('Setting primary diagnosis:', primaryDiagnosis, 'with confidence:', confidence);
                        
                        // Add treatments as recommendations
                        if (topPrediction.treatments) {
                            recommendations.push(...topPrediction.treatments);
                        }
                        
                        // Set urgency based on severity
                        if (textData.urgent_care) {
                            urgency = 'high';
                        } else if (textData.severity && textData.severity.level) {
                            // Map AI service urgency levels to database schema
                            const urgencyMap = {
                                'low': 'low',
                                'moderate': 'medium',
                                'high': 'high',
                                'critical': 'emergency'
                            };
                            urgency = urgencyMap[textData.severity.level] || 'low';
                        }
                        
                        // Add suggested actions
                        suggestedActions.push(`Primary diagnosis: ${topPrediction.disease} (${(confidence * 100).toFixed(1)}% confidence)`);
                        if (topPrediction.treatments && topPrediction.treatments.length > 0) {
                            suggestedActions.push(`Recommended treatments: ${topPrediction.treatments.slice(0, 3).join(', ')}`);
                        }
                    }
                } else if (textAnalysis && textAnalysis.error) {
                    suggestedActions.push(`Text analysis failed: ${textAnalysis.details}`);
                }
                
                // Process image analysis results
                if (imageAnalysis && !imageAnalysis.error && imageAnalysis.data) {
                    const imageData = imageAnalysis.data;
                    if (imageData.medical_advice) {
                        const medicalAdvice = imageData.medical_advice;
                        if (medicalAdvice.diagnosis && medicalAdvice.confidence > confidence) {
                            primaryDiagnosis = medicalAdvice.diagnosis;
                            confidence = medicalAdvice.confidence;
                        }
                        
                        if (medicalAdvice.treatments) {
                            recommendations.push(...medicalAdvice.treatments);
                        }
                        
                        if (medicalAdvice.is_emergency) {
                            urgency = 'high';
                        }
                        
                        suggestedActions.push(`Image analysis: ${medicalAdvice.diagnosis} (${(medicalAdvice.confidence * 100).toFixed(1)}% confidence)`);
                    }
                } else if (imageAnalysis && imageAnalysis.error) {
                    suggestedActions.push(`Image analysis failed: ${imageAnalysis.details}`);
                }
                
                // Process audio analysis results
                if (audioAnalysis && !audioAnalysis.error && audioAnalysis.data) {
                    const audioData = audioAnalysis.data;
                    if (audioData.predictions && audioData.predictions.length > 0) {
                        const topAudio = audioData.predictions[0];
                        suggestedActions.push(`Audio analysis: ${topAudio.disease} (${(topAudio.confidence * 100).toFixed(1)}% confidence)`);
                    }
                } else if (audioAnalysis && audioAnalysis.error) {
                    suggestedActions.push(`Audio analysis failed: ${audioAnalysis.details}`);
                }
                
                // Create structured results for frontend
                console.log('Final analysis results before saving:');
                console.log('Primary diagnosis:', primaryDiagnosis);
                console.log('Confidence:', confidence);
                console.log('Urgency:', urgency);
                
                const structuredResults = {
                    diagnosis: primaryDiagnosis,
                    primaryDiagnosis: primaryDiagnosis,
                    confidence: Math.round(confidence * 100),
                    urgency: urgency,
                    recommendations: [...new Set(recommendations)],
                    suggestedActions: suggestedActions,
                    analysisDetails: {
                        text: textAnalysis ? textAnalysis.data : null,
                        image: imageAnalysis ? imageAnalysis.data : null,
                        audio: audioAnalysis ? audioAnalysis.data : null
                    }
                };
                
                healthLog.aiAnalysis = {
                    status: 'completed',
                    results: structuredResults,
                    modelVersion: 'v1.0-real',
                    processingTime: Date.now() - healthLog.createdAt.getTime()
                };
                
                await healthLog.save();
                console.log(`AI analysis completed for health log ${healthLog._id}`);
            } catch (error) {
                console.error('Error in AI processing:', error);
                console.error('Error stack:', error.stack);
                healthLog.aiAnalysis.status = 'failed';
                healthLog.aiAnalysis.error = error.message;
                await healthLog.save();
            }
        }, 1000);

        res.json({
            success: true,
            message: 'Health analysis submitted successfully',
            healthLogId: healthLog._id,
            estimatedProcessingTime: '2-5 minutes'
        });

    } catch (error) {
        console.error('Error submitting health analysis:', error);
        res.status(500).json({ error: 'Failed to submit health analysis' });
    }
});

// Get health analysis results
router.get('/analyze/:id', requireAuth, async (req, res) => {
    try {
        const healthLog = await HealthLog.findOne({
            _id: req.params.id,
            owner: req.session.user._id
        }).populate('dog', 'name breed age');

        if (!healthLog) {
            return res.status(404).json({ error: 'Health analysis not found' });
        }

        res.json({
            success: true,
            healthLog: {
                _id: healthLog._id,
                dog: healthLog.dog,
                symptoms: healthLog.symptoms,
                files: healthLog.files,
                aiAnalysis: healthLog.aiAnalysis,
                status: healthLog.status,
                tags: healthLog.tags,
                createdAt: healthLog.createdAt,
                updatedAt: healthLog.updatedAt
            }
        });
    } catch (error) {
        console.error('Error fetching health analysis:', error);
        res.status(500).json({ error: 'Failed to fetch health analysis' });
    }
});

router.get('/dogs/:dogId/logs', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        
        const dog = await Dog.findOne({ 
            _id: req.params.dogId, 
            owner: req.session.user._id 
        });
        
        if (!dog) {
            return res.status(404).json({ error: 'Dog not found or access denied' });
        }

        const query = { 
            dog: req.params.dogId,
            owner: req.session.user._id
        };
        
        if (status) {
            query.status = status;
        }

        const healthLogs = await HealthLog.find(query)
            .select('-files.images.path -files.audio.path')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await HealthLog.countDocuments(query);

        res.json({
            success: true,
            healthLogs,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Error fetching health logs:', error);
        res.status(500).json({ error: 'Failed to fetch health logs' });
    }
});

router.put('/logs/:id/status', requireAuth, async (req, res) => {
    try {
        const { status, vetNotes } = req.body;
        
        const healthLog = await HealthLog.findOne({
            _id: req.params.id,
            owner: req.session.user._id
        });

        if (!healthLog) {
            return res.status(404).json({ error: 'Health log not found' });
        }

        healthLog.status = status;
        
        if (vetNotes) {
            healthLog.vetNotes = {
                ...healthLog.vetNotes,
                reviewed: true,
                vetComments: vetNotes.vetComments,
                followUpRequired: vetNotes.followUpRequired || false,
                reviewedAt: new Date()
            };
        }

        await healthLog.save();

        res.json({
            success: true,
            message: 'Health log status updated successfully'
        });
    } catch (error) {
        console.error('Error updating health log status:', error);
        res.status(500).json({ error: 'Failed to update health log status' });
    }
});

router.get('/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user._id;
        
        const stats = await HealthLog.aggregate([
            { $match: { owner: userId } },
            {
                $group: {
                    _id: null,
                    totalLogs: { $sum: 1 },
                    pendingAnalysis: {
                        $sum: { $cond: [{ $eq: ['$aiAnalysis.status', 'pending'] }, 1, 0] }
                    },
                    completedAnalysis: {
                        $sum: { $cond: [{ $eq: ['$aiAnalysis.status', 'completed'] }, 1, 0] }
                    },
                    emergencyCases: {
                        $sum: { $cond: [{ $eq: ['$aiAnalysis.results.urgency', 'emergency'] }, 1, 0] }
                    },
                    avgConfidence: { $avg: '$aiAnalysis.results.confidence' }
                }
            }
        ]);

        const recentLogs = await HealthLog.find({ owner: userId })
            .populate('dog', 'name breed')
            .select('symptoms aiAnalysis status createdAt')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            stats: stats[0] || {
                totalLogs: 0,
                pendingAnalysis: 0,
                completedAnalysis: 0,
                emergencyCases: 0,
                avgConfidence: 0
            },
            recentLogs
        });
    } catch (error) {
        console.error('Error fetching health stats:', error);
        res.status(500).json({ error: 'Failed to fetch health statistics' });
    }
});

function generateMockAnalysis(symptoms, files) {
    const mockDiagnoses = [
        'Skin irritation - possible allergic reaction',
        'Ear infection - requires veterinary attention',
        'Digestive upset - monitor food intake',
        'Behavioral changes - stress or anxiety',
        'Joint stiffness - age-related mobility issues',
        'Respiratory concern - check for congestion',
        'Eye discharge - possible infection',
        'Limping - potential injury or arthritis'
    ];

    const mockRecommendations = [
        'Monitor symptoms for 24-48 hours',
        'Schedule veterinary appointment within 1 week',
        'Apply topical treatment as directed',
        'Ensure adequate rest and hydration',
        'Avoid known allergens',
        'Consider dietary changes',
        'Implement stress reduction techniques',
        'Seek immediate veterinary care'
    ];

    const randomDiagnosis = mockDiagnoses[Math.floor(Math.random() * mockDiagnoses.length)];
    const randomRecommendations = mockRecommendations
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 2);

    const urgencyLevels = ['low', 'medium', 'high', 'emergency'];
    const randomUrgency = urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)];

    return {
        results: {
            diagnosis: randomDiagnosis,
            confidence: Math.floor(Math.random() * 40) + 60, 
            recommendations: randomRecommendations,
            urgency: randomUrgency,
            suggestedActions: [
                'Take detailed notes of symptoms',
                'Monitor pet closely',
                'Contact veterinarian if symptoms worsen'
            ],
            vetRecommendation: randomUrgency === 'high' || randomUrgency === 'emergency',
            processedAt: new Date()
        }
    };
}

module.exports = router;
