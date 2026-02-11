
import requests
import json

try:
    response = requests.get('http://localhost:5000/api/file-sync/tree')
    data = response.json()
    
    if data.get('success'):
        tree = data.get('tree', [])
        print(f"Total items at root: {len(tree)}")
        
        # Check for backslashes
        has_backslashes = False
        for item in tree:
            if '\\' in item['path']:
                has_backslashes = True
                print(f"Found backslash in: {item['path']}")
                break
        
        # Check for node_modules
        has_node_modules = False
        for item in tree:
            if 'node_modules' in item['path']:
                has_node_modules = True
                print(f"Found node_modules in: {item['path']}")
                break
                
        if not has_backslashes and not has_node_modules:
            print("SUCCESS: No backslashes found and node_modules excluded.")
        else:
            print(f"FAILURE: Backslashes: {has_backslashes}, node_modules: {has_node_modules}")
            
        # Print first few paths to verify format
        print("Sample paths:")
        for item in tree[:5]:
            print(f"- {item['path']}")
            
    else:
        print(f"Failed to get tree: {data.get('error')}")
except Exception as e:
    print(f"Error connecting to backend: {e}")
