// Fixed JavaScript for Audio Recognition Page

console.log('Loading recognize_fixed.js');

// Initialize page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - starting initialization');
    
    // Wait a moment for all scripts to load
    setTimeout(function() {
        initializeRecognizePage();
    }, 100);
});

// Page initialization
function initializeRecognizePage() {
    console.log('Initializing recognize page...');
    
    // Check if DejavuApp is available
    if (typeof window.DejavuApp === 'undefined') {
        console.error('DejavuApp not found! Check if app.js is loaded.');
        return;
    }
    
    setupFileUpload();
    setupRecognizeButton();
    
    console.log('Recognize page initialization complete');
}

// Setup file upload handling
function setupFileUpload() {
    const fileInput = document.getElementById('audioFile');
    const dropZone = document.getElementById('dropZone');
    
    if (!fileInput || !dropZone) {
        console.error('File input or drop zone not found');
        return;
    }
    
    console.log('Setting up file upload...');
    
    // Handle file input change
    fileInput.addEventListener('change', function(e) {
        console.log('File input changed');
        console.log('Files count:', this.files.length);
        
        const file = this.files[0];
        if (file) {
            console.log('File selected via input:', file.name, file.size);
            updateFileDisplay(file);
        } else {
            console.log('No file in input after change');
        }
    });
    
    // Handle drop zone click
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Setup drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function handleDrop(e) {
        console.log('Files dropped');
        const files = e.dataTransfer.files;
        console.log('Dropped files count:', files.length);
        
        if (files.length > 0) {
            console.log('Setting files to input:', files[0].name);
            
            // Create a new FileList and assign it to the input
            const dt = new DataTransfer();
            dt.items.add(files[0]);
            fileInput.files = dt.files;
            
            console.log('Files in input after drop:', fileInput.files.length);
            updateFileDisplay(files[0]);
        }
    }
}

// Setup recognize button
function setupRecognizeButton() {
    const form = document.getElementById('recognizeForm');
    const button = document.getElementById('recognizeBtn');
    
    if (!form || !button) {
        console.error('Form or button not found');
        return;
    }
    
    console.log('Setting up recognize button...');
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted via submit event');
        await startRecognition();
    });
    
    // Handle button click (backup)
    button.addEventListener('click', async function(e) {
        e.preventDefault();
        console.log('Button clicked directly');
        await startRecognition();
    });
}

// Update file display
function updateFileDisplay(file) {
    const dropZone = document.getElementById('dropZone');
    const content = dropZone.querySelector('.drop-zone-content');
    
    if (!content) return;
    
    try {
        // Validate file
        if (!window.DejavuApp.isAudioFile(file.name)) {
            throw new Error('Invalid file type. Please select an audio file (MP3, WAV, FLAC, M4A, OGG)');
        }
        
        // Update display
        content.innerHTML = `
            <i class="fas fa-file-audio fa-3x text-success mb-3"></i>
            <h5>${file.name}</h5>
            <p class="text-muted">${window.DejavuApp.formatFileSize(file.size)}</p>
            <button type="button" class="btn btn-outline-secondary" onclick="clearFileSelection()">
                Change File
            </button>
        `;
        
        console.log('File display updated for:', file.name);
        
    } catch (error) {
        window.DejavuApp.showAlert(error.message, 'danger');
        clearFileSelection();
    }
}

// Clear file selection
function clearFileSelection() {
    const fileInput = document.getElementById('audioFile');
    const dropZone = document.getElementById('dropZone');
    const content = dropZone.querySelector('.drop-zone-content');
    
    if (fileInput) fileInput.value = '';
    
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
    
    console.log('File selection cleared');
}

// Start recognition process
async function startRecognition() {
    console.log('Starting recognition process...');
    
    const fileInput = document.getElementById('audioFile');
    console.log('File input element found:', !!fileInput);
    
    if (!fileInput) {
        console.error('File input element not found!');
        window.DejavuApp.showAlert('File input not found. Please refresh the page.', 'danger');
        return;
    }
    
    console.log('Files in input:', fileInput.files.length);
    const file = fileInput.files[0];
    
    console.log('File selected:', !!file);
    if (file) {
        console.log('File name:', file.name);
        console.log('File size:', file.size);
        console.log('File type:', file.type);
    }
    
    if (!file) {
        console.log('No file selected - showing alert');
        window.DejavuApp.showAlert('Please select an audio file first', 'warning');
        return;
    }
    
    try {
        console.log('Validating file...');
        window.DejavuApp.validateAudioFile(file);
        
        console.log('Showing progress...');
        showProgress();
        
        console.log('Disabling form...');
        window.DejavuApp.disableForm('recognizeForm');
        
        console.log('Creating form data...');
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('Making API request...');
        const response = await fetch('/api/recognize', {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Result:', result);
        
        if (!response.ok) {
            throw new Error(result.error || 'Recognition failed');
        }
        
        hideProgress();
        showResults(result);
        
    } catch (error) {
        console.error('Recognition error:', error);
        hideProgress();
        window.DejavuApp.showAlert(`Recognition failed: ${error.message}`, 'danger');
    } finally {
        window.DejavuApp.enableForm('recognizeForm');
    }
}

// Show progress
function showProgress() {
    const progressCard = document.getElementById('progressCard');
    if (progressCard) {
        progressCard.style.display = 'block';
    }
    hideResults();
}

// Hide progress
function hideProgress() {
    const progressCard = document.getElementById('progressCard');
    if (progressCard) {
        progressCard.style.display = 'none';
    }
}

// Show results
function showResults(result) {
    const resultsCard = document.getElementById('resultsCard');
    const resultsContent = document.getElementById('resultsContent');
    
    if (!resultsCard || !resultsContent) return;
    
    let resultHTML = '';
    
    if (result.status === 'match_found') {
        resultHTML = `
            <div class="alert alert-success">
                <div class="d-flex align-items-center">
                    <i class="fas fa-check-circle fa-2x me-3"></i>
                    <div>
                        <h4 class="mb-1">Match Found!</h4>
                        <h5>${result.song_name}</h5>
                        <p class="mb-0">Confidence: ${(result.confidence * 100).toFixed(1)}%</p>
                        ${result.offset_seconds ? `<small>Offset: ${result.offset_seconds.toFixed(1)}s</small>` : ''}
                    </div>
                </div>
            </div>
        `;
    } else {
        resultHTML = `
            <div class="alert alert-warning">
                <div class="d-flex align-items-center">
                    <i class="fas fa-times-circle fa-2x me-3"></i>
                    <div>
                        <h4 class="mb-1">No Match Found</h4>
                        <p class="mb-0">Could not identify this audio file</p>
                        <small>The song might not be in the database or audio quality is poor</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    resultsContent.innerHTML = resultHTML;
    resultsCard.style.display = 'block';
}

// Hide results
function hideResults() {
    const resultsCard = document.getElementById('resultsCard');
    if (resultsCard) {
        resultsCard.style.display = 'none';
    }
}

// Export functions for global access
window.clearFileSelection = clearFileSelection;
window.hideResults = hideResults;

console.log('recognize_fixed.js loaded successfully');