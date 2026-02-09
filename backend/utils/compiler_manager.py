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
    'nodejs': {
        'url': "https://nodejs.org/dist/v18.17.0/node-v18.17.0-win-x64.zip",
        'zip_name': "node_portable.zip",
        'extract_dir': "nodejs",
        'bin_path': "node-v18.17.0-win-x64",
        'executables': {
            'node': 'node.exe',
            'npm': 'npm.cmd'
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

def enable_python_pip(python_dir):
    """
    Enables pip for the portable embeddable Python distribution.
    1. Modifies the ._pth file to enable site-packages.
    2. Downloads and runs get-pip.py if pip is missing.
    """
    python_dir = Path(python_dir).resolve()
    
    # 1. Update ._pth file
    # Find the pythonXX._pth file
    pth_files = list(python_dir.glob("python*._pth"))
    if pth_files:
        pth_file = pth_files[0]
        try:
            with open(pth_file, 'r') as f:
                content = f.read()
            
            # Uncomment 'import site' if it exists and is commented
            if "#import site" in content:
                print(f"[python] Enabling site-packages in {pth_file.name}")
                content = content.replace("#import site", "import site")
                with open(pth_file, 'w') as f:
                    f.write(content)
        except Exception as e:
            print(f"[python] Warning: Failed to modify ._pth file: {e}")

    # 2. Install pip if missing
    python_exe = (python_dir / "python.exe").resolve()
    scripts_dir = (python_dir / "Scripts").resolve()
    pip_exe = (scripts_dir / "pip.exe").resolve()
    
    if not pip_exe.exists():
        print("[python] pip not found. Installing pip...")
        get_pip_path = (RUNTIMES_DIR / "get-pip.py").resolve()
        try:
            if not get_pip_path.exists():
                print("[python] Downloading get-pip.py...")
                url = "https://bootstrap.pypa.io/get-pip.py"
                r = requests.get(url)
                with open(get_pip_path, 'wb') as f:
                    f.write(r.content)
            
            # Run get-pip.py using absolute paths
            print(f"[python] Running get-pip.py with {python_exe}...")
            # We don't set cwd here to avoid confusion; usage of absolute paths handles it.
            # But pip installation might detail into site-packages relative to executable location.
            # Python's behavior relative to executable should be fine if we run it directly.
            subprocess.run([str(python_exe), str(get_pip_path)], cwd=str(python_dir), check=True, capture_output=True)
            print("[python] pip installed successfully.")
        except Exception as e:
            print(f"[python] Failed to install pip: {e}")
            if hasattr(e, 'stderr') and e.stderr:
                print(f"Error output: {e.stderr.decode() if isinstance(e.stderr, bytes) else e.stderr}")
            elif hasattr(e, 'output') and e.output:
                 print(f"Output: {e.output.decode() if isinstance(e.output, bytes) else e.output}")

def setup_all_runtimes():
    """Sets up all portable runtimes and adds them to PATH."""
    paths = []
    for lang in RUNTIME_CONFIG:
        path = setup_runtime(lang)
        if path:
            paths.append(path)
            
            # Additional setup for Python
            if lang == 'python':
                # The bin path for python IS the extract path (plus Scripts)
                enable_python_pip(path)
                scripts_path = str((Path(path) / "Scripts").absolute())
                if scripts_path not in os.environ["PATH"]:
                    os.environ["PATH"] = scripts_path + os.pathsep + os.environ["PATH"]

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

