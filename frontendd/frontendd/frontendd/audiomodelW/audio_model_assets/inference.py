
import tensorflow as tf
import tensorflow_hub as hub
import librosa
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import tempfile
import os

class DogAudioClassifier:
    def __init__(self, model_assets_path):
        self.model_assets_path = model_assets_path
        
        # loading configuration
        with open(f'{model_assets_path}/model_config.json', 'r') as f:
            self.config = json.load(f)
        
        # loading label encoder
        self.label_encoder = joblib.load(f'{model_assets_path}/label_encoder.pkl')
        
        # loading class names
        with open(f'{model_assets_path}/class_names.json', 'r') as f:
            self.class_names = json.load(f)
        
        # loading model
        self.model = tf.keras.models.load_model(f'{model_assets_path}/dog_audio_model.h5')
        
        self.SAMPLE_RATE = self.config["sample_rate"]
        self.DURATION = self.config["duration"]
        
        # loading YAMNet model
        self.yamnet_model = hub.load('https://tfhub.dev/google/yamnet/1')
    
    def extract_yamnet_features(self, audio_path):
        # extracting YAMNet features from audio file
        try:
            # loading and preprocessing audio
            audio, sr = librosa.load(audio_path, sr=self.SAMPLE_RATE, duration=self.DURATION)
            
            # padding if shorter than duration
            if len(audio) < self.SAMPLE_RATE * self.DURATION:
                audio = np.pad(audio, (0, int(self.SAMPLE_RATE * self.DURATION) - len(audio)), mode='constant')
            
            # normalizing audio
            audio = audio.astype(np.float32)
            if np.max(np.abs(audio)) > 0:
                audio = audio / np.max(np.abs(audio))
            
            # getting YAMNet embeddings
            scores, embeddings, spectrogram = self.yamnet_model(audio)
            mean_embedding = tf.reduce_mean(embeddings, axis=0).numpy()
            
            return mean_embedding
            
        except Exception as e:
            raise Exception(f"Audio processing error: {str(e)}")
    
    def predict(self, audio_path, top_k=3):
        try:
            # extracting features
            features = self.extract_yamnet_features(audio_path)
            features = features.reshape(1, -1)
            
            # getting prediction
            predictions = self.model.predict(features, verbose=0)
            top_k = min(top_k, self.config["num_classes"])
            
            # getting top predictions
            top_indices = np.argsort(predictions[0])[-top_k:][::-1]
            top_probs = predictions[0][top_indices]
            
            results = []
            for i, (idx, prob) in enumerate(zip(top_indices, top_probs)):
                disease = self.label_encoder.inverse_transform([idx])[0]
                
                # generating confidence explanation
                if prob > 0.7:
                    confidence_level = "High confidence"
                    explanation = "Clear audio patterns match this condition"
                elif prob > 0.5:
                    confidence_level = "Moderate confidence" 
                    explanation = "Good audio alignment with some uncertainty"
                elif prob > 0.3:
                    confidence_level = "Low confidence"
                    explanation = "Audio features could indicate multiple conditions"
                else:
                    confidence_level = "Very low confidence"
                    explanation = "Limited audio information available"
                
                results.append({
                    'disease': disease, 
                    'confidence': float(prob),
                    'confidence_level': confidence_level,
                    'explanation': explanation,
                    'class_index': int(idx)
                })
            
            return {
                'predictions': results,
                'top_disease': results[0]['disease'],
                'top_confidence': results[0]['confidence'],
                'status': 'success'
            }
            
        except Exception as e:
            return {
                'error': str(e),
                'status': 'error'
            }

# flask app
app = Flask(__name__)
CORS(app)

# initializing predictor
predictor = None

def initialize_predictor():
    global predictor
    if predictor is None:
        predictor = DogAudioClassifier('audio_model_assets')
    return predictor

@app.route('/predict-audio', methods=['POST'])
def predict_audio_endpoint():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided', 'status': 'error'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No file selected', 'status': 'error'}), 400
    
    try:
        predictor = initialize_predictor()
        
        # saving uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            file.save(tmp_file.name)
            result = predictor.predict(tmp_file.name)
        
        os.unlink(tmp_file.name)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/health-audio', methods=['GET'])
def health_check():
    predictor = initialize_predictor()
    return jsonify({
        'status': 'healthy', 
        'model_loaded': True,
        'num_classes': len(predictor.class_names),
        'classes': predictor.class_names
    })

if __name__ == '__main__':
    initialize_predictor()
    print("Dog Audio Disease Prediction API started!")
    print(f"Loaded {len(predictor.class_names)} classes: {predictor.class_names}")
    app.run(host='0.0.0.0', port=5001, debug=False)
