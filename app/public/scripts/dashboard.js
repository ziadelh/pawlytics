let healthChart = null;

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded, initializing...');
    
    try {
        loadDashboardData();
        initializeTabs();
        initializeNotifications();
        console.log('Dashboard initialization complete');
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('Failed to load dashboard data');
    }
});

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadHealthStats(),
            loadRecentLogs(),
            loadPetsList()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

// Load health statistics
async function loadHealthStats() {
    try {
        const response = await fetch('/api/health/stats');
        const data = await response.json();
        
        if (data.success) {
            updateStatsDisplay(data.stats);
        }
    } catch (error) {
        console.error('Error loading health stats:', error);
    }
}

// Update statistics display
function updateStatsDisplay(stats) {
    document.getElementById('totalLogs').textContent = stats.totalLogs || 0;
    document.getElementById('pendingLogs').textContent = stats.pendingAnalysis || 0;
    document.getElementById('completedLogs').textContent = stats.completedAnalysis || 0;
    document.getElementById('emergencyLogs').textContent = stats.emergencyCases || 0;
}

// Load recent health logs
async function loadRecentLogs() {
    try {
        const response = await fetch('/api/health/stats');
        const data = await response.json();
        
        if (data.success && data.recentLogs) {
            displayRecentLogs(data.recentLogs);
        } else {
            showNoLogs();
        }
    } catch (error) {
        console.error('Error loading recent logs:', error);
        showNoLogs();
    }
}

// Display recent logs
function displayRecentLogs(logs) {
    const container = document.getElementById('recentLogs');
    
    if (logs.length === 0) {
        showNoLogs();
        return;
    }
    
    container.innerHTML = logs.map(log => createLogItem(log)).join('');
}

// Create log item element
function createLogItem(log) {
    const statusClass = getStatusClass(log.aiAnalysis?.status);
    const urgencyClass = getUrgencyClass(log.aiAnalysis?.urgency);
    const date = new Date(log.createdAt).toLocaleDateString();
    
    return `
        <div class="log-item">
            <h4>${log.symptoms?.text || 'Health Check'}</h4>
            <p>${log.symptoms?.description || 'No description available'}</p>
            <div class="log-meta">
                <span class="status-badge ${statusClass}">${log.aiAnalysis?.status || 'Pending'}</span>
                <span class="log-date">${date}</span>
            </div>
        </div>
    `;
}

// Show no logs message
function showNoLogs() {
    const container = document.getElementById('recentLogs');
    container.innerHTML = '<div class="loading">No recent health logs found</div>';
}

// Load pets list
async function loadPetsList() {
    try {
        const response = await fetch('/api/dogs');
        const data = await response.json();
        
        if (data.success && data.dogs) {
            displayPetsList(data.dogs);
        } else {
            showNoPets();
        }
    } catch (error) {
        console.error('Error loading pets:', error);
        showNoPets();
    }
}

// Display pets list
function displayPetsList(pets) {
    const container = document.getElementById('petsList');
    
    if (pets.length === 0) {
        showNoPets();
        return;
    }
    
    container.innerHTML = '';
    
    // Add each pet item
    pets.forEach(pet => {
        const petItem = createPetItem(pet);
        container.appendChild(petItem);
    });
}

// Create pet item element
function createPetItem(pet) {
    const age = pet.age ? `${pet.age} years old` : 'Age unknown';
    const breed = pet.breed || 'Unknown breed';
    
    const petItem = document.createElement('div');
    petItem.className = 'pet-item';
    
    petItem.innerHTML = `
        <div class="pet-avatar">
            ${pet.name.charAt(0).toUpperCase()}
        </div>
        <div class="pet-info">
            <h4>${pet.name}</h4>
            <p>${breed} • ${age}</p>
        </div>
        <button class="btn-small view-pet-btn" data-pet-id="${pet._id}">View</button>
    `;
    
    // event listener to view button
    const viewBtn = petItem.querySelector('.view-pet-btn');
    viewBtn.addEventListener('click', function() {
        const petId = this.getAttribute('data-pet-id');
        viewPet(petId);
    });
    
    return petItem;
}

// Show no pets message
function showNoPets() {
    const container = document.getElementById('petsList');
    container.innerHTML = '<div class="loading">No pets found. Add your first pet!</div>';
}

// Initialize analytics tabs
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Initialize chart if trends tab is selected
            if (targetTab === 'trends') {
                initializeChart();
            }
        });
    });
    
    // Initialize chart for default active tab
    initializeChart();
}

// Initialize health chart
function initializeChart() {
    const ctx = document.getElementById('healthChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (healthChart) {
        healthChart.destroy();
    }
    
    healthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Health Score',
                data: [85, 78, 90, 86, 92, 88],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: '#f3f4f6'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Initialize notifications
function initializeNotifications() {
    const settingsBtn = document.querySelector('.btn-icon');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            alert('Notification settings coming soon!');
        });
    }
    
    // Notification action buttons
    document.querySelectorAll('.notification-actions .btn-small').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.textContent;
            showSuccessMessage(`${action} action triggered!`);
        });
    });
}


// View pet function
window.viewPet = function(petId) {
    showSuccessMessage(`Viewing pet ${petId} - Feature coming soon!`);
};

// Utility functions
function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'processing': 'status-processing',
        'completed': 'status-completed',
        'failed': 'status-failed'
    };
    return statusMap[status] || 'status-pending';
}

function getUrgencyClass(urgency) {
    const urgencyMap = {
        'low': 'urgency-low',
        'medium': 'urgency-medium',
        'high': 'urgency-high',
        'emergency': 'urgency-emergency'
    };
    return urgencyMap[urgency] || 'urgency-low';
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
function showError(message) {
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}
