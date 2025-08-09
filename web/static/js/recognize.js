// JavaScript for Audio Recognition Page

// Initialize page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing recognize page...');
    console.log('DejavuApp available:', typeof window.DejavuApp);
    initializeRecognizePage();
});

// Page initialization
function initializeRecognizePage() {
    console.log('Initializing recognize page components...');
    setupDropZone();
    setupRecognizeForm();
    console.log('Recognize page initialization complete');
}

// Setup drag and drop functionality
function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('audioFile');
    
    if (!dropZone || !fileInput) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
    
    // Handle file input change
    fileInput.addEventListener('change', handleFileSelect, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropZone.classList.add('dragover');
    }
    
    function unhighlight() {
        dropZone.classList.remove('dragover');
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect();
        }
    }
}

// Handle file selection
function handleFileSelect() {
    const fileInput = document.getElementById('audioFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    try {
        DejavuApp.validateAudioFile(file);
        updateFileDisplay(file);
        DejavuApp.showAlert(`File selected: ${file.name}`, 'success', 3000);
    } catch (error) {
        DejavuApp.showAlert(error.message, 'danger');
        fileInput.value = '';
    }
}

// Update file display in drop zone
function updateFileDisplay(file) {
    const dropZone = document.getElementById('dropZone');
    const content = dropZone.querySelector('.drop-zone-content');
    
    content.innerHTML = `
        <i class="fas fa-file-audio fa-3x text-success mb-3"></i>
        <h5>${file.name}</h5>
        <p class="text-muted">${DejavuApp.formatFileSize(file.size)}</p>
        <button type="button" class="btn btn-outline-secondary" onclick="clearFileSelection()">
            Change File
        </button>
    `;
}

// Clear file selection
function clearFileSelection() {
    const fileInput = document.getElementById('audioFile');
    const dropZone = document.getElementById('dropZone');
    const content = dropZone.querySelector('.drop-zone-content');
    
    fileInput.value = '';
    
    content.innerHTML = `
        <i class="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
        <h5>Drag & drop your audio file here</h5>
        <p class="text-muted">or click to browse</p>
        <button type="button" class="btn btn-outline-primary" onclick="document.getElementById('audioFile').click()">
            Choose File
        </button>
    `;
}

// Setup recognition form
function setupRecognizeForm() {
    const form = document.getElementById('recognizeForm');
    if (!form) {
        console.error('recognizeForm not found');
        return;
    }
    
    console.log('Setting up recognition form...');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted, starting recognition...');
        await performRecognition();
    });
    
    // Also add click handler to button as backup
    const submitBtn = document.getElementById('recognizeBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Button clicked, starting recognition...');
            await performRecognition();
        });
    }
}

// Perform audio recognition
async function performRecognition() {
    console.log('performRecognition called');
    
    const fileInput = document.getElementById('audioFile');
    const file = fileInput ? fileInput.files[0] : null;
    
    console.log('File input found:', !!fileInput);
    console.log('File selected:', !!file, file ? file.name : 'none');
    
    if (!file) {
        console.log('No file selected, showing alert');
        DejavuApp.showAlert('Please select an audio file first', 'warning');
        return;
    }
    
    // Check system status
    if (DejavuApp.systemStatus !== 'connected') {
        DejavuApp.showAlert('System is not connected. Please check your database connection.', 'danger');
        return;
    }
    
    try {
        // Validate file
        DejavuApp.validateAudioFile(file);
        
        // Show progress
        showRecognitionProgress();
        DejavuApp.disableForm('recognizeForm');
        
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        
        // Make API request
        const response = await fetch('/api/recognize', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Recognition failed');
        }
        
        // Hide progress and show results
        hideRecognitionProgress();
        showRecognitionResults(result);
        
    } catch (error) {
        hideRecognitionProgress();
        DejavuApp.showAlert(`Recognition failed: ${error.message}`, 'danger');
        console.error('Recognition error:', error);
    } finally {
        DejavuApp.enableForm('recognizeForm');
    }
}

// Show recognition progress
function showRecognitionProgress() {
    DejavuApp.showElement('progressCard');
    DejavuApp.hideElement('resultsCard');
}

// Hide recognition progress
function hideRecognitionProgress() {
    DejavuApp.hideElement('progressCard');
}

// Show recognition results
function showRecognitionResults(result) {
    const resultsCard = document.getElementById('resultsCard');
    const resultsContent = document.getElementById('resultsContent');
    
    if (!resultsCard || !resultsContent) return;
    
    let resultHTML = '';
    
    if (result.status === 'match_found') {
        resultHTML = `
            <div class="result-match">
                <div class="d-flex align-items-center mb-3">
                    <i class="fas fa-check-circle fa-2x text-success me-3"></i>
                    <div>
                        <h4 class="mb-1 text-success">Match Found!</h4>
                        <p class="mb-0 text-muted">Song successfully identified</p>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="fas fa-music me-2"></i>Song Name</h6>
                        <p class="fs-5 fw-bold text-dark">${result.song_name}</p>
                    </div>
                    <div class="col-md-3">
                        <h6><i class="fas fa-percentage me-2"></i>Confidence</h6>
                        <p class="fs-5 text-success">${DejavuApp.formatConfidence(result.confidence)}</p>
                    </div>
                    <div class="col-md-3">
                        <h6><i class="fas fa-clock me-2"></i>Offset</h6>
                        <p class="fs-6">${DejavuApp.formatTime(result.offset_seconds || 0)}</p>
                    </div>
                </div>
                
                <small class="text-muted">
                    <i class="fas fa-calendar me-1"></i>
                    Recognized at: ${DejavuApp.formatTimestamp(result.timestamp)}
                </small>
            </div>
        `;
    } else {
        resultHTML = `
            <div class="result-no-match">
                <div class="d-flex align-items-center mb-3">
                    <i class="fas fa-times-circle fa-2x text-danger me-3"></i>
                    <div>
                        <h4 class="mb-1 text-danger">No Match Found</h4>
                        <p class="mb-0 text-muted">Could not identify this audio</p>
                    </div>
                </div>
                
                <div class="mb-3">
                    <h6>Possible reasons:</h6>
                    <ul class="mb-0">
                        <li>Song is not in the database</li>
                        <li>Audio quality is too poor</li>
                        <li>Recording is too short (try 5+ seconds)</li>
                        <li>Too much background noise</li>
                    </ul>
                </div>
                
                <small class="text-muted">
                    <i class="fas fa-calendar me-1"></i>
                    Tested at: ${DejavuApp.formatTimestamp(result.timestamp)}
                </small>
            </div>
        `;
    }
    
    resultsContent.innerHTML = resultHTML;
    DejavuApp.showElement('resultsCard');
}

// Hide results
function hideResults() {
    DejavuApp.hideElement('resultsCard');
}

// Test existing slices
async function testSlices() {
    try {
        DejavuApp.showAlert('Testing audio slices...', 'info');
        
        const result = await DejavuApp.makeAPIRequest('/test-slices', {
            method: 'POST'
        });
        
        if (result.status === 'success') {
            const summary = result.results;
            const message = `
                Slice testing completed!<br>
                <strong>Files tested:</strong> ${summary.total_files}<br>
                <strong>Matches found:</strong> ${summary.matches}<br>
                <strong>Success rate:</strong> ${summary.success_rate.toFixed(1)}%
            `;
            DejavuApp.showAlert(message, 'success', 8000);
        } else {
            throw new Error('Slice testing failed');
        }
        
    } catch (error) {
        DejavuApp.showAlert(`Slice testing failed: ${error.message}`, 'danger');
        console.error('Slice testing error:', error);
    }
}

// Show create slices modal
function showCreateSlices() {
    DejavuApp.showModal('createSlicesModal');
}

// Create audio slices
async function createSlices() {
    const form = document.getElementById('createSlicesForm');
    const fileInput = document.getElementById('sliceFile');
    const file = fileInput.files[0];
    
    if (!file) {
        DejavuApp.showAlert('Please select an audio file', 'warning');
        return;
    }
    
    try {
        // Validate file
        DejavuApp.validateAudioFile(file);
        
        // Get form data
        const formData = new FormData(form);
        
        DejavuApp.showAlert('Creating audio slices...', 'info');
        
        const result = await fetch('/api/slices', {
            method: 'POST',
            body: formData
        });
        
        const data = await result.json();
        
        if (!result.ok) {
            throw new Error(data.error || 'Failed to create slices');
        }
        
        DejavuApp.hideModal('createSlicesModal');
        DejavuApp.showAlert(`Successfully created ${data.slices_created} audio slices!`, 'success');
        
        // Reset form
        form.reset();
        
    } catch (error) {
        DejavuApp.showAlert(`Failed to create slices: ${error.message}`, 'danger');
        console.error('Create slices error:', error);
    }
}