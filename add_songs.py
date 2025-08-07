#!/usr/bin/env python3
"""
Add Songs - Main interface for adding songs to Dejavu database
Simple wrapper for the quick_start functionality.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'core'))

from quick_start import DejavuQuickStart

def main():
    """Main function for adding songs."""
    config_path = os.path.join('config', 'dejavu_config.json')
    qs = DejavuQuickStart(config_path)
    
    if not qs.setup():
        sys.exit(1)
    
    if len(sys.argv) < 2:
        print("Add Songs to Dejavu Database")
        print("\nUsage:")
        print("  python add_songs.py <file_or_folder> [song_name]")
        print("\nExamples:")
        print("  python add_songs.py data/songs/                    # Add entire folder")
        print("  python add_songs.py song.mp3 'Artist - Title'      # Add single song")
        print("\nInteractive mode:")
        print("  python add_songs.py --interactive")
        sys.exit(1)
    
    if sys.argv[1] == "--interactive":
        qs.interactive_mode()
    else:
        path = sys.argv[1]
        name = sys.argv[2] if len(sys.argv) > 2 else None
        
        if os.path.isdir(path):
            qs.add_folder(path)
        else:
            qs.add_song(path, name)
        
        qs.show_stats()

if __name__ == "__main__":
    main()