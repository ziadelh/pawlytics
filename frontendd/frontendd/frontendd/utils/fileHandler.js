const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp'); 
const ffmpeg = require('fluent-ffmpeg'); 

// Ensure upload directories exist
const createUploadDirs = () => {
    const dirs = ['public/uploads/images', 'public/uploads/audio', 'public/uploads/thumbnails'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

createUploadDirs();

// File type validation
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedAudioTypes = /mp3|wav|m4a|aac|ogg/;
    
    const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
                   allowedAudioTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images and audio files are allowed.'));
    }
};

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'public/uploads/';
        
        if (file.fieldname === 'image' || file.fieldname === 'imageFile' || file.fieldname === 'images') {
            uploadPath += 'images/';
        } else if (file.fieldname === 'audioFile' || file.fieldname === 'audio') {
            uploadPath += 'audio/';
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Multer configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, 
        files: 5 
    }
});

// Image compression utility
const compressImage = async (inputPath, outputPath, quality = 80) => {
    try {
        await sharp(inputPath)
            .resize(1920, 1080, { 
                fit: 'inside',
                withoutEnlargement: true 
            })
            .jpeg({ quality: quality })
            .toFile(outputPath);
        
        // Delete original if compression successful
        if (inputPath !== outputPath) {
            fs.unlinkSync(inputPath);
        }
        
        return true;
    } catch (error) {
        console.error('Image compression error:', error);
        return false;
    }
};

// Generate thumbnail for images
const generateThumbnail = async (inputPath, outputPath) => {
    try {
        await sharp(inputPath)
            .resize(300, 300, { 
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 70 })
            .toFile(outputPath);
        
        return true;
    } catch (error) {
        console.error('Thumbnail generation error:', error);
        return false;
    }
};

// Get file duration for audio
const getFileDuration = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration);
            }
        });
    });
};

// Clean up old files
const cleanupOldFiles = (daysOld = 30) => {
    const uploadDirs = ['public/uploads/images', 'public/uploads/audio'];
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    uploadDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted old file: ${filePath}`);
                }
            });
        }
    });
};


module.exports = {
    upload,
    compressImage,
    generateThumbnail,
    getFileDuration,
    cleanupOldFiles
};
