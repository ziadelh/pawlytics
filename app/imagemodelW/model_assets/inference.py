
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from PIL import Image
import json
import io
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

# the MedicalResponseSystem class 

class MedicalResponseSystem:
    def __init__(self, protocols_path, emergency_indicators_path):
        # Load from saved files instead of hardcoded
        with open(protocols_path, 'r') as f:
            self.treatment_protocols = json.load(f)
        
        with open(emergency_indicators_path, 'r') as f:
            self.emergency_indicators = json.load(f)
    
    def get_treatment_plan(self, disease_name, confidence_score):
        """Your existing treatment plan logic"""
        protocol = self.treatment_protocols.get(disease_name, {
            'treatments': ['Consult healthcare professional for proper diagnosis'],
            'emergency': False,
            'urgency': 'unknown'
        })
        
        return {
            'diagnosis': disease_name,
            'treatments': protocol['treatments'],
            'is_emergency': protocol['emergency'],
            'urgency_level': protocol['urgency'],
            'confidence': confidence_score,
            'recommendation': self._generate_recommendation(protocol, confidence_score)
        }
    
    def _generate_recommendation(self, protocol, confidence):
        """Your existing recommendation logic"""
        if protocol['emergency']:
            return "EMERGENCY: Seek immediate veterinary/medical attention"
        
        if confidence < 0.7:
            return "Low confidence diagnosis - Consult healthcare professional"
        
        if protocol['urgency'] == 'high':
            return "URGENT: Consult healthcare professional within 24 hours"
        elif protocol['urgency'] == 'moderate':
            return "Consult healthcare professional within 2-3 days"
        else:
            return "Monitor condition - consider over-the-counter options"
    
    def assess_emergency_symptoms(self, symptoms_text):
        """Your existing emergency assessment logic"""
        emergency_flags = []
        if symptoms_text:
            symptoms_lower = symptoms_text.lower()
            for indicator, message in self.emergency_indicators.items():
                if indicator in symptoms_lower:
                    emergency_flags.append(message)
        
        return emergency_flags
    
    def generate_comprehensive_report(self, image_prediction, symptoms_text=None):
        """Your existing report generation logic"""
        primary_diagnosis = image_prediction[0]
        
        report = {
            'primary_diagnosis': primary_diagnosis['class'],
            'confidence': primary_diagnosis['confidence'],
            'differential_diagnoses': image_prediction[1:3],
            'medical_advice': self.get_treatment_plan(primary_diagnosis['class'], primary_diagnosis['confidence'])
        }
        
        if symptoms_text:
            report['emergency_assessment'] = self.assess_emergency_symptoms(symptoms_text)
            report['patient_symptoms'] = symptoms_text
        
        report['disclaimer'] = "AI-assisted diagnosis. Consult healthcare professional for medical decisions."
        
        return report


# the Skin Disease Predictor Class 
class SkinDiseasePredictor:
    def __init__(self, model_assets_path):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_assets_path = model_assets_path
        
        # loading configuration
        with open(f'{model_assets_path}/model_config.json', 'r') as f:
            self.config = json.load(f)
        
        # loading class mappings
        with open(f'{model_assets_path}/class_to_idx.json', 'r') as f:
            self.class_to_idx = json.load(f)
        
        with open(f'{model_assets_path}/idx_to_class.json', 'r') as f:
            self.idx_to_class = json.load(f)
        
        # loading class names
        with open(f'{model_assets_path}/class_names.json', 'r') as f:
            self.class_names = json.load(f)
        
        # initializing the MedicalResponseSystem
        self.medical_system = MedicalResponseSystem(
            f'{model_assets_path}/medical_protocols.json',
            f'{model_assets_path}/emergency_indicators.json'
        )
        
        # initializing model
        self.model = self._create_model()
        self.model.load_state_dict(
            torch.load(f'{model_assets_path}/skin_disease_model.pth', 
                      map_location=self.device)
        )
        self.model.to(self.device)
        self.model.eval()
        
        # image transforms
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(self.config["input_size"]),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=self.config["normalization"]["mean"],
                std=self.config["normalization"]["std"]
            ),
        ])
    
    def _create_model(self):
        class RegularizedEfficientNet(nn.Module):
            def __init__(self, num_classes=9, dropout_rate=0.4):
                super().__init__()
                self.base_model = models.efficientnet_b0(pretrained=False)
                in_features = self.base_model.classifier[1].in_features
                self.base_model.classifier[1] = nn.Sequential(
                    nn.Dropout(dropout_rate),
                    nn.Linear(in_features, num_classes)
                )
            
            def forward(self, x):
                return self.base_model(x)
                
        return RegularizedEfficientNet(self.config["num_classes"])
    
    def predict(self, image_bytes, top_k=3):
        # predicting diseases from image
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            input_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                output = self.model(input_tensor)
                probabilities = F.softmax(output, dim=1)
                top_probs, top_indices = torch.topk(probabilities, top_k)
            
            top_probs = top_probs.cpu().numpy()[0]
            top_indices = top_indices.cpu().numpy()[0]
            
            predictions = []
            for i, (idx, prob) in enumerate(zip(top_indices, top_probs)):
                class_name = self.idx_to_class[str(idx)]
                predictions.append({
                    'rank': i + 1,
                    'class': class_name,
                    'confidence': float(prob),
                    'class_index': int(idx)
                })
            
            return predictions
            
        except Exception as e:
            return [{
                'rank': 1,
                'class': 'prediction_error',
                'confidence': 0.0,
                'error': str(e)
            }]
    
    def predict_with_treatment(self, image_bytes, symptoms_text=None):
        image_pred = self.predict(image_bytes)
        
        # checking if prediction failed
        if image_pred and 'error' in image_pred[0]:
            return {
                'error': image_pred[0]['error'],
                'diagnosis': 'unknown',
                'recommendation': 'Please try again or use a different image'
            }
        
        # generating report
        report = self.medical_system.generate_comprehensive_report(image_pred, symptoms_text)
        return report

# flask app
app = Flask(__name__)
CORS(app)

# initializing predictor
predictor = None

def initialize_predictor():
    global predictor
    if predictor is None:
        predictor = SkinDiseasePredictor('model_assets')
    return predictor

@app.route('/predict', methods=['POST'])
def predict_endpoint():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        predictor = initialize_predictor()
        image_bytes = file.read()
        symptoms = request.form.get('symptoms', '')
        
        # Use your existing medical response system
        result = predictor.predict_with_treatment(image_bytes, symptoms)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
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
    print("Skin Disease Prediction API started!")
    print(f"Loaded {len(predictor.class_names)} classes: {predictor.class_names}")
    app.run(host='0.0.0.0', port=5000, debug=False)
