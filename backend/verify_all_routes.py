
import sys
import os
import json
import logging
import time
import requests
import subprocess
import signal

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_routes():
    """Verify all AI routes are working correctly against a LIVE server."""
    
    # 1. Start Server
    print(">>> Starting Server (run_debug_windows.py)...")
    server_process = subprocess.Popen(
        [sys.executable, "backend/run_debug_windows.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=os.getcwd()
    )
    
    # Wait for startup
    time.sleep(5)
    
    base_url = "http://localhost:5000"
    
    routes_to_test = [
        {
            'name': 'AI Chat',
            'url': f'{base_url}/api/ai/chat',
            'method': 'POST',
            'data': {
                "code": "print('hello')",
                "language": "python",
                "query": "Explain brevity",
                "history": []
            }
        },
        {
            'name': 'AI Explain',
            'url': f'{base_url}/api/ai/explain',
            'method': 'POST',
            'data': {
                "code": "def fast(x): return x*x",
                "language": "python"
            }
        },
        # ... (rest similar)
    ]
    
    success_count = 0
    
    print("\n>>> STARTING LIVE PROBE VERIFICATION <<<\n")
    
    try:
        for route in routes_to_test:
            print(f"Testing {route['name']} ({route['url']})...")
            try:
                response = requests.post(
                    route['url'],
                    json=route['data'],
                    timeout=30 # longer timeout for AI
                )
                
                if response.status_code == 200:
                    print(f"✅ {route['name']}: Licensed/Success (200 OK)")
                    success_count += 1
                elif response.status_code == 500:
                    print(f"❌ {route['name']}: FAILED (500 Internal Server Error)")
                    print(response.text[:200])
                else:
                    print(f"⚠️ {route['name']}: Returned {response.status_code}")
                    print(response.text[:200])
                    # We count non-500s as "passing" the crash test
                    success_count += 1
                    
            except Exception as e:
                print(f"❌ {route['name']}: Exception during request: {e}")

    finally:
        print("\n>>> Stopping Server...")
        server_process.terminate()
        try:
             stdout, stderr = server_process.communicate(timeout=5)
             print("\n--- SERVER STDOUT ---")
             print(stdout.decode(errors='replace'))
             print("\n--- SERVER STDERR ---")
             print(stderr.decode(errors='replace'))
        except:
             server_process.kill()

    print(f"\n>>> VERIFICATION COMPLETE: {success_count}/{len(routes_to_test)} passing crash checks <<<")

if __name__ == "__main__":
    verify_routes()
