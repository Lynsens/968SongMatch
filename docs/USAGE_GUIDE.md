# Detailed Usage Guide for Dejavu Audio Fingerprinting

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Adding Songs to Database](#adding-songs-to-database)
3. [Matching/Recognizing Songs](#matching-recognizing-songs)
4. [Practical Examples](#practical-examples)
5. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### Step 1: Install MySQL
First, you need MySQL installed and running:

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Ubuntu/Linux:**
```bash
sudo apt-get install mysql-server
sudo systemctl start mysql
```

**Windows:**
Download MySQL installer from [mysql.com](https://dev.mysql.com/downloads/)

### Step 2: Create Database
```bash
mysql -u root -p
```

In MySQL prompt:
```sql
CREATE DATABASE dejavu;
CREATE USER 'dejavu_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON dejavu.* TO 'dejavu_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Update Configuration
Edit `dejavu_config.json`:
```json
{
    "database": {
        "host": "localhost",
        "user": "dejavu_user",
        "password": "your_password",
        "database": "dejavu"
    },
    "database_type": "mysql"
}
```

### Step 4: Test Connection
```python
python3 -c "from dejavu_example import AudioFingerprinter; fp = AudioFingerprinter('dejavu_config.json'); print('✓ Connected successfully!')"
```

---

## Adding Songs to Database

### Method 1: Add a Single Song

Create a script `add_song.py`:
```python
#!/usr/bin/env python3
import sys
from dejavu_example import AudioFingerprinter

def add_single_song(filepath, song_name=None):
    # Initialize fingerprinter
    fp = AudioFingerprinter("dejavu_config.json")
    
    # Add the song
    fp.fingerprint_file(filepath, song_name=song_name)
    
    # Show database stats
    stats = fp.get_database_stats()
    print(f"\n✓ Song added successfully!")
    print(f"Total songs in database: {stats['num_songs']}")
    print(f"Total fingerprints: {stats['num_fingerprints']}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python add_song.py <audio_file> [song_name]")
        sys.exit(1)
    
    filepath = sys.argv[1]
    song_name = sys.argv[2] if len(sys.argv) > 2 else None
    add_single_song(filepath, song_name)
```

**Usage:**
```bash
python add_song.py "music/Shape_of_You.mp3" "Ed Sheeran - Shape of You"
python add_song.py "music/Bohemian_Rhapsody.mp3"  # Uses filename as song name
```

### Method 2: Add Multiple Songs from a Directory

Create a script `add_directory.py`:
```python
#!/usr/bin/env python3
import sys
import os
from dejavu_example import AudioFingerprinter

def add_directory(directory_path):
    # Initialize fingerprinter
    fp = AudioFingerprinter("dejavu_config.json")
    
    # Check directory exists
    if not os.path.exists(directory_path):
        print(f"Error: Directory '{directory_path}' not found!")
        return
    
    # Fingerprint all audio files in directory
    print(f"Scanning directory: {directory_path}")
    print("This may take a while depending on the number of files...")
    
    fp.fingerprint_directory(
        directory_path, 
        extensions=[".mp3", ".wav", ".flac", ".m4a", ".ogg"]
    )
    
    # Show results
    stats = fp.get_database_stats()
    print(f"\n✓ Directory processed successfully!")
    print(f"Total songs in database: {stats['num_songs']}")
    print(f"Total fingerprints: {stats['num_fingerprints']}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python add_directory.py <directory_path>")
        sys.exit(1)
    
    directory = sys.argv[1]
    add_directory(directory)
```

**Usage:**
```bash
python add_directory.py ~/Music/Library
python add_directory.py ./my_music_collection
```

### Method 3: Batch Add with CSV

Create a script `batch_add.py`:
```python
#!/usr/bin/env python3
import csv
import os
from dejavu_example import AudioFingerprinter

def batch_add_from_csv(csv_file):
    """
    CSV format:
    filepath,song_name,artist
    """
    fp = AudioFingerprinter("dejavu_config.json")
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            filepath = row['filepath']
            song_name = f"{row['artist']} - {row['song_name']}"
            
            if os.path.exists(filepath):
                print(f"Adding: {song_name}")
                fp.fingerprint_file(filepath, song_name=song_name)
            else:
                print(f"Warning: File not found - {filepath}")
    
    stats = fp.get_database_stats()
    print(f"\n✓ Batch add complete!")
    print(f"Total songs: {stats['num_songs']}")

# Usage: Create songs.csv with your music data
# Then run: python batch_add.py songs.csv
```

---

## Matching/Recognizing Songs

### Method 1: Recognize from Audio File

Create a script `recognize_file.py`:
```python
#!/usr/bin/env python3
import sys
import json
from dejavu_example import AudioFingerprinter

def recognize_audio_file(filepath, save_results=False):
    # Initialize fingerprinter
    fp = AudioFingerprinter("dejavu_config.json")
    
    print(f"Analyzing: {filepath}")
    print("-" * 50)
    
    # Recognize the audio
    results = fp.recognize_file(filepath)
    
    if results and results['song_name']:
        print(f"\n🎵 MATCH FOUND!")
        print(f"Song: {results['song_name']}")
        print(f"Confidence: {results['input_confidence']:.2%}")
        print(f"Match offset: {results['offset_seconds']:.2f} seconds")
        print(f"Fingerprints matched: {results.get('fingerprinted_hashes', 'N/A')}")
        
        if save_results:
            with open('recognition_results.json', 'w') as f:
                json.dump(results, f, indent=2)
            print("\n✓ Results saved to recognition_results.json")
    else:
        print("\n❌ No match found in database")
        print("Possible reasons:")
        print("  - Song not in database")
        print("  - Audio quality too poor")
        print("  - Recording too short (need 5+ seconds)")
    
    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python recognize_file.py <audio_file> [--save]")
        sys.exit(1)
    
    filepath = sys.argv[1]
    save = "--save" in sys.argv
    recognize_audio_file(filepath, save)
```

**Usage:**
```bash
# Recognize a full song
python recognize_file.py "unknown_song.mp3"

# Recognize a short recording
python recognize_file.py "recording_10sec.wav"

# Save detailed results
python recognize_file.py "mystery_audio.mp3" --save
```

### Method 2: Recognize from Microphone

Create a script `recognize_mic.py`:
```python
#!/usr/bin/env python3
import sys
from dejavu_example import AudioFingerprinter

def recognize_from_microphone(seconds=10):
    # Initialize fingerprinter
    fp = AudioFingerprinter("dejavu_config.json")
    
    print(f"🎤 Listening for {seconds} seconds...")
    print("Play the song now!")
    print("-" * 50)
    
    # Record and recognize
    results = fp.recognize_microphone(seconds=seconds)
    
    if results and results['song_name']:
        print(f"\n🎵 MATCH FOUND!")
        print(f"Song: {results['song_name']}")
        print(f"Confidence: {results['input_confidence']:.2%}")
    else:
        print("\n❌ No match found")
        print("Tips for better recognition:")
        print("  - Play the song louder")
        print("  - Reduce background noise")
        print("  - Try a longer recording (15-20 seconds)")
    
    return results

if __name__ == "__main__":
    seconds = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    recognize_from_microphone(seconds)
```

**Usage:**
```bash
# Listen for 10 seconds (default)
python recognize_mic.py

# Listen for 20 seconds
python recognize_mic.py 20
```

### Method 3: Batch Recognition

Create a script `batch_recognize.py`:
```python
#!/usr/bin/env python3
import os
import csv
from dejavu_example import AudioFingerprinter

def batch_recognize(directory_path, output_csv="recognition_results.csv"):
    fp = AudioFingerprinter("dejavu_config.json")
    
    # Find all audio files
    audio_extensions = ['.mp3', '.wav', '.flac', '.m4a']
    audio_files = []
    
    for root, dirs, files in os.walk(directory_path):
        for file in files:
            if any(file.lower().endswith(ext) for ext in audio_extensions):
                audio_files.append(os.path.join(root, file))
    
    print(f"Found {len(audio_files)} audio files to recognize")
    
    # Recognize each file
    results_list = []
    for i, filepath in enumerate(audio_files, 1):
        print(f"\n[{i}/{len(audio_files)}] Processing: {os.path.basename(filepath)}")
        
        results = fp.recognize_file(filepath)
        
        results_list.append({
            'filename': os.path.basename(filepath),
            'filepath': filepath,
            'matched_song': results.get('song_name', 'No match'),
            'confidence': f"{results.get('input_confidence', 0):.2%}" if results else "0%",
            'offset_seconds': results.get('offset_seconds', 'N/A') if results else 'N/A'
        })
    
    # Save results to CSV
    with open(output_csv, 'w', newline='') as f:
        fieldnames = ['filename', 'filepath', 'matched_song', 'confidence', 'offset_seconds']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results_list)
    
    print(f"\n✓ Results saved to {output_csv}")
    
    # Summary
    matched = sum(1 for r in results_list if r['matched_song'] != 'No match')
    print(f"\nSummary:")
    print(f"  Total files: {len(audio_files)}")
    print(f"  Matched: {matched}")
    print(f"  Not matched: {len(audio_files) - matched}")

# Usage: python batch_recognize.py ./test_recordings
```

---

## Practical Examples

### Example 1: Building a Music Library Database

```bash
# Step 1: Organize your music
mkdir -p ~/MusicLibrary/{Rock,Pop,Classical,Jazz}

# Step 2: Add all music to database
python add_directory.py ~/MusicLibrary

# Step 3: Test with a sample
python recognize_file.py ~/Downloads/unknown_song.mp3
```

### Example 2: Identifying Songs from Radio Recording

```bash
# Record 30 seconds from microphone
python recognize_mic.py 30

# Or use a pre-recorded file
python recognize_file.py radio_recording.wav
```

### Example 3: Finding Duplicates in Your Collection

```python
#!/usr/bin/env python3
# find_duplicates.py
from dejavu_example import AudioFingerprinter
import os
from collections import defaultdict

def find_duplicates(directory):
    fp = AudioFingerprinter("dejavu_config.json")
    
    duplicates = defaultdict(list)
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.mp3', '.wav', '.flac')):
                filepath = os.path.join(root, file)
                results = fp.recognize_file(filepath)
                
                if results and results['song_name']:
                    if results['input_confidence'] > 0.9:  # High confidence
                        duplicates[results['song_name']].append(filepath)
    
    # Print duplicates
    for song, files in duplicates.items():
        if len(files) > 1:
            print(f"\nDuplicate found: {song}")
            for f in files:
                print(f"  - {f}")

# Usage: python find_duplicates.py ~/Music
```

### Example 4: Real-time Song Recognition Service

```python
#!/usr/bin/env python3
# realtime_recognition.py
import time
from dejavu_example import AudioFingerprinter

def continuous_recognition():
    fp = AudioFingerprinter("dejavu_config.json")
    
    print("Starting continuous recognition service...")
    print("Press Ctrl+C to stop\n")
    
    try:
        while True:
            print("Listening...")
            results = fp.recognize_microphone(seconds=5)
            
            if results and results['song_name']:
                print(f"🎵 Now playing: {results['song_name']}")
            else:
                print("No music detected")
            
            time.sleep(2)  # Wait before next recognition
            
    except KeyboardInterrupt:
        print("\nStopping recognition service")

# Usage: python realtime_recognition.py
```

---

## Troubleshooting

### Common Issues and Solutions

**1. MySQL Connection Error**
```bash
# Check if MySQL is running
sudo systemctl status mysql  # Linux
brew services list  # macOS

# Test connection
mysql -u dejavu_user -p -h localhost dejavu
```

**2. Poor Recognition Accuracy**
- Ensure audio quality is good (no extreme compression)
- Use at least 5-10 seconds of audio
- Check that the song is actually in the database
- Reduce background noise for microphone recording

**3. Slow Fingerprinting**
- Use multiple processes: modify `nprocesses` parameter
- Fingerprint during off-hours
- Consider using PostgreSQL for better performance with large datasets

**4. Memory Issues with Large Libraries**
```python
# Process in batches
import os

def add_large_library(directory, batch_size=100):
    fp = AudioFingerprinter("dejavu_config.json")
    
    files = []
    for root, dirs, filenames in os.walk(directory):
        for filename in filenames:
            if filename.endswith(('.mp3', '.wav')):
                files.append(os.path.join(root, filename))
    
    # Process in batches
    for i in range(0, len(files), batch_size):
        batch = files[i:i+batch_size]
        for filepath in batch:
            fp.fingerprint_file(filepath)
        print(f"Processed batch {i//batch_size + 1}")
```

---

## Performance Tips

1. **Database Optimization**
   - Add indexes to fingerprint tables
   - Use SSD for database storage
   - Increase MySQL buffer pool size

2. **Audio Preprocessing**
   - Convert to consistent format (44.1kHz, mono)
   - Normalize audio levels
   - Remove silence from beginning/end

3. **Recognition Speed**
   - Use shorter samples for faster recognition (5-10 seconds is usually enough)
   - Cache frequently queried songs
   - Use connection pooling for database

---

## Database Management

### View Database Statistics
```python
from dejavu_example import AudioFingerprinter

fp = AudioFingerprinter("dejavu_config.json")
stats = fp.get_database_stats()
print(f"Songs: {stats['num_songs']}")
print(f"Fingerprints: {stats['num_fingerprints']}")
print(f"Avg fingerprints per song: {stats['num_fingerprints'] / stats['num_songs']:.0f}")
```

### Clear Database
```sql
mysql -u dejavu_user -p dejavu
TRUNCATE TABLE fingerprints;
TRUNCATE TABLE songs;
```

### Backup Database
```bash
mysqldump -u dejavu_user -p dejavu > dejavu_backup.sql
```

### Restore Database
```bash
mysql -u dejavu_user -p dejavu < dejavu_backup.sql
```

---

This guide should help you get started with adding songs and recognizing them using the Dejavu audio fingerprinting system!