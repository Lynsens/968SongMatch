// JavaScript for Database Management Page v2.0 - Fixed API calls

// Socket.IO connection for real-time progress
let socket = null;
let currentSessionId = null;

// Initialize page when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initializeManagePage();
    initializeSocketIO();
});

// Initialize Socket.IO connection
function initializeSocketIO() {
    if (typeof io !== 'undefined') {
        socket = io();
        
        socket.on('connect', function() {
            console.log('Connected to server for real-time updates');
        });
        
        socket.on('upload_progress', function(data) {
            if (data.session_id === currentSessionId) {
                handleUploadProgress(data);
            }
        });
    }
}

// Handle real-time upload progress
function handleUploadProgress(data) {
    const progressStatus = document.getElementById('progressStatus');
    const currentFileInfo = document.getElementById('currentFileInfo');
    const currentFileName = document.getElementById('currentFileName');
    
    if (data.status === 'processing' || data.status === 'started') {
        // Processing represents 50-100% of total progress
        // Calculate actual percentage based on files processed
        const processingProgress = data.total > 0 ? (data.processed / data.total) * 50 : 0;
        const totalPercent = 50 + processingProgress; // 50% from upload + processing progress
        const statusText = `Processing audio files... ${totalPercent.toFixed(1)}% (${data.processed}/${data.total})`;
        
        // Update progress bar with correct percentage
        DejavuApp.updateProgress('addProgressBar', totalPercent, statusText);
        
        // Update status text with correct percentage
        if (progressStatus) {
            progressStatus.textContent = statusText;
        }
        
        // Show current file being processed
        if (data.current_file && currentFileInfo && currentFileName) {
            currentFileInfo.style.display = 'block';
            currentFileName.textContent = data.current_file;
        }
    } else if (data.status === 'completed') {
        DejavuApp.updateProgress('addProgressBar', 100, 'Processing complete! (100%)');
        if (progressStatus) {
            progressStatus.textContent = 'Processing complete! (100%)';
        }
        if (currentFileInfo) {
            currentFileInfo.style.display = 'none';
        }
    }
}

// Page initialization
function initializeManagePage() {
    setupAddSongsForm();
    setupFileInput();
    setupKeyboardShortcuts();
    
    // Add a small delay to ensure DOM is fully ready
    setTimeout(() => {
        refreshStats(true);  // Pass true for initial load
        loadSongLibrary(true);  // Pass true for initial load
    }, 100);
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Alt + S for stats refresh only
        if (e.altKey && e.key === 's') {
            e.preventDefault();
            refreshStats();
        }
        
        // Alt + L for library refresh only
        if (e.altKey && e.key === 'l') {
            e.preventDefault();
            loadSongLibrary();
        }
        
        // Alt + R for refresh both
        if (e.altKey && e.key === 'r') {
            e.preventDefault();
            refreshStats();
            loadSongLibrary();
            DejavuApp.showAlert('Refreshing all data...', 'info', 1500);
        }
    });
}

// Setup add songs form
function setupAddSongsForm() {
    const form = document.getElementById('addSongsForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await addSongsToDatabase();
    });
}

// Setup file input handling
function setupFileInput() {
    // Setup individual file selection
    const fileInput = document.getElementById('musicFiles');
    const folderInput = document.getElementById('musicFolder');
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    const selectFolderBtn = document.getElementById('selectFolderBtn');
    
    if (!fileInput || !folderInput) return;
    
    // File selection button click
    if (selectFilesBtn) {
        selectFilesBtn.addEventListener('click', function() {
            fileInput.click();
        });
    }
    
    // Folder selection button click
    if (selectFolderBtn) {
        selectFolderBtn.addEventListener('click', function() {
            folderInput.click();
        });
    }
    
    // File input change handler
    fileInput.addEventListener('change', function() {
        displaySelectedFiles(this.files, 'files');
        // Reset folder input
        folderInput.value = '';
    });
    
    // Folder input change handler
    folderInput.addEventListener('change', function() {
        displaySelectedFiles(this.files, 'folder');
        // Reset file input
        fileInput.value = '';
    });
}

// Display selected files
function displaySelectedFiles(files, selectionType = 'files') {
    const fileList = document.getElementById('fileList');
    const fileListContent = document.getElementById('fileListContent');
    
    if (!files || files.length === 0) {
        fileList.style.display = 'none';
        return;
    }
    
    let filesHTML = '';
    let totalSize = 0;
    let validFiles = 0;
    let folderName = '';
    
    // Group files by folder if from folder selection
    let fileGroups = {};
    
    Array.from(files).forEach((file, index) => {
        totalSize += file.size;
        
        const isValid = DejavuApp.isAudioFile(file.name);
        if (isValid) validFiles++;
        
        // Extract folder path for folder uploads
        if (selectionType === 'folder' && file.webkitRelativePath) {
            const pathParts = file.webkitRelativePath.split('/');
            if (pathParts.length > 1) {
                folderName = pathParts[0];
                const subfolder = pathParts.slice(0, -1).join('/');
                if (!fileGroups[subfolder]) {
                    fileGroups[subfolder] = [];
                }
                fileGroups[subfolder].push({file, isValid});
            }
        } else {
            if (!fileGroups['root']) {
                fileGroups['root'] = [];
            }
            fileGroups['root'].push({file, isValid});
        }
    });
    
    // Create HTML for file display
    if (selectionType === 'folder' && folderName) {
        filesHTML += `
            <div class="alert alert-success d-flex align-items-center mb-3">
                <i class="fas fa-folder-open fa-2x me-3"></i>
                <div>
                    <h6 class="mb-0">Folder Selected: ${folderName}</h6>
                    <small class="text-muted">Found ${validFiles} valid audio files</small>
                </div>
            </div>
        `;
    } else {
        filesHTML += `
            <div class="alert alert-info d-flex align-items-center mb-3">
                <i class="fas fa-files-o fa-2x me-3"></i>
                <div>
                    <h6 class="mb-0">Files Selected</h6>
                    <small class="text-muted">Selected ${validFiles} valid audio files</small>
                </div>
            </div>
        `;
    }
    
    // Display files grouped by folder
    Object.keys(fileGroups).forEach(groupKey => {
        if (groupKey !== 'root' && selectionType === 'folder') {
            filesHTML += `
                <div class="folder-group mb-3">
                    <h6 class="text-muted mb-2">
                        <i class="fas fa-folder me-1"></i>${groupKey}
                    </h6>
                </div>
            `;
        }
        
        // Only show first 10 files if there are many, with option to expand
        const groupFiles = fileGroups[groupKey];
        const showAll = groupFiles.length <= 10;
        const filesToShow = showAll ? groupFiles : groupFiles.slice(0, 10);
        
        filesToShow.forEach(({file, isValid}, index) => {
            const displayName = selectionType === 'folder' && file.webkitRelativePath ? 
                                file.name : file.name;
            
            filesHTML += `
                <div class="file-item mb-2 p-2 border rounded ${isValid ? 'border-success bg-light' : 'border-danger bg-danger bg-opacity-10'}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center flex-grow-1">
                            <i class="fas fa-${isValid ? 'music' : 'exclamation-triangle'} me-2 ${isValid ? 'text-success' : 'text-danger'}"></i>
                            <div class="flex-grow-1">
                                <div class="fw-bold small">${displayName}</div>
                                <div class="text-muted small">${DejavuApp.formatFileSize(file.size)}</div>
                            </div>
                        </div>
                        <div>
                            ${isValid ? 
                                '<span class="badge bg-success">✓</span>' : 
                                '<span class="badge bg-danger">✗</span>'
                            }
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Show "and X more files" if there are more files
        if (!showAll) {
            const remaining = groupFiles.length - 10;
            filesHTML += `
                <div class="text-center my-2">
                    <small class="text-muted">
                        <i class="fas fa-ellipsis-h me-1"></i>
                        and ${remaining} more file${remaining > 1 ? 's' : ''}
                    </small>
                </div>
            `;
        }
    });
    
    // Add summary
    filesHTML += `
        <div class="mt-3 p-3 bg-light rounded">
            <div class="row text-center">
                <div class="col-4">
                    <strong class="text-success">${validFiles}</strong>
                    <div class="small text-muted">Valid Files</div>
                </div>
                <div class="col-4">
                    <strong class="text-warning">${files.length - validFiles}</strong>
                    <div class="small text-muted">Invalid Files</div>
                </div>
                <div class="col-4">
                    <strong class="text-info">${DejavuApp.formatFileSize(totalSize)}</strong>
                    <div class="small text-muted">Total Size</div>
                </div>
            </div>
        </div>
    `;
    
    fileListContent.innerHTML = filesHTML;
    fileList.style.display = 'block';
    
    // Show warning if invalid files
    if (validFiles < files.length) {
        const invalidCount = files.length - validFiles;
        DejavuApp.showAlert(`${invalidCount} file(s) will be skipped (invalid format)`, 'warning');
    }
    
    // Show success message for valid files
    if (validFiles > 0) {
        const message = selectionType === 'folder' ? 
            `Found ${validFiles} audio files in folder "${folderName}"` :
            `Selected ${validFiles} audio files`;
        DejavuApp.showAlert(message, 'success', 3000);
    }
}

// Add songs to database
async function addSongsToDatabase() {
    const fileInput = document.getElementById('musicFiles');
    const folderInput = document.getElementById('musicFolder');
    
    // Get files from either input
    let files = null;
    let selectionType = '';
    
    if (fileInput.files && fileInput.files.length > 0) {
        files = fileInput.files;
        selectionType = 'files';
    } else if (folderInput.files && folderInput.files.length > 0) {
        files = folderInput.files;
        selectionType = 'folder';
    }
    
    if (!files || files.length === 0) {
        DejavuApp.showAlert('Please select music files or folder first', 'warning');
        return;
    }
    
    // Check system status
    if (DejavuApp.systemStatus !== 'connected') {
        DejavuApp.showAlert('System is not connected. Please check your database connection.', 'danger');
        return;
    }
    
    try {
        // Generate session ID for progress tracking
        currentSessionId = 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Show progress
        showAddProgress();
        DejavuApp.disableForm('addSongsForm');
        
        // Create form data
        const formData = new FormData();
        
        // Add session ID for socket.io progress tracking
        formData.append('session_id', currentSessionId);
        
        // Add files
        Array.from(files).forEach(file => {
            if (DejavuApp.isAudioFile(file.name)) {
                formData.append('files', file);
                
                // Add custom name if provided
                const nameInput = document.querySelector(`input[name="name_${file.name}"]`);
                if (nameInput && nameInput.value.trim()) {
                    formData.append(`name_${file.name}`, nameInput.value.trim());
                }
            }
        });
        
        // Make API request with progress tracking
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                // Upload represents 0-50% of total progress
                const percentComplete = (e.loaded / e.total) * 50;
                // Show actual total progress percentage (0-50% during upload)
                const totalProgressPercent = percentComplete;
                DejavuApp.updateProgress('addProgressBar', percentComplete, `Uploading files... ${totalProgressPercent.toFixed(1)}%`);
                
                // Update status text with correct percentage
                const progressStatus = document.getElementById('progressStatus');
                if (progressStatus) {
                    progressStatus.textContent = `Uploading files... ${totalProgressPercent.toFixed(1)}%`;
                }
            }
        });
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                // Show processing status after upload completes (at 50%)
                DejavuApp.updateProgress('addProgressBar', 50, 'Processing and fingerprinting audio files... 50%');
                
                // Update status text
                const progressStatus = document.getElementById('progressStatus');
                if (progressStatus) {
                    progressStatus.textContent = 'Processing and fingerprinting audio files... 50%';
                }
                
                // Parse response
                const result = JSON.parse(xhr.responseText);
                
                // If no WebSocket updates (fallback), complete the progress bar after a delay
                if (!socket || !socket.connected) {
                    setTimeout(() => {
                        DejavuApp.updateProgress('addProgressBar', 100, 'Processing complete! (100%)');
                        if (progressStatus) {
                            progressStatus.textContent = 'Processing complete! (100%)';
                        }
                    }, 1000);
                }
                
                // Small delay before hiding progress
                setTimeout(() => {
                    hideAddProgress();
                    showAddResults(result.results);
                }, 1500);
                
                // Refresh stats after adding
                setTimeout(refreshStats, 1000);
                
                // Reset form and hide file list
                DejavuApp.resetForm('addSongsForm');
                document.getElementById('fileList').style.display = 'none';
                
                // Refresh song library to show new songs
                setTimeout(loadSongLibrary, 1500);
                
            } else {
                const error = JSON.parse(xhr.responseText);
                throw new Error(error.error || 'Upload failed');
            }
        };
        
        xhr.onerror = function() {
            throw new Error('Network error during upload');
        };
        
        xhr.open('POST', '/api/songs');
        xhr.send(formData);
        
    } catch (error) {
        hideAddProgress();
        DejavuApp.showAlert(`Failed to add songs: ${error.message}`, 'danger');
        console.error('Add songs error:', error);
    } finally {
        DejavuApp.enableForm('addSongsForm');
    }
}

// Show add progress
function showAddProgress() {
    DejavuApp.showElement('addProgressCard');
    DejavuApp.hideElement('addResultsCard');
    DejavuApp.updateProgress('addProgressBar', 0, 'Preparing upload...');
    
    // Reset progress UI elements
    const progressStatus = document.getElementById('progressStatus');
    const currentFileInfo = document.getElementById('currentFileInfo');
    if (progressStatus) {
        progressStatus.textContent = 'Preparing upload...';
    }
    if (currentFileInfo) {
        currentFileInfo.style.display = 'none';
    }
}

// Hide add progress
function hideAddProgress() {
    DejavuApp.hideElement('addProgressCard');
}

// Show add results
function showAddResults(results) {
    const resultsContent = document.getElementById('addResultsContent');
    
    if (!results || !Array.isArray(results)) {
        resultsContent.innerHTML = '<p class="text-danger">Invalid results data</p>';
        DejavuApp.showElement('addResultsCard');
        return;
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.length - successCount;
    
    let resultsHTML = '';
    
    // Success banner if any files were added
    if (successCount > 0) {
        resultsHTML += `
            <div class="alert alert-success border-0 shadow-sm mb-4">
                <div class="d-flex align-items-center">
                    <div class="flex-shrink-0">
                        <i class="fas fa-check-circle fa-3x text-success"></i>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <h4 class="alert-heading mb-1">Upload Successful! 🎉</h4>
                        <p class="mb-2">Successfully added <strong>${successCount} song${successCount > 1 ? 's' : ''}</strong> to your music database.</p>
                        <p class="mb-0 small text-success">
                            <i class="fas fa-info-circle me-1"></i>
                            Your songs are now fingerprinted and ready for recognition!
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Statistics summary
    resultsHTML += `
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="card border-success h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-check-circle fa-2x text-success mb-2"></i>
                        <h3 class="text-success mb-0">${successCount}</h3>
                        <small class="text-muted">Songs Added</small>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card border-warning h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                        <h3 class="text-warning mb-0">${errorCount}</h3>
                        <small class="text-muted">Errors</small>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card border-info h-100">
                    <div class="card-body text-center">
                        <i class="fas fa-music fa-2x text-info mb-2"></i>
                        <h3 class="text-info mb-0">${results.length}</h3>
                        <small class="text-muted">Total Processed</small>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Detailed results (collapsible if many files)
    const showDetailed = results.length <= 10 || errorCount > 0;
    
    if (showDetailed) {
        resultsHTML += `
            <div class="mb-3">
                <h6>
                    <i class="fas fa-list me-2"></i>Detailed Results
                    ${results.length > 10 ? `<span class="badge bg-secondary ms-2">${results.length} files</span>` : ''}
                </h6>
            </div>
            <div class="list-group">
        `;
    } else {
        resultsHTML += `
            <div class="mb-3">
                <button class="btn btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#detailedResults">
                    <i class="fas fa-list me-2"></i>Show Detailed Results (${results.length} files)
                </button>
            </div>
            <div class="collapse" id="detailedResults">
                <div class="list-group">
        `;
    }
    
    results.forEach(result => {
        const iconClass = result.status === 'success' ? 'fa-check text-success' : 'fa-times text-danger';
        const badgeClass = result.status === 'success' ? 'bg-success' : 'bg-danger';
        
        resultsHTML += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <i class="fas ${iconClass} me-2"></i>
                        <div>
                            <div class="fw-bold">${result.filename}</div>
                            <small class="text-muted">${result.message}</small>
                        </div>
                    </div>
                    <span class="badge ${badgeClass}">${result.status}</span>
                </div>
            </div>
        `;
    });
    
    resultsHTML += `
        </div>
        ${!showDetailed ? '</div>' : ''}
    `;
    
    resultsContent.innerHTML = resultsHTML;
    DejavuApp.showElement('addResultsCard');
}

// Hide add results
function hideAddResults() {
    DejavuApp.hideElement('addResultsCard');
}

// Song Library Management Functions
let currentSongs = [];
let selectedSongs = [];

async function loadSongLibrary(isInitialLoad = false) {
    const content = document.getElementById('songLibraryContent');
    
    // Get the refresh button
    const refreshBtn = event ? event.target.closest('button') : document.querySelector('button[onclick="loadSongLibrary()"]');
    const originalHTML = refreshBtn ? refreshBtn.innerHTML : '';
    
    try {
        // Only show loading state on button if not initial load
        if (!isInitialLoad && refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Loading...';
        }
        
        // Show loading state in content
        content.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading song library...</p>
            </div>
        `;
        
        const result = await DejavuApp.makeAPIRequest('/songs');
        currentSongs = result.songs || [];
        
        if (currentSongs.length === 0) {
            content.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-music fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No songs in database</h5>
                    <p class="text-muted">Add some songs using the form above to get started.</p>
                </div>
            `;
            if (!isInitialLoad) {
                DejavuApp.showAlert('Song library is empty', 'info', 2000);
            }
        } else {
            displaySongLibrary(currentSongs);
            if (!isInitialLoad) {
                DejavuApp.showAlert(`Loaded ${currentSongs.length} song${currentSongs.length > 1 ? 's' : ''}`, 'success', 2000);
            }
        }
        
    } catch (error) {
        content.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Failed to load song library: ${error.message || error}
            </div>
        `;
        DejavuApp.showAlert('Failed to load song library', 'danger');
    } finally {
        // Restore button state
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalHTML;
        }
    }
}

function displaySongLibrary(songs) {
    const content = document.getElementById('songLibraryContent');
    
    if (songs.length === 0) {
        content.innerHTML = '<p class="text-muted text-center py-3">No songs match your search.</p>';
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th width="50">
                            <input type="checkbox" class="form-check-input" onchange="toggleSelectAll(this)">
                        </th>
                        <th>Song Name</th>
                        <th>Fingerprints</th>
                        <th>Date Added</th>
                        <th width="100">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    songs.forEach(song => {
        html += `
            <tr>
                <td>
                    <input type="checkbox" class="form-check-input song-checkbox" 
                           value="${song.song_id}" onchange="updateSelection()">
                </td>
                <td>
                    <strong>${escapeHtml(song.song_name || 'Unknown')}</strong>
                </td>
                <td>
                    <span class="badge bg-primary">${(song.total_hashes || 0).toLocaleString()}</span>
                </td>
                <td>
                    <small class="text-muted">${formatDate(song.date_created)}</small>
                </td>
                <td>
                    <button class="btn btn-outline-danger btn-sm" 
                            onclick="deleteSingleSong(${song.song_id}, '${escapeHtml(song.song_name || 'Unknown')}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    content.innerHTML = html;
    
    // Reset selection
    selectedSongs = [];
}

function filterSongs() {
    const searchTerm = document.getElementById('songSearch').value.toLowerCase();
    const filteredSongs = currentSongs.filter(song => 
        (song.song_name || '').toLowerCase().includes(searchTerm)
    );
    displaySongLibrary(filteredSongs);
}

function toggleSelectAll(checkbox) {
    const songCheckboxes = document.querySelectorAll('.song-checkbox');
    songCheckboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateSelection();
}

function updateSelection() {
    const checkboxes = document.querySelectorAll('.song-checkbox:checked');
    selectedSongs = Array.from(checkboxes).map(cb => parseInt(cb.value));
}

function selectAllSongs() {
    const songCheckboxes = document.querySelectorAll('.song-checkbox');
    songCheckboxes.forEach(cb => cb.checked = true);
    updateSelection();
}

function clearSelection() {
    const songCheckboxes = document.querySelectorAll('.song-checkbox');
    songCheckboxes.forEach(cb => cb.checked = false);
    const selectAllCheckbox = document.querySelector('thead input[type="checkbox"]');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    selectedSongs = [];
}

async function deleteSingleSong(songId, songName) {
    showDeleteConfirmation([songId], `song "${songName}"`);
}

async function deleteSelectedSongs() {
    if (selectedSongs.length === 0) {
        DejavuApp.showAlert('Please select songs to delete first', 'warning');
        return;
    }
    
    const songText = selectedSongs.length === 1 ? '1 song' : `${selectedSongs.length} songs`;
    showDeleteConfirmation(selectedSongs, songText);
}

function showDeleteConfirmation(songIds, description) {
    const modal = document.getElementById('deleteConfirmModal');
    const modalBody = document.getElementById('deleteModalBody');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    modalBody.innerHTML = `
        <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>Warning:</strong> This action cannot be undone!
        </div>
        <p>Are you sure you want to delete ${description}?</p>
        <p class="text-muted small">This will permanently remove the song(s) and all associated fingerprints from the database.</p>
    `;
    
    // Store song IDs for deletion
    confirmBtn.dataset.songIds = JSON.stringify(songIds);
    
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

async function executeDelete() {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const songIds = JSON.parse(confirmBtn.dataset.songIds || '[]');
    
    if (songIds.length === 0) return;
    
    try {
        // Show loading state
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Deleting...';
        
        let result;
        if (songIds.length === 1) {
            result = await DejavuApp.makeAPIRequest(`/songs/${songIds[0]}`, {
                method: 'DELETE'
            });
        } else {
            result = await DejavuApp.makeAPIRequest('/songs/batch', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    song_ids: songIds
                })
            });
        }
        
        if (result.success) {
            DejavuApp.showAlert(result.message, 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
            modal.hide();
            
            // Refresh library and stats
            await loadSongLibrary();
            await refreshStats();
        }
        
    } catch (error) {
        DejavuApp.showAlert(`Failed to delete songs: ${error.message || error}`, 'danger');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Delete';
    }
}

// Database Operations

async function confirmClearDatabase() {
    console.log('🗑️ confirmClearDatabase called - v2.0');
    const confirmation = prompt('This will DELETE ALL SONGS and FINGERPRINTS permanently!\n\nType "DELETE ALL" to confirm:');
    
    if (confirmation === 'DELETE ALL') {
        try {
            console.log('🚀 Making DELETE request to /database/clear');
            const result = await DejavuApp.makeAPIRequest('/database/clear', {
                method: 'DELETE'
            });
            console.log('✅ Database clear result:', result);
            if (result.success) {
                DejavuApp.showAlert('Database cleared successfully', 'success');
                await loadSongLibrary();
                await refreshStats();
            }
        } catch (error) {
            DejavuApp.showAlert(`Failed to clear database: ${error.message || error}`, 'danger');
        }
    } else if (confirmation !== null) {
        DejavuApp.showAlert('Database clear cancelled - confirmation text did not match', 'info');
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return 'Unknown';
    }
}

// Refresh database statistics
async function refreshStats(isInitialLoad = false) {
    // Get the refresh button
    const refreshBtn = event ? event.target.closest('button') : document.querySelector('button[onclick="refreshStats()"]');
    const originalHTML = refreshBtn ? refreshBtn.innerHTML : '';
    
    try {
        // Only show loading states if not initial load
        if (!isInitialLoad) {
            // Show loading state on button
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Refreshing...';
            }
            
            // Show loading in stats display
            updateStatsDisplay({
                songs_count: '<div class="spinner-border spinner-border-sm" role="status"></div>',
                fingerprints_count: '<div class="spinner-border spinner-border-sm" role="status"></div>',
                database_connected: null
            });
        }
        
        const result = await DejavuApp.makeAPIRequest('/status');
        
        if (result.status === 'ok') {
            updateStatsDisplay(result);
            // Only show success message if not initial load
            if (!isInitialLoad) {
                DejavuApp.showAlert('Statistics refreshed successfully', 'success', 2000);
            }
        } else {
            throw new Error('Failed to get database status');
        }
        
    } catch (error) {
        console.error('Stats refresh error:', error);
        updateStatsDisplay({
            songs_count: 'Error',
            fingerprints_count: 'Error',
            database_connected: false
        });
        DejavuApp.showAlert('Failed to refresh statistics', 'danger');
    } finally {
        // Restore button state
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalHTML;
        }
    }
}

// Update statistics display
function updateStatsDisplay(data) {
    const songsCount = document.getElementById('songsCount');
    const fingerprintsCount = document.getElementById('fingerprintsCount');
    const statusIcon = document.getElementById('statusIcon');
    
    if (songsCount) {
        // Handle both HTML content and plain numbers
        if (typeof data.songs_count === 'string' && data.songs_count.includes('<')) {
            songsCount.innerHTML = data.songs_count;
        } else {
            songsCount.textContent = typeof data.songs_count === 'number' ? 
                data.songs_count.toLocaleString() : 
                data.songs_count;
        }
    }
    
    if (fingerprintsCount) {
        // Handle both HTML content and plain numbers
        if (typeof data.fingerprints_count === 'string' && data.fingerprints_count.includes('<')) {
            fingerprintsCount.innerHTML = data.fingerprints_count;
        } else {
            fingerprintsCount.textContent = typeof data.fingerprints_count === 'number' ? 
                data.fingerprints_count.toLocaleString() : 
                data.fingerprints_count;
        }
    }
    
    if (statusIcon) {
        if (data.database_connected) {
            statusIcon.innerHTML = '<i class="fas fa-check-circle text-success"></i>';
        } else {
            statusIcon.innerHTML = '<i class="fas fa-times-circle text-danger"></i>';
        }
    }
}