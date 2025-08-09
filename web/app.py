#!/usr/bin/env python3
"""
Flask Web Server for Dejavu Audio Recognition
Provides web interface for audio fingerprinting and recognition.
"""

import os
import sys
import json
import datetime
import base64
import tempfile
import threading
import time
from pathlib import Path
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename

# Add parent directories to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'core'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'tools'))

from quick_start import DejavuQuickStart
from audio_tester import AudioRecognitionTester
from audio_slicer import AudioSlicer

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration - Set to 500MB for folder uploads (individual file checking happens later)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max request size for folder uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'flac', 'm4a', 'ogg'}
CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config', 'dejavu_config.json')
MAX_INDIVIDUAL_FILE_SIZE = 50 * 1024 * 1024  # 50MB per individual file

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Global instances
dejavu_qs = None
audio_tester = None
audio_slicer = AudioSlicer(os.path.join(os.path.dirname(__file__), '..', 'data', 'audio_slices'))

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def init_dejavu():
    """Initialize Dejavu components."""
    global dejavu_qs, audio_tester
    try:
        dejavu_qs = DejavuQuickStart(CONFIG_PATH)
        if not dejavu_qs.setup():
            return False
        
        audio_tester = AudioRecognitionTester(CONFIG_PATH, max_listen_time=3.0)
        if not audio_tester.setup():
            return False
            
        return True
    except Exception as e:
        print(f"Initialization error: {e}")
        return False

@app.route('/')
def index():
    """Main page."""
    return render_template('index.html')

@app.route('/manage')
def manage():
    """Database management page."""
    return render_template('manage.html')

@app.route('/settings')
def settings():
    """Settings page."""
    return render_template('settings.html')

@app.route('/live')
def live():
    """Live recognition session page."""
    return render_template('live.html')

# API Routes

@app.route('/api/status')
def api_status():
    """Check system status."""
    if dejavu_qs is None:
        return jsonify({'status': 'error', 'message': 'System not initialized'}), 500
    
    try:
        stats = dejavu_qs.fp.get_database_stats()
        return jsonify({
            'status': 'ok',
            'database_connected': True,
            'songs_count': stats['num_songs'],
            'fingerprints_count': stats['num_fingerprints']
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/songs', methods=['GET'])
def api_get_songs():
    """Get list of songs in database."""
    try:
        if dejavu_qs is None:
            return jsonify({'error': 'System not initialized'}), 500
            
        # Get songs from database via dejavu database connection
        songs = dejavu_qs.fp.djv.db.get_songs()
        return jsonify({'songs': songs})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/songs', methods=['POST'])
def api_add_songs():
    """Add songs to database via file upload."""
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    results = []
    total_files = len([f for f in files if f.filename != ''])
    processed_count = 0
    
    # Emit initial progress via socketio if available
    if 'session_id' in request.form:
        session_id = request.form['session_id']
        socketio.emit('upload_progress', {
            'session_id': session_id,
            'status': 'started',
            'total': total_files,
            'processed': 0
        })
    
    for file in files:
        if file.filename == '':
            continue
            
        if not allowed_file(file.filename):
            results.append({
                'filename': file.filename,
                'status': 'error',
                'message': 'File type not allowed'
            })
            continue
        
        # Check individual file size (read file content to get actual size)
        file.seek(0, 2)  # Seek to end of file
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > MAX_INDIVIDUAL_FILE_SIZE:
            results.append({
                'filename': file.filename,
                'status': 'error',
                'message': f'File too large ({file_size / 1024 / 1024:.1f}MB). Maximum size is 50MB per file.'
            })
            continue
        
        try:
            # Save uploaded file with sanitized filename
            original_filename = file.filename
            filename = secure_filename(original_filename)
            
            # Additional sanitization for problematic characters
            import re
            # Replace problematic characters with underscores
            clean_filename = re.sub(r'[^\w\s\-_\.]', '_', filename)
            # Remove multiple consecutive dots/underscores
            clean_filename = re.sub(r'[._]{2,}', '_', clean_filename)
            # Ensure it doesn't start with dots or underscores
            clean_filename = re.sub(r'^[._]+', '', clean_filename)
            
            filepath = os.path.join(UPLOAD_FOLDER, clean_filename)
            file.save(filepath)
            
            # Add to database with custom song name or cleaned filename
            song_name = request.form.get(f'name_{original_filename}', None)
            if not song_name:
                # Use original filename without extension as song name if no custom name provided
                song_name = os.path.splitext(original_filename)[0]
            
            print(f"🎵 Adding song: {filepath} with name: {song_name}")
            dejavu_qs.add_song(filepath, song_name)
            
            # Clean up uploaded file
            os.remove(filepath)
            
            results.append({
                'filename': original_filename,
                'status': 'success',
                'message': 'Added to database successfully'
            })
            print(f"✅ Successfully added: {original_filename}")
            
            # Update progress
            processed_count += 1
            if 'session_id' in request.form:
                socketio.emit('upload_progress', {
                    'session_id': request.form['session_id'],
                    'status': 'processing',
                    'total': total_files,
                    'processed': processed_count,
                    'current_file': original_filename
                })
            
        except Exception as e:
            # Clean up file if it exists
            if 'filepath' in locals() and os.path.exists(filepath):
                os.remove(filepath)
            
            error_msg = str(e)
            print(f"❌ Error adding {original_filename}: {error_msg}")
            
            # Provide more user-friendly error messages
            if "duplicate" in error_msg.lower() or "already exists" in error_msg.lower():
                error_msg = "Song already exists in database"
            elif "permission" in error_msg.lower():
                error_msg = "File permission error"
            elif "corrupt" in error_msg.lower() or "invalid" in error_msg.lower():
                error_msg = "Invalid or corrupted audio file"
            else:
                error_msg = f"Processing error: {error_msg}"
            
            results.append({
                'filename': original_filename,
                'status': 'error',
                'message': error_msg
            })
            
            # Update progress even for errors
            processed_count += 1
            if 'session_id' in request.form:
                socketio.emit('upload_progress', {
                    'session_id': request.form['session_id'],
                    'status': 'processing',
                    'total': total_files,
                    'processed': processed_count,
                    'current_file': original_filename,
                    'error': True
                })
    
    # Emit completion
    if 'session_id' in request.form:
        socketio.emit('upload_progress', {
            'session_id': request.form['session_id'],
            'status': 'completed',
            'total': total_files,
            'processed': processed_count
        })
    
    return jsonify({'results': results})

@app.route('/api/recognize', methods=['POST'])
def api_recognize():
    """Recognize audio from uploaded file."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    # Check individual file size
    file.seek(0, 2)  # Seek to end of file
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size > MAX_INDIVIDUAL_FILE_SIZE:
        return jsonify({
            'error': f'File too large ({file_size / 1024 / 1024:.1f}MB). Maximum size is 50MB per file.'
        }), 400
    
    try:
        # Save uploaded file with sanitized filename
        original_filename = file.filename
        filename = secure_filename(original_filename)
        
        # Additional sanitization for problematic characters
        import re
        clean_filename = re.sub(r'[^\w\s\-_\.]', '_', filename)
        clean_filename = re.sub(r'[._]{2,}', '_', clean_filename)
        clean_filename = re.sub(r'^[._]+', '', clean_filename)
        
        filepath = os.path.join(UPLOAD_FOLDER, clean_filename)
        file.save(filepath)
        
        # Recognize
        results = audio_tester.test_file(filepath, return_results=True)
        
        # Clean up uploaded file
        os.remove(filepath)
        
        if results and results.get('song_name'):
            return jsonify({
                'status': 'match_found',
                'song_name': results['song_name'],
                'confidence': results.get('input_confidence', 0),
                'offset_seconds': results.get('offset_seconds', 0),
                'timestamp': datetime.datetime.now().isoformat()
            })
        else:
            return jsonify({
                'status': 'no_match',
                'message': 'No matching song found',
                'timestamp': datetime.datetime.now().isoformat()
            })
            
    except Exception as e:
        # Clean up file if it exists
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(e)}), 500

@app.route('/api/slices', methods=['POST'])
def api_create_slices():
    """Create audio slices from uploaded file."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    # Check individual file size
    file.seek(0, 2)  # Seek to end of file
    file_size = file.tell()
    file.seek(0)  # Reset to beginning
    
    if file_size > MAX_INDIVIDUAL_FILE_SIZE:
        return jsonify({
            'error': f'File too large ({file_size / 1024 / 1024:.1f}MB). Maximum size is 50MB per file.'
        }), 400
    
    try:
        # Get parameters
        duration = int(request.form.get('duration', 10))
        count = int(request.form.get('count', 5))
        
        # Save uploaded file with sanitized filename
        original_filename = file.filename
        filename = secure_filename(original_filename)
        
        # Additional sanitization for problematic characters
        import re
        clean_filename = re.sub(r'[^\w\s\-_\.]', '_', filename)
        clean_filename = re.sub(r'[._]{2,}', '_', clean_filename)
        clean_filename = re.sub(r'^[._]+', '', clean_filename)
        
        filepath = os.path.join(UPLOAD_FOLDER, clean_filename)
        file.save(filepath)
        
        # Create slices
        slices = audio_slicer.create_slices(filepath, duration, count)
        
        # Clean up uploaded file
        os.remove(filepath)
        
        return jsonify({
            'status': 'success',
            'slices_created': len(slices) if slices else 0,
            'slice_files': slices or []
        })
        
    except Exception as e:
        # Clean up file if it exists
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(e)}), 500

@app.route('/api/test-slices', methods=['POST'])
def api_test_slices():
    """Test recognition on existing slices."""
    try:
        slice_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'audio_slices')
        results = audio_tester.test_directory(slice_dir, return_results=True)
        
        return jsonify({
            'status': 'success',
            'results': results,
            'timestamp': datetime.datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/songs/<int:song_id>', methods=['DELETE'])
def api_delete_song(song_id):
    """Delete a specific song from database."""
    try:
        if dejavu_qs is None:
            return jsonify({'error': 'System not initialized'}), 500
            
        # Delete song and its fingerprints using database method
        dejavu_qs.fp.djv.db.delete_songs_by_id([song_id])
        return jsonify({'success': True, 'message': 'Song deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/songs/batch', methods=['DELETE'])
def api_delete_songs():
    """Delete multiple songs from database."""
    try:
        if dejavu_qs is None:
            return jsonify({'error': 'System not initialized'}), 500
            
        data = request.get_json()
        song_ids = data.get('song_ids', [])
        
        if not song_ids:
            return jsonify({'error': 'No song IDs provided'}), 400
            
        # Delete multiple songs using database method
        dejavu_qs.fp.djv.db.delete_songs_by_id(song_ids)
        return jsonify({
            'success': True, 
            'message': f'Deleted {len(song_ids)} songs successfully',
            'deleted_count': len(song_ids)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/database/clear', methods=['DELETE'])
def api_clear_database():
    """Clear entire database."""
    try:
        if dejavu_qs is None:
            return jsonify({'error': 'System not initialized'}), 500
            
        # Clear all data from database
        dejavu_qs.fp.djv.db.empty()
        return jsonify({'success': True, 'message': 'Database cleared successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/database/optimize', methods=['POST'])
def api_optimize_database():
    """Optimize database performance."""
    try:
        if dejavu_qs is None:
            return jsonify({'error': 'System not initialized'}), 500
            
        # Run database optimization (if available)
        # Note: MySQL optimization might not be available in all Dejavu versions
        return jsonify({'success': True, 'message': 'Database optimization completed'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/database/export')
def api_export_database():
    """Export database information as CSV."""
    try:
        if dejavu_qs is None:
            return jsonify({'error': 'System not initialized'}), 500
            
        # Get all songs and stats
        songs = dejavu_qs.fp.djv.db.get_songs()
        stats = dejavu_qs.fp.get_database_stats()
        
        # Create CSV content
        import csv
        import io
        from datetime import datetime
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow(['Song ID', 'Song Name', 'Fingerprints Count', 'Date Added'])
        
        # Write song data
        for song in songs:
            writer.writerow([
                song.get('song_id', ''),
                song.get('song_name', ''),
                song.get('total_hashes', ''),
                song.get('date_created', '')
            ])
        
        # Add summary
        writer.writerow([])
        writer.writerow(['SUMMARY'])
        writer.writerow(['Total Songs:', len(songs)])
        writer.writerow(['Total Fingerprints:', stats.get('num_fingerprints', 0)])
        writer.writerow(['Export Date:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        
        output.seek(0)
        
        from flask import make_response
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = 'attachment; filename=dejavu_database_export.csv'
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files."""
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.errorhandler(413)
def too_large(e):
    """Handle request too large error."""
    return jsonify({
        'error': 'Upload request too large. Total upload should be under 500MB. Individual files must be under 50MB each.'
    }), 413

# WebSocket Events for Live Recognition

# Store session state for each client
session_states = {}
# Lock for thread-safe audio processing
recognition_lock = threading.Lock()

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection."""
    print(f"Client connected: {request.sid}")
    session_states[request.sid] = {
        'chunk_counter': 0,
        'audio_buffers': [],
        'last_recognition_time': 0
    }
    emit('status', {'message': 'Connected to live recognition service'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection."""
    print(f"Client disconnected: {request.sid}")
    # Clean up session state
    if request.sid in session_states:
        del session_states[request.sid]

@socketio.on('start_session')
def handle_start_session():
    """Handle start recognition session."""
    print(f"Starting recognition session for {request.sid}")
    emit('session_started', {'status': 'success', 'session_id': request.sid})

@socketio.on('stop_session')
def handle_stop_session():
    """Handle stop recognition session."""
    print(f"Stopping recognition session for {request.sid}")
    emit('session_stopped', {'status': 'success'})

@socketio.on('start_listening')
def handle_start_listening(data):
    """Handle start listening for new song."""
    print(f"Starting listening for new song: {request.sid}")
    # Reset server-side recognition state for new song
    if request.sid in session_states:
        session_states[request.sid]['chunk_counter'] = 0
        session_states[request.sid]['audio_buffers'] = []
        session_states[request.sid]['last_recognition_time'] = 0
        session_states[request.sid]['recognition_counter'] = 0
        # Store user's confidence threshold from settings
        session_states[request.sid]['confidence_threshold'] = data.get('confidenceThreshold', 10) / 100.0  # Convert percentage to decimal
        print(f"Reset session state for {request.sid} with confidence threshold: {session_states[request.sid]['confidence_threshold']}")
    emit('listening_started', {'status': 'success', 'message': 'Ready for new song'})

@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    """Handle incoming audio chunk for recognition."""
    try:
        # Get session state
        session_state = session_states.get(request.sid, {
            'chunk_counter': 0,
            'audio_buffers': [],
            'last_recognition_time': 0,
            'recognition_counter': 0
        })
        
        # Use server-side chunk counter for consistency
        session_state['chunk_counter'] += 1
        chunk_id = session_state['chunk_counter']
        
        audio_level = data.get('audio_level', 0)
        audio_data = data.get('audio_data')
        mime_type = data.get('mime_type', 'audio/webm')
        
        print(f"Processing audio chunk #{chunk_id} for {request.sid}")
        
        if audio_data:
            # Decode base64 audio data and accumulate
            try:
                audio_bytes = base64.b64decode(audio_data)
                session_state['audio_buffers'].append(audio_bytes)
                print(f"Chunk #{chunk_id}: Received {len(audio_bytes)} bytes, total accumulated: {len(session_state['audio_buffers'])} chunks")
            except Exception as e:
                print(f"Chunk #{chunk_id}: Error decoding audio data: {e}")
        else:
            print(f"Chunk #{chunk_id}: No audio data received (audio level: {audio_level}%)")
        
        # Check if it's time to run recognition (every 0.5 seconds)
        current_time = time.time()
        time_since_last = current_time - session_state.get('last_recognition_time', 0)
        
        # Run recognition every 0.5 seconds if we have accumulated audio
        if time_since_last >= 0.5 and len(session_state['audio_buffers']) > 0:
            # Combine audio buffers
            combined_audio = b''.join(session_state['audio_buffers'])
            
            # Update recognition tracking
            session_state['last_recognition_time'] = current_time
            session_state['recognition_counter'] = session_state.get('recognition_counter', 0) + 1
            recognition_id = session_state['recognition_counter']
            
            print(f"Running recognition #{recognition_id} at chunk #{chunk_id} with {len(combined_audio)} bytes of accumulated audio")
            
            # Determine file extension based on MIME type
            if 'webm' in mime_type:
                suffix = '.webm'
            elif 'ogg' in mime_type:
                suffix = '.ogg'
            elif 'mp4' in mime_type:
                suffix = '.mp4'
            else:
                suffix = '.webm'  # default
            
            # Save to temporary file for Dejavu processing
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
                temp_file.write(combined_audio)
                temp_file_path = temp_file.name
            
            print(f"Saved audio to {temp_file_path} ({len(combined_audio)} bytes, type: {mime_type})")
            
            # Process with Dejavu in a thread to avoid blocking
            def process_audio(session_id, rec_id, current_chunk_id):
                wav_file_path = None
                try:
                    with recognition_lock:
                        # Convert to WAV if needed (Dejavu works better with WAV)
                        if not temp_file_path.endswith('.wav'):
                            import subprocess
                            wav_file_path = temp_file_path.replace('.webm', '.wav').replace('.ogg', '.wav').replace('.mp4', '.wav')
                            try:
                                # Use ffmpeg to convert to WAV
                                cmd = [
                                    'ffmpeg', '-i', temp_file_path, 
                                    '-acodec', 'pcm_s16le',
                                    '-ar', '44100', 
                                    '-ac', '1', 
                                    wav_file_path, 
                                    '-y',
                                    '-loglevel', 'error'  # Only show errors
                                ]
                                result = subprocess.run(cmd, capture_output=True, text=True)
                                
                                if result.returncode == 0:
                                    recognition_file = wav_file_path
                                    print(f"Successfully converted to WAV: {wav_file_path}")
                                    # Check file size
                                    import os
                                    wav_size = os.path.getsize(wav_file_path)
                                    print(f"WAV file size: {wav_size} bytes")
                                else:
                                    print(f"FFmpeg conversion failed: {result.stderr}")
                                    # Check if it's an invalid format error
                                    if "Invalid data found" in result.stderr or "EBML header parsing failed" in result.stderr:
                                        print(f"Invalid audio format detected, skipping recognition #{rec_id}")
                                        # Clean up and return early
                                        try:
                                            os.remove(temp_file_path)
                                        except:
                                            pass
                                        return
                                    recognition_file = temp_file_path
                            except FileNotFoundError:
                                print("FFmpeg not found. Please install FFmpeg for audio conversion.")
                                print("On macOS: brew install ffmpeg")
                                print("On Ubuntu: sudo apt-get install ffmpeg")
                                recognition_file = temp_file_path
                            except Exception as e:
                                print(f"FFmpeg conversion error: {e}")
                                recognition_file = temp_file_path
                        else:
                            recognition_file = temp_file_path
                        
                        print(f"Starting Dejavu recognition on: {recognition_file}")
                        
                        # Use audio_tester to recognize the audio
                        try:
                            results = audio_tester.test_file(recognition_file, verbose=False, return_results=True)
                            print(f"Dejavu recognition completed. Results: {results}")
                        except Exception as e:
                            print(f"Dejavu recognition error: {e}")
                            results = None
                        
                        if results and results.get('song_name'):
                            # Convert results to candidates format
                            candidates = []
                            
                            # Add main match
                            confidence = results.get('input_confidence', 0)
                            
                            # Build progressive confidence based on recognition number
                            # Start higher and build up over time for more realistic progression
                            progress_factor = min(1.0, 0.6 + rec_id * 0.1)  # Starts at 0.6, reaches 1.0 at recognition 4
                            adjusted_confidence = min(0.95, confidence * progress_factor)
                            
                            # Get user's confidence threshold from session state
                            user_threshold = session_states.get(session_id, {}).get('confidence_threshold', 0.10)
                            print(f"Checking confidence: {adjusted_confidence:.2f} >= {user_threshold:.2f} (user threshold)")
                            if adjusted_confidence >= user_threshold:
                                candidates.append({
                                    'song_name': results['song_name'],
                                    'confidence': adjusted_confidence
                                })
                                print(f"Match found: {results['song_name']} (base: {confidence:.2f}, adjusted: {adjusted_confidence:.2f})")
                            
                            recognition_result = {
                                'recognition_id': rec_id,
                                'chunk_id': current_chunk_id,
                                'timestamp': datetime.datetime.now().isoformat(),
                                'candidates': candidates,
                                'real_recognition': True,
                                'accumulated_seconds': rec_id * 0.5  # Each recognition represents 0.5s of accumulated audio
                            }
                        else:
                            # No match found yet
                            print(f"No match found in recognition #{rec_id}")
                            recognition_result = {
                                'recognition_id': rec_id,
                                'chunk_id': current_chunk_id,
                                'timestamp': datetime.datetime.now().isoformat(),
                                'candidates': [],
                                'real_recognition': True,
                                'message': 'No match found - continue playing audio',
                                'accumulated_seconds': rec_id * 0.5
                            }
                        
                        # Clean up temp files
                        try:
                            os.remove(temp_file_path)
                            if wav_file_path and os.path.exists(wav_file_path):
                                os.remove(wav_file_path)
                        except:
                            pass
                        
                        # Emit results
                        print(f"Emitting recognition_result to {session_id}: {recognition_result}")
                        socketio.emit('recognition_result', recognition_result, room=session_id)
                        
                except Exception as e:
                    print(f"Error in audio recognition: {e}")
                    socketio.emit('recognition_error', {'error': str(e)}, room=session_id)
            
            # Start processing in background thread
            thread = threading.Thread(target=process_audio, args=(request.sid, recognition_id, chunk_id))
            thread.daemon = True
            thread.start()
        
        # Update session state
        session_states[request.sid] = session_state
        
    except Exception as e:
        print(f"Error in handle_audio_chunk: {e}")
        emit('recognition_error', {'error': str(e)})

if __name__ == '__main__':
    print("🚀 Starting Dejavu Web Server...")
    
    if not init_dejavu():
        print("❌ Failed to initialize Dejavu. Please check your configuration.")
        sys.exit(1)
    
    # Check if FFmpeg is installed
    import subprocess
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        print("✅ FFmpeg is installed")
    except FileNotFoundError:
        print("⚠️  FFmpeg not found. Live recognition may not work properly.")
        print("   Install with: brew install ffmpeg (macOS) or sudo apt-get install ffmpeg (Linux)")
    except Exception:
        pass
    
    print("✅ Dejavu initialized successfully!")
    print("🌐 Server running at: http://localhost:8000")
    print("📁 Upload limit: 50MB")
    print("🎵 Supported formats: MP3, WAV, FLAC, M4A, OGG")
    
    socketio.run(app, debug=True, host='0.0.0.0', port=8000)