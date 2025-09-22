import os
import sys
import json
import tempfile
import importlib.util
import logging
from typing import Dict, List, Optional, Any
from flask import Flask, request, jsonify
from flask_cors import CORS

text_model_path = os.path.join(os.path.dirname(__file__), '..', 'textmodelW', 'model_assets')
audio_model_path = os.path.join(os.path.dirname(__file__), '..', 'audiomodelW', 'audio_model_assets')
image_model_path = os.path.join(os.path.dirname(__file__), '..', 'imagemodelW', 'model_assets')

sys.path.extend([text_model_path, audio_model_path, image_model_path])

sys.path.insert(0, text_model_path)
text_spec = importlib.util.spec_from_file_location("text_inference", os.path.join(text_model_path, "inference.py"))
text_module = importlib.util.module_from_spec(text_spec)
text_spec.loader.exec_module(text_module)
DogDiseaseClassifier = text_module.DogDiseaseClassifier
sys.path.pop(0)

sys.path.insert(0, audio_model_path)
audio_spec = importlib.util.spec_from_file_location("audio_inference", os.path.join(audio_model_path, "inference.py"))
audio_module = importlib.util.module_from_spec(audio_spec)
audio_spec.loader.exec_module(audio_module)
DogAudioClassifier = audio_module.DogAudioClassifier
sys.path.pop(0)

sys.path.insert(0, image_model_path)
image_spec = importlib.util.spec_from_file_location("image_inference", os.path.join(image_model_path, "inference.py"))
image_module = importlib.util.module_from_spec(image_spec)
image_spec.loader.exec_module(image_module)
SkinDiseasePredictor = image_module.SkinDiseasePredictor
sys.path.pop(0)

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIOrchestrator:
    def __init__(self):
        self.models = {}
        self.initialize_models()
    
    def initialize_models(self):
        try:
            base_dir = os.path.dirname(os.path.dirname(__file__))
            
            text_model_path = os.path.join(base_dir, 'textmodelW', 'model_assets')
            if os.path.exists(text_model_path):
                self.models['text'] = DogDiseaseClassifier(text_model_path)
                logger.info("Text model loaded successfully")
            else:
                logger.error(f"Text model path not found: {text_model_path}")
                raise FileNotFoundError(f"Text model assets not found at {text_model_path}")
            
            audio_model_path = os.path.join(base_dir, 'audiomodelW', 'audio_model_assets')
            if os.path.exists(audio_model_path):
                self.models['audio'] = DogAudioClassifier(audio_model_path)
                logger.info("Audio model loaded successfully")
            else:
                logger.error(f"Audio model path not found: {audio_model_path}")
                raise FileNotFoundError(f"Audio model assets not found at {audio_model_path}")
            
            image_model_path = os.path.join(base_dir, 'imagemodelW', 'model_assets')
            if os.path.exists(image_model_path):
                self.models['image'] = SkinDiseasePredictor(image_model_path)
                logger.info("Image model loaded successfully")
            else:
                logger.error(f"Image model path not found: {image_model_path}")
                raise FileNotFoundError(f"Image model assets not found at {image_model_path}")
            
        except Exception as e:
            logger.error(f"Error initializing models: {str(e)}")
            raise
    
    def analyze_text(self, symptom_text: str, breed: str = None, age: int = None, sex: str = None) -> Dict:
        try:
            result = self.models['text'].predict(symptom_text, breed, age, sex)
            return {
                'type': 'text',
                'status': 'success',
                'data': result
            }
        except Exception as e:
            logger.error(f"Text analysis error: {str(e)}")
            return {
                'type': 'text',
                'status': 'error',
                'error': str(e)
            }
    
    def analyze_audio(self, audio_file_path: str) -> Dict:
        try:
            result = self.models['audio'].predict(audio_file_path)
            return {
                'type': 'audio',
                'status': 'success',
                'data': result
            }
        except Exception as e:
            logger.error(f"Audio analysis error: {str(e)}")
            return {
                'type': 'audio',
                'status': 'error',
                'error': str(e)
            }
    
    def analyze_image(self, image_bytes: bytes, symptoms_text: str = None) -> Dict:
        try:
            result = self.models['image'].predict_with_treatment(image_bytes, symptoms_text)
            return {
                'type': 'image',
                'status': 'success',
                'data': result
            }
        except Exception as e:
            logger.error(f"Image analysis error: {str(e)}")
            return {
                'type': 'image',
                'status': 'error',
                'error': str(e)
            }
    
    def analyze_multimodal(self, 
                          symptom_text: str = None,
                          audio_file_path: str = None, 
                          image_bytes: bytes = None,
                          breed: str = None,
                          age: int = None,
                          sex: str = None) -> Dict:
        results = {}
        
        if symptom_text:
            results['text_analysis'] = self.analyze_text(symptom_text, breed, age, sex)
        
        if audio_file_path:
            results['audio_analysis'] = self.analyze_audio(audio_file_path)
        
        if image_bytes:
            results['image_analysis'] = self.analyze_image(image_bytes, symptom_text)
        
        comprehensive_report = self._generate_comprehensive_report(results, breed, age, sex)
        
        return {
            'status': 'success',
            'individual_results': results,
            'comprehensive_report': comprehensive_report,
            'analysis_timestamp': json.dumps(str(__import__('datetime').datetime.now()))
        }
    
    def _generate_comprehensive_report(self, results: Dict, breed: str = None, age: int = None, sex: str = None) -> Dict:
        report = {
            'patient_info': {
                'breed': breed,
                'age': age,
                'sex': sex
            },
            'analyses_performed': list(results.keys()),
            'primary_diagnoses': [],
            'confidence_scores': [],
            'treatment_recommendations': [],
            'urgency_level': 'low',
            'emergency_flags': [],
            'overall_assessment': 'No immediate concerns detected'
        }
        
        if 'text_analysis' in results and results['text_analysis']['status'] == 'success':
            text_data = results['text_analysis']['data']
            report['primary_diagnoses'].append({
                'source': 'text_symptoms',
                'diagnosis': text_data.get('top_disease', 'Unknown'),
                'confidence': text_data.get('top_confidence', 0.0),
                'treatments': text_data.get('top_treatments', [])
            })
            
            if text_data.get('urgent_care', False):
                report['urgency_level'] = 'high'
                report['emergency_flags'].append('Text symptoms indicate urgent care needed')
        
        if 'audio_analysis' in results and results['audio_analysis']['status'] == 'success':
            audio_data = results['audio_analysis']['data']
            if 'predictions' in audio_data and len(audio_data['predictions']) > 0:
                top_audio = audio_data['predictions'][0]
                report['primary_diagnoses'].append({
                    'source': 'audio_analysis',
                    'diagnosis': top_audio.get('disease', 'Unknown'),
                    'confidence': top_audio.get('confidence', 0.0),
                    'treatments': []
                })
        
        if 'image_analysis' in results and results['image_analysis']['status'] == 'success':
            image_data = results['image_analysis']['data']
            if 'medical_advice' in image_data:
                medical_advice = image_data['medical_advice']
                report['primary_diagnoses'].append({
                    'source': 'image_analysis',
                    'diagnosis': medical_advice.get('diagnosis', 'Unknown'),
                    'confidence': medical_advice.get('confidence', 0.0),
                    'treatments': medical_advice.get('treatments', [])
                })
                
                if medical_advice.get('is_emergency', False):
                    report['urgency_level'] = 'high'
                    report['emergency_flags'].append('Image analysis indicates emergency condition')
        
        if report['primary_diagnoses']:
            avg_confidence = sum(d['confidence'] for d in report['primary_diagnoses']) / len(report['primary_diagnoses'])
            report['overall_confidence'] = avg_confidence
            
            if report['urgency_level'] == 'high':
                report['overall_assessment'] = 'URGENT: Immediate veterinary attention recommended'
            elif avg_confidence > 0.7:
                report['overall_assessment'] = 'High confidence diagnosis - Follow recommended treatments'
            elif avg_confidence > 0.5:
                report['overall_assessment'] = 'Moderate confidence - Monitor closely and consult veterinarian'
            else:
                report['overall_assessment'] = 'Low confidence - Additional evaluation recommended'
        
        all_treatments = []
        for diagnosis in report['primary_diagnoses']:
            all_treatments.extend(diagnosis['treatments'])
        
        seen = set()
        unique_treatments = []
        for treatment in all_treatments:
            if treatment not in seen:
                seen.add(treatment)
                unique_treatments.append(treatment)
        
        report['treatment_recommendations'] = unique_treatments[:10]
        
        return report

orchestrator = None

def initialize_orchestrator():
    global orchestrator
    if orchestrator is None:
        orchestrator = AIOrchestrator()
    return orchestrator

@app.route('/health', methods=['GET'])
def health_check():
    try:
        orchestrator = initialize_orchestrator()
        return jsonify({
            'status': 'healthy',
            'models_loaded': list(orchestrator.models.keys()),
            'service': 'AI Model Orchestrator'
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@app.route('/analyze/text', methods=['POST'])
def analyze_text():
    try:
        data = request.get_json()
        if not data or 'symptom_text' not in data:
            return jsonify({'error': 'symptom_text is required'}), 400
        
        orchestrator = initialize_orchestrator()
        result = orchestrator.analyze_text(
            symptom_text=data['symptom_text'],
            breed=data.get('breed'),
            age=data.get('age'),
            sex=data.get('sex')
        )
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/analyze/audio', methods=['POST'])
def analyze_audio():
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        file = request.files['audio']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            file.save(tmp_file.name)
            
            orchestrator = initialize_orchestrator()
            result = orchestrator.analyze_audio(tmp_file.name)
        
        os.unlink(tmp_file.name)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/analyze/image', methods=['POST'])
def analyze_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        image_bytes = file.read()
        symptoms_text = request.form.get('symptoms', '')
        
        orchestrator = initialize_orchestrator()
        result = orchestrator.analyze_image(image_bytes, symptoms_text)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/analyze/comprehensive', methods=['POST'])
def analyze_comprehensive():
    try:
        orchestrator = initialize_orchestrator()
        
        if request.content_type and 'multipart/form-data' in request.content_type:
            symptom_text = request.form.get('symptom_text', '')
            breed = request.form.get('breed')
            age = request.form.get('age')
            sex = request.form.get('sex')
            
            if age:
                try:
                    age = int(age)
                except ValueError:
                    age = None
            
            audio_file_path = None
            image_bytes = None
            
            if 'audio' in request.files:
                audio_file = request.files['audio']
                if audio_file.filename:
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                        audio_file.save(tmp_file.name)
                        audio_file_path = tmp_file.name
            
            if 'image' in request.files:
                image_file = request.files['image']
                if image_file.filename:
                    image_bytes = image_file.read()
        
        else:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            symptom_text = data.get('symptom_text', '')
            breed = data.get('breed')
            age = data.get('age')
            sex = data.get('sex')
            audio_file_path = None
            image_bytes = None
        
        result = orchestrator.analyze_multimodal(
            symptom_text=symptom_text,
            audio_file_path=audio_file_path,
            image_bytes=image_bytes,
            breed=breed,
            age=age,
            sex=sex
        )
        
        if audio_file_path and os.path.exists(audio_file_path):
            os.unlink(audio_file_path)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    initialize_orchestrator()
    print("AI Model Orchestrator Service Started!")
    print("Models loaded:")
    print("  - Text Analysis (Bio_ClinicalBERT)")
    print("  - Audio Analysis (YAMNet + TensorFlow)")
    print("  - Image Analysis (EfficientNet)")
    print("API running on http://localhost:5002")
    app.run(host='0.0.0.0', port=5002, debug=False)
