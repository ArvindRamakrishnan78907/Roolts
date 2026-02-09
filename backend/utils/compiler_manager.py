import os
import sys
import zipfile
import subprocess
import requests
import shutil
from pathlib import Path

# Configuration for portable runtimes
RUNTIMES_DIR = Path("compiler")

RUNTIME_CONFIG = {
    'c_cpp': {
        'url': "https://github.com/skeeto/w64devkit/releases/download/v1.21.0/w64devkit-1.21.0.zip",
        'zip_name': "w64devkit.zip",
        'extract_dir': "c_cpp",
        'bin_path': "w64devkit/bin",
        'executables': {
            'gcc': 'gcc.exe',
            'g++': 'g++.exe',
            'make': 'make.exe'
        }
    },
    'python': {
        'url': "https://www.python.org/ftp/python/3.11.4/python-3.11.4-embed-amd64.zip",
        'zip_name': "python_portable.zip",
        'extract_dir': "python",
        'bin_path': "",
        'executables': {
            'python': 'python.exe'
        }
    },
    'java': {
        'url': "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%2B13/OpenJDK21U-jdk_x64_windows_hotspot_21.0.2_13.zip",
        'zip_name': "openjdk.zip",
        'extract_dir': "java", 
        'bin_path': "jdk-21.0.2+13/bin", # Temurin has this nested
        'executables': {
            'java': 'java.exe',
            'javac': 'javac.exe'
        }
    },
    'go': {
        'url': "https://go.dev/dl/go1.21.6.windows-amd64.zip",
        'zip_name': "go_portable.zip",
        'extract_dir': "go_runtime",
        'bin_path': "go/bin", # Go has 'go' folder in zip
        'executables': {
            'go': 'go.exe'
        }
    }
}

def is_tool_installed(name):
    """Check if a tool is available in the current PATH."""
    try:
        # shutil.which is more reliable for simple presence check
        return shutil.which(name) is not None
    except:
        return False

def setup_runtime(lang_key):
    """
    Downloads and sets up a portable runtime for a specific language.
    """
    config = RUNTIME_CONFIG.get(lang_key)
    if not config:
        return None

    extract_to = RUNTIMES_DIR / config['extract_dir']
    bin_dir = extract_to / config['bin_path']
    
    # Check if first executable exists
    first_exe_name = list(config['executables'].keys())[0]
    if os.path.exists(get_executable_path(lang_key, first_exe_name)):
        return str(bin_dir.absolute())

    print(f"[{lang_key}] Portable runtime not found. Downloading...")
    
    try:
        RUNTIMES_DIR.mkdir(exist_ok=True)
        # Also ensure extraction subfolder exists
        extract_to.mkdir(exist_ok=True)
        
        zip_path = RUNTIMES_DIR / config['zip_name']
        
        # Download
        print(f"[{lang_key}] Downloading from {config['url']}...")
        response = requests.get(config['url'], stream=True)
        response.raise_for_status()
        
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        # Extract
        print(f"[{lang_key}] Extracting into {extract_to}...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
            
        # Cleanup zip
        os.remove(zip_path)
        
        print(f"[{lang_key}] Setup complete.")
        return str(bin_dir.absolute())
        
    except Exception as e:
        print(f"[{lang_key}] Failed to setup runtime: {e}")
        return None

def setup_all_runtimes():
    """Sets up all portable runtimes and adds them to PATH."""
    paths = []
    for lang in RUNTIME_CONFIG:
        path = setup_runtime(lang)
        if path:
            paths.append(path)
            if path not in os.environ["PATH"]:
                os.environ["PATH"] = path + os.pathsep + os.environ["PATH"]
    return paths

def get_executable_path(lang_key, tool_name):
    """Returns the absolute path to a specific tool."""
    config = RUNTIME_CONFIG.get(lang_key)
    if not config or tool_name not in config['executables']:
        return tool_name # Fallback to system name

    portable_path = RUNTIMES_DIR / config['extract_dir'] / config['bin_path'] / config['executables'][tool_name]
    if portable_path.exists():
        return str(portable_path.absolute())
    
    return tool_name

def get_runtime_root(lang_key):
    """Returns the root directory of a runtime (e.g., GOROOT)."""
    config = RUNTIME_CONFIG.get(lang_key)
    if not config:
        return None
    
    # For Go, the root is compiler/go_runtime/go
    # For others, it might just be the extract_dir
    root_path = RUNTIMES_DIR / config['extract_dir']
    
    # Handle nested folders like 'go/bin' -> root is 'go'
    if config['bin_path']:
        # If bin_path is 'go/bin', we want the part before 'bin'
        bin_parts = Path(config['bin_path']).parts
        if 'bin' in bin_parts:
            # Join all parts before 'bin'
            bin_idx = bin_parts.index('bin')
            root_path = root_path.joinpath(*bin_parts[:bin_idx])
            
    if root_path.exists():
        return str(root_path.absolute())
    return None

# Legacy aliases for backward compatibility
def get_gcc_path(): return get_executable_path('c_cpp', 'gcc')
def get_gplusplus_path(): return get_executable_path('c_cpp', 'g++')
def setup_compiler(): return setup_runtime('c_cpp')

