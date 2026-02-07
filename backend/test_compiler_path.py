import sys
import os

# Add backend to path to import utils
sys.path.append(os.getcwd())

from utils.compiler_manager import get_gcc_path, get_gplusplus_path

print(f"Current Working Directory: {os.getcwd()}")
print(f"GCC Path: {get_gcc_path()}")
print(f"G++ Path: {get_gplusplus_path()}")

# Verify if the returned path exists
gcc = get_gcc_path()
if os.path.exists(gcc):
    print("✅ GCC path exists")
else:
    print("❌ GCC path does NOT exist")
