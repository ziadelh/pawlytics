const express = require('express');
const { upload, compressImage, generateThumbnail } = require('../utils/fileHandler');
const { validateFileUpload } = require('../middleware/security');
const Dog = require('../models/dog');
const HealthLog = require('../models/healthLog');
const User = require('../models/user');
const fs = require('fs');

const router = express.Router();

// Use shared authentication middleware
const { requireAuth } = require('../middleware/security');

// Get all dogs for a user
router.get('/dogs', requireAuth, async (req, res) => {
    try {
        const dogs = await Dog.find({ owner: req.session.user._id })
            .select('-medicalHistory -vaccinations -medications')
            .sort({ createdAt: -1 });
        
        res.json({ success: true, dogs });
    } catch (error) {
        console.error('Error fetching dogs:', error);
        res.status(500).json({ error: 'Failed to fetch dogs' });
    }
});

// Get specific dog details
router.get('/dogs/:id', requireAuth, async (req, res) => {
    try {
        const dog = await Dog.findOne({ 
            _id: req.params.id, 
            owner: req.session.user._id 
        });
        
        if (!dog) {
            return res.status(404).json({ error: 'Dog not found' });
        }
        
        res.json({ success: true, dog });
    } catch (error) {
        console.error('Error fetching dog:', error);
        res.status(500).json({ error: 'Failed to fetch dog details' });
    }
});


// Add new dog "API"
router.post('/dogs', requireAuth, upload.single('profileImage'), validateFileUpload, async (req, res) => {
    try {
        const { name, breed, age, weight, gender, color, microchipId, allergies } = req.body || {};
        
        const dogData = {
            name,
            breed,
            age: parseInt(age),
            weight: weight ? parseFloat(weight) : undefined,
            gender: gender || 'unknown',
            color,
            microchipId,
            allergies: allergies ? allergies.split(',').map(a => a.trim()) : [],
            owner: req.session.user._id
        };
        
        // Handle profile image
        if (req.file) {
            const thumbnailPath = `public/uploads/thumbnails/thumb_${req.file.filename}`;
            await generateThumbnail(req.file.path, thumbnailPath);
            dogData.profileImage = req.file.filename;
        }
        
        const dog = new Dog(dogData);
        await dog.save();
        
        res.json({ 
            success: true, 
            message: 'Dog profile created successfully',
            dog: {
                _id: dog._id,
                name: dog.name,
                breed: dog.breed,
                age: dog.age,
                profileImage: dog.profileImage
            }
        });
    } catch (error) {
        console.error('Error creating dog:', error);
        res.status(500).json({ error: 'Failed to create dog profile' });
    }
});

// Update dog profile
router.put('/dogs/:id', requireAuth, upload.single('profileImage'), async (req, res) => {
    try {
        const { name, breed, age, weight, gender, color, microchipId, allergies } = req.body;
        
        const dog = await Dog.findOne({ 
            _id: req.params.id, 
            owner: req.session.user._id 
        });
        
        if (!dog) {
            return res.status(404).json({ error: 'Dog not found' });
        }
        
        // Update fields
        if (name) dog.name = name;
        if (breed) dog.breed = breed;
        if (age) dog.age = parseInt(age);
        if (weight) dog.weight = parseFloat(weight);
        if (gender) dog.gender = gender;
        if (color) dog.color = color;
        if (microchipId) dog.microchipId = microchipId;
        if (allergies) dog.allergies = allergies.split(',').map(a => a.trim());
        
        // Handle new profile image
        if (req.file) {
            if (dog.profileImage) {
                const oldImagePath = `public/uploads/images/${dog.profileImage}`;
                const oldThumbPath = `public/uploads/thumbnails/thumb_${dog.profileImage}`;
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
                if (fs.existsSync(oldThumbPath)) fs.unlinkSync(oldThumbPath);
            }
            
            const thumbnailPath = `public/uploads/thumbnails/thumb_${req.file.filename}`;
            await generateThumbnail(req.file.path, thumbnailPath);
            dog.profileImage = req.file.filename;
        }
        
        await dog.save();
        
        res.json({ 
            success: true, 
            message: 'Dog profile updated successfully',
            dog
        });
    } catch (error) {
        console.error('Error updating dog:', error);
        res.status(500).json({ error: 'Failed to update dog profile' });
    }
});

// Delete dog
router.delete('/dogs/:id', requireAuth, async (req, res) => {
    try {
        const dog = await Dog.findOne({ 
            _id: req.params.id, 
            owner: req.session.user._id 
        });
        
        if (!dog) {
            return res.status(404).json({ error: 'Dog not found' });
        }
        
        await HealthLog.deleteMany({ dog: dog._id });
        
        if (dog.profileImage) {
            const imagePath = `public/uploads/images/${dog.profileImage}`;
            const thumbPath = `public/uploads/thumbnails/thumb_${dog.profileImage}`;
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        }
        
        await Dog.findByIdAndDelete(dog._id);
        
        res.json({ 
            success: true, 
            message: 'Dog profile and all associated data deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting dog:', error);
        res.status(500).json({ error: 'Failed to delete dog profile' });
    }
});

// Add medical history entry
router.post('/dogs/:id/medical-history', requireAuth, async (req, res) => {
    try {
        const { condition, treatment, vet, notes } = req.body;
        
        const dog = await Dog.findOne({ 
            _id: req.params.id, 
            owner: req.session.user._id 
        });
        
        if (!dog) {
            return res.status(404).json({ error: 'Dog not found' });
        }
        
        dog.medicalHistory.push({
            condition,
            treatment,
            vet,
            notes,
            date: new Date()
        });
        
        await dog.save();
        
        res.json({ 
            success: true, 
            message: 'Medical history entry added successfully'
        });
    } catch (error) {
        console.error('Error adding medical history:', error);
        res.status(500).json({ error: 'Failed to add medical history entry' });
    }
});

// Add vaccination record
router.post('/dogs/:id/vaccinations', requireAuth, async (req, res) => {
    try {
        const { name, date, nextDue, vet } = req.body;
        
        const dog = await Dog.findOne({ 
            _id: req.params.id, 
            owner: req.session.user._id 
        });
        
        if (!dog) {
            return res.status(404).json({ error: 'Dog not found' });
        }
        
        dog.vaccinations.push({
            name,
            date: new Date(date),
            nextDue: new Date(nextDue),
            vet
        });
        
        await dog.save();
        
        res.json({ 
            success: true, 
            message: 'Vaccination record added successfully'
        });
    } catch (error) {
        console.error('Error adding vaccination:', error);
        res.status(500).json({ error: 'Failed to add vaccination record' });
    }
});

// Add medication record
router.post('/dogs/:id/medications', requireAuth, async (req, res) => {
    try {
        const { name, dosage, frequency, startDate, endDate } = req.body;
        
        const dog = await Dog.findOne({ 
            _id: req.params.id, 
            owner: req.session.user._id 
        });
        
        if (!dog) {
            return res.status(404).json({ error: 'Dog not found' });
        }
        
        dog.medications.push({
            name,
            dosage,
            frequency,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null
        });
        
        await dog.save();
        
        res.json({ 
            success: true, 
            message: 'Medication record added successfully'
        });
    } catch (error) {
        console.error('Error adding medication:', error);
        res.status(500).json({ error: 'Failed to add medication record' });
    }
});

module.exports = router;
