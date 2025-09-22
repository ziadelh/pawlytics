// Scroll to top on page load
window.scrollTo({ top: 0, behavior: "smooth" });

// Loader fade-out
window.addEventListener('load', () => {
  const loader = document.getElementById('loader-wrapper');
  if (loader) {
    setTimeout(() => loader.classList.add('fade-out'), 500);
  }
});

// Emergency detection keywords
const EMERGENCY_KEYWORDS = [
  "seizure", "unconscious", "collapse", "bleeding", "bloat", 
  "distended", "difficulty breathing", "pale gums", "paralysis",
  "not breathing", "choking", "emergency", "urgent", "critical"
];

// Dog-related keywords for validation
const DOG_KEYWORDS = [
  "dog", "puppy", "canine", "pet", "animal", "veterinary", "vet",
  "bark", "tail", "paw", "fur", "coat", "breed", "puppy", "kennel",
  "collar", "leash", "walk", "fetch", "sit", "stay", "come"
];

const DOG_SYMPTOM_KEYWORDS = [
  "cough", "sneeze", "vomit", "diarrhea", "limping", "scratching", "licking",
  "shaking", "head", "ears", "eyes", "nose", "mouth", "teeth", "gums",
  "breathing", "panting", "eating", "drinking", "sleeping", "playing",
  "lethargic", "fever", "pain", "swelling", "discharge", "bleeding",
  "skin", "rash", "hot spot", "wound", "injury", "sick", "illness"
];

// Input validation functions
function validateSymptomInput(symptoms) {
  if (!symptoms || symptoms.trim().length < 5) {
    return {
      valid: false,
      message: "Please provide symptoms (at least 5 characters)."
    };
  }
  
  // Check if input is dog-related
  const symptomsLower = symptoms.toLowerCase();
  const hasDogKeywords = DOG_KEYWORDS.some(keyword => 
    symptomsLower.includes(keyword)
  );
  const hasSymptomKeywords = DOG_SYMPTOM_KEYWORDS.some(keyword => 
    symptomsLower.includes(keyword)
  );
  
  if (!hasDogKeywords && !hasSymptomKeywords) {
    return {
      valid: false,
      message: "Please describe dog-related symptoms. Examples: 'My dog is coughing', 'Vomiting and diarrhea', 'Limping on front leg'"
    };
  }
  
  // Check for emergency keywords
  const emergencyFound = EMERGENCY_KEYWORDS.some(keyword => 
    symptomsLower.includes(keyword)
  );
  
  if (emergencyFound) {
    return {
      valid: true,
      emergency: true,
      message: "EMERGENCY DETECTED: Please contact your veterinarian immediately or go to an emergency clinic!"
    };
  }
  
  return { valid: true, emergency: false };
}

function validateImageFiles(files) {
  if (!files || files.length === 0) return { valid: true };
  
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const invalidFiles = [];
  
  for (let file of files) {
    if (!validTypes.includes(file.type)) {
      invalidFiles.push(file.name);
    }
  }
  
  if (invalidFiles.length > 0) {
    return {
      valid: false,
      message: `Invalid image files: ${invalidFiles.join(', ')}. Please upload only JPG, PNG, GIF, or WebP images.`
    };
  }
  
  return { valid: true };
}

// Basic image content validation 
function validateImageContent(file) {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = function() {
      const isValid = img.width > 30 && img.height > 30; 
      
      resolve({
        valid: isValid,
        message: isValid ? null : "Please upload a valid image file"
      });
    };
    
    img.onerror = function() {
      resolve({
        valid: false,
        message: "Invalid image file. Please upload a valid image."
      });
    };
    
    img.src = URL.createObjectURL(file);
  });
}


function validateAudioFiles(files) {
  if (!files || files.length === 0) return { valid: true };
  
  const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/aac', 'audio/ogg'];
  const invalidFiles = [];
  
  for (let file of files) {
    if (!validTypes.includes(file.type)) {
      invalidFiles.push(file.name);
    }
  }
  
  if (invalidFiles.length > 0) {
    return {
      valid: false,
      message: `Invalid audio files: ${invalidFiles.join(', ')}. Please upload only MP3, WAV, M4A, AAC, or OGG audio files.`
    };
  }
  
  return { valid: true };
}

//  audio content validation
function validateAudioContent(file) {
  return new Promise((resolve) => {
    const audio = new Audio();
    
    audio.onloadedmetadata = function() {
      // check duration and file size
      const duration = audio.duration;
      const fileSize = file.size;
      const isValid = duration > 0.5 && duration < 60 && fileSize > 1000 && fileSize < 10000000; 
      
      resolve({
        valid: isValid,
        message: isValid ? null : "Please upload a clear audio recording of your dog's symptoms (coughing, breathing, or vocal sounds) - 0.5 to 60 seconds"
      });
    };
    
    audio.onerror = function() {
      resolve({
        valid: false,
        message: "Invalid audio file. Please upload a valid audio recording."
      });
    };
    
    audio.src = URL.createObjectURL(file);
  });
}

// Load pets on page load
document.addEventListener('DOMContentLoaded', function() {
  checkAuthentication();
  loadPets();
  setupFormSubmission();
  setupFileUploadHandlers();
});

// Check if user is authenticated
function checkAuthentication() {
  // Check if user is logged in
  fetch('/api/dogs')
    .then(response => {
      if (response.status === 401) {
        // User not authenticated, redirect to login
        window.location.href = '/login';
      }
    })
    .catch(error => {
      console.error('Authentication check failed:', error);
      showErrorMessage('Please log in to use the analysis feature.');
    });
}

// pload handlers
function setupFileUploadHandlers() {
  const imageUpload = document.getElementById('imageUpload');
  const audioUpload = document.getElementById('audioUpload');
  
  if (imageUpload) {
    imageUpload.addEventListener('change', function() {
      showFileNames('imageUpload', 'imagePreview');
    });
  }
  
  if (audioUpload) {
    audioUpload.addEventListener('change', function() {
      showFileNames('audioUpload', 'audioPreview');
    });
  }
}

// Load pets for dropdown
async function loadPets() {
  try {
    const response = await fetch('/api/dogs');
    const data = await response.json();
    
    const select = document.getElementById('dogSelect');
    
  if (data.success && data.dogs.length > 0) {
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a pet...';
    select.appendChild(defaultOption);
    data.dogs.forEach(pet => {
      const option = document.createElement('option');
      option.value = pet._id;
      option.textContent = `${pet.name} (${pet.breed})`;
      select.appendChild(option);
    });
  } else {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No pets found. Add a pet first.';
    select.appendChild(option);
  }
  } catch (error) {
    console.error('Error loading pets:', error);
    const select = document.getElementById('dogSelect');
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Error loading pets';
    select.appendChild(option);
  }
}

// Setup form submission
function setupFormSubmission() {
  const form = document.getElementById('analysisForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data for validation
    const formData = new FormData(form);
    const symptoms = formData.get('symptoms');
    const imageFiles = formData.getAll('images');
    const audioFiles = formData.getAll('audio');
    
    // Validate symptoms
    const symptomValidation = validateSymptomInput(symptoms);
    if (!symptomValidation.valid) {
      showErrorMessage(symptomValidation.message);
      return;
    }
    
    // Check for emergency
    if (symptomValidation.emergency) {
      showErrorMessage(symptomValidation.message);
      return;
    }
    
    // Validate image files
    const imageValidation = validateImageFiles(imageFiles);
    if (!imageValidation.valid) {
      showErrorMessage(imageValidation.message);
      return;
    }
    
    // Validate image content
    if (imageFiles.length > 0) {
      try {
        const imageContentValidation = await validateImageContent(imageFiles[0]);
        if (!imageContentValidation.valid) {
          showErrorMessage(imageContentValidation.message);
          return;
        }
      } catch (error) {
        showErrorMessage("Error validating image content. Please try again.");
        return;
      }
    }
    
    // Validate audio files
    const audioValidation = validateAudioFiles(audioFiles);
    if (!audioValidation.valid) {
      showErrorMessage(audioValidation.message);
      return;
    }
    
    // Validate audio content
    if (audioFiles.length > 0) {
      try {
        const audioContentValidation = await validateAudioContent(audioFiles[0]);
        if (!audioContentValidation.valid) {
          showErrorMessage(audioContentValidation.message);
          return;
        }
      } catch (error) {
        showErrorMessage("Error validating audio content. Please try again.");
        return;
      }
    }
    
    // Show loading state
    submitBtn.disabled = true;
    
    try {
      const response = await fetch('/api/health/analyze', {
        method: 'POST',
        body: formData
      });
      
      if (response.status === 401) {
        // User not authenticated
        showErrorMessage('Please log in to use the analysis feature.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        return;
      }
      
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        showErrorMessage('Server returned invalid response. Please try again.');
        return;
      }
      
      if (result.success) {
        showSuccessMessage(result.message);
        // Start polling for results
        if (result.healthLogId) {
          pollForResults(result.healthLogId);
        } else {
          console.error('No healthLogId received from server');
          showErrorMessage('Failed to get analysis ID. Please try again.');
        }
        form.reset();
        showFileNames('imageUpload', 'imagePreview');
        showFileNames('audioUpload', 'audioPreview');
      } else {
        showErrorMessage(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error submitting analysis:', error);
      showErrorMessage('Failed to submit analysis. Please try again.');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function resetButtonState() {
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = false;
  }
}

// Poll analysis results
async function pollForResults(healthLogId) {
  const maxAttempts = 30; 
  let attempts = 0;
  
  resetButtonState();
  showProcessingState();
  
  const poll = async () => {
    try {
      console.log(`Polling attempt ${attempts + 1} for healthLogId: ${healthLogId}`);
      const response = await fetch(`/api/health/analyze/${healthLogId}`);
      const data = await response.json();
      
      console.log('Polling response:', data);
      
      if (data.success && data.healthLog && data.healthLog.aiAnalysis.status === 'completed') {
        console.log('Analysis completed, displaying results:', data.healthLog);
        displayResults(data.healthLog);
        resetButtonState();
        return;
      }
      
      if (data.healthLog && data.healthLog.aiAnalysis.status === 'failed') {
        showErrorMessage('Analysis failed. Please try again.');
        hideProcessingState();
        resetButtonState();
        return;
      }
      
      if (data.healthLog && data.healthLog.aiAnalysis.status === 'processing') {
        console.log('Analysis still processing...');
      } else if (data.healthLog && data.healthLog.aiAnalysis.status === 'pending') {
        console.log('Analysis pending...');
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 3000); 
      } else {
        showErrorMessage('Analysis is taking longer than expected. Please check back later.');
        hideProcessingState();
        resetButtonState();
      }
    } catch (error) {
      console.error('Error polling for results:', error);
      showErrorMessage('Error checking analysis status.');
      hideProcessingState();
      resetButtonState();
    }
  };
  
  setTimeout(poll, 2000); 
}

// Show processing state
function showProcessingState() {
  const resultsSection = document.getElementById('resultsSection');
  const resultsContent = document.getElementById('resultsContent');
  
  if (!resultsSection || !resultsContent) return;
  
  resultsSection.classList.remove('hidden');
  
  resultsContent.innerHTML = `
    <div class="processing-state">
      <div class="processing-animation">
        <div class="spinner"></div>
      </div>
      <h3>AI Analysis in Progress</h3>
      <p>Our AI is analyzing your pet's symptoms, images, and audio...</p>
      <div class="processing-steps">
        <div class="step">Processing text symptoms</div>
        <div class="step">Analyzing images</div>
        <div class="step">Processing audio</div>
      </div>
      <p class="processing-note">This may take 30-60 seconds. Please wait...</p>
    </div>
  `;
  
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Hide processing state
function hideProcessingState() {
  const resultsSection = document.getElementById('resultsSection');
  if (resultsSection) {
    resultsSection.classList.add('hidden');
  }
}

// Display analysis results
function displayResults(healthLog) {
  const resultsSection = document.getElementById('resultsSection');
  const resultsContent = document.getElementById('resultsContent');
  
  const analysis = healthLog.aiAnalysis.results;
  
  // Clear previous results
  resultsContent.innerHTML = '';
  
  // Check confidence levels and create appropriate display
  const confidenceThreshold = 40; 
  const hasHighConfidence = analysis.confidence >= confidenceThreshold;
  
  if (!hasHighConfidence) {
    resultsContent.innerHTML = createLowConfidenceMessage(analysis, healthLog);
  } else {
    resultsContent.innerHTML = createHighConfidenceResults(analysis, healthLog);
  }
  
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Create low confidence message with improvement suggestions
function createLowConfidenceMessage(analysis, healthLog) {
  const symptoms = healthLog.symptoms.text || '';
  const hasImage = healthLog.files.images && healthLog.files.images.length > 0;
  const hasAudio = healthLog.files.audio && healthLog.files.audio.length > 0;
  
  let suggestions = [];
  
  // what's missing or could be improved
  if (symptoms.length < 20) {
    suggestions.push('Provide more detailed symptoms (at least 20 characters)');
  }
  if (!hasImage) {
    suggestions.push('Upload clear photos of the affected area');
  }
  if (!hasAudio) {
    suggestions.push('Record audio of breathing, coughing, or other sounds');
  }
  if (symptoms.toLowerCase().includes('unknown') || symptoms.length < 10) {
    suggestions.push('Be more specific about symptoms and their duration');
  }
  
  return `
    <div class="low-confidence-container">
      <div class="low-confidence-header">
        <h3>Analysis Confidence Too Low</h3>
        <div class="confidence-badge low-confidence">${analysis.confidence}% confidence</div>
      </div>
      
      <div class="low-confidence-content">
        <p>Our AI couldn't provide a reliable diagnosis with the current information. The confidence level is ${analysis.confidence}%, which is below our threshold for accurate results.</p>
        
        <div class="improvement-suggestions">
          <h4>How to Improve Your Analysis:</h4>
          <ul class="suggestion-list">
            ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        </div>
        
        <div class="current-analysis-preview">
          <h4>What We Found (Low Confidence):</h4>
          <div class="preview-diagnosis">
            <strong>Possible Condition:</strong> ${analysis.diagnosis}
          </div>
          <div class="preview-urgency">
            <strong>Urgency Level:</strong> 
            <span class="urgency-badge urgency-${analysis.urgency}">${analysis.urgency.toUpperCase()}</span>
          </div>
        </div>
        
        <div class="retry-section">
          <button onclick="location.reload()" class="retry-button">
            Try Again with Better Input
          </button>
        </div>
      </div>
    </div>
  `;
}

// Create high confidence results with improved layout
function createHighConfidenceResults(analysis, healthLog) {
  const analysisDetails = analysis.analysisDetails || {};
  
  return `
    <div class="analysis-results">
      <div class="results-header">
        <h3>AI Analysis Results</h3>
        <div class="confidence-badge high-confidence">${analysis.confidence}% confidence</div>
      </div>
      
      <div class="results-grid">
        <!-- Primary Diagnosis -->
        <div class="result-card primary-diagnosis">
          <div class="card-header">
            <h4>Primary Diagnosis</h4>
            <span class="confidence-indicator">${analysis.confidence}% confident</span>
          </div>
          <div class="diagnosis-content">
            <div class="diagnosis-name">${analysis.diagnosis}</div>
            <div class="diagnosis-description">Based on comprehensive analysis of symptoms, images, and audio</div>
          </div>
        </div>
        
        <!-- Urgency Level -->
        <div class="result-card urgency-card">
          <div class="card-header">
            <h4>Urgency Level</h4>
          </div>
          <div class="urgency-content">
            <span class="urgency-badge urgency-${analysis.urgency}">${analysis.urgency.toUpperCase()}</span>
            <div class="urgency-description">${getUrgencyDescription(analysis.urgency)}</div>
          </div>
        </div>
        
        <!-- Treatment Recommendations -->
        <div class="result-card recommendations-card">
          <div class="card-header">
            <h4>Treatment Recommendations</h4>
          </div>
          <div class="recommendations-content">
            <ul class="recommendations-list">
              ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        </div>
        
        <!-- Analysis Details -->
        <div class="result-card analysis-details-card">
          <div class="card-header">
            <h4>Analysis Details</h4>
          </div>
          <div class="analysis-details-content">
            ${createAnalysisDetails(analysisDetails)}
          </div>
        </div>
        
        <!-- Next Steps -->
        <div class="result-card next-steps-card">
          <div class="card-header">
            <h4>Next Steps</h4>
          </div>
          <div class="next-steps-content">
            <ul class="next-steps-list">
              ${analysis.suggestedActions.map(action => `<li>${action}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
      
      <!-- Veterinary Recommendation -->
      <div class="vet-recommendation ${analysis.urgency === 'high' || analysis.urgency === 'emergency' ? 'urgent' : 'standard'}">
        <div class="vet-icon">${analysis.urgency === 'high' || analysis.urgency === 'emergency' ? 'URGENT' : 'VET'}</div>
        <div class="vet-message">
          <strong>${analysis.urgency === 'high' || analysis.urgency === 'emergency' ? 'Immediate veterinary attention recommended' : 'Veterinary consultation recommended'}</strong>
          <p>This analysis is for informational purposes only. Always consult with a qualified veterinarian for proper diagnosis and treatment.</p>
        </div>
      </div>
    </div>
  `;
}

// Get urgency description
function getUrgencyDescription(urgency) {
  const descriptions = {
    'low': 'Monitor at home, schedule routine checkup',
    'medium': 'Schedule veterinary appointment within 1-2 days',
    'high': 'Seek veterinary attention within 24 hours',
    'emergency': 'Seek immediate emergency veterinary care'
  };
  return descriptions[urgency] || 'Consult with your veterinarian';
}

// Create analysis details section
function createAnalysisDetails(analysisDetails) {
  let details = '<div class="analysis-sources">';
  
  if (analysisDetails.text) {
    details += `
      <div class="analysis-source">
        <h5>Text Analysis</h5>
        <p>Analyzed symptoms and provided disease predictions</p>
      </div>
    `;
  }
  
  if (analysisDetails.image) {
    details += `
      <div class="analysis-source">
        <h5>Image Analysis</h5>
        <p>Visual inspection of uploaded images</p>
      </div>
    `;
  }
  
  if (analysisDetails.audio) {
    details += `
      <div class="analysis-source">
        <h5>Audio Analysis</h5>
        <p>Sound pattern recognition for respiratory issues</p>
      </div>
    `;
  }
  
  details += '</div>';
  return details;
}

// Helper function to create result cards
function createResultCard(title, content, badge) {
  const card = document.createElement('div');
  card.className = 'result-card';
  
  const header = document.createElement('div');
  header.className = 'result-header';
  
  const titleEl = document.createElement('h4');
  titleEl.textContent = title;
  header.appendChild(titleEl);
  
  if (badge) {
    const [badgeClass, badgeText] = badge.split(':');
    const badgeEl = document.createElement('span');
    badgeEl.className = badgeClass;
    badgeEl.textContent = badgeText;
    header.appendChild(badgeEl);
  }
  
  card.appendChild(header);
  
  if (content) {
    const contentEl = document.createElement('p');
    contentEl.className = 'diagnosis';
    contentEl.textContent = content;
    card.appendChild(contentEl);
  }
  
  // Handle special content types
  if (badge && badge.startsWith('recommendations:')) {
    const list = document.createElement('ul');
    list.className = 'recommendations';
    const items = badge.split(':')[1].split('|');
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    card.appendChild(list);
  }
  
  if (badge && badge.startsWith('actions:')) {
    const list = document.createElement('ul');
    list.className = 'actions';
    const items = badge.split(':')[1].split('|');
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    card.appendChild(list);
  }
  
  return card;
}

// Show file name previews 
function showFileNames(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  
  if (input.files.length > 0) {
    const fileNames = Array.from(input.files).map(file => file.name).join(', ');
    preview.textContent = `${input.files.length} file(s): ${fileNames}`;
  } else {
    preview.textContent = "No files selected";
  }
}

// Show success message
function showSuccessMessage(message) {
  const notification = document.createElement('div');
  notification.className = 'success-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}


// Show error message
function showErrorMessage(message) {
  const existingError = document.querySelector('.error-alert');
  if (existingError) {
    existingError.remove();
  }
  
  // Create error alert at the top of the form
  const form = document.getElementById('analysisForm');
  const errorAlert = document.createElement('div');
  errorAlert.className = 'error-alert';
  errorAlert.innerHTML = `
    <div class="alert alert-error" style="background: #fee; border: 1px solid #fcc; color: #c33; padding: 15px; margin: 10px 0; border-radius: 5px;">
      <h4>Error</h4>
      <p>${message}</p>
    </div>
  `;
  
  // Insert at the top of the form
  form.insertBefore(errorAlert, form.firstChild);
  
  // Scroll to top to show the error
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (errorAlert.parentNode) {
      errorAlert.remove();
    }
  }, 10000);
}

// Reveal animation
const revealElements = document.querySelectorAll('.reveal');
function revealOnScroll() {
  const windowHeight = window.innerHeight;
  revealElements.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < windowHeight - 100) {
      el.classList.add('active');
    }
  });
}
window.addEventListener('scroll', revealOnScroll);
window.addEventListener('load', revealOnScroll);
