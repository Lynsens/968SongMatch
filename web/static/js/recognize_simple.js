// Simplified Working JavaScript for Audio Recognition

console.log('Loading recognize_simple.js');

let selectedFile = null;

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    initializePage();
});

function initializePage() {
    setupFileInput();
    setupRecognizeButton();
    console.log('Page initialized');
}

function setupFileInput() {
    const fileInput = document.getElementById('audioFile');
    const dropZone = document.getElementById('dropZone');
    
    if (!fileInput || !dropZone) {
        console.error('File input or drop zone not found');
        return;
    }
    
    // File input change handler
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        console.log('File input changed:', file ? file.name : 'no file');
        if (file) {
            selectedFile = file;
            updateDisplay(file);
        }
    });
    
    // Drop zone click handler
    dropZone.addEventListener('click', function(e) {
        console.log('Drop zone clicked');
        fileInput.click();
    });
    
    // Drag and drop handlers
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, function(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.backgroundColor = '#f0f8ff';
        });
    });
    
    ['dragleave', 'dragend'].forEach(eventName => {
        dropZone.addEventListener(eventName, function(e) {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.backgroundColor = '';
        });
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.style.backgroundColor = '';
        
        const files = e.dataTransfer.files;
        console.log('Files dropped:', files.length);
        
        if (files.length > 0) {
            const file = files[0];
            selectedFile = file;
            
            // Don't try to set fileInput.files, just use selectedFile directly
            console.log('File set via drag & drop:', file.name);
            updateDisplay(file);
        }
    });
}

function setupRecognizeButton() {
    const button = document.getElementById('recognizeBtn');
    const form = document.getElementById('recognizeForm');
    
    if (!button) {
        console.error('Recognize button not found');
        return;
    }
    
    // Prevent form submission and handle click
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleRecognition();
        });
    }
    
    button.addEventListener('click', function(e) {
        e.preventDefault();
        handleRecognition();
    });
    
    console.log('Recognize button setup complete');
}

function updateDisplay(file) {
    const dropZone = document.getElementById('dropZone');
    const content = dropZone.querySelector('.drop-zone-content');
    
    if (!content) return;
    
    // Validate file type
    const validExtensions = ['mp3', 'wav', 'flac', 'm4a', 'ogg'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
        showAlert('Invalid file type. Please select an audio file (MP3, WAV, FLAC, M4A, OGG)', 'danger');
        selectedFile = null;
        return;
    }
    
    content.innerHTML = `
        <i class="fas fa-file-audio fa-3x text-success mb-3"></i>
        <h5>${file.name}</h5>
        <p class="text-muted">${formatFileSize(file.size)}</p>
        <button type="button" class="btn btn-outline-secondary" onclick="clearFile()">
            Change File
        </button>
    `;
    
    console.log('Display updated for:', file.name);
    showAlert(`File selected: ${file.name}`, 'success');
}

function clearFile() {
    selectedFile = null;
    const fileInput = document.getElementById('audioFile');
    if (fileInput) {
        fileInput.value = '';
    }
    
    const dropZone = document.getElementById('dropZone');
    const content = dropZone.querySelector('.drop-zone-content');
    
    if (content) {
        content.innerHTML = `
            <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
            <h5>Drag & drop your audio file here</h5>
            <p class="text-muted">or click to browse</p>
            <button type="button" class="btn btn-outline-primary">
                Choose File
            </button>
        `;
    }
    
    console.log('File cleared');
}

async function handleRecognition() {
    console.log('Recognition started');
    console.log('Selected file:', selectedFile ? selectedFile.name : 'none');
    
    if (!selectedFile) {
        showAlert('Please select an audio file first', 'warning');
        return;
    }
    
    try {
        // Show progress
        showProgress(true);
        disableButton(true);
        
        // Create form data
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        console.log('Sending request to /api/recognize');
        
        // Make API call
        const response = await fetch('/api/recognize', {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        // Show results
        showResults(result);
        
    } catch (error) {
        console.error('Recognition error:', error);
        showAlert(`Recognition failed: ${error.message}`, 'danger');
    } finally {
        showProgress(false);
        disableButton(false);
    }
}

function showProgress(show) {
    const progressCard = document.getElementById('progressCard');
    if (progressCard) {
        progressCard.style.display = show ? 'block' : 'none';
    }
}

function disableButton(disable) {
    const button = document.getElementById('recognizeBtn');
    if (button) {
        button.disabled = disable;
        button.innerHTML = disable ? 
            '<i class="fas fa-spinner fa-spin me-2"></i>Processing...' :
            '<i class="fas fa-search me-2"></i>Recognize Song';
    }
}

function showResults(result) {
    const resultsCard = document.getElementById('resultsCard');
    const resultsContent = document.getElementById('resultsContent');
    
    if (!resultsCard || !resultsContent) return;
    
    let html = '';
    
    if (result.status === 'match_found') {
        html = `
            <div class="alert alert-success">
                <h4><i class="fas fa-check-circle me-2"></i>Match Found!</h4>
                <h5 class="mb-2">${result.song_name}</h5>
                <p class="mb-1"><strong>Confidence:</strong> ${(result.confidence * 100).toFixed(1)}%</p>
                ${result.offset_seconds ? `<p class="mb-0"><strong>Offset:</strong> ${result.offset_seconds.toFixed(1)}s</p>` : ''}
            </div>
        `;
    } else {
        html = `
            <div class="alert alert-warning">
                <h4><i class="fas fa-exclamation-triangle me-2"></i>No Match Found</h4>
                <p class="mb-0">Could not identify this audio file.</p>
                <small>Make sure the song is in the database and audio quality is good.</small>
            </div>
        `;
    }
    
    resultsContent.innerHTML = html;
    resultsCard.style.display = 'block';
    
    // Hide results after 10 seconds
    setTimeout(() => {
        if (resultsCard) resultsCard.style.display = 'none';
    }, 10000);
}

function showAlert(message, type) {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 3000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Quick Test Functions
function showCreateSlices() {
    console.log('Showing create slices modal...');
    const modal = new bootstrap.Modal(document.getElementById('createSlicesModal'));
    modal.show();
}

async function createSlices() {
    console.log('Creating audio slices...');
    
    const fileInput = document.getElementById('sliceFile');
    const duration = document.getElementById('sliceDuration').value;
    const count = document.getElementById('sliceCount').value;
    
    if (!fileInput.files[0]) {
        showAlert('Please select a file first', 'warning');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('duration', duration);
        formData.append('count', count);
        
        showAlert('Creating audio slices...', 'info');
        
        const response = await fetch('/api/slices', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('createSlicesModal'));
        modal.hide();
        
        // Show success
        showAlert(`Successfully created ${result.slices_created} audio slices`, 'success');
        
    } catch (error) {
        console.error('Create slices error:', error);
        showAlert(`Failed to create slices: ${error.message}`, 'danger');
    }
}

function hideResults() {
    const resultsCard = document.getElementById('resultsCard');
    if (resultsCard) {
        resultsCard.style.display = 'none';
    }
}

// Global functions
window.clearFile = clearFile;
window.showCreateSlices = showCreateSlices;
window.createSlices = createSlices;
window.hideResults = hideResults;

console.log('recognize_simple.js loaded');