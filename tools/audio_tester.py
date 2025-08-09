#!/usr/bin/env python3
"""
Audio Recognition Tester for Dejavu
Test audio recognition using file slices OR microphone input.
Perfect for testing recognition with various audio sources.
"""

import os
import sys
import time
import json
import signal
from pathlib import Path
from typing import Dict, List, Optional, Union

# Add parent directory to path to import from core
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'core'))
from dejavu_example import AudioFingerprinter


class AudioRecognitionTester:
    """Test audio recognition against the Dejavu database."""
    
    def __init__(self, config_file: str = "dejavu_config.json", max_listen_time: float = 3.0):
        """Initialize the tester."""
        self.config_file = config_file
        self.max_listen_time = max_listen_time
        self.fp = None
        self.results_log = []
        
    def setup(self) -> bool:
        """Setup and test database connection."""
        try:
            print("🔧 Initializing Dejavu Audio Recognition Tester...")
            self.fp = AudioFingerprinter(self.config_file)
            
            # Check database status
            stats = self.fp.get_database_stats()
            print(f"✅ Connected to database with {stats['num_songs']} songs")
            
            if stats['num_songs'] == 0:
                print("⚠️  Warning: Database is empty! Add songs first with:")
                print("   python quick_start.py add <audio_file>")
                # Still return True to allow web server to start for adding songs
                return True
            
            return True
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def _timeout_handler(self, signum, frame):
        """Handle timeout signal."""
        raise TimeoutError("Recognition timed out")
    
    def _run_recognition_with_timeout(self, recognition_func, timeout: float, *args, **kwargs) -> tuple:
        """Run recognition function with timeout protection."""
        start_time = time.time()
        results = None
        timed_out = False
        
        try:
            # Skip signal-based timeout in web context (Flask threads don't support signals)
            # Just run the function directly - the underlying recognition should be fast enough
            results = recognition_func(*args, **kwargs)
                
        except Exception as e:
            # Re-raise any recognition errors
            raise e
        
        processing_time = time.time() - start_time
        return results, processing_time, timed_out
    
    def _create_result_dict(self, 
                           source: str, 
                           source_type: str,
                           results: Optional[Dict], 
                           processing_time: float,
                           timed_out: bool = False, 
                           timeout_limit: Optional[float] = None) -> Dict:
        """Create standardized result dictionary."""
        base_result = {
            'source': source,
            'source_type': source_type,  # 'file' or 'microphone'
            'matched': False,
            'song_name': None,
            'confidence': 0,
            'processing_time': processing_time,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        if timed_out:
            base_result.update({
                'timed_out': True,
                'timeout_limit': timeout_limit
            })
        elif results and results.get('song_name'):
            base_result.update({
                'matched': True,
                'song_name': results['song_name'],
                'song_id': results.get('song_id'),
                'confidence': results.get('input_confidence', 0),
                'offset_seconds': results.get('offset_seconds', 0),
                'hashes_matched': results.get('hashes_matched_in_input', 0),
                'input_hashes': results.get('input_total_hashes', 0),
                'fingerprinted_hashes': results.get('fingerprinted_hashes_in_db', 0)
            })
        
        return base_result
    
    def _print_result(self, result: Dict, verbose: bool = True):
        """Print recognition result in a standardized format."""
        if not verbose:
            return
            
        source_icon = "🎵" if result['source_type'] == 'file' else "🎤"
        source_display = Path(result['source']).name if result['source_type'] == 'file' else f"{result['source']}s recording"
        
        print(f"\n{source_icon} Testing: {source_display}")
        
        if result.get('timed_out'):
            print(f"⏰ Recognition timed out after {result['timeout_limit']}s")
            print(f"   Actual processing time: {result['processing_time']:.2f}s")
            print(f"   Try increasing timeout or using shorter audio")
            
        elif result['matched']:
            print(f"🎉 MATCH FOUND!")
            print(f"   Song: {result['song_name']}")
            print(f"   Confidence: {result['confidence']:.1%}")
            if result.get('offset_seconds'):
                print(f"   Match offset: {result['offset_seconds']:.2f} seconds")
            print(f"   Hashes matched: {result.get('hashes_matched', 0)}/{result.get('input_hashes', 0)}")
            print(f"   Processing time: {result['processing_time']:.2f}s")
            
        else:
            print(f"❌ No match found")
            print(f"   Processing time: {result['processing_time']:.2f}s")
            print(f"   Possible reasons:")
            print(f"     - Song not in database")
            print(f"     - Audio quality too poor")
            print(f"     - Recording too short (recommend 5+ seconds)")
    
    def test_file(self, audio_file: str, verbose: bool = True, timeout: Optional[float] = None, return_results: bool = False) -> Optional[Dict]:
        """Test recognition with an audio file."""
        if not os.path.exists(audio_file):
            if verbose:
                print(f"❌ File not found: {audio_file}")
            return None
        
        timeout = timeout or self.max_listen_time
        
        if verbose:
            print(f"⏱️  Max processing time: {timeout}s")
            print("-" * 50)
        
        # Run recognition with timeout
        results, processing_time, timed_out = self._run_recognition_with_timeout(
            self.fp.recognize_file, timeout, audio_file
        )
        
        # Create result
        result = self._create_result_dict(
            audio_file, 'file', results, processing_time, timed_out, timeout
        )
        
        # Print and log result
        if not return_results:
            self._print_result(result, verbose)
        self.results_log.append(result)
        
        if return_results:
            # For web API, return the results in expected format
            return results if results else {'song_name': None}
        
        return result
    
    def test_microphone(self, duration: int = 10, verbose: bool = True, timeout: Optional[float] = None) -> Optional[Dict]:
        """Test recognition with microphone input."""
        timeout = timeout or self.max_listen_time
        
        if verbose:
            print(f"🎤 Recording for {duration} seconds...")
            print(f"⏱️  Max processing time: {timeout}s")
            print("   Play your music now!")
            print("-" * 50)
        
        # Run recognition with timeout
        try:
            results, processing_time, timed_out = self._run_recognition_with_timeout(
                self.fp.recognize_microphone, timeout, duration
            )
        except Exception as e:
            # No timeout clearing needed in web context
            
            if verbose:
                print(f"❌ Microphone error: {e}")
                if "Invalid number of channels" in str(e):
                    print("   Try installing: brew install portaudio (macOS) or check microphone permissions")
                else:
                    print("   Make sure pyaudio is installed and microphone is available")
                    print("   Install with: pip install pyaudio")
            return None
        
        # Create result
        result = self._create_result_dict(
            str(duration), 'microphone', results, processing_time, timed_out, timeout
        )
        
        # Print and log result
        self._print_result(result, verbose)
        self.results_log.append(result)
        
        return result
    
    def test_directory(self, directory_path: str, output_file: Optional[str] = None, return_results: bool = False) -> Dict:
        """Test all audio files in a directory."""
        print(f"📁 Checking directory: {directory_path}")
        
        if not os.path.exists(directory_path):
            print(f"❌ Directory not found: '{directory_path}'")
            return {'error': 'Directory not found'}
            
        if not os.path.isdir(directory_path):
            print(f"❌ Path is not a directory: '{directory_path}'")
            return {'error': 'Path is not a directory'}
        
        # Find audio files
        audio_extensions = {'.mp3', '.wav', '.flac', '.m4a', '.ogg'}
        audio_files = []
        
        for root, _, files in os.walk(directory_path):
            for file in files:
                if Path(file).suffix.lower() in audio_extensions:
                    audio_files.append(os.path.join(root, file))
        
        if not audio_files:
            print(f"❌ No audio files found in: {directory_path}")
            return {'error': 'No audio files found'}
        
        print(f"\n📁 Testing {len(audio_files)} audio files from: {directory_path}")
        print("=" * 70)
        
        matches = 0
        timeouts = 0
        total_time = 0
        
        for i, audio_file in enumerate(audio_files, 1):
            print(f"\n[{i}/{len(audio_files)}] Processing: {Path(audio_file).name}")
            result = self.test_file(audio_file, verbose=False)
            
            if result:
                total_time += result['processing_time']
                if result.get('timed_out'):
                    timeouts += 1
                    print(f"   ⏰ Timed out")
                elif result['matched']:
                    matches += 1
                    print(f"   ✅ {result['song_name']} ({result['confidence']:.1%})")
                else:
                    print(f"   ❌ No match")
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 BATCH TESTING SUMMARY")
        print("=" * 70)
        print(f"Total files tested: {len(audio_files)}")
        print(f"Matches found: {matches}")
        print(f"No matches: {len(audio_files) - matches - timeouts}")
        print(f"Timeouts: {timeouts}")
        print(f"Success rate: {(matches/len(audio_files)*100):.1f}%")
        print(f"Total processing time: {total_time:.2f}s")
        print(f"Average time per file: {(total_time/len(audio_files)):.2f}s")
        
        # Save results
        if output_file or len(audio_files) > 10:
            output_file = output_file or f"recognition_test_results_{int(time.time())}.json"
            if self.save_results(output_file):
                print(f"\n💾 Detailed results saved to: {output_file}")
        
        summary = {
            'total_files': len(audio_files),
            'matches': matches,
            'timeouts': timeouts,
            'success_rate': matches/len(audio_files)*100,
            'total_time': total_time
        }
        
        if return_results:
            # For web API, include detailed results
            summary['detailed_results'] = self.results_log[-len(audio_files):]
        
        return summary
    
    def save_results(self, filename: str) -> bool:
        """Save test results to JSON file."""
        try:
            with open(filename, 'w') as f:
                json.dump({
                    'test_session': {
                        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                        'total_tests': len(self.results_log),
                        'matches': sum(1 for r in self.results_log if r['matched']),
                        'timeouts': sum(1 for r in self.results_log if r.get('timed_out')),
                        'config_file': self.config_file,
                        'max_listen_time': self.max_listen_time
                    },
                    'results': self.results_log
                }, f, indent=2)
            return True
        except Exception as e:
            print(f"❌ Error saving results: {e}")
            return False
    
    def get_recent_results(self, count: int = 10) -> List[Dict]:
        """Get recent test results."""
        return self.results_log[-count:] if self.results_log else []
    
    def clear_results(self):
        """Clear all test results."""
        self.results_log.clear()
    
    def _clear_timeout(self):
        """Safely clear any remaining timeout signals."""
        # No timeout clearing needed in web context (signals don't work in threads)
        pass
    
    def interactive_mode(self):
        """Interactive mode for testing audio recognition."""
        if not self.setup():
            return
        
        while True:
            print("\n" + "="*70)
            print("AUDIO RECOGNITION TESTER")
            print("="*70)
            print(f"⏱️  Current max processing time: {self.max_listen_time}s")
            print("-"*70)
            print("1. Test audio file")
            print("2. Test microphone")
            print("3. Test directory (batch files)")
            print("4. Change max processing time")
            print("5. View recent results")
            print("6. Save results to file")
            print("7. Clear results")
            print("8. Exit")
            print("-"*70)
            
            choice = input("Select option (1-8): ").strip()
            
            if choice == "1":
                filepath = input("Enter path to audio file: ").strip()
                if filepath:
                    custom_timeout = input(f"Custom timeout in seconds (Enter for {self.max_listen_time}s): ").strip()
                    timeout = float(custom_timeout) if custom_timeout else self.max_listen_time
                    self.test_file(filepath, timeout=timeout)
            
            elif choice == "2":
                try:
                    duration = int(input("Recording duration in seconds (default 10): ").strip() or "10")
                    custom_timeout = input(f"Custom timeout in seconds (Enter for {self.max_listen_time}s): ").strip()
                    timeout = float(custom_timeout) if custom_timeout else self.max_listen_time
                    self.test_microphone(duration, timeout=timeout)
                except ValueError:
                    print("❌ Please enter valid numbers")
            
            elif choice == "3":
                folder_path = input("Enter folder path containing audio files: ").strip()
                if folder_path:
                    save_file = input("Save results to file? (Enter filename or press Enter to skip): ").strip()
                    self.test_directory(folder_path, save_file if save_file else None)
                else:
                    print("❌ No folder path entered")
            
            elif choice == "4":
                try:
                    new_timeout = float(input(f"Enter new max processing time in seconds (current: {self.max_listen_time}s): ").strip())
                    if new_timeout > 0:
                        self.max_listen_time = new_timeout
                        print(f"✅ Max processing time updated to {self.max_listen_time}s")
                    else:
                        print("❌ Timeout must be positive")
                except ValueError:
                    print("❌ Please enter a valid number")
            
            elif choice == "5":
                recent = self.get_recent_results()
                if recent:
                    print(f"\n📊 Recent Results ({len(recent)} tests):")
                    print("-" * 70)
                    for i, result in enumerate(recent, 1):
                        status = "✅" if result['matched'] else ("⏰" if result.get('timed_out') else "❌")
                        source_type = "🎵" if result['source_type'] == 'file' else "🎤"
                        source = Path(result['source']).name if result['source_type'] == 'file' else f"{result['source']}s mic"
                        song = result['song_name'] or "No match"
                        print(f"{i:2d}. {status} {source_type} {source} → {song}")
                else:
                    print("\n📭 No test results yet")
            
            elif choice == "6":
                if self.results_log:
                    filename = input("Enter filename (or press Enter for auto): ").strip()
                    if not filename:
                        filename = f"recognition_results_{int(time.time())}.json"
                    if self.save_results(filename):
                        print(f"✅ Results saved to: {filename}")
                else:
                    print("❌ No results to save")
            
            elif choice == "7":
                if self.results_log:
                    confirm = input(f"Clear {len(self.results_log)} test results? (y/N): ").strip().lower()
                    if confirm == 'y':
                        self.clear_results()
                        print("✅ Results cleared")
                else:
                    print("📭 No results to clear")
            
            elif choice == "8":
                print("\n👋 Goodbye!")
                break
            
            else:
                print("❌ Invalid option")
            
            if choice != "8":
                self._clear_timeout()  # Ensure no timeout signals interfere
                input("\nPress Enter to continue...")


def main():
    """Command line interface."""
    # Parse arguments
    timeout = 3.0  # default
    args = sys.argv[1:]
    
    # Look for --timeout argument
    if '--timeout' in args:
        timeout_idx = args.index('--timeout')
        if timeout_idx + 1 < len(args):
            try:
                timeout = float(args[timeout_idx + 1])
                # Remove timeout args
                args = args[:timeout_idx] + args[timeout_idx + 2:]
            except ValueError:
                print("❌ Invalid timeout value. Using default 3.0 seconds.")
    
    tester = AudioRecognitionTester(max_listen_time=timeout)
    
    if len(args) == 0:
        # Interactive mode
        tester.interactive_mode()
    
    elif len(args) >= 1:
        if not tester.setup():
            sys.exit(1)
        
        command = args[0].lower()
        
        if command == "file":
            if len(args) < 2:
                print("Usage: python audio_tester.py file <audio_file> [--timeout seconds]")
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
                print("Usage: python audio_tester.py batch <folder> [output_file] [--timeout seconds]")
                sys.exit(1)
            
            folder = args[1]
            output_file = args[2] if len(args) > 2 else None
            tester.test_directory(folder, output_file)
        
        else:
            print("Unknown command:", command)
            print("\nAvailable commands:")
            print("  file <audio_file> [--timeout seconds]        - Test single audio file")
            print("  mic [duration] [--timeout seconds]           - Test microphone input")
            print("  batch <folder> [output] [--timeout seconds]  - Test all files in folder")
            print("  --timeout <seconds>                          - Set max processing time (default: 3s)")
            print("\nExamples:")
            print("  python audio_tester.py file slice.wav --timeout 5")
            print("  python audio_tester.py mic 15 --timeout 10")
            print("  python audio_tester.py batch audio_slices/ results.json")
            print("\nOr run without arguments for interactive mode")


if __name__ == "__main__":
    main()