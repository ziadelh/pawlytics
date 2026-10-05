
import torch
import joblib
import json
from transformers import AutoTokenizer, AutoModel
from sklearn.preprocessing import LabelEncoder
import re

class DogDiseaseClassifier:
    def __init__(self, model_assets_path):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model_assets_path = model_assets_path
        
        # load configuration
        with open(f'{model_assets_path}/model_config.json', 'r') as f:
            self.config = json.load(f)
        
        # load label encoder
        self.label_encoder = joblib.load(f'{model_assets_path}/label_encoder.pkl')
        
        # load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(f'{model_assets_path}/tokenizer')
        
        # load treatment suggestions
        with open(f'{model_assets_path}/treatment_suggestions.json', 'r') as f:
            self.treatment_suggestions = json.load(f)
            
        # load severity levels
        with open(f'{model_assets_path}/severity_levels.json', 'r') as f:
            self.severity_levels = json.load(f)
        
        # initialize model
        self.model = self._create_model()
        self.model.load_state_dict(torch.load(f'{model_assets_path}/dog_disease_model.pth', 
                                            map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
    
    def _create_model(self):
        model_assets_path = self.model_assets_path
        class EnhancedDiseaseClassifier(torch.nn.Module):
            def __init__(self, num_classes, model_name="emilyalsentzer/Bio_ClinicalBERT"):
                super().__init__()
                self.bert = AutoModel.from_pretrained(f'{model_assets_path}/bio_clinical_bert', 
                                                     local_files_only=True)                
                self.dropout = torch.nn.Dropout(0.3)
                self.hidden = torch.nn.Linear(self.bert.config.hidden_size, 256)
                self.classifier = torch.nn.Linear(256, num_classes)
                self.relu = torch.nn.ReLU()
            
            def forward(self, input_ids, attention_mask, labels=None):
                outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
                pooled_output = outputs.last_hidden_state[:, 0, :]
                pooled_output = self.dropout(pooled_output)
                hidden = self.relu(self.hidden(pooled_output))
                hidden = self.dropout(hidden)
                logits = self.classifier(hidden)
                
                loss = None
                if labels is not None:
                    loss_fct = torch.nn.CrossEntropyLoss()  
                    loss = loss_fct(logits, labels)
                
                return loss, logits
                
        return EnhancedDiseaseClassifier(self.config["num_classes"], self.config["model_name"])
    
    def get_treatment_suggestions(self, disease_name):
        disease_lower = disease_name.lower()
        
        if any(keyword in disease_lower for keyword in ['dental', 'teeth', 'gingivitis', 'periodontal']):
            return self.treatment_suggestions['dental']
        elif any(keyword in disease_lower for keyword in ['ear infection', 'otitis', 'ear mites']):
            return self.treatment_suggestions['ear infection']
        elif any(keyword in disease_lower for keyword in ['giardia', 'parasite', 'intestinal worms']):
            return self.treatment_suggestions['giardia']
        elif any(keyword in disease_lower for keyword in ['allerg', 'pruritis', 'dermatitis', 'skin allergy']):
            return self.treatment_suggestions['allergy']
        elif any(keyword in disease_lower for keyword in ['arthritis', 'joint', 'orthopedic', 'hip dysplasia']):
            return self.treatment_suggestions['arthritis']
        elif any(keyword in disease_lower for keyword in ['kennel cough', 'tracheobronchitis', 'respiratory infection']):
            return self.treatment_suggestions['kennel cough']
        elif any(keyword in disease_lower for keyword in ['bite', 'trauma', 'laceration', 'wound', 'injury']):
            return self.treatment_suggestions['trauma']
        elif any(keyword in disease_lower for keyword in ['cataract']):
            return self.treatment_suggestions['cataract']
        elif any(keyword in disease_lower for keyword in ['murmur', 'cardiac', 'heart disease']):
            return self.treatment_suggestions['heart murmur']
        else:
            return self.treatment_suggestions['default']
    
    def calculate_symptom_severity(self, symptoms_text):
        symptom_text_lower = symptoms_text.lower()
        severity_score = 1
        
        # critical indicators 
        critical_indicators = [
            'unconscious', 'seizure', 'paralysis', 'collapse', 
            'pale gums', 'bloat', 'distended abdomen', 'difficulty breathing'
        ]
        
        # severe indicators 
        severe_indicators = [
            'bleeding', 'vomiting blood', 'bloody diarrhea', 'unable to stand',
            'crying in pain', 'swollen abdomen', 'high fever'
        ]
        
        # moderate indicators
        moderate_indicators = [
            'vomiting', 'diarrhea', 'lethargy', 'pain', 'limp', 'not eating',
            'fever', 'coughing', 'whining', 'difficulty urinating'
        ]
        
        # check for critical indicators
        for indicator in critical_indicators:
            if re.search(r'\b' + re.escape(indicator) + r'\b', symptom_text_lower):
                severity_score = max(severity_score, self.severity_levels['critical'])
        
        # check for severe indicators
        for indicator in severe_indicators:
            if re.search(r'\b' + re.escape(indicator) + r'\b', symptom_text_lower):
                severity_score = max(severity_score, self.severity_levels['severe'])
        
        # check for moderate indicators
        for indicator in moderate_indicators:
            if re.search(r'\b' + re.escape(indicator) + r'\b', symptom_text_lower):
                severity_score = max(severity_score, self.severity_levels['moderate'])
        
        return severity_score
    
    def predict(self, symptom_text, breed=None, age=None, sex=None, top_k=3):
        # validate top_k parameter
        if not isinstance(top_k, int) or top_k <= 0:
            top_k = 3  
        top_k = min(top_k, self.config["num_classes"])
        
        # clinical description
        clinical_text = symptom_text
        if breed:
            clinical_text += f" Breed: {breed}"
        if age:
            clinical_text += f" Age: {age} years"
        if sex:
            clinical_text += f" Sex: {sex}"
        
        # tokenize input
        encoding = self.tokenizer(
            clinical_text,
            truncation=True,
            padding='max_length',
            max_length=self.config["max_length"],
            return_tensors='pt'
        )
        
        input_ids = encoding['input_ids'].to(self.device)
        attention_mask = encoding['attention_mask'].to(self.device)
        
        # get prediction
        with torch.no_grad():
            _, logits = self.model(input_ids=input_ids, attention_mask=attention_mask)
            probabilities = torch.softmax(logits, dim=1)
            top_probs, top_indices = torch.topk(probabilities, top_k)
        
        results = []
        for i in range(top_k):
            disease = self.label_encoder.inverse_transform([top_indices[0][i].item()])[0]
            prob = top_probs[0][i].item()
            
            # generate confidence explanation
            if prob > 0.7:
                confidence_level = "High confidence"
                explanation = "Clear symptom patterns match this condition"
            elif prob > 0.5:
                confidence_level = "Moderate confidence" 
                explanation = "Good symptom alignment with some uncertainty"
            elif prob > 0.3:
                confidence_level = "Low confidence"
                explanation = "Symptoms could indicate multiple conditions"
            else:
                confidence_level = "Very low confidence"
                explanation = "Limited symptom information available"
            
            results.append({
                'disease': disease, 
                'confidence': prob,
                'confidence_level': confidence_level,
                'explanation': explanation,
                'treatments': self.get_treatment_suggestions(disease),
                'severity': self.calculate_symptom_severity(symptom_text)
            })
        
        # calculate severity
        severity_score = self.calculate_symptom_severity(clinical_text)
        score_to_level = {v: k for k, v in self.severity_levels.items()}
        severity_level = score_to_level.get(severity_score, "unknown")        
       
        # format comprehensive results
        result = {
            'symptoms': symptom_text,
            'demographics': {'breed': breed, 'age': age, 'sex': sex},
            'severity': {'score': severity_score, 'level': severity_level},
            'urgent_care': severity_score >= self.severity_levels['severe'],
            'predictions': results,
            'top_disease': results[0]['disease'],
            'top_confidence': results[0]['confidence'],
            'top_treatments': results[0]['treatments'][:3]  
        }
        
        return result

