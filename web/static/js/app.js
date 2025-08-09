// Global JavaScript for Dejavu Audio Recognition Web Interface

// Configuration
const API_BASE = '/api';
const STATUS_CHECK_INTERVAL = 30000; // 30 seconds

// Global state
let systemStatus = 'disconnected';

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// App initialization
function initializeApp() {
    checkSystemStatus();
    setInterval(checkSystemStatus, STATUS_CHECK_INTERVAL);
}

// System status checking
async function checkSystemStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        
        if (data.status === 'ok') {
            updateStatusIndicator('connected', `${data.songs_count} songs`);
            systemStatus = 'connected';
        } else {
            updateStatusIndicator('disconnected', 'Error');
            systemStatus = 'disconnected';
        }
    } catch (error) {
        updateStatusIndicator('disconnected', 'Offline');
        systemStatus = 'disconnected';
        console.error('Status check failed:', error);
    }
}

// Update status indicator in navbar
function updateStatusIndicator(status, text) {
    const statusIcon = document.getElementById('status-text');
    const statusCircle = document.querySelector('#status-indicator i');
    
    if (!statusIcon || !statusCircle) return;
    
    // Update text
    statusIcon.textContent = text;
    
    // Update icon classes
    statusCircle.className = 'fas fa-circle';
    
    switch (status) {
        case 'connected':
            statusCircle.classList.add('text-success');
            break;
        case 'loading':
            statusCircle.classList.add('text-warning');
            break;
        case 'disconnected':
        default:
            statusCircle.classList.add('text-danger');
            break;
    }
}

// File handling utilities
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
}

function isAudioFile(filename) {
    const audioExtensions = ['mp3', 'wav', 'flac', 'm4a', 'ogg'];
    return audioExtensions.includes(getFileExtension(filename));
}

// API utilities
async function makeAPIRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                ...options.headers,
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// UI utilities
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alertContainer') || createAlertContainer();
    
    const alertId = 'alert_' + Date.now();
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // Auto-dismiss after duration
    if (duration > 0) {
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                const bsAlert = new bootstrap.Alert(alertElement);
                bsAlert.close();
            }
        }, duration);
    }
}

function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alertContainer';
    container.className = 'position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
    }
}

// Progress utilities
function updateProgress(elementId, percentage, text = '') {
    const progressBar = document.getElementById(elementId);
    const progressText = document.getElementById(elementId.replace('Bar', 'Text'));
    const progressBarText = document.getElementById('progressBarText');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
        
        // Update text inside the progress bar
        if (progressBarText) {
            progressBarText.textContent = `${percentage.toFixed(1)}%`;
        }
    }
    
    if (progressText && text) {
        progressText.textContent = text;
    }
}

function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
        element.classList.add('fade-in');
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
        element.classList.remove('fade-in');
    }
}

// File validation
function validateAudioFile(file, maxSize = 50 * 1024 * 1024) { // 50MB default
    if (!file) {
        throw new Error('No file selected');
    }
    
    if (!isAudioFile(file.name)) {
        throw new Error('Invalid file type. Please select an audio file (MP3, WAV, FLAC, M4A, OGG)');
    }
    
    if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${formatFileSize(maxSize)}`);
    }
    
    return true;
}

// Form utilities
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        
        // Clear custom file displays
        const fileDisplays = form.querySelectorAll('[id*="List"], [id*="Display"]');
        fileDisplays.forEach(display => {
            display.style.display = 'none';
            display.innerHTML = '';
        });
    }
}

function disableForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const inputs = form.querySelectorAll('input, button, select, textarea');
        inputs.forEach(input => input.disabled = true);
    }
}

function enableForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const inputs = form.querySelectorAll('input, button, select, textarea');
        inputs.forEach(input => input.disabled = false);
    }
}

// Time formatting utilities
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    } else {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}m ${secs}s`;
    }
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Confidence percentage formatting
function formatConfidence(confidence) {
    if (confidence === null || confidence === undefined) {
        return 'N/A';
    }
    return `${(confidence * 100).toFixed(1)}%`;
}

// Export functions for use in other scripts
window.DejavuApp = {
    // API utilities
    makeAPIRequest,
    
    // UI utilities
    showAlert,
    showModal,
    hideModal,
    showElement,
    hideElement,
    updateProgress,
    
    // File utilities
    validateAudioFile,
    formatFileSize,
    isAudioFile,
    
    // Form utilities
    resetForm,
    disableForm,
    enableForm,
    
    // Formatting utilities
    formatTime,
    formatTimestamp,
    formatConfidence,
    
    // System status
    get systemStatus() { return systemStatus; }
};