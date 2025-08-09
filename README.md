# Dejavu Audio Fingerprinting Project

An audio fingerprinting and recognition system using the Dejavu library, capable of identifying songs from audio samples similar to Shazam. Now with a modern web interface for easy interaction!

> **Note**: This project has been updated to work with Python 3.13+, which requires special handling for the deprecated `audioop` module.

## Features

- **Audio Fingerprinting**: Create unique fingerprints for audio files
- **Song Recognition**: Identify unknown audio samples against a database
- **Web Interface**: Modern, responsive web UI for all operations
- **Live Recognition Sessions**: Real-time progressive confidence display during recognition
- **Batch Processing**: Fingerprint entire directories of music
- **Microphone Recognition**: Real-time audio recognition from microphone input
- **Database Storage**: Persistent storage of audio fingerprints using MySQL
- **Audio Slicing**: Create test slices from audio files for testing
- **Recognition History**: Track all recognition attempts and results

## Prerequisites

- Python 3.8+
- MySQL Server (for fingerprint storage)
- FFmpeg (for audio processing)
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation

1. **Create and activate Python virtual environment**:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
# For Python 3.13+, also install:
pip install audioop-lts
# For web interface:
pip install flask flask-cors flask-socketio
```

3. **Install FFmpeg** (required for audio processing):
- macOS: `brew install ffmpeg`
- Ubuntu/Debian: `sudo apt-get install ffmpeg`
- Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

4. **Set up MySQL database**:
```sql
CREATE DATABASE dejavu;
```

5. **Configure database connection**:
Edit `dejavu_config.json` with your MySQL credentials:
```json
{
    "database": {
        "host": "localhost",
        "user": "your_username",
        "password": "your_password",
        "database": "dejavu"
    }
}
```

## Quick Demo (No Database Required)

Run the demo to see audio fingerprinting in action:

```bash
python dejavu_demo.py
```

This will generate a sample audio signal, compute its fingerprints, and create a visualization showing the fingerprinting process.

## Usage

### Web Interface (Recommended)

Start the web server:

```bash
python web_server.py
```

Then open your browser and navigate to:
- **Home**: http://localhost:8000/ - Upload audio files for recognition
- **Live Session**: http://localhost:8000/live - Real-time microphone recognition with progressive confidence
- **Database Management**: http://localhost:8000/manage - Add/remove songs from database
- **History**: http://localhost:8000/history - View recognition history

#### Live Recognition Features:
- **Session-based recognition**: Start/stop recognition sessions
- **Progressive confidence**: Watch confidence levels build in real-time (30% → 60% → 90%)
- **5-second listening window**: Automatic stop after 5 seconds
- **Audio level monitoring**: Visual feedback of microphone input
- **Recognition timer**: Track how long each recognition takes
- **Session history**: Review all recognition attempts in the session

### Command Line Interface

```python
from dejavu_example import AudioFingerprinter

# Initialize
fp = AudioFingerprinter("dejavu_config.json")

# Fingerprint a single file
fp.fingerprint_file("song.mp3", song_name="My Song")

# Recognize an unknown audio file
results = fp.recognize_file("unknown_audio.mp3")
```

### Running the Example Program

```bash
python dejavu_example.py
```

### Common Operations

#### 1. Fingerprint a Music Library
```python
fp.fingerprint_directory("./music_library/", extensions=[".mp3", ".wav", ".flac"])
```

#### 2. Recognize Audio from File
```python
results = fp.recognize_file("./unknown_song.mp3")
if results['song_name']:
    print(f"Found: {results['song_name']} with {results['input_confidence']:.2%} confidence")
```

#### 3. Recognize from Microphone
```python
# Listen for 10 seconds
results = fp.recognize_microphone(seconds=10)
```

#### 4. Check Database Statistics
```python
stats = fp.get_database_stats()
print(f"Songs in database: {stats['num_songs']}")
print(f"Total fingerprints: {stats['num_fingerprints']}")
```

## Configuration

The `dejavu_config.json` file contains:

- **Database Settings**: MySQL connection parameters
- **Fingerprint Parameters**:
  - `SAMPLE_RATE`: Audio sampling rate (default: 44100 Hz)
  - `WINDOW_SIZE`: FFT window size (default: 4096)
  - `FAN_VALUE`: Degree of fingerprint generation (default: 5)
  - `PEAK_NEIGHBORHOOD_SIZE`: Local maxima detection area (default: 10)

## Project Structure

```
dejavu/
├── core/                    # Core Dejavu functionality
│   ├── __init__.py
│   └── quick_start.py       # Quick start wrapper for Dejavu
├── tools/                   # Utility tools
│   ├── __init__.py
│   ├── audio_tester.py      # Audio recognition testing
│   └── audio_slicer.py      # Audio slice generation
├── web/                     # Web interface
│   ├── app.py              # Flask web server
│   ├── static/             # Static assets (CSS, JS, uploads)
│   │   ├── css/
│   │   └── js/
│   └── templates/          # HTML templates
├── config/                  # Configuration files
│   └── dejavu_config.json  # Database configuration
├── data/                    # Data storage
│   ├── songs/              # Audio files library
│   └── audio_slices/       # Test audio slices
├── web_server.py           # Web server launcher
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Troubleshooting

### Common Issues

1. **MySQL Connection Error**: Ensure MySQL is running and credentials in `dejavu_config.json` are correct

2. **Audio File Not Found**: Use absolute paths or ensure files are in the correct directory

3. **FFmpeg Not Found**: Install FFmpeg and ensure it's in your system PATH

4. **Microphone Recognition Not Working**: Install PyAudio:
   ```bash
   pip install pyaudio
   ```
   On macOS, you might need: `brew install portaudio`

## Performance Tips

- **Fingerprinting**: Process audio files in batch using `fingerprint_directory()`
- **Recognition**: Shorter audio samples (5-10 seconds) are usually sufficient
- **Database**: Index your MySQL tables for faster lookups with large music libraries

## License

This project uses the open-source Dejavu library. See [Dejavu GitHub](https://github.com/worldveil/dejavu) for more information.

## Acknowledgments

Built with [Dejavu](https://github.com/worldveil/dejavu) - An audio fingerprinting and recognition algorithm implemented in Python.