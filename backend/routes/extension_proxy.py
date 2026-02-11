from flask import Blueprint, request, jsonify
import requests
import os
import zipfile
import json
import shutil
from pathlib import Path

extension_proxy_bp = Blueprint('extension_proxy', __name__)

OPEN_VSX_SEARCH_API = "https://open-vsx.org/api/-/search"


# Directory for extracted extensions
EXTENSIONS_DIR = Path(__file__).parent.parent / "extensions_data"
if not EXTENSIONS_DIR.exists():
    EXTENSIONS_DIR.mkdir(parents=True, exist_ok=True)

@extension_proxy_bp.route('/search', methods=['GET'])
def search_extensions():
    # ... (existing search logic)
    query = request.args.get('query', '')
    if not query:
        return jsonify({'extensions': []})

    try:
        response = requests.get(OPEN_VSX_SEARCH_API, params={'query': query}, timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': 'Failed to fetch extensions', 'details': str(e)}), 500

@extension_proxy_bp.route('/install', methods=['POST'])
def install_extension():
    """Download and extract a VSIX package to provide real language features."""
    data = request.get_json()
    download_url = data.get('downloadUrl')
    namespace = data.get('namespace')
    name = data.get('name')
    
    if not download_url or not namespace or not name:
        return jsonify({'error': 'Missing extension details'}), 400

    ext_id = f"{namespace}.{name}"
    target_path = EXTENSIONS_DIR / ext_id
    
    try:
        # 1. Download VSIX
        print(f">>> Downloading extension: {ext_id}")
        response = requests.get(download_url, timeout=30)
        response.raise_for_status()
        
        # 2. Extract VSIX (it's a zip file)
        # We save to a temporary file first
        temp_vsix = EXTENSIONS_DIR / f"{ext_id}.vsix"
        with open(temp_vsix, "wb") as f:
            f.write(response.content)
            
        # Clear existing data if any
        if target_path.exists():
            shutil.rmtree(target_path)
            
        with zipfile.ZipFile(temp_vsix, 'r') as zip_ref:
            # Extension files are usually inside a 'extension' folder in the zip
            # We want to flatten this or just extract it
            zip_ref.extractall(target_path)
            
        # Clean up temp file
        os.remove(temp_vsix)
        
        # 3. Parse package.json (usually at target_path / 'extension' / 'package.json')
        pkg_json_path = target_path / 'extension' / 'package.json'
        # Sometimes it might be directly at root? Varies by author, but VSIX standard is 'extension' folder
        if not pkg_json_path.exists():
            pkg_json_path = target_path / 'package.json'
            
        if not pkg_json_path.exists():
            return jsonify({'error': 'Invalid VSIX: package.json not found'}), 400
            
        with open(pkg_json_path, 'r', encoding='utf-8') as f:
            pkg_data = json.load(f)
            
        contributes = pkg_data.get('contributes', {})
        results = {
            'id': ext_id,
            'displayName': pkg_data.get('displayName', name),
            'version': pkg_data.get('version'),
            'snippets': [],
            'grammars': [],
            'languages': contributes.get('languages', [])
        }
        
        # 4. Extract Snippet details
        snippets_list = contributes.get('snippets', [])
        for snip in snippets_list:
            snip_path = target_path / 'extension' / snip.get('path', '').replace('./', '')
            if not snip_path.exists():
                snip_path = target_path / snip.get('path', '').replace('./', '')
                
            if snip_path.exists():
                try:
                    with open(snip_path, 'r', encoding='utf-8') as sf:
                        # Some snippet files have comments or are non-standard JSON, but usually they are JSON
                        snip_content = sf.read()
                        results['snippets'].append({
                            'language': snip.get('language'),
                            'content': snip_content
                        })
                except Exception as ex:
                    print(f"Failed to read snippet {snip_path}: {ex}")

        return jsonify({'success': True, 'data': results})

    except Exception as e:
        print(f"Extension install failed: {str(e)}")
        return jsonify({'error': 'Extension installation failed', 'details': str(e)}), 500
