import os
import sys
import zipfile
import subprocess
import requests
import shutil
from pathlib import Path

# w64devkit 1.21.0 (smaller ~80MB)
COMPILER_URL = "https://github.com/skeeto/w64devkit/releases/download/v1.21.0/w64devkit-1.21.0.zip"
COMPILER_DIR = Path("compiler")
# w64devkit extracts to 'w64devkit' by default
COMPILER_BIN = COMPILER_DIR / "w64devkit" / "bin"

def is_gcc_installed():
    """Check if gcc is available in the current PATH."""
    try:
        subprocess.run(["gcc", "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def setup_compiler():
    """
    Downloads and sets up w64devkit if gcc is not found.
    Returns the path to the bin directory to be added to PATH, or None if not needed/failed.
    """
    if is_gcc_installed():
        print("GCC is already installed.")
        return None

    if COMPILER_BIN.exists() and (COMPILER_BIN / "gcc.exe").exists():
        print("Portable compiler already exists.")
        return str(COMPILER_BIN.absolute())

    print("GCC not found. Downloading portable MinGW (w64devkit)...")
    
    # Cleanup previous attempts if any
    try:
        if COMPILER_DIR.exists():
            shutil.rmtree(COMPILER_DIR)
    except Exception as e:
        print(f"Warning: Failed to clean up existing compiler directory: {e}")
    
    try:
        # Create compiler directory
        COMPILER_DIR.mkdir(exist_ok=True)
        
        # Download
        zip_path = COMPILER_DIR / "w64devkit.zip"
        print(f"Downloading from {COMPILER_URL}...")
        response = requests.get(COMPILER_URL, stream=True)
        response.raise_for_status()
        
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        # Extract
        print("Extracting compiler...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(COMPILER_DIR)
            
        # Cleanup zip
        os.remove(zip_path)
        
        # Verify extraction
        if not (COMPILER_BIN / "gcc.exe").exists():
            print("Error: Compile binary not found after extraction.")
            # Verify structure
            print(f"Contents of {COMPILER_DIR}:")
            for item in COMPILER_DIR.iterdir():
                print(f" - {item.name}")
            return None
        
        print("Compiler setup complete.")
        return str(COMPILER_BIN.absolute())
        
    except Exception as e:
        print(f"Failed to setup compiler: {e}")
        # Clean up partial install
        if zip_path.exists():
            try:
                os.remove(zip_path)
            except:
                pass
        return None
