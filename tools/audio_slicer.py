#!/usr/bin/env python3
"""
Audio Slicer - Extract segments from audio files for testing
Create audio slices/segments from your music files to test recognition.
"""

import os
import sys
from pathlib import Path
from pydub import AudioSegment
import random


class AudioSlicer:
    """Extract audio slices from music files."""
    
    def __init__(self, output_dir="audio_slices"):
        """Initialize with output directory."""
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
    def extract_slice(self, 
                     input_file, 
                     start_seconds=None, 
                     duration_seconds=10, 
                     output_name=None,
                     fade_in_ms=100,
                     fade_out_ms=100):
        """
        Extract a single slice from an audio file.
        
        Args:
            input_file: Path to input audio file
            start_seconds: Start time in seconds (None for random)
            duration_seconds: Length of slice
            output_name: Custom output filename
            fade_in_ms: Fade in duration to avoid clicks
            fade_out_ms: Fade out duration to avoid clicks
        
        Returns:
            Path to created slice file or None if failed
        """
        try:
            print(f"📄 Loading: {Path(input_file).name}")
            
            # Load audio file
            audio = AudioSegment.from_file(input_file)
            audio_duration_seconds = len(audio) / 1000
            
            print(f"   Duration: {audio_duration_seconds:.1f} seconds")
            
            # Determine start time
            if start_seconds is None:
                # Random start, leaving room for the slice duration
                max_start = max(0, audio_duration_seconds - duration_seconds)
                start_seconds = random.uniform(0, max_start)
            
            # Ensure we don't go beyond the file
            end_seconds = min(start_seconds + duration_seconds, audio_duration_seconds)
            actual_duration = end_seconds - start_seconds
            
            if actual_duration < 2:  # Too short
                print(f"   ⚠️ Slice would be too short ({actual_duration:.1f}s), skipping")
                return None
            
            # Extract slice
            start_ms = int(start_seconds * 1000)
            end_ms = int(end_seconds * 1000)
            
            slice_audio = audio[start_ms:end_ms]
            
            # Apply fades to avoid clicks/pops
            if fade_in_ms > 0:
                slice_audio = slice_audio.fade_in(fade_in_ms)
            if fade_out_ms > 0:
                slice_audio = slice_audio.fade_out(fade_out_ms)
            
            # Generate output filename
            if output_name is None:
                input_stem = Path(input_file).stem
                output_name = f"{input_stem}_slice_{start_seconds:.1f}s_{actual_duration:.1f}s.wav"
            
            output_path = self.output_dir / output_name
            
            # Save slice
            slice_audio.export(output_path, format="wav")
            
            print(f"   ✅ Slice created: {output_name}")
            print(f"      Start: {start_seconds:.1f}s, Duration: {actual_duration:.1f}s")
            
            return str(output_path)
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return None
    
    def extract_multiple_slices(self,
                               input_file,
                               num_slices=3,
                               duration_seconds=10,
                               method="random"):
        """
        Extract multiple slices from one file.
        
        Args:
            input_file: Path to input audio file
            num_slices: Number of slices to extract
            duration_seconds: Duration of each slice
            method: "random", "evenly_spaced", or "beginning"
        
        Returns:
            List of created slice file paths
        """
        try:
            audio = AudioSegment.from_file(input_file)
            audio_duration_seconds = len(audio) / 1000
            
            if audio_duration_seconds < duration_seconds:
                print(f"⚠️ File too short for {duration_seconds}s slices")
                return []
            
            slices_created = []
            input_stem = Path(input_file).stem
            
            for i in range(num_slices):
                if method == "random":
                    max_start = audio_duration_seconds - duration_seconds
                    start_time = random.uniform(0, max_start)
                
                elif method == "evenly_spaced":
                    # Divide audio into sections
                    section_size = (audio_duration_seconds - duration_seconds) / num_slices
                    start_time = i * section_size
                
                elif method == "beginning":
                    # Extract from beginning with small gaps
                    start_time = i * (duration_seconds + 2)  # 2 second gap
                    if start_time + duration_seconds > audio_duration_seconds:
                        break
                
                else:
                    start_time = i * duration_seconds
                
                output_name = f"{input_stem}_slice_{i+1}_{start_time:.1f}s.wav"
                
                slice_path = self.extract_slice(
                    input_file, 
                    start_seconds=start_time,
                    duration_seconds=duration_seconds,
                    output_name=output_name
                )
                
                if slice_path:
                    slices_created.append(slice_path)
            
            return slices_created
            
        except Exception as e:
            print(f"❌ Error processing {input_file}: {e}")
            return []
    
    def slice_directory(self,
                       directory_path,
                       slices_per_file=2,
                       duration_seconds=10,
                       method="random",
                       max_files=None):
        """
        Extract slices from all audio files in a directory.
        
        Args:
            directory_path: Path to directory with audio files
            slices_per_file: Number of slices per audio file
            duration_seconds: Duration of each slice
            method: Slicing method
            max_files: Maximum files to process (None for all)
        
        Returns:
            Dictionary with statistics
        """
        audio_extensions = {'.mp3', '.wav', '.flac', '.m4a', '.ogg'}
        
        # Find audio files
        audio_files = []
        for root, _, files in os.walk(directory_path):
            for file in files:
                if Path(file).suffix.lower() in audio_extensions:
                    audio_files.append(os.path.join(root, file))
        
        if max_files:
            audio_files = audio_files[:max_files]
        
        print(f"\n📁 Processing {len(audio_files)} audio files from: {directory_path}")
        print(f"   Output directory: {self.output_dir}")
        print(f"   Slices per file: {slices_per_file}")
        print(f"   Slice duration: {duration_seconds}s")
        print(f"   Method: {method}")
        print("=" * 70)
        
        total_slices = 0
        processed_files = 0
        
        for i, audio_file in enumerate(audio_files, 1):
            print(f"\n[{i}/{len(audio_files)}] {Path(audio_file).name}")
            
            slices = self.extract_multiple_slices(
                audio_file,
                num_slices=slices_per_file,
                duration_seconds=duration_seconds,
                method=method
            )
            
            if slices:
                processed_files += 1
                total_slices += len(slices)
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 SLICING SUMMARY")
        print("=" * 70)
        print(f"Files processed: {processed_files}/{len(audio_files)}")
        print(f"Total slices created: {total_slices}")
        print(f"Output directory: {self.output_dir}")
        
        if total_slices > 0:
            print(f"\n🎯 Next steps:")
            print(f"   1. Test slices: python audio_slice_tester.py test {self.output_dir}")
            print(f"   2. Interactive mode: python audio_slice_tester.py")
        
        return {
            'files_processed': processed_files,
            'total_files': len(audio_files),
            'slices_created': total_slices,
            'output_directory': str(self.output_dir)
        }


def main():
    """Command line interface."""
    if len(sys.argv) == 1:
        print("Audio Slicer - Extract test segments from audio files")
        print("\nUsage:")
        print("  python audio_slicer.py slice <input_file> [duration] [start_time]")
        print("  python audio_slicer.py multi <input_file> [num_slices] [duration] [method]")
        print("  python audio_slicer.py batch <directory> [slices_per_file] [duration]")
        print("\nExamples:")
        print("  python audio_slicer.py slice song.mp3 15 30      # 15s slice starting at 30s")
        print("  python audio_slicer.py multi song.mp3 5 10       # 5 random 10s slices")
        print("  python audio_slicer.py batch ~/Music/ 2 10       # 2x 10s slices from each file")
        print("\nMethods for multi: random, evenly_spaced, beginning")
        return
    
    command = sys.argv[1].lower()
    slicer = AudioSlicer()
    
    if command == "slice":
        if len(sys.argv) < 3:
            print("Usage: python audio_slicer.py slice <input_file> [duration] [start_time]")
            sys.exit(1)
        
        input_file = sys.argv[2]
        duration = float(sys.argv[3]) if len(sys.argv) > 3 else 10
        start_time = float(sys.argv[4]) if len(sys.argv) > 4 else None
        
        result = slicer.extract_slice(input_file, start_time, duration)
        
        if result:
            print(f"\n✅ Success! Test the slice with:")
            print(f"   python audio_slice_tester.py test {result}")
    
    elif command == "multi":
        if len(sys.argv) < 3:
            print("Usage: python audio_slicer.py multi <input_file> [num_slices] [duration] [method]")
            sys.exit(1)
        
        input_file = sys.argv[2]
        num_slices = int(sys.argv[3]) if len(sys.argv) > 3 else 3
        duration = float(sys.argv[4]) if len(sys.argv) > 4 else 10
        method = sys.argv[5] if len(sys.argv) > 5 else "random"
        
        results = slicer.extract_multiple_slices(input_file, num_slices, duration, method)
        
        if results:
            print(f"\n✅ Created {len(results)} slices! Test them with:")
            print(f"   python audio_slice_tester.py test {slicer.output_dir}")
    
    elif command == "batch":
        if len(sys.argv) < 3:
            print("Usage: python audio_slicer.py batch <directory> [slices_per_file] [duration]")
            sys.exit(1)
        
        directory = sys.argv[2]
        slices_per_file = int(sys.argv[3]) if len(sys.argv) > 3 else 2
        duration = float(sys.argv[4]) if len(sys.argv) > 4 else 10
        
        results = slicer.slice_directory(directory, slices_per_file, duration)
        
        if results['slices_created'] > 0:
            print(f"\n🎉 Success! {results['slices_created']} slices ready for testing!")
    
    else:
        print(f"Unknown command: {command}")
        print("Available commands: slice, multi, batch")


if __name__ == "__main__":
    main()