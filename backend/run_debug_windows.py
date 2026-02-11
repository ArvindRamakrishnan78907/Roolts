
import os
import sys
import asyncio
import platform

# 1. Force Windows SelectorEventLoop Policy (Critical for aiohttp + Flask on Windows)
if platform.system() == 'Windows':
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        print(">>> Windows SelectorEventLoopPolicy applied successfully.")
    except Exception as e:
        print(f"!!! Failed to set Windows event loop policy: {e}")

# 2. Prevent Eventlet Monkey Patching (Just in case)
os.environ['EVENTLET_NO_GREENTHREADS'] = 'true'

# 3. Import and Patch
import nest_asyncio
nest_asyncio.apply()
print(">>> nest_asyncio applied.")

# 4. Import App
try:
    from app import app, socketio
    print(">>> App imported successfully.")
except ImportError as e:
    print(f"!!! Failed to import app: {e}")
    sys.exit(1)

if __name__ == '__main__':
    print("\n>>> STARTING IN WINDOWS DEBUG MODE <<<")
    print("This mode forces SelectorEventLoop and Threading for stability.\n")
    
    # Ensure raw WSGI/Threading mode
    socketio.run(app, 
                host='0.0.0.0', 
                port=5000, 
                debug=True, 
                use_reloader=False, # Reloader can sometimes mess up loops
                allow_unsafe_werkzeug=True)
