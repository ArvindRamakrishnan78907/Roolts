
import os
import json
from datetime import datetime
import mimetypes

# Mock workspace path
workspace_path = r"c:\Users\anasa\sih\Roolts\frontend"

def build_tree(path, max_depth=10, current_depth=0):
    """Recursively build file tree"""
    if current_depth > max_depth:
        return None
        
    items = []
    try:
        if not os.path.isdir(path):
            return []
            
        for item in sorted(os.listdir(path)):
            if item.startswith('.') or item == 'node_modules' or item == 'dist' or item == 'build':  # Skip hidden files and large dirs
                continue
                
            item_path = os.path.join(path, item)
            relative_path = os.path.relpath(item_path, workspace_path)
            
            # Normalize path to use forward slashes for output verification
            # relative_path = relative_path.replace('\\', '/')
            
            stat_info = os.stat(item_path)
            is_dir = os.path.isdir(item_path)
            
            node = {
                'name': item,
                'path': relative_path,
                'isDirectory': is_dir,
            }
            
            if is_dir:
                node['children'] = build_tree(item_path, max_depth, current_depth + 1)
            
            items.append(node)
    except PermissionError:
        pass  # Skip directories we can't read
        
    # Remove duplicates by path to ensure unique items
    seen_paths = set()
    unique_items = []
    for item in items:
        if item['path'] not in seen_paths:
            seen_paths.add(item['path'])
            unique_items.append(item)
    
    return unique_items

if __name__ == "__main__":
    print(f"Scanning workspace: {workspace_path}")
    tree = build_tree(workspace_path)
    print(json.dumps(tree, indent=2))
