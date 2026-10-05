#!/usr/bin/env python3

import os
import sys
import subprocess
import signal
import time
from pathlib import Path

def check_python_version():
    if sys.version_info < (3, 8):
        print("Python 3.8 or higher is required")
        sys.exit(1)
    print(f"Python {sys.version_info.major}.{sys.version_info.minor} detected")

def install_requirements():
    requirements_file = Path(__file__).parent / "requirements.txt"
    if not requirements_file.exists():
        print("requirements.txt not found")
        return False
    
    print("Installing required packages...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ])
        print("Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install requirements: {e}")
        return False

def check_model_files():
    base_dir = Path(__file__).parent.parent
    
    required_paths = [
        base_dir / "textmodelW" / "model_assets",
        base_dir / "audiomodelW" / "audio_model_assets", 
        base_dir / "imagemodelW" / "model_assets"
    ]
    
    missing_paths = []
    for path in required_paths:
        if not path.exists():
            missing_paths.append(str(path))
    
    if missing_paths:
        print("Missing model directories:")
        for path in missing_paths:
            print(f"   - {path}")
        return False
    
    print("All model directories found")
    return True

def start_service():
    orchestrator_file = Path(__file__).parent / "orchestrator.py"
    if not orchestrator_file.exists():
        print("orchestrator.py not found")
        return False
    
    print("Starting AI Model Orchestrator Service...")
    try:
        process = subprocess.Popen([
            sys.executable, str(orchestrator_file)
        ])
        
        time.sleep(3)
        if process.poll() is None:
            print("AI Service started successfully on http://localhost:5002")
            print("Available endpoints:")
            print("   - GET  /health - Health check")
            print("   - POST /analyze/text - Text symptom analysis")
            print("   - POST /analyze/audio - Audio analysis")
            print("   - POST /analyze/image - Image analysis")
            print("   - POST /analyze/comprehensive - Multimodal analysis")
            print("\nPress Ctrl+C to stop the service")
            
            try:
                process.wait()
            except KeyboardInterrupt:
                print("\nStopping AI service...")
                process.terminate()
                process.wait()
                print("AI service stopped")
        else:
            print("Failed to start AI service")
            return False
            
    except Exception as e:
        print(f"Error starting service: {e}")
        return False
    
    return True

def main():
    print("AI Model Orchestrator Service Startup")
    print("=" * 50)
    
    check_python_version()
    
    if not check_model_files():
        print("\nPlease ensure all model files are properly extracted")
        sys.exit(1)
    
    if not install_requirements():
        print("\nFailed to install requirements")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    
    start_service()

if __name__ == "__main__":
    main()
