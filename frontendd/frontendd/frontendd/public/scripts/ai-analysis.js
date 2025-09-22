// Analysis Frontend JavaScript
class AIAnalysis {
    constructor() {
        this.currentTab = 'comprehensive';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                this.switchTab(tabId, tabButtons, tabContents);
            });
        });
    }

    switchTab(tabId, tabButtons, tabContents) {
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to selected button and content
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
        
        this.currentTab = tabId;
    }

    setupEventListeners() {
        // Comprehensive analysis
        document.getElementById('analyze-comprehensive').addEventListener('click', () => {
            this.analyzeComprehensive();
        });

        // Text analysis
        document.getElementById('analyze-text').addEventListener('click', () => {
            this.analyzeText();
        });

        // Audio analysis
        document.getElementById('analyze-audio').addEventListener('click', () => {
            this.analyzeAudio();
        });

        // Image analysis
        document.getElementById('analyze-image').addEventListener('click', () => {
            this.analyzeImage();
        });
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showResults(results) {
        this.hideLoading();
        document.getElementById('results').style.display = 'block';
        document.getElementById('results-content').innerHTML = this.formatResults(results);
    }

    showError(message) {
        this.hideLoading();
        document.getElementById('results').style.display = 'block';
        document.getElementById('results-content').innerHTML = `
            <div class="error-message">
                <h4>Analysis Failed</h4>
                <p>${message}</p>
            </div>
        `;
    }

    async analyzeComprehensive() {
        const formData = new FormData();
        
        // Get text data
        const symptomText = document.getElementById('symptom-text').value.trim();
        const breed = document.getElementById('breed').value.trim();
        const age = document.getElementById('age').value.trim();
        const sex = document.getElementById('sex').value.trim();

        if (!symptomText && !document.getElementById('image-upload').files[0] && !document.getElementById('audio-upload').files[0]) {
            alert('Please provide at least one type of data (text, image, or audio)');
            return;
        }

        // Add text data
        if (symptomText) formData.append('symptom_text', symptomText);
        if (breed) formData.append('breed', breed);
        if (age) formData.append('age', age);
        if (sex) formData.append('sex', sex);

        // Add image file
        const imageFile = document.getElementById('image-upload').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        // Add audio file
        const audioFile = document.getElementById('audio-upload').files[0];
        if (audioFile) {
            formData.append('audio', audioFile);
        }

        this.showLoading();

        try {
            const response = await fetch('/api/ai/analyze/comprehensive', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.showResults(data);
            } else {
                this.showError(data.error || 'Analysis failed');
            }
        } catch (error) {
            this.showError(`Network error: ${error.message}`);
        }
    }

    async analyzeText() {
        const symptomText = document.getElementById('text-symptoms').value.trim();
        const breed = document.getElementById('text-breed').value.trim();
        const age = document.getElementById('text-age').value.trim();
        const sex = document.getElementById('text-sex').value.trim();

        if (!symptomText) {
            alert('Please enter symptom description');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/ai/analyze/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    symptom_text: symptomText,
                    breed: breed || undefined,
                    age: age ? parseInt(age) : undefined,
                    sex: sex || undefined
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showResults(data);
            } else {
                this.showError(data.error || 'Text analysis failed');
            }
        } catch (error) {
            this.showError(`Network error: ${error.message}`);
        }
    }

    async analyzeAudio() {
        const audioFile = document.getElementById('audio-file').files[0];

        if (!audioFile) {
            alert('Please select an audio file');
            return;
        }

        const formData = new FormData();
        formData.append('audio', audioFile);

        this.showLoading();

        try {
            const response = await fetch('/api/ai/analyze/audio', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.showResults(data);
            } else {
                this.showError(data.error || 'Audio analysis failed');
            }
        } catch (error) {
            this.showError(`Network error: ${error.message}`);
        }
    }

    async analyzeImage() {
        const imageFile = document.getElementById('image-file').files[0];
        const symptoms = document.getElementById('image-symptoms').value.trim();

        if (!imageFile) {
            alert('Please select an image file');
            return;
        }

        const formData = new FormData();
        formData.append('image', imageFile);
        if (symptoms) {
            formData.append('symptoms', symptoms);
        }

        this.showLoading();

        try {
            const response = await fetch('/api/ai/analyze/image', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.showResults(data);
            } else {
                this.showError(data.error || 'Image analysis failed');
            }
        } catch (error) {
            this.showError(`Network error: ${error.message}`);
        }
    }

    formatResults(data) {
        if (data.status === 'success' && data.comprehensive_report) {
            return this.formatComprehensiveResults(data);
        } else if (data.status === 'success' && data.data) {
            return this.formatIndividualResults(data);
        } else {
            return `<div class="error-message">Invalid response format</div>`;
        }
    }

    formatComprehensiveResults(data) {
        const report = data.comprehensive_report;
        
        let html = `
            <div class="success-message">
                <h4>Comprehensive Analysis Complete</h4>
                <p>${report.overall_assessment}</p>
            </div>
        `;

        if (report.urgency_level === 'high') {
            html += `
                <div class="result-card urgency-high">
                    <h4>URGENT ATTENTION REQUIRED</h4>
                    <p>Based on the analysis, immediate veterinary attention is recommended.</p>
                </div>
            `;
        }

        if (report.primary_diagnoses && report.primary_diagnoses.length > 0) {
            html += `
                <div class="result-card">
                    <h4>Primary Diagnoses</h4>
                    ${report.primary_diagnoses.map(diagnosis => `
                        <div style="margin-bottom: 15px;">
                            <strong>${diagnosis.diagnosis}</strong> 
                            <span style="color: #6c757d;">(${diagnosis.source})</span>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: ${diagnosis.confidence * 100}%"></div>
                            </div>
                            <small>Confidence: ${(diagnosis.confidence * 100).toFixed(1)}%</small>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (report.treatment_recommendations && report.treatment_recommendations.length > 0) {
            html += `
                <div class="result-card">
                    <h4>Treatment Recommendations</h4>
                    <ul class="treatment-list">
                        ${report.treatment_recommendations.map(treatment => `<li>${treatment}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        if (report.emergency_flags && report.emergency_flags.length > 0) {
            html += `
                <div class="result-card urgency-high">
                    <h4>Emergency Flags</h4>
                    <ul>
                        ${report.emergency_flags.map(flag => `<li>${flag}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        return html;
    }

    formatIndividualResults(data) {
        const resultData = data.data;
        
        let html = `
            <div class="success-message">
                <h4> ${data.type.charAt(0).toUpperCase() + data.type.slice(1)} Analysis Complete</h4>
            </div>
        `;

        if (data.type === 'text') {
            html += this.formatTextResults(resultData);
        } else if (data.type === 'audio') {
            html += this.formatAudioResults(resultData);
        } else if (data.type === 'image') {
            html += this.formatImageResults(resultData);
        }

        return html;
    }

    formatTextResults(data) {
        let html = '';

        if (data.predictions && data.predictions.length > 0) {
            html += `
                <div class="result-card ${data.urgent_care ? 'urgency-high' : 'urgency-low'}">
                    <h4>Disease Predictions</h4>
                    ${data.predictions.map(pred => `
                        <div style="margin-bottom: 15px;">
                            <strong>${pred.disease}</strong>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: ${pred.confidence * 100}%"></div>
                            </div>
                            <small>Confidence: ${(pred.confidence * 100).toFixed(1)}% - ${pred.confidence_level}</small>
                            <p style="margin: 5px 0; font-size: 0.9em; color: #6c757d;">${pred.explanation}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (data.top_treatments && data.top_treatments.length > 0) {
            html += `
                <div class="result-card">
                    <h4>Treatment Recommendations</h4>
                    <ul class="treatment-list">
                        ${data.top_treatments.map(treatment => `<li>${treatment}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        return html;
    }

    formatAudioResults(data) {
        let html = '';

        if (data.predictions && data.predictions.length > 0) {
            html += `
                <div class="result-card">
                    <h4>Audio Analysis Results</h4>
                    ${data.predictions.map(pred => `
                        <div style="margin-bottom: 15px;">
                            <strong>${pred.disease}</strong>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: ${pred.confidence * 100}%"></div>
                            </div>
                            <small>Confidence: ${(pred.confidence * 100).toFixed(1)}% - ${pred.confidence_level}</small>
                            <p style="margin: 5px 0; font-size: 0.9em; color: #6c757d;">${pred.explanation}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return html;
    }

    formatImageResults(data) {
        let html = '';

        if (data.medical_advice) {
            const advice = data.medical_advice;
            html += `
                <div class="result-card ${advice.is_emergency ? 'urgency-high' : advice.urgency_level === 'high' ? 'urgency-moderate' : 'urgency-low'}">
                    <h4>Image Analysis Results</h4>
                    <p><strong>Diagnosis:</strong> ${advice.diagnosis}</p>
                    <p><strong>Confidence:</strong> ${(advice.confidence * 100).toFixed(1)}%</p>
                    <p><strong>Recommendation:</strong> ${advice.recommendation}</p>
                </div>
            `;

            if (advice.treatments && advice.treatments.length > 0) {
                html += `
                    <div class="result-card">
                        <h4>Treatment Plan</h4>
                        <ul class="treatment-list">
                            ${advice.treatments.map(treatment => `<li>${treatment}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
        }

        return html;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AIAnalysis();
});
