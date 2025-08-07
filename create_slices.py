#!/usr/bin/env python3
"""
Create Audio Slices - Main interface for creating audio slices for testing
Wrapper for the audio slicer functionality.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'tools'))

from audio_slicer import AudioSlicer

def main():
    """Main function for creating audio slices."""
    if len(sys.argv) < 2:
        print("Create Audio Slices for Testing")
        print("\nUsage:")
        print("  python create_slices.py <input_file> [output_dir] [duration] [count]")
        print("\nExamples:")
        print("  python create_slices.py song.mp3                           # Create 5x 10s slices in data/audio_slices/")
        print("  python create_slices.py song.mp3 custom_dir/ 15 3          # Create 3x 15s slices in custom_dir/")
        print("  python create_slices.py data/songs/ data/test_slices/      # Process entire folder")
        print("\nParameters:")
        print("  input_file    - Audio file or directory to process")
        print("  output_dir    - Output directory (default: data/audio_slices/)")
        print("  duration      - Slice duration in seconds (default: 10)")
        print("  count         - Number of slices per file (default: 5)")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data/audio_slices/"
    duration = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    count = int(sys.argv[4]) if len(sys.argv) > 4 else 5
    
    slicer = AudioSlicer(output_dir)
    
    if os.path.isdir(input_path):
        print(f"🎵 Processing directory: {input_path}")
        slicer.process_directory(input_path, duration, count)
    elif os.path.isfile(input_path):
        print(f"🎵 Processing file: {input_path}")
        slicer.create_slices(input_path, duration, count)
    else:
        print(f"❌ File or directory not found: {input_path}")
        sys.exit(1)
    
    print(f"✅ Slices created in: {output_dir}")

if __name__ == "__main__":
    main()