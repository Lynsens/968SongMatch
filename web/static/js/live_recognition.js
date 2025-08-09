// Live Recognition Session JavaScript

console.log('Loading live_recognition.js v2.3 - Settings page integration');

// Global state
let socket = null;
let mediaStream = null;
let audioContext = null;
let analyser = null;
let isSessionActive = false;
let isListening = false;
let sessionStartTime = null;
let timerInterval = null;
let chunkCounter = 0;
let audioProcessor = null;
let recognitionHistory = [];
let listeningTimeout = null;
let hasListenedBefore = false;
let recognitionStartTime = null;
let recognitionTimerInterval = null;
let mediaRecorder = null;
let audioChunks = [];

// Track songs for smooth updates
let songElements = new Map(); // songName -> DOM element
let lastTopSong = null; // Track lead changes for history
let lastLoggedConfidences = new Map(); // Track last logged confidence per song

// Microphone settings helper function
function getMicrophoneSettings() {
    return {
        deviceId: localStorage.getItem('micDeviceId') || 'default',
        inputGain: parseFloat(localStorage.getItem('micInputGain') || '1.0'),
        audioQuality: parseInt(localStorage.getItem('micAudioQuality') || '44100'),
        noiseReduction: localStorage.getItem('micNoiseReduction') === 'true',
        autoGainControl: localStorage.getItem('micAutoGainControl') === 'true'
    };
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing live recognition...');
    
    // Duration preference is now managed in Settings page
    initializeLiveRecognition();
});

function initializeLiveRecognition() {
    setupWebSocket();
    setupUI();
    console.log('Live recognition initialized');
}

// WebSocket Setup
function setupWebSocket() {
    console.log('Setting up WebSocket connection...');
    
    // Show connection modal
    const connectionModal = new bootstrap.Modal(document.getElementById('connectionModal'));
    connectionModal.show();
    
    // Initialize Socket.IO
    socket = io();
    
    socket.on('connect', function() {
        console.log('WebSocket connected');
        document.getElementById('connectionStatus').textContent = 'Connected successfully!';
        
        setTimeout(() => {
            connectionModal.hide();
        }, 1000);
    });
    
    socket.on('disconnect', function() {
        console.log('WebSocket disconnected');
        updateSessionStatus('error', 'Connection Lost');
    });
    
    socket.on('status', function(data) {
        console.log('Status:', data.message);
    });
    
    socket.on('session_started', function(data) {
        console.log('Session started:', data);
        isSessionActive = true;
        updateSessionControls();
        updateSessionStatus('success', 'Session Active');
    });
    
    socket.on('session_stopped', function(data) {
        console.log('Session stopped:', data);
        isSessionActive = false;
        isListening = false;
        updateSessionControls();
        updateSessionStatus('secondary', 'Session Inactive');
        stopAudioCapture();
    });
    
    socket.on('listening_started', function(data) {
        console.log('Listening started for new song:', data);
        // Alert removed - UI already shows listening state
    });
    
    socket.on('recognition_result', function(data) {
        displayRecognitionResult(data);
    });
    
    socket.on('recognition_error', function(data) {
        console.error('Recognition error:', data);
        showAlert(`Recognition error: ${data.error}`, 'danger');
    });
}

// UI Setup
function setupUI() {
    // Session timer
    timerInterval = setInterval(updateTimer, 1000);
}

// Session Control Functions
function startSession() {
    console.log('Starting recognition session...');
    socket.emit('start_session');
    sessionStartTime = new Date();
    chunkCounter = 0;
    recognitionHistory = [];
    hasListenedBefore = false;
    
    // Clear previous results
    document.getElementById('liveResultsContent').innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="fas fa-ear-listen fa-3x mb-3"></i>
            <h5>Session started - waiting to listen...</h5>
            <p>Click "Start Listening" to begin audio capture</p>
        </div>
    `;
    
    showElement('sessionHistoryCard');
}

function stopSession() {
    console.log('Stopping recognition session...');
    socket.emit('stop_session');
    sessionStartTime = null;
    hasListenedBefore = false;
    
    if (isListening) {
        stopListening();
    }
    
    // Clear timeout if exists
    if (listeningTimeout) {
        clearTimeout(listeningTimeout);
        listeningTimeout = null;
    }
    
    // Stop recognition timer
    stopRecognitionTimer();
    
    // Reset timer display
    const timerElement = document.getElementById('recognitionTimer');
    if (timerElement) {
        timerElement.textContent = '00:00';
        timerElement.className = 'badge bg-primary';
    }
}

async function startListening() {
    if (!isSessionActive) {
        showAlert('Please start a session first', 'warning');
        return;
    }
    
    console.log('Starting audio listening...');
    
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showAlert('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.', 'danger');
        return;
    }
    
    // Check current permission status if available
    if (navigator.permissions && navigator.permissions.query) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
            console.log('Microphone permission status:', permissionStatus.state);
            
            if (permissionStatus.state === 'denied') {
                showMicrophonePermissionHelp();
                return;
            }
        } catch (e) {
            console.log('Permission API not fully supported, continuing...');
        }
    }
    
    // Add session divider to history
    addSessionDivider();
    
    // Reset tracking variables for new song
    songElements.clear();
    lastTopSong = null;
    lastLoggedConfidences.clear();
    
    // Reset recognition results for new song
    document.getElementById('analysisCounter').textContent = '0 analyses';
    chunkCounter = 0;
    
    // Start recognition timer
    startRecognitionTimer();
    
    // Get confidence threshold from settings (default 10%)
    const confidenceThreshold = localStorage.getItem('confidenceThreshold') || '10';
    console.log(`Using confidence threshold: ${confidenceThreshold}%`);
    
    // Notify server that we're starting a new song recognition
    socket.emit('start_listening', { 
        action: 'new_song',
        timestamp: new Date().toISOString(),
        confidenceThreshold: parseInt(confidenceThreshold)
    });
    
    try {
        // Show permission prompt message
        showAlert('Please allow microphone access when prompted by your browser', 'info');
        
        // Load microphone settings from localStorage
        const micSettings = getMicrophoneSettings();
        
        // Build audio constraints
        const audioConstraints = {
            echoCancellation: true,
            noiseSuppression: micSettings.noiseReduction,
            autoGainControl: micSettings.autoGainControl
        };
        
        // Only add deviceId if not default
        if (micSettings.deviceId && micSettings.deviceId !== 'default') {
            audioConstraints.deviceId = { exact: micSettings.deviceId };
        }
        
        // Add sample rate if supported (not all browsers support this)
        if (micSettings.audioQuality) {
            audioConstraints.sampleRate = micSettings.audioQuality;
        }
        
        console.log('Requesting microphone with constraints:', audioConstraints);
        
        // Request microphone access - THIS WILL TRIGGER THE BROWSER PERMISSION PROMPT
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: audioConstraints
        });
        
        console.log('Microphone access granted!');
        
        await setupAudioProcessing();
        isListening = true;
        updateSessionControls();
        updateSessionStatus('warning', 'Listening...');
        
        showElement('audioVisualization');
        showElement('liveResultsCard');
        
        // Get duration from localStorage (set in Settings page)
        const listenDuration = parseInt(localStorage.getItem('preferredListenDuration')) || 5;
        
        // Save preference to localStorage
        localStorage.setItem('preferredListenDuration', listenDuration);
        
        // Set timeout for automatic stop with countdown
        let countdown = listenDuration;
        const countdownInterval = setInterval(() => {
            countdown--;
            const countdownElement = document.querySelector('#liveResultsContent h5');
            if (countdownElement && isListening) {
                countdownElement.textContent = `Listening for audio... (${countdown}s remaining)`;
            }
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
        
        listeningTimeout = setTimeout(() => {
            console.log(`${listenDuration}-second listening timeout reached`);
            clearInterval(countdownInterval);
            stopListening();
            // Alert removed - UI already shows completion state
        }, listenDuration * 1000);
        
        // Clear previous results and show listening state
        document.getElementById('liveResultsContent').innerHTML = `
            <div class="text-center text-primary py-4">
                <i class="fas fa-microphone fa-3x mb-3 pulse"></i>
                <h5>Listening for audio... (${listenDuration}s max)</h5>
                <p>Play the new song to see live recognition results</p>
                <div class="mt-3">
                    <button class="btn btn-danger" onclick="stopListening()">
                        <i class="fas fa-stop me-2"></i>Stop Listening
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Microphone access error:', error);
        
        // Handle specific error types
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            showMicrophonePermissionHelp();
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            showAlert('No microphone found. Please connect a microphone and try again.', 'danger');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            showAlert('Microphone is already in use by another application. Please close other apps using the microphone and try again.', 'danger');
        } else if (error.name === 'OverconstrainedError') {
            showAlert('The selected microphone settings are not supported. Please check your microphone settings.', 'danger');
        } else if (error.name === 'TypeError') {
            showAlert('Invalid microphone settings. Please check your configuration.', 'danger');
        } else {
            showAlert(`Microphone error: ${error.message || 'Unknown error occurred'}`, 'danger');
        }
        
        // Reset UI state
        isListening = false;
        updateSessionControls();
    }
}

function stopListening() {
    console.log('Stopping audio listening...');
    
    isListening = false;
    hasListenedBefore = true;
    updateSessionControls();
    updateSessionStatus('success', 'Session Active');
    
    // Clear timeout if exists
    if (listeningTimeout) {
        clearTimeout(listeningTimeout);
        listeningTimeout = null;
    }
    
    // Stop recognition timer
    stopRecognitionTimer();
    
    stopAudioCapture();
    hideElement('audioVisualization');
    
    // Get final elapsed time
    const finalTime = recognitionStartTime ? 
        ((new Date() - recognitionStartTime) / 1000).toFixed(1) : 
        '0.0';
    
    document.getElementById('liveResultsContent').innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="fas fa-forward fa-3x mb-3"></i>
            <h5>Ready for next song</h5>
            <p>Recognition completed in ${finalTime}s</p>
            <small class="text-muted">Click "Next Song" to recognize another track</small>
        </div>
    `;
}

// Audio Processing Setup
async function setupAudioProcessing() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume audio context if suspended (required by some browsers)
        if (audioContext.state === 'suspended') {
            console.log('Resuming audio context...');
            await audioContext.resume();
        }
        
        const source = audioContext.createMediaStreamSource(mediaStream);
        
        // Apply input gain from settings
        const micSettings = getMicrophoneSettings();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = micSettings.inputGain;
        console.log(`Applying input gain: ${micSettings.inputGain}x`);
        
        source.connect(gainNode);
        analyser = audioContext.createAnalyser();
        
        // Configure analyser for better level detection
        analyser.fftSize = 256;  // Smaller for faster processing
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.85;
        
        gainNode.connect(analyser);
        
        // Test that audio is coming through
        const testArray = new Uint8Array(analyser.fftSize);
        setTimeout(() => {
            analyser.getByteTimeDomainData(testArray);
            const hasSignal = testArray.some(val => Math.abs(val - 128) > 2);
            console.log('Audio signal test:', hasSignal ? 'DETECTED' : 'NO SIGNAL');
            console.log('Sample values:', testArray.slice(0, 10));
        }, 500);
        
        console.log('Audio processing setup complete');
        console.log('Sample rate:', audioContext.sampleRate);
        console.log('Audio context state:', audioContext.state);
        console.log('Analyser frequency bin count:', analyser.frequencyBinCount);
        
        // Start audio level monitoring
        startAudioLevelMonitoring();
        
        // Start sending audio chunks (simplified for demo)
        startAudioChunking();
        
    } catch (error) {
        console.error('Error setting up audio processing:', error);
        throw error;
    }
}

function startAudioLevelMonitoring() {
    if (!analyser) {
        console.error('Analyser not initialized!');
        return;
    }
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Uint8Array(analyser.fftSize);
    
    console.log('Starting audio level monitoring, buffer length:', bufferLength);
    console.log('Analyser FFT size:', analyser.fftSize);
    
    function updateLevel() {
        if (!isListening || !analyser) {
            console.log('Stopping audio level monitoring');
            return;
        }
        
        try {
            // Get time domain data for accurate volume measurement
            analyser.getByteTimeDomainData(timeDataArray);
            
            // Calculate RMS (Root Mean Square) for accurate volume
            let sum = 0;
            let max = 0;
            for (let i = 0; i < timeDataArray.length; i++) {
                const sample = Math.abs(timeDataArray[i] - 128); // Center around 0
                sum += sample;
                if (sample > max) max = sample;
            }
            
            // Use peak detection for better responsiveness
            const peak = max / 128; // Normalize to 0-1
            const average = (sum / timeDataArray.length) / 128;
            
            // Combine peak and average for balanced response
            const level = (peak * 0.7 + average * 0.3);
            const percentage = Math.min(100, level * 100 * 2); // Scale up for visibility
            
            // Also check frequency data for additional sensitivity
            analyser.getByteFrequencyData(dataArray);
            let freqSum = 0;
            const relevantBins = Math.min(bufferLength, 32); // Focus on lower frequencies
            
            for (let i = 0; i < relevantBins; i++) {
                freqSum += dataArray[i];
            }
            
            const freqLevel = (freqSum / relevantBins) / 255; // Normalize
            const freqPercentage = Math.min(100, freqLevel * 100 * 1.5);
            
            // Use the higher of the two measurements
            const finalPercentage = Math.max(percentage, freqPercentage);
            updateLevelBar(finalPercentage);
            
        } catch (error) {
            console.error('Error updating audio level:', error);
        }
        
        requestAnimationFrame(updateLevel);
    }
    
    function updateLevelBar(percentage) {
        const levelBar = document.getElementById('audioLevelBar');
        if (!levelBar) return;
        
        levelBar.style.width = `${percentage.toFixed(1)}%`;
        levelBar.setAttribute('aria-valuenow', percentage.toFixed(1));
        
        // Change color based on level
        if (percentage < 5) {
            levelBar.className = 'progress-bar bg-secondary';
            levelBar.setAttribute('title', 'Too quiet - try speaking louder or getting closer to mic');
        } else if (percentage < 20) {
            levelBar.className = 'progress-bar bg-info';
            levelBar.setAttribute('title', 'Quiet - audio detected but low');
        } else if (percentage < 60) {
            levelBar.className = 'progress-bar bg-success';
            levelBar.setAttribute('title', 'Good level - perfect for recognition');
        } else if (percentage < 80) {
            levelBar.className = 'progress-bar bg-warning';
            levelBar.setAttribute('title', 'Loud - may cause distortion');
        } else {
            levelBar.className = 'progress-bar bg-danger';
            levelBar.setAttribute('title', 'Too loud - reduce volume to avoid clipping');
        }
        
        // Debug logging more frequently for debugging
        if (Math.random() < 0.2) { // Log 20% of the time for debugging
            console.log(`Audio level: ${percentage.toFixed(1)}%`);
        }
    }
    
    // Start the monitoring loop
    updateLevel();
}

function startAudioChunking() {
    // Use MediaRecorder to capture real audio data
    if (!mediaStream) {
        console.error('No media stream available');
        return;
    }
    
    // Reset audio chunks
    audioChunks = [];
    
    // Check which MIME types are supported
    const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus', 
        'audio/ogg',
        'audio/wav',
        'audio/mp4'
    ];
    
    let mimeType = 'audio/webm'; // default
    for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            console.log('Using supported MIME type:', type);
            break;
        }
    }
    
    try {
        const recorderOptions = {
            mimeType: mimeType
        };
        
        // Only add audioBitsPerSecond if it's not wav
        if (!mimeType.includes('wav')) {
            recorderOptions.audioBitsPerSecond = 128000;
        }
        
        mediaRecorder = new MediaRecorder(mediaStream, recorderOptions);
        
        console.log('MediaRecorder created with options:', recorderOptions);
        
        // Collect audio data as it becomes available
        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
                console.log('Audio chunk collected, size:', event.data.size);
            } else {
                console.warn('Empty audio chunk received');
            }
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
        };
        
        mediaRecorder.onstart = () => {
            console.log('MediaRecorder started successfully');
        };
        
        mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped');
        };
        
        // Start continuous recording (we'll manually request data)
        mediaRecorder.start();
        console.log('MediaRecorder started in continuous mode');
        
        // Test: Verify recording after 1 second
        setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                console.log('MediaRecorder state after 1s:', mediaRecorder.state);
                console.log('Audio chunks collected so far:', audioChunks.length);
                if (audioChunks.length === 0) {
                    console.warn('No audio chunks collected yet - requesting data manually');
                    mediaRecorder.requestData();
                }
            }
        }, 1000);
        
        // Send audio chunks every 500ms
        const chunkInterval = setInterval(async () => {
            if (!isListening || !mediaRecorder || mediaRecorder.state !== 'recording') {
                clearInterval(chunkInterval);
                return;
            }
            
            // Request data from MediaRecorder (this triggers ondataavailable)
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.requestData();
            }
            
            // Wait a bit for data to be available
            setTimeout(() => {
                chunkCounter++;
                
                // If we have audio chunks, send them
                if (audioChunks.length > 0) {
                    // Combine chunks into a single blob
                    const audioBlob = new Blob(audioChunks, { type: mimeType });
                    const chunkSize = audioBlob.size;
                    audioChunks = []; // Reset for next interval
                    
                    if (chunkSize > 0) {
                        // Convert blob to base64 for transmission
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64Audio = reader.result.split(',')[1]; // Remove data URL prefix
                            
                            // Get current audio level
                            const levelBar = document.getElementById('audioLevelBar');
                            const audioLevel = levelBar ? parseFloat(levelBar.style.width) || 0 : 0;
                            
                            // Send audio chunk data to server
                            socket.emit('audio_chunk', {
                                chunk_id: chunkCounter,
                                timestamp: new Date().toISOString(),
                                audio_level: audioLevel,
                                audio_data: base64Audio,
                                mime_type: mimeType
                            });
                            
                            console.log(`Sent audio chunk #${chunkCounter}, size: ${chunkSize} bytes`);
                        };
                        reader.readAsDataURL(audioBlob);
                    } else {
                        console.warn(`Empty audio blob for chunk #${chunkCounter}`);
                        // Send without audio data to maintain chunk count
                        const levelBar = document.getElementById('audioLevelBar');
                        const audioLevel = levelBar ? parseFloat(levelBar.style.width) || 0 : 0;
                        
                        socket.emit('audio_chunk', {
                            chunk_id: chunkCounter,
                            timestamp: new Date().toISOString(),
                            audio_level: audioLevel
                        });
                    }
                } else {
                    console.warn(`No audio chunks available for chunk #${chunkCounter}`);
                    // Send without audio data to maintain chunk count
                    const levelBar = document.getElementById('audioLevelBar');
                    const audioLevel = levelBar ? parseFloat(levelBar.style.width) || 0 : 0;
                    
                    socket.emit('audio_chunk', {
                        chunk_id: chunkCounter,
                        timestamp: new Date().toISOString(),
                        audio_level: audioLevel
                    });
                }
            }, 100); // Small delay to allow data to be collected
            
        }, 500); // Send every 500ms
        
    } catch (error) {
        console.error('Error creating MediaRecorder:', error);
        // Fallback to old method if MediaRecorder fails
        startAudioChunkingFallback();
    }
}

function startAudioChunkingFallback() {
    // Fallback method without real audio data (original implementation)
    const chunkInterval = setInterval(() => {
        if (!isListening) {
            clearInterval(chunkInterval);
            return;
        }
        
        chunkCounter++;
        
        const levelBar = document.getElementById('audioLevelBar');
        const audioLevel = levelBar ? parseFloat(levelBar.style.width) || 0 : 0;
        
        socket.emit('audio_chunk', {
            chunk_id: chunkCounter,
            timestamp: new Date().toISOString(),
            audio_level: audioLevel
        });
        
    }, 500);
}

function stopAudioCapture() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder = null;
    }
    
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    analyser = null;
    audioChunks = [];
}

// Recognition Results Display
function displayRecognitionResult(data) {
    try {
        const analysisCounter = document.getElementById('analysisCounter');
        if (analysisCounter) {
            const accumulatedTime = data.accumulated_seconds || (data.recognition_id * 0.5) || 0;
            analysisCounter.textContent = `${data.recognition_id || data.chunk_id} analyses (${accumulatedTime.toFixed(1)}s audio)`;
        } else {
            console.error('analysisCounter element not found');
        }
        
        // Always update live results if we have data (even if not actively listening)
        // This ensures results are shown even after the 5-second timeout
        updateLiveResults(data);
        
        // Add to session history
        addToSessionHistory(data);
    } catch (error) {
        console.error('Error in displayRecognitionResult:', error);
    }
}

function updateLiveResults(data) {
    const content = document.getElementById('liveResultsContent');
    
    if (!content) {
        console.error('liveResultsContent element not found!');
        return;
    }
    
    // Get settings from localStorage
    const confidenceThreshold = (parseInt(localStorage.getItem('confidenceThreshold')) || 10) / 100;
    const maxResults = parseInt(localStorage.getItem('maxResults')) || 5;
    
    // Get candidates and sort by confidence
    const candidates = (data.candidates || [])
        .filter(c => c.confidence >= confidenceThreshold)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, maxResults);
    
    const accumulatedTime = data.accumulated_seconds || 0;
    
    // If no candidates, show waiting message
    if (candidates.length === 0) {
        if (!content.querySelector('.no-matches')) {
            content.innerHTML = `
                <div class="no-matches text-center text-muted py-4">
                    <i class="fas fa-music fa-3x mb-3"></i>
                    <h5>Listening...</h5>
                    <p>No matches yet (${accumulatedTime.toFixed(1)}s of audio)</p>
                </div>
            `;
        } else {
            // Just update the time
            const timeElement = content.querySelector('.no-matches p');
            if (timeElement) {
                timeElement.textContent = `No matches yet (${accumulatedTime.toFixed(1)}s of audio)`;
            }
        }
        songElements.clear();
        return;
    }
    
    // Create or update header
    let header = content.querySelector('.results-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'results-header mb-3';
        content.innerHTML = '';
        content.appendChild(header);
    }
    header.innerHTML = `
        <h6 class="mb-0">
            <i class="fas fa-music me-2"></i>
            Possible Songs <small class="text-muted">(${accumulatedTime.toFixed(1)}s analyzed)</small>
        </h6>
    `;
    
    // Create or get song list container
    let listContainer = content.querySelector('.song-list');
    if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.className = 'song-list';
        content.appendChild(listContainer);
    }
    
    // Track which songs are in current results
    const currentSongs = new Set(candidates.map(c => c.song_name));
    
    // Remove songs no longer in top 5
    songElements.forEach((element, songName) => {
        if (!currentSongs.has(songName)) {
            element.style.opacity = '0';
            setTimeout(() => {
                element.remove();
                songElements.delete(songName);
            }, 300);
        }
    });
    
    // Update or create elements for each candidate
    candidates.forEach((candidate, index) => {
        const confidencePercent = (candidate.confidence * 100).toFixed(1);
        const progressClass = candidate.confidence > 0.8 ? 'bg-success' : 
                             candidate.confidence > 0.5 ? 'bg-warning' : 'bg-info';
        
        let songElement = songElements.get(candidate.song_name);
        
        if (!songElement) {
            // Create new element
            songElement = document.createElement('div');
            songElement.className = 'song-item mb-3 p-2 border rounded';
            songElement.style.opacity = '0';
            songElement.style.transition = 'all 0.3s ease';
            listContainer.appendChild(songElement);
            songElements.set(candidate.song_name, songElement);
            
            // Fade in after adding to DOM
            setTimeout(() => {
                songElement.style.opacity = '1';
            }, 10);
        }
        
        // Update content
        const isTopMatch = index === 0;
        songElement.className = `song-item mb-3 p-2 border rounded ${isTopMatch ? 'border-primary bg-light' : ''}`;
        
        songElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold">
                    ${index + 1}. ${candidate.song_name}
                    ${isTopMatch && candidate.confidence > 0.8 ? '<i class="fas fa-check-circle text-success ms-2"></i>' : ''}
                </span>
                <span class="badge ${progressClass}">${confidencePercent}%</span>
            </div>
            <div class="progress" style="height: 10px;">
                <div class="progress-bar ${progressClass} progress-bar-animated" 
                     role="progressbar" 
                     style="width: ${confidencePercent}%; transition: width 0.3s ease;" 
                     aria-valuenow="${confidencePercent}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                </div>
            </div>
        `;
        
        // Reorder in DOM based on ranking
        const existingIndex = Array.from(listContainer.children).indexOf(songElement);
        if (existingIndex !== index) {
            const referenceNode = listContainer.children[index];
            if (referenceNode && referenceNode !== songElement) {
                listContainer.insertBefore(songElement, referenceNode);
            }
        }
    });
}

function addSessionDivider() {
    const tbody = document.getElementById('sessionHistoryBody');
    
    if (!tbody) {
        return;
    }
    
    // Get the final result from previous session if any
    let finalResultText = '';
    if (lastTopSong && lastLoggedConfidences.has(lastTopSong)) {
        const confidence = (lastLoggedConfidences.get(lastTopSong) * 100).toFixed(1);
        finalResultText = ` - Previous: "${lastTopSong}" (${confidence}%)`;
    }
    
    // Create divider row
    const dividerRow = document.createElement('tr');
    dividerRow.className = 'table-secondary';
    dividerRow.innerHTML = `
        <td colspan="5" class="text-center py-2">
            <strong>
                <i class="fas fa-music me-2"></i>
                New Song Session Started - ${formatTime(new Date())}
                ${finalResultText}
            </strong>
        </td>
    `;
    
    tbody.insertBefore(dividerRow, tbody.firstChild);
    
    // Keep only last 20 entries
    while (tbody.children.length > 20) {
        tbody.removeChild(tbody.lastChild);
    }
}

function addToSessionHistory(data) {
    const tbody = document.getElementById('sessionHistoryBody');
    
    if (!tbody) {
        console.error('sessionHistoryBody element not found!');
        return;
    }
    
    // Get top candidate
    const candidates = (data.candidates || [])
        .filter(c => c.confidence >= 0.3) // Only consider 30%+ for history
        .sort((a, b) => b.confidence - a.confidence);
    
    if (candidates.length === 0) {
        return; // Don't log if no confident matches
    }
    
    const topCandidate = candidates[0];
    const confidencePercent = (topCandidate.confidence * 100).toFixed(1);
    const accumulatedTime = data.accumulated_seconds || 0;
    
    // Determine if this is a significant event
    let eventType = null;
    let shouldLog = false;
    
    // Check for first detection of a song
    if (topCandidate.song_name !== lastTopSong && topCandidate.confidence >= 0.3) {
        eventType = 'Song Detected';
        lastTopSong = topCandidate.song_name;
        shouldLog = true;
        lastLoggedConfidences.set(topCandidate.song_name, topCandidate.confidence);
    }
    
    // Check for confidence milestones
    const lastLogged = lastLoggedConfidences.get(topCandidate.song_name) || 0;
    const milestones = [0.5, 0.7, 0.9];
    
    for (const milestone of milestones) {
        if (lastLogged < milestone && topCandidate.confidence >= milestone) {
            eventType = `${(milestone * 100)}% Confidence`;
            shouldLog = true;
            lastLoggedConfidences.set(topCandidate.song_name, topCandidate.confidence);
            break;
        }
    }
    
    // Log if significant event
    if (shouldLog) {
        const row = document.createElement('tr');
        const badgeClass = topCandidate.confidence > 0.8 ? 'bg-success' : 
                          topCandidate.confidence > 0.5 ? 'bg-warning' : 'bg-info';
        
        row.innerHTML = `
            <td>${formatTime(new Date())}</td>
            <td>
                <strong>${eventType}</strong>
            </td>
            <td>${topCandidate.song_name}</td>
            <td>
                <span class="badge ${badgeClass}">${confidencePercent}%</span>
            </td>
            <td>
                <small class="text-muted">${accumulatedTime.toFixed(1)}s</small>
            </td>
        `;
        
        tbody.insertBefore(row, tbody.firstChild);
        
        // Keep only last 10 significant events
        while (tbody.children.length > 10) {
            tbody.removeChild(tbody.lastChild);
        }
    }
}

// UI Helper Functions
function updateSessionControls() {
    const startSessionBtn = document.getElementById('startSessionBtn');
    const startListenBtn = document.getElementById('startListenBtn');
    const stopSessionBtn = document.getElementById('stopSessionBtn');
    
    if (isSessionActive) {
        startSessionBtn.disabled = true;
        startListenBtn.disabled = false;
        stopSessionBtn.disabled = false;
        
        if (isListening) {
            startListenBtn.innerHTML = '<i class="fas fa-pause me-2"></i>Stop Listening';
            startListenBtn.className = 'btn btn-danger btn-lg w-100';
            startListenBtn.onclick = stopListening;
        } else {
            if (hasListenedBefore) {
                startListenBtn.innerHTML = '<i class="fas fa-forward me-2"></i>Next Song';
                startListenBtn.className = 'btn btn-success btn-lg w-100';
            } else {
                startListenBtn.innerHTML = '<i class="fas fa-microphone me-2"></i>Start Listening';
                startListenBtn.className = 'btn btn-warning btn-lg w-100';
            }
            startListenBtn.onclick = startListening;
        }
    } else {
        startSessionBtn.disabled = false;
        startListenBtn.disabled = true;
        stopSessionBtn.disabled = true;
        
        startListenBtn.innerHTML = '<i class="fas fa-microphone me-2"></i>Next Song';
        startListenBtn.className = 'btn btn-warning btn-lg w-100';
    }
}

function updateSessionStatus(type, text) {
    const icon = document.getElementById('sessionStatusIcon');
    const statusText = document.getElementById('sessionStatusText');
    
    const colors = {
        'success': '#28a745',
        'warning': '#ffc107', 
        'danger': '#dc3545',
        'error': '#dc3545',
        'secondary': '#6c757d'
    };
    
    icon.style.color = colors[type] || colors['secondary'];
    statusText.textContent = text;
}

function updateTimer() {
    const timerElement = document.getElementById('sessionTimer');
    
    if (sessionStartTime) {
        const elapsed = new Date() - sessionStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        timerElement.textContent = '00:00';
    }
}

function clearResults() {
    document.getElementById('liveResultsContent').innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="fas fa-eraser fa-3x mb-3"></i>
            <h5>Results cleared</h5>
            <p>Continue listening for new recognition results</p>
        </div>
    `;
    
    document.getElementById('sessionHistoryBody').innerHTML = '';
    document.getElementById('analysisCounter').textContent = '0 analyses';
}

// Recognition Timer Functions
function startRecognitionTimer() {
    recognitionStartTime = new Date();
    
    // Reset timer display
    document.getElementById('recognitionTimer').textContent = '00:00';
    
    // Start timer interval
    recognitionTimerInterval = setInterval(updateRecognitionTimer, 100); // Update every 100ms for smooth display
    
    console.log('Recognition timer started');
}

function stopRecognitionTimer() {
    if (recognitionTimerInterval) {
        clearInterval(recognitionTimerInterval);
        recognitionTimerInterval = null;
    }
    
    console.log('Recognition timer stopped');
}

function updateRecognitionTimer() {
    if (!recognitionStartTime) return;
    
    const elapsed = new Date() - recognitionStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const milliseconds = Math.floor((elapsed % 1000) / 100);
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    const timerElement = document.getElementById('recognitionTimer');
    if (timerElement) {
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds}`;
        timerElement.textContent = formattedTime;
        
        // Change color based on elapsed time
        if (seconds < 5) {
            timerElement.className = 'badge bg-success';
        } else if (seconds < 8) {
            timerElement.className = 'badge bg-warning';
        } else {
            timerElement.className = 'badge bg-danger';
        }
    }
}

// Utility Functions
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

function showFinalResult(highConfidenceMatch, data) {
    const content = document.getElementById('liveResultsContent');
    const confidencePercent = (highConfidenceMatch.confidence * 100).toFixed(1);
    const finalTime = recognitionStartTime ? 
        ((new Date() - recognitionStartTime) / 1000).toFixed(1) : 
        'N/A';
    
    content.innerHTML = `
        <div class="text-center py-4">
            <div class="mb-4">
                <i class="fas fa-trophy fa-4x text-warning mb-3"></i>
                <h4 class="text-success fw-bold">🎯 Song Identified!</h4>
            </div>
            
            <div class="card border-success mb-3">
                <div class="card-body">
                    <h5 class="card-title text-primary fw-bold">${highConfidenceMatch.song_name}</h5>
                    <div class="progress mb-3" style="height: 15px;">
                        <div class="progress-bar bg-success" role="progressbar" 
                             style="width: ${confidencePercent}%" 
                             aria-valuenow="${confidencePercent}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                            ${confidencePercent}% Confidence
                        </div>
                    </div>
                    <div class="row text-center">
                        <div class="col-6">
                            <i class="fas fa-clock text-primary me-1"></i>
                            <small class="text-muted">Recognition Time</small>
                            <div class="fw-bold">${finalTime}s</div>
                        </div>
                        <div class="col-6">
                            <i class="fas fa-chart-line text-success me-1"></i>
                            <small class="text-muted">Analysis Count</small>
                            <div class="fw-bold">${data.chunk_id} chunks</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="alert alert-success" role="alert">
                <i class="fas fa-check-circle me-2"></i>
                <strong>Auto-stopped:</strong> High confidence (${confidencePercent}%) reached in ${finalTime} seconds
            </div>
            
            <div class="mt-3">
                <small class="text-muted">Recognition completed automatically at 80%+ confidence threshold</small>
            </div>
        </div>
    `;
}

function formatTime(date) {
    return date.toLocaleTimeString();
}

function showMicrophonePermissionHelp() {
    // Detect browser
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isChrome || isEdge) {
        instructions = `
            <h6>How to enable microphone in Chrome/Edge:</h6>
            <ol>
                <li>Click the <i class="fas fa-lock"></i> or <i class="fas fa-microphone-slash"></i> icon in the address bar</li>
                <li>Click "Site settings" or the microphone icon</li>
                <li>Change "Microphone" to "Allow"</li>
                <li>Refresh the page and try again</li>
            </ol>
            <p class="mt-3">Or go to: <code>chrome://settings/content/microphone</code></p>
        `;
    } else if (isFirefox) {
        instructions = `
            <h6>How to enable microphone in Firefox:</h6>
            <ol>
                <li>Click the <i class="fas fa-lock"></i> icon in the address bar</li>
                <li>Click the blocked microphone icon</li>
                <li>Click "Allow" for microphone access</li>
                <li>Refresh the page and try again</li>
            </ol>
            <p class="mt-3">Or go to: <code>about:preferences#privacy</code></p>
        `;
    } else if (isSafari) {
        instructions = `
            <h6>How to enable microphone in Safari:</h6>
            <ol>
                <li>Go to Safari menu → Preferences</li>
                <li>Click "Websites" tab</li>
                <li>Select "Microphone" from the left sidebar</li>
                <li>Find this website and change to "Allow"</li>
                <li>Refresh the page and try again</li>
            </ol>
        `;
    } else {
        instructions = `
            <h6>How to enable microphone:</h6>
            <ol>
                <li>Check your browser's address bar for a microphone icon</li>
                <li>Click it and allow microphone access</li>
                <li>Or check your browser's settings/preferences</li>
                <li>Look for "Site Settings" or "Permissions"</li>
                <li>Enable microphone for this website</li>
                <li>Refresh the page and try again</li>
            </ol>
        `;
    }
    
    const modalHTML = `
        <div class="modal fade" id="micPermissionModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-microphone-slash me-2"></i>
                            Microphone Permission Denied
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Microphone access is required</strong> for live audio recognition.
                        </div>
                        ${instructions}
                        <div class="alert alert-info mt-3">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Note:</strong> If you're using HTTPS, make sure the SSL certificate is valid.
                            Some browsers block microphone access on insecure connections.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="location.reload()">
                            <i class="fas fa-redo me-2"></i>Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('micPermissionModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('micPermissionModal'));
    modal.show();
}

// Test microphone permission function
async function testMicrophonePermission() {
    console.log('🎤 testMicrophonePermission() called');
    
    try {
        console.log('Showing alert and preparing to request microphone...');
        showAlert('🎤 Requesting microphone access - please allow when prompted!', 'info');
        
        // Add a small delay to ensure user can see the message
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('About to call getUserMedia - this SHOULD trigger browser permission prompt!');
        
        // Use the most minimal constraints possible
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        console.log('✅ SUCCESS! Got microphone stream:', testStream);
        console.log('Audio tracks:', testStream.getAudioTracks());
        
        // Success - immediately stop the test stream
        testStream.getTracks().forEach(track => {
            console.log('Stopping track:', track);
            track.stop();
        });
        
        showAlert('✅ Microphone access granted! You can now start live recognition.', 'success');
        console.log('Microphone test completed successfully');
        
    } catch (error) {
        console.error('❌ Microphone test failed:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            console.log('Permission denied - showing help modal');
            showMicrophonePermissionHelp();
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            showAlert('❌ No microphone found. Please connect a microphone and try again.', 'danger');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            showAlert('❌ Microphone is already in use by another application. Please close other apps using the microphone.', 'danger');
        } else {
            showAlert(`❌ Microphone test failed: ${error.name} - ${error.message || 'Unknown error'}`, 'danger');
        }
    }
}

console.log('live_recognition.js loaded');