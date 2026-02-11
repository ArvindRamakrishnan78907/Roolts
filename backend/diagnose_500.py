import sys
import os
import asyncio
import json
from flask import Flask

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print(">>> Importing app...")
    from app import app
    print(">>> App imported successfully.")
except Exception as e:
    print(f"!!! Failed to import app: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

def run_diagnosis():
    print("\n>>> Starting Diagnosis for /api/ai/chat...")
    
    # Create a test client
    client = app.test_client()
    
    # Payload similar to what frontend sends
    payload = {
        "code": "print('hello')",
        "language": "python",
        "query": "Explain this code",
        "history": []
    }
    
    print(f">>> Sending POST request to /api/ai/chat with payload: {json.dumps(payload)}")
    
    try:
        response = client.post('/api/ai/chat', 
                             data=json.dumps(payload),
                             content_type='application/json')
        
        print(f"\n>>> Status Code: {response.status_code}")
        print(f">>> Response Data: {response.data.decode('utf-8')}")
        
        if response.status_code == 500:
            print("\n!!! 500 ERROR DETECTED !!!")
            # If the app error handler worked, the message might contain the traceback
            try:
                data = json.loads(response.data)
                if 'message' in data and 'Traceback' in data['message']:
                    print(">>> Traceback found in response:")
                    print(data['message'])
                else:
                    print(">>> No traceback in response message.")
            except:
                pass
        else:
            print(">>> Request successful (or not 500).")
            
    except Exception as e:
        print(f"\n!!! Exception during request: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_diagnosis()
