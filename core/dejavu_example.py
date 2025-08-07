#!/usr/bin/env python3
"""
Dejavu Audio Fingerprinting Example
This program demonstrates how to use Dejavu for audio fingerprinting and recognition.
"""

import json
import warnings
from pathlib import Path
from dejavu_lib import Dejavu
from dejavu_lib.logic.recognizer.file_recognizer import FileRecognizer
from dejavu_lib.logic.recognizer.microphone_recognizer import MicrophoneRecognizer

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
        raw_results = self.djv.recognize(FileRecognizer, filepath)
        
        if raw_results and raw_results.get('results') and len(raw_results['results']) > 0:
            # Get the best match (first result)
            best_match = raw_results['results'][0]
            
            # Decode song name from bytes if needed
            song_name = best_match['song_name']
            if isinstance(song_name, bytes):
                song_name = song_name.decode('utf-8')
            elif isinstance(song_name, str) and song_name.startswith("b'"):
                # Handle string representation of bytes
                try:
                    song_name = eval(song_name).decode('utf-8')
                except:
                    pass
            
            # Create unified results format
            results = {
                'song_name': song_name,
                'song_id': best_match['song_id'],
                'input_confidence': best_match['input_confidence'],
                'fingerprinted_confidence': best_match['fingerprinted_confidence'],
                'offset_seconds': float(best_match['offset_seconds']),
                'hashes_matched_in_input': best_match['hashes_matched_in_input'],
                'input_total_hashes': best_match['input_total_hashes'],
                'fingerprinted_hashes_in_db': best_match['fingerprinted_hashes_in_db'],
                'total_time': raw_results['total_time'],
                'query_time': raw_results['query_time']
            }
            
            print(f"✓ Match found: {song_name}")
            print(f"  Confidence: {results['input_confidence']:.2%}")
            print(f"  Offset: {results['offset_seconds']:.2f} seconds")
            
            return results
        else:
            print("✗ No match found")
            return None
    
    def recognize_microphone(self, seconds=10):
        """
        Recognize audio from microphone input.
        
        Args:
            seconds: Duration to record from microphone
        
        Returns:
            Recognition results dictionary
        """
        print(f"Listening for {seconds} seconds...")
        raw_results = self.djv.recognize(MicrophoneRecognizer, seconds=seconds)
        
        # Handle tuple format from microphone recognizer
        if raw_results and isinstance(raw_results, tuple) and len(raw_results) >= 4:
            match_list, total_time, query_time, align_time = raw_results
            if match_list and len(match_list) > 0:
                # Get the best match (first result)
                best_match = match_list[0]
                
                # Decode song name from bytes if needed
                song_name = best_match['song_name']
                if isinstance(song_name, bytes):
                    song_name = song_name.decode('utf-8')
                elif isinstance(song_name, str) and song_name.startswith("b'"):
                    # Handle string representation of bytes
                    try:
                        song_name = eval(song_name).decode('utf-8')
                    except:
                        pass
                
                # Create unified results format
                results = {
                    'song_name': song_name,
                    'song_id': best_match['song_id'],
                    'input_confidence': best_match['input_confidence'],
                    'fingerprinted_confidence': best_match['fingerprinted_confidence'],
                    'offset_seconds': float(best_match['offset_seconds']),
                    'hashes_matched_in_input': best_match['hashes_matched_in_input'],
                    'input_total_hashes': best_match['input_total_hashes'],
                    'fingerprinted_hashes_in_db': best_match['fingerprinted_hashes_in_db'],
                    'total_time': float(total_time),
                    'query_time': float(query_time)
                }
                
                print(f"✓ Match found: {song_name}")
                print(f"  Confidence: {results['input_confidence']:.2%}")
                
                return results
        else:
            print("✗ No match found")
            return None
    
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