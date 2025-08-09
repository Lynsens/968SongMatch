#!/usr/bin/env python3
"""
Web Server Launcher for Dejavu Audio Recognition
Main entry point for the web interface.
"""

import sys
import os

# Add web directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'web'))

if __name__ == "__main__":
    try:
        from web.app import app, socketio, init_dejavu
        
        print("🚀 Starting Dejavu Web Server...")
        
        if not init_dejavu():
            print("❌ Failed to initialize Dejavu. Please check your configuration.")
            print("\nTroubleshooting:")
            print("1. Ensure MySQL is running and accessible")
            print("2. Check database credentials in config/dejavu_config.json")
            print("3. Verify database 'dejavu' exists")
            print("4. Install required dependencies: pip install -r requirements.txt")
            sys.exit(1)
        
        print("✅ Dejavu initialized successfully!")
        print("🌐 Server starting at: http://localhost:8000")
        print("📁 Upload limit: 50MB")
        print("🎵 Supported formats: MP3, WAV, FLAC, M4A, OGG")
        print("🔴 WebSocket support: ENABLED")
        print("\n" + "="*50)
        print("DEJAVU AUDIO RECOGNITION WEB INTERFACE")
        print("="*50)
        print("🏠 Home (Recognition): http://localhost:8000/")
        print("📡 Live Session: http://localhost:8000/live")
        print("🗃️  Database Management: http://localhost:8000/manage")  
        print("📊 History: http://localhost:8000/history")
        print("="*50)
        print("\nPress Ctrl+C to stop the server")
        
        socketio.run(app, debug=True, host='0.0.0.0', port=8000, allow_unsafe_werkzeug=True)
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("\nPlease install required dependencies:")
        print("pip install flask flask-cors")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down Dejavu Web Server...")
        print("Goodbye!")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1)