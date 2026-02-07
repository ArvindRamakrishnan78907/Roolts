
import requests
import json
import sys

BASE_URL = 'http://localhost:5000/api/virtual-env'
HEADERS = {'X-User-ID': '1', 'Content-Type': 'application/json'}

def log(msg):
    print(f"[TEST] {msg}")

def test_api():
    # 1. List Environments
    log("Listing environments...")
    res = requests.get(f'{BASE_URL}/environments', headers=HEADERS)
    if res.status_code != 200:
        log(f"Failed to list envs: {res.text}")
        return
    
    envs = res.json().get('environments', [])
    if not envs:
        log("No environments found. Creating one...")
        # Create env logic here if needed, but assuming one exists from previous attempts
        return

    env_id = envs[0]['id']
    log(f"Using environment ID: {env_id}")

    # 2. Create File
    log("Creating file 'test_crud.txt'...")
    res = requests.post(f'{BASE_URL}/environments/{env_id}/files/create', headers=HEADERS, json={
        'path': 'test_crud.txt',
        'type': 'file'
    })
    log(f"Create response: {res.status_code} - {res.text}")

    # 3. Read File (expect empty)
    log("Reading file...")
    res = requests.get(f'{BASE_URL}/environments/{env_id}/files/test_crud.txt', headers=HEADERS)
    log(f"Read response: {res.status_code} - {res.text}")

    # 4. Write Content
    log("Writing content...")
    res = requests.put(f'{BASE_URL}/environments/{env_id}/files/test_crud.txt', headers=HEADERS, json={
        'content': 'Hello CRUD!'
    })
    log(f"Write response: {res.status_code} - {res.text}")

    # 5. Read again
    log("Reading file again...")
    res = requests.get(f'{BASE_URL}/environments/{env_id}/files/test_crud.txt', headers=HEADERS)
    content = res.json().get('content', '')
    log(f"Content: {content}")
    if content.strip() != 'Hello CRUD!':
        log("❌ Content mismatch!")
    else:
        log("✅ Content match!")

    # 5.5 Test Path Normalization
    log("Testing path normalization (reading with /workspace/ prefix)...")
    res = requests.get(f'{BASE_URL}/environments/{env_id}/files/workspace/test_crud.txt', headers=HEADERS)
    if res.status_code == 200:
        log("✅ Path normalization works (read /workspace/test_crud.txt via URL)")
    else:
        log(f"❌ Path normalization failed: {res.status_code} - {res.text}")

    # 6. Rename File
    log("Renaming to 'test_crud_renamed.txt'...")
    res = requests.post(f'{BASE_URL}/environments/{env_id}/files/rename', headers=HEADERS, json={
        'old_path': 'test_crud.txt',
        'new_path': 'test_crud_renamed.txt'
    })
    log(f"Rename response: {res.status_code} - {res.text}")

    # 7. Delete File
    log("Deleting renamed file...")
    res = requests.delete(f'{BASE_URL}/environments/{env_id}/files/test_crud_renamed.txt', headers=HEADERS)
    log(f"Delete response: {res.status_code} - {res.text}")

    # 8. Create Directory
    log("Creating directory 'crud_dir'...")
    res = requests.post(f'{BASE_URL}/environments/{env_id}/files/create', headers=HEADERS, json={
        'path': 'crud_dir',
        'type': 'directory'
    })
    log(f"Create Dir response: {res.status_code} - {res.text}")

    # 9. Delete Directory
    log("Deleting directory...")
    res = requests.delete(f'{BASE_URL}/environments/{env_id}/files/crud_dir', headers=HEADERS)
    log(f"Delete Dir response: {res.status_code} - {res.text}")

if __name__ == '__main__':
    try:
        test_api()
    except Exception as e:
        log(f"Exception: {e}")
