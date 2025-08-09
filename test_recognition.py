#!/usr/bin/env python3
"""
Test Recognition - Main interface for testing audio recognition
Wrapper for the unified audio tester.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'tools'))

from tools.audio_tester import AudioRecognitionTester

def main():
    """Main function for testing recognition."""
    # Parse timeout argument
    timeout = 3.0  # default
    args = sys.argv[1:]
    
    if '--timeout' in args:
        timeout_idx = args.index('--timeout')
        if timeout_idx + 1 < len(args):
            try:
                timeout = float(args[timeout_idx + 1])
                args = args[:timeout_idx] + args[timeout_idx + 2:]
            except ValueError:
                print("Invalid timeout value. Using default 3.0 seconds.")
    
    config_path = os.path.join('config', 'dejavu_config.json')
    tester = AudioRecognitionTester(config_path, max_listen_time=timeout)
    
    if len(args) == 0:
        # Interactive mode
        tester.interactive_mode()
    
    elif len(args) >= 1:
        if not tester.setup():
            sys.exit(1)
        
        command = args[0].lower()
        
        if command == "file":
            if len(args) < 2:
                print("Usage: python test_recognition.py file <audio_file> [--timeout seconds]")
                sys.exit(1)
            
            path = args[1]
            if os.path.isfile(path):
                tester.test_file(path)
            else:
                print(f"❌ File not found: {path}")
        
        elif command == "mic":
            duration = int(args[1]) if len(args) > 1 else 10
            tester.test_microphone(duration)
        
        elif command == "batch":
            if len(args) < 2:
                print("Usage: python test_recognition.py batch <folder> [output_file] [--timeout seconds]")
                sys.exit(1)
            
            folder = args[1]
            output_file = args[2] if len(args) > 2 else None
            tester.test_directory(folder, output_file)
        
        else:
            print("Test Audio Recognition")
            print("\nUsage:")
            print("  python test_recognition.py file <audio_file>        # Test audio file")
            print("  python test_recognition.py mic [duration]           # Test microphone")
            print("  python test_recognition.py batch <folder>           # Test directory")
            print("  python test_recognition.py --timeout <seconds>      # Set timeout")
            print("\nExamples:")
            print("  python test_recognition.py file data/audio_slices/slice.wav")
            print("  python test_recognition.py mic 15 --timeout 10")
            print("  python test_recognition.py batch data/audio_slices/")
            print("\nInteractive mode:")
            print("  python test_recognition.py")

if __name__ == "__main__":
    main()