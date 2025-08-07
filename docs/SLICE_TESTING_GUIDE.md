# Audio Slice Testing Guide

Complete workflow for testing audio recognition using uploaded audio slices instead of live microphone input.

## Overview

This system lets you:
1. **Add full songs** to your database
2. **Create audio slices** from those songs (or other audio)
3. **Test recognition** using the slices to simulate microphone input

## Quick Start Workflow

### Step 1: Add Songs to Database
```bash
# Add a single song
python quick_start.py add "song.mp3" "Artist - Song Title"

# Add entire music folder
python quick_start.py add ~/Music/

# Check what's in database
python quick_start.py stats
```

### Step 2: Create Audio Slices for Testing
```bash
# Create 3 random 10-second slices from a song
python audio_slicer.py multi "song.mp3" 3 10

# Create slices from all songs in a folder
python audio_slicer.py batch ~/Music/ 2 15

# Create a specific slice (15 seconds starting at 30 seconds)
python audio_slicer.py slice "song.mp3" 15 30
```

### Step 3: Test Recognition
```bash
# Test a single slice
python audio_slice_tester.py test audio_slices/song_slice_1.wav

# Test all slices in folder
python audio_slice_tester.py test audio_slices/

# Interactive testing mode
python audio_slice_tester.py
```

## Detailed Usage

### 🎵 Adding Songs to Database

**Single Song:**
```bash
python quick_start.py add "music/Bohemian_Rhapsody.mp3" "Queen - Bohemian Rhapsody"
```

**Batch Add:**
```bash
python quick_start.py add ~/Music/Rock/
```

**Interactive Mode:**
```bash
python quick_start.py
# Select option 1 or 2
```

### ✂️ Creating Audio Slices

#### Single Slice
```bash
# Random 10-second slice
python audio_slicer.py slice "song.mp3"

# 15-second slice starting at 45 seconds
python audio_slicer.py slice "song.mp3" 15 45
```

#### Multiple Slices from One Song
```bash
# 5 random 10-second slices
python audio_slicer.py multi "song.mp3" 5 10 random

# 3 evenly-spaced 15-second slices
python audio_slicer.py multi "song.mp3" 3 15 evenly_spaced

# 4 slices from the beginning
python audio_slicer.py multi "song.mp3" 4 12 beginning
```

#### Batch Slice Creation
```bash
# 2 slices of 10 seconds each from all songs in folder
python audio_slicer.py batch ~/Music/ 2 10

# 3 slices of 15 seconds each (first 50 files only)
python audio_slicer.py batch ~/Music/ 3 15
```

**Output:** Creates `audio_slices/` directory with WAV files

### 🔍 Testing Recognition

#### Test Single Slice
```bash
python audio_slice_tester.py test "audio_slices/song_slice_30.0s.wav"

# Test with custom timeout (5 seconds instead of default 3s)
python audio_slice_tester.py test "audio_slices/song_slice_30.0s.wav" --timeout 5
```

**Example Output:**
```
🔍 Testing audio slice: song_slice_30.0s.wav
--------------------------------------------------
🎉 MATCH FOUND!
   Song: Queen - Bohemian Rhapsody
   Confidence: 89.2%
   Match offset: 30.15 seconds
   Hashes matched: 156/175
   Processing time: 0.34s
```

#### Test All Slices in Directory
```bash
python audio_slice_tester.py test audio_slices/
```

**Example Output:**
```
📁 Testing 15 audio slices from: audio_slices/
======================================================================

[1/15] Processing: bohemian_rhapsody_slice_1.wav
   ✅ Queen - Bohemian Rhapsody (92.3%)

[2/15] Processing: shape_of_you_slice_1.wav  
   ✅ Ed Sheeran - Shape of You (87.1%)

[15/15] Processing: unknown_song_slice.wav
   ❌ No match

======================================================================
📊 BATCH TESTING SUMMARY
======================================================================
Total files tested: 15
Matches found: 14
No matches: 1
Success rate: 93.3%
Total processing time: 4.52s
Average time per file: 0.30s

💾 Detailed results saved to: slice_test_results_1704123456.json
```

#### Interactive Testing Mode
```bash
python audio_slice_tester.py
```

Provides menu for:
- Testing single files
- Testing folders  
- Viewing results
- Saving results

## File Organization

```
dejavu/
├── songs/                    # Your original music files (optional)
├── audio_slices/             # Generated test slices (auto-created)
│   ├── song1_slice_1_30.0s.wav
│   ├── song1_slice_2_60.0s.wav
│   └── ...
├── slice_test_results_*.json # Test results (auto-generated)
├── quick_start.py           # Add songs to database
├── audio_slicer.py          # Create audio slices
└── audio_slice_tester.py    # Test recognition
```

## Advanced Usage

### Custom Slice Parameters

**Slice Length Recommendations:**
- **5 seconds**: Minimum for reliable recognition
- **10 seconds**: Good balance of speed and accuracy  
- **15-20 seconds**: Higher accuracy, slower processing
- **30+ seconds**: Maximum accuracy (like full song)

**Quality Settings:**
```bash
# High quality slices (no fades, longer duration)
python audio_slicer.py slice "song.mp3" 20 60
```

### Batch Testing with Results

```bash
# Test all slices and save detailed results
python audio_slice_tester.py batch audio_slices/ results.json
```

**Results JSON contains:**
```json
{
  "test_session": {
    "timestamp": "2024-01-01 12:00:00",
    "total_tests": 15,
    "matches": 14
  },
  "results": [
    {
      "filename": "song_slice_1.wav",
      "matched": true,
      "song_name": "Artist - Song",
      "confidence": 0.892,
      "offset_seconds": 30.15,
      "processing_time": 0.34
    }
  ]
}
```

### Performance Testing

**Test Recognition Accuracy:**
```bash
# Create many slices from known songs
python audio_slicer.py batch ~/Music/ 5 10

# Test all slices
python audio_slice_tester.py batch audio_slices/ accuracy_test.json

# Analyze results
python -c "
import json
with open('accuracy_test.json') as f:
    data = json.load(f)
total = data['test_session']['total_tests']  
matches = data['test_session']['matches']
print(f'Accuracy: {matches/total*100:.1f}%')
"
```

## Common Use Cases

### 1. **Testing New Database Setup**
```bash
# Add some songs
python quick_start.py add ~/Music/TestSongs/

# Create test slices
python audio_slicer.py batch ~/Music/TestSongs/ 3 10

# Test recognition
python audio_slice_tester.py test audio_slices/
```

### 2. **Quality Testing Different Audio Sources**
```bash
# Test with high-quality slices
python audio_slicer.py multi "high_quality.flac" 5 15

# Test with compressed audio
python audio_slicer.py multi "compressed.mp3" 5 15

# Compare results
python audio_slice_tester.py test audio_slices/
```

### 3. **Performance Benchmarking**
```bash
# Create large test set
python audio_slicer.py batch ~/Music/ 2 10

# Measure performance
time python audio_slice_tester.py batch audio_slices/ benchmark.json
```

## Troubleshooting

### No Matches Found
- Ensure the source song is actually in your database
- Try longer slices (15-20 seconds)  
- Check audio quality isn't too degraded
- Verify database has fingerprints: `python quick_start.py stats`

### Poor Recognition Accuracy
- Increase slice duration
- Reduce background noise in slices
- Use higher quality source audio
- Check database configuration

### Slice Creation Fails
- Install required codecs for your audio format
- Ensure source files aren't corrupted
- Check file permissions

## Tips for Best Results

1. **Slice Duration**: 10-15 seconds is optimal
2. **Multiple Tests**: Create 3-5 slices per song for thorough testing
3. **Variety**: Test different parts of songs (beginning, middle, end)
4. **Quality**: Use high-quality source audio when possible
5. **Database Size**: Larger databases may have slightly lower accuracy but better coverage

This system gives you complete control over testing your audio recognition setup without needing live microphone input!