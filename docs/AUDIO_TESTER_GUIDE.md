# Audio Recognition Tester Guide

The new unified `audio_tester.py` combines file slice testing AND microphone recognition with clean, lint-free code.

## 🎯 **Key Features**

### ✨ **Unified Interface**
- **File Testing**: Test uploaded audio slices
- **Microphone Testing**: Live audio recognition  
- **Batch Testing**: Process entire directories
- **Timeout Control**: Configurable processing limits (default 3s)

### 🔧 **Clean Architecture**  
- Removed code duplication
- Standardized result format
- Type hints throughout
- Consistent error handling

## 🚀 **Usage**

### **Command Line**

```bash
# Test single audio file
python audio_tester.py file slice.wav

# Test microphone for 10 seconds  
python audio_tester.py mic 10

# Batch test directory
python audio_tester.py batch audio_slices/

# Custom timeout (5 seconds)
python audio_tester.py file slice.wav --timeout 5
python audio_tester.py mic 15 --timeout 10
```

### **Interactive Mode**
```bash
python audio_tester.py
```

**Interactive Menu:**
```
AUDIO RECOGNITION TESTER
======================================================================
⏱️  Current max processing time: 3.0s
----------------------------------------------------------------------
1. Test audio file
2. Test microphone  
3. Test directory (batch files)
4. Change max processing time
5. View recent results
6. Save results to file
7. Clear results
8. Exit
```

## 📊 **Result Format**

**Standardized results include:**
- Source type (file 🎵 or microphone 🎤)
- Match confidence and song details
- Processing time tracking
- Timeout detection
- Comprehensive metadata

**Example Output:**
```
🎵 Testing: song_slice.wav
🎉 MATCH FOUND!
   Song: Jay Chou - 安静
   Confidence: 66.0%
   Match offset: 92.46 seconds
   Hashes matched: 2202/3324
   Processing time: 1.01s
```

## 🎤 **Microphone Testing**

**Requirements:**
- `pyaudio` installed (`pip install pyaudio`)
- Working microphone
- Audio playing during recording

**Usage:**
```bash
# Record for 10 seconds
python audio_tester.py mic 10

# Record for 15 seconds with 5s timeout
python audio_tester.py mic 15 --timeout 5
```

## 📁 **Batch Testing**

**Process entire directories:**
```bash
# Basic batch test
python audio_tester.py batch audio_slices/

# Save detailed results
python audio_tester.py batch audio_slices/ results.json

# Custom timeout for slow processing
python audio_tester.py batch large_files/ --timeout 10
```

**Batch Summary:**
- Success rate percentage
- Processing time statistics  
- Timeout tracking
- Auto-saves results for large batches

## ⏱️ **Timeout Management**

**Default: 3 seconds** (configurable)

**Benefits:**
- Prevents hanging on problematic files
- Consistent response times
- Flexible per-test customization

**Configuration:**
- Command line: `--timeout 5`
- Interactive: Menu option 4
- Per-test: Custom input prompts

## 🔧 **Code Improvements**

### **Before (old audio_slice_tester.py):**
- Duplicate timeout handling  
- Inconsistent result formats
- File-only testing
- Scattered error handling

### **After (new audio_tester.py):**
- ✅ **Unified timeout system** with `_run_recognition_with_timeout()`
- ✅ **Standardized results** via `_create_result_dict()`
- ✅ **Both file & microphone** support
- ✅ **Type hints** throughout
- ✅ **Clean class structure** with logical method grouping
- ✅ **Consistent error handling**

## 💡 **Migration from Old Tester**

**Old Command → New Command:**
```bash
# OLD
python audio_slice_tester.py test file.wav
python audio_slice_tester.py test audio_slices/

# NEW  
python audio_tester.py file file.wav
python audio_tester.py batch audio_slices/
```

**New Capabilities:**
- Microphone testing: `python audio_tester.py mic 10`
- Cleaner interactive mode
- Better result tracking
- Improved timeout handling

## 📈 **Example Workflows**

### **1. Test Music Recognition Setup**
```bash
# Test with known audio slice
python audio_tester.py file known_song_slice.wav

# Test with microphone  
python audio_tester.py mic 10
# (play the same song during recording)
```

### **2. Batch Accuracy Testing**
```bash
# Create test slices
python audio_slicer.py batch songs/ 3 10

# Test all slices
python audio_tester.py batch audio_slices/ accuracy_results.json

# Review results
python -c "
import json
with open('accuracy_results.json') as f:
    data = json.load(f)
print(f'Accuracy: {data[\"test_session\"][\"matches\"]}/{data[\"test_session\"][\"total_tests\"]} = {data[\"test_session\"][\"matches\"]/data[\"test_session\"][\"total_tests\"]*100:.1f}%')
"
```

### **3. Performance Testing**
```bash
# Test with different timeouts
python audio_tester.py batch audio_slices/ --timeout 1   # Fast
python audio_tester.py batch audio_slices/ --timeout 5   # Thorough
```

The new unified tester provides a much cleaner, more powerful interface for testing audio recognition with both file slices and live microphone input! 🎉