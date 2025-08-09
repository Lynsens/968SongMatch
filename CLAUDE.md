# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Dejavu audio fingerprinting system that identifies songs from audio samples (similar to Shazam). The project uses a modular architecture with organized folders and main wrapper functions at the root level.

## Key Commands

### Development Setup
```bash
# Setup environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Python 3.13+ requires additional package
pip install audioop-lts
```

### Main Operations
```bash
# CLI Operations
# Add songs to database
python add_songs.py data/songs/
python add_songs.py song.mp3 "Artist - Title"

# Test recognition
python test_recognition.py                    # Interactive mode
python test_recognition.py file audio.wav
python test_recognition.py mic 10
python test_recognition.py batch data/audio_slices/

# Create test slices
python create_slices.py song.mp3             # Creates 5x 10s slices
python create_slices.py song.mp3 output_dir/ 15 3

# Web Interface
python web_server.py                         # Start web server at http://localhost:8000
```

### Database Configuration
Configuration is in `config/dejavu_config.json`. Current setup uses remote MySQL:
- Host: 49.234.22.169
- Database: dejavu
- User/Password: jlg/jlg88888888

## Architecture

### Core Components
- **`core/`**: Contains the main Dejavu library (`dejavu_lib/`) and core functionality (`quick_start.py`, `dejavu_example.py`)
- **`tools/`**: Utilities for audio testing (`audio_tester.py`) and slice creation (`audio_slicer.py`)
- **`web/`**: Flask web interface with templates, static files, and API endpoints
- **`config/`**: Database and fingerprint configuration
- **`data/`**: Songs library and generated audio slices for testing

### Main Wrapper Functions (Root Level)
- `add_songs.py`: Wrapper for adding songs to database
- `test_recognition.py`: Wrapper for unified audio testing (file/microphone/batch)
- `create_slices.py`: Wrapper for creating audio slices for testing
- `web_server.py`: Flask web interface launcher

### Web Interface
The Flask web server (`web_server.py`) provides a user-friendly interface with:
- **Recognition page**: Upload audio files for identification
- **Database management**: Add songs, view statistics
- **History tracking**: View past recognition results
- **API endpoints**: RESTful API for all operations (`/api/*`)
- **File upload**: Support for MP3, WAV, FLAC, M4A, OGG (50MB limit)

### Python 3.13 Compatibility Issues
The project handles Python 3.13+ compatibility issues:
- `numpy.fromstring` replaced with `numpy.frombuffer` in `core/dejavu_lib/logic/decoder.py`
- `audioop` module deprecation handled by `audioop-lts` package
- Microphone defaults to single channel (`default_channels=1`) in recognizer

### Audio Testing System
The `AudioRecognitionTester` class provides:
- File-based recognition testing
- Microphone recognition with configurable timeout (default 3s)
- Batch directory processing
- Audio slice generation and testing
- Signal-based timeout handling without interference

### Database Integration
- Uses MySQL for fingerprint storage
- Remote database connection configured
- Fingerprint parameters: 44.1kHz sample rate, 4096 window size, fan value 5
- Database statistics and management available through API

## Testing Workflow

1. **Add songs**: `python add_songs.py data/songs/`
2. **Create test slices**: `python create_slices.py data/songs/song.mp3`  
3. **Test recognition**: `python test_recognition.py` (interactive mode)
4. **Batch testing**: `python test_recognition.py batch data/audio_slices/`

The system achieves high recognition accuracy with properly fingerprinted songs and quality audio slices.
- this program runs in a venv