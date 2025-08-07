# Dejavu Audio Fingerprinting Project

An audio fingerprinting and recognition system using the Dejavu library, capable of identifying songs from audio samples similar to Shazam.

## Features

- **Audio Fingerprinting**: Create unique fingerprints for audio files
- **Song Recognition**: Identify unknown audio samples against a database
- **Batch Processing**: Fingerprint entire directories of music
- **Microphone Recognition**: Real-time audio recognition from microphone input
- **Database Storage**: Persistent storage of audio fingerprints using MySQL

## Prerequisites

- Python 3.8+
- MySQL Server (for fingerprint storage)
- FFmpeg (for audio processing)

## Installation

1. **Create and activate Python virtual environment**:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
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

## Usage

### Basic Example

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
├── venv/                    # Python virtual environment
├── dejavu_example.py        # Main program with AudioFingerprinter class
├── dejavu_config.json       # Configuration file
├── requirements.txt         # Python dependencies
└── README.md               # This file
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