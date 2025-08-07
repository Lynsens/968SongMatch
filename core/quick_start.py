#!/usr/bin/env python3
"""
Quick Start Script - Complete working example for Dejavu
This script provides all the basic operations in one place.
"""

import os
import sys
import json
from pathlib import Path
from dejavu_example import AudioFingerprinter

class DejavuQuickStart:
    def __init__(self, config_file="dejavu_config.json"):
        """Initialize with configuration file."""
        self.config_file = config_file
        self.fp = None
        
    def setup(self):
        """Setup and test database connection."""
        try:
            print("🔧 Setting up Dejavu...")
            self.fp = AudioFingerprinter(self.config_file)
            print("✅ Successfully connected to database!")
            return True
        except Exception as e:
            print(f"❌ Error: {e}")
            print("\nPlease check:")
            print("1. MySQL is running")
            print("2. Database 'dejavu' exists")
            print("3. Credentials in dejavu_config.json are correct")
            return False
    
    def add_song(self, filepath, name=None):
        """Add a single song to the database."""
        if not os.path.exists(filepath):
            print(f"❌ File not found: {filepath}")
            return False
        
        print(f"🎵 Adding song: {filepath}")
        self.fp.fingerprint_file(filepath, song_name=name)
        print(f"✅ Successfully added: {name or Path(filepath).stem}")
        return True
    
    def add_folder(self, folder_path):
        """Add all songs from a folder."""
        if not os.path.exists(folder_path):
            print(f"❌ Folder not found: {folder_path}")
            return False
        
        print(f"📁 Adding songs from: {folder_path}")
        self.fp.fingerprint_directory(
            folder_path,
            extensions=[".mp3", ".wav", ".flac", ".m4a", ".ogg"]
        )
        print(f"✅ Successfully processed folder")
        return True
    
    def recognize_file(self, filepath):
        """Recognize a song from audio file."""
        if not os.path.exists(filepath):
            print(f"❌ File not found: {filepath}")
            return None
        
        print(f"🔍 Analyzing: {filepath}")
        results = self.fp.recognize_file(filepath)
        
        if results and results['song_name']:
            print(f"\n🎉 MATCH FOUND!")
            print(f"   Song: {results['song_name']}")
            print(f"   Confidence: {results['input_confidence']:.1%}")
            print(f"   Offset: {results['offset_seconds']:.2f} seconds")
        else:
            print("\n❌ No match found")
        
        return results
    
    def recognize_mic(self, seconds=10):
        """Recognize from microphone."""
        print(f"🎤 Listening for {seconds} seconds...")
        print("   Play your music now!")
        
        results = self.fp.recognize_microphone(seconds=seconds)
        
        if results and results['song_name']:
            print(f"\n🎉 MATCH FOUND!")
            print(f"   Song: {results['song_name']}")
            print(f"   Confidence: {results['input_confidence']:.1%}")
        else:
            print("\n❌ No match found")
        
        return results
    
    def show_stats(self):
        """Display database statistics."""
        stats = self.fp.get_database_stats()
        print("\n📊 Database Statistics:")
        print(f"   Total songs: {stats['num_songs']}")
        print(f"   Total fingerprints: {stats['num_fingerprints']}")
        if stats['num_songs'] > 0:
            avg = stats['num_fingerprints'] / stats['num_songs']
            print(f"   Avg fingerprints/song: {avg:.0f}")
    
    def interactive_menu(self):
        """Interactive menu for easy operation."""
        if not self.setup():
            return
        
        while True:
            print("\n" + "="*50)
            print("DEJAVU AUDIO FINGERPRINTING")
            print("="*50)
            print("1. Add a single song")
            print("2. Add songs from folder")
            print("3. Recognize from file")
            print("4. Recognize from microphone")
            print("5. Show database statistics")
            print("6. Exit")
            print("-"*50)
            
            choice = input("Select option (1-6): ").strip()
            
            if choice == "1":
                filepath = input("Enter audio file path: ").strip()
                name = input("Enter song name (or press Enter to use filename): ").strip()
                self.add_song(filepath, name if name else None)
                
            elif choice == "2":
                folder = input("Enter folder path: ").strip()
                self.add_folder(folder)
                
            elif choice == "3":
                filepath = input("Enter audio file to recognize: ").strip()
                self.recognize_file(filepath)
                
            elif choice == "4":
                seconds = input("How many seconds to record? (default 10): ").strip()
                seconds = int(seconds) if seconds else 10
                self.recognize_mic(seconds)
                
            elif choice == "5":
                self.show_stats()
                
            elif choice == "6":
                print("\n👋 Goodbye!")
                break
                
            else:
                print("❌ Invalid option. Please try again.")
            
            input("\nPress Enter to continue...")


def main():
    """Main function with command line interface."""
    if len(sys.argv) == 1:
        # No arguments - run interactive menu
        qs = DejavuQuickStart()
        qs.interactive_menu()
    
    elif len(sys.argv) >= 2:
        command = sys.argv[1].lower()
        qs = DejavuQuickStart()
        
        if not qs.setup():
            sys.exit(1)
        
        if command == "add":
            if len(sys.argv) < 3:
                print("Usage: python quick_start.py add <file_or_folder> [name]")
                sys.exit(1)
            
            path = sys.argv[2]
            name = sys.argv[3] if len(sys.argv) > 3 else None
            
            if os.path.isdir(path):
                qs.add_folder(path)
            else:
                qs.add_song(path, name)
        
        elif command == "recognize":
            if len(sys.argv) < 3:
                print("Usage: python quick_start.py recognize <file>")
                print("   or: python quick_start.py recognize mic [seconds]")
                sys.exit(1)
            
            if sys.argv[2].lower() == "mic":
                seconds = int(sys.argv[3]) if len(sys.argv) > 3 else 10
                qs.recognize_mic(seconds)
            else:
                qs.recognize_file(sys.argv[2])
        
        elif command == "stats":
            qs.show_stats()
        
        else:
            print("Unknown command:", command)
            print("\nAvailable commands:")
            print("  add <file_or_folder> [name]  - Add songs to database")
            print("  recognize <file>              - Recognize from file")
            print("  recognize mic [seconds]       - Recognize from microphone")
            print("  stats                         - Show database statistics")
            print("\nOr run without arguments for interactive menu")


if __name__ == "__main__":
    main()