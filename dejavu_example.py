#!/usr/bin/env python3
"""
Dejavu Audio Fingerprinting Example
This program demonstrates how to use Dejavu for audio fingerprinting and recognition.
"""

import json
import warnings
from pathlib import Path
from dejavu import Dejavu
from dejavu.logic.recognizer.file_recognizer import FileRecognizer
from dejavu.logic.recognizer.microphone_recognizer import MicrophoneRecognizer

warnings.filterwarnings("ignore")


class AudioFingerprinter:
    def __init__(self, config_path="dejavu.cnf.SAMPLE"):
        """Initialize Dejavu with configuration."""
        with open(config_path) as f:
            config = json.load(f)
        self.djv = Dejavu(config)
    
    def fingerprint_directory(self, directory_path, extensions=[".mp3", ".wav", ".flac", ".m4a"]):
        """
        Fingerprint all audio files in a directory.
        
        Args:
            directory_path: Path to directory containing audio files
            extensions: List of audio file extensions to process
        """
        print(f"Fingerprinting audio files in: {directory_path}")
        self.djv.fingerprint_directory(directory_path, extensions)
        print(f"Fingerprinting complete. Total songs in database: {self.djv.db.get_num_songs()}")
    
    def fingerprint_file(self, filepath, song_name=None):
        """
        Fingerprint a single audio file.
        
        Args:
            filepath: Path to the audio file
            song_name: Optional name for the song in database
        """
        if song_name is None:
            song_name = Path(filepath).stem
        
        print(f"Fingerprinting: {filepath}")
        self.djv.fingerprint_file(filepath, song_name=song_name)
        print(f"Successfully fingerprinted: {song_name}")
    
    def recognize_file(self, filepath):
        """
        Recognize an audio file against the fingerprint database.
        
        Args:
            filepath: Path to the audio file to recognize
        
        Returns:
            Recognition results dictionary
        """
        print(f"Recognizing: {filepath}")
        results = self.djv.recognize(FileRecognizer, filepath)
        
        if results and results['song_name']:
            print(f"✓ Match found: {results['song_name']}")
            print(f"  Confidence: {results['input_confidence']:.2%}")
            print(f"  Offset: {results['offset_seconds']:.2f} seconds")
        else:
            print("✗ No match found")
        
        return results
    
    def recognize_microphone(self, seconds=10):
        """
        Recognize audio from microphone input.
        
        Args:
            seconds: Duration to record from microphone
        
        Returns:
            Recognition results dictionary
        """
        print(f"Listening for {seconds} seconds...")
        results = self.djv.recognize(MicrophoneRecognizer, seconds=seconds)
        
        if results and results['song_name']:
            print(f"✓ Match found: {results['song_name']}")
            print(f"  Confidence: {results['input_confidence']:.2%}")
        else:
            print("✗ No match found")
        
        return results
    
    def get_database_stats(self):
        """Get statistics about the fingerprint database."""
        num_songs = self.djv.db.get_num_songs()
        num_fingerprints = self.djv.db.get_num_fingerprints()
        
        print(f"Database Statistics:")
        print(f"  Total songs: {num_songs}")
        print(f"  Total fingerprints: {num_fingerprints}")
        
        return {
            "num_songs": num_songs,
            "num_fingerprints": num_fingerprints
        }


def main():
    """Main function demonstrating Dejavu usage."""
    
    # Initialize fingerprinter
    print("Initializing Dejavu Audio Fingerprinter...")
    fp = AudioFingerprinter("dejavu_config.json")
    
    # Example usage (uncomment as needed):
    
    # 1. Fingerprint a directory of songs
    # fp.fingerprint_directory("./audio_library/")
    
    # 2. Fingerprint a single file
    # fp.fingerprint_file("./sample_audio.mp3", song_name="My Sample Song")
    
    # 3. Recognize an audio file
    # results = fp.recognize_file("./unknown_audio.mp3")
    
    # 4. Recognize from microphone (requires pyaudio)
    # results = fp.recognize_microphone(seconds=10)
    
    # 5. Get database statistics
    stats = fp.get_database_stats()
    
    print("\nDejavu is ready to use!")
    print("Uncomment the example functions in main() to:")
    print("  - Fingerprint audio files")
    print("  - Recognize unknown audio")
    print("  - Use microphone recognition")


if __name__ == "__main__":
    main()