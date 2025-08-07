# Dejavu Audio Fingerprinting Project Structure

## 📁 Directory Layout

```
dejavu/
├── 📄 Core Files
│   ├── quick_start.py           # Main interface - add songs & recognize
│   ├── dejavu_config.json       # Remote MySQL configuration
│   └── dejavu_example.py        # Core AudioFingerprinter class
│
├── 🧪 Audio Recognition Testing
│   ├── audio_slicer.py          # Create test slices from songs
│   ├── audio_tester.py          # Unified recognition tester (files + mic)
│   ├── audio_slice_tester.py.old # Old file-only tester (backup)
│   └── audio_slices/            # Generated test slices (auto-created)
│
├── 📚 Documentation
│   ├── README.md                # Main project documentation  
│   ├── USAGE_GUIDE.md           # Detailed usage instructions
│   ├── SLICE_TESTING_GUIDE.md   # Audio slice testing workflow
│   └── AUDIO_TESTER_GUIDE.md    # New unified tester guide
│
├── 🎵 Music Library
│   └── songs/                   # Your music collection
│       └── Jay Chou/           # Artist folders
│           ├── 安静.mp3
│           ├── 彩虹.mp3
│           └── ... (other songs)
│
├── 🔧 System Files
│   ├── requirements.txt         # Python dependencies
│   ├── .gitignore              # Git ignore rules
│   ├── dejavu_lib/             # Modified Dejavu library (Python 3.13 compatible)
│   └── venv/                   # Python virtual environment
│
└── 📊 Database
    └── Remote MySQL @ 49.234.22.169
        ├── Database: dejavu
        ├── Songs: 13
        └── Fingerprints: 1,626,465
```

## 🚀 Main Programs

### `quick_start.py` - Primary Interface
- **Interactive mode**: `python quick_start.py`
- **Add songs**: `python quick_start.py add <file_or_folder>`
- **Recognize**: `python quick_start.py recognize <file>`
- **Stats**: `python quick_start.py stats`

### `audio_slicer.py` - Create Test Slices
- **Single slice**: `python audio_slicer.py slice song.mp3 10 30`
- **Multiple slices**: `python audio_slicer.py multi song.mp3 3 15`
- **Batch process**: `python audio_slicer.py batch ~/Music/ 2 10`

### `audio_tester.py` - Unified Recognition Testing
- **Test file**: `python audio_tester.py file slice.wav`
- **Test microphone**: `python audio_tester.py mic 10`
- **Test batch**: `python audio_tester.py batch audio_slices/`
- **Interactive**: `python audio_tester.py`

## 📋 Key Features Implemented

✅ **Remote MySQL Database** - Connected to 49.234.22.169  
✅ **Python 3.13 Compatibility** - Fixed numpy/audioop issues  
✅ **Audio Slice Testing** - Upload simulation without live mic  
✅ **Batch Processing** - Add entire music libraries  
✅ **High Recognition Accuracy** - 100% success rate in tests  
✅ **Chinese Song Support** - Proper UTF-8 handling  
✅ **Comprehensive Documentation** - Multiple guide files  

## 🗃️ Database Status

- **Songs**: 13 (Jay Chou collection)
- **Fingerprints**: 1,626,465 
- **Average per song**: 125,113 fingerprints
- **Database size**: ~650 MB estimated
- **Recognition accuracy**: 100% in slice tests

## 🎯 Workflow Summary

1. **Add Music**: `python quick_start.py add songs/`
2. **Create Slices**: `python audio_slicer.py multi song.mp3 5 10`
3. **Test Recognition**: `python audio_slice_tester.py test audio_slices/`
4. **Results**: Perfect recognition with offset detection

The system successfully replaces live microphone input with uploaded audio slices for testing purposes!