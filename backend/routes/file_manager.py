"""
Secure File Manager Routes
Handles persistent file operations with user isolation and security
"""

import os
import shutil
import mimetypes
import hashlib
from datetime import datetime
from flask import Blueprint, jsonify, request, send_file, current_app, g
from functools import wraps
import jwt

file_manager_bp = Blueprint('file_manager', __name__)

# File upload limits
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {
    'text': ['.py', '.js', '.java', '.cpp', '.c', '.go', '.html', '.css', '.txt', '.md', '.json', '.xml'],
    'image': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'],
    'archive': ['.zip', '.tar', '.gz']
}

BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.bin', '.dll', '.so']

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Development bypass - disable authentication in development mode
        if current_app.config.get('FLASK_ENV') == 'development' or current_app.config.get('DEV_MODE_BYPASS_AUTH', False):
            # Set default development user
            g.user_id = 'dev_user_123'
            g.username = 'developer'
            return f(*args, **kwargs)
        
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        try:
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            g.user_id = payload.get('user_id')
            g.username = payload.get('username')
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

def get_user_workspace(user_id):
    """Get user's secure workspace directory"""
    base_workspace = os.path.join(os.getcwd(), 'user_workspaces')
    user_workspace = os.path.join(base_workspace, str(user_id))
    os.makedirs(user_workspace, exist_ok=True)
    return user_workspace

def is_path_safe(user_workspace, file_path):
    """Validate that path is within user's workspace"""
    try:
        abs_workspace = os.path.abspath(user_workspace)
        abs_path = os.path.abspath(os.path.join(user_workspace, file_path))
        return abs_path.startswith(abs_workspace)
    except:
        return False

def is_extension_allowed(filename):
    """Check if file extension is allowed"""
    _, ext = os.path.splitext(filename.lower())
    
    if ext in BLOCKED_EXTENSIONS:
        return False
    
    for category, extensions in ALLOWED_EXTENSIONS.items():
        if ext in extensions:
            return True
    
    return False

@file_manager_bp.route('/list', methods=['GET'])
@require_auth
def list_files():
    """List files and directories in user's workspace"""
    try:
        user_id = g.user_id
        path = request.args.get('path', '')
        
        user_workspace = get_user_workspace(user_id)
        
        if path and not is_path_safe(user_workspace, path):
            return jsonify({'error': 'Invalid path'}), 403
        
        target_path = os.path.join(user_workspace, path) if path else user_workspace
        
        if not os.path.exists(target_path):
            return jsonify({'error': 'Path not found'}), 404
        
        items = []
        for item in os.listdir(target_path):
            item_path = os.path.join(target_path, item)
            stat = os.stat(item_path)
            
            items.append({
                'name': item,
                'type': 'directory' if os.path.isdir(item_path) else 'file',
                'size': stat.st_size if os.path.isfile(item_path) else 0,
                'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'path': os.path.join(path, item).replace('\\', '/') if path else item
            })
        
        return jsonify({
            'items': sorted(items, key=lambda x: (x['type'] != 'directory', x['name'].lower())),
            'currentPath': path.replace('\\', '/') if path else '',
            'workspace': user_workspace
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@file_manager_bp.route('/create-folder', methods=['POST'])
@require_auth
def create_folder():
    """Create a new folder"""
    try:
        user_id = g.user_id
        data = request.get_json()
        
        folder_path = data.get('path', '')
        folder_name = data.get('name', '')
        
        if not folder_name or '..' in folder_name or '/' in folder_name or '\\' in folder_name:
            return jsonify({'error': 'Invalid folder name'}), 400
        
        user_workspace = get_user_workspace(user_id)
        
        if folder_path and not is_path_safe(user_workspace, folder_path):
            return jsonify({'error': 'Invalid path'}), 403
        
        full_path = os.path.join(user_workspace, folder_path, folder_name)
        
        if os.path.exists(full_path):
            return jsonify({'error': 'Folder already exists'}), 400
        
        os.makedirs(full_path, exist_ok=True)
        
        return jsonify({'message': 'Folder created successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@file_manager_bp.route('/upload', methods=['POST'])
@require_auth
def upload_file():
    """Upload a file to user's workspace"""
    try:
        user_id = g.user_id
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        path = request.form.get('path', '')
        
        if not file.filename:
            return jsonify({'error': 'No file selected'}), 400
        
        if not is_extension_allowed(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        size = file.tell()
        file.seek(0)  # Reset
        
        if size > MAX_FILE_SIZE:
            return jsonify({'error': f'File too large (max {MAX_FILE_SIZE // 1024 // 1024}MB)'}), 400
        
        user_workspace = get_user_workspace(user_id)
        
        if path and not is_path_safe(user_workspace, path):
            return jsonify({'error': 'Invalid path'}), 403
        
        target_dir = os.path.join(user_workspace, path) if path else user_workspace
        os.makedirs(target_dir, exist_ok=True)
        
        file_path = os.path.join(target_dir, file.filename)
        
        # Check if file already exists
        if os.path.exists(file_path):
            return jsonify({'error': 'File already exists'}), 400
        
        file.save(file_path)
        
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': file.filename,
            'size': size
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@file_manager_bp.route('/download', methods=['GET'])
@require_auth
def download_file():
    """Download a file from user's workspace"""
    try:
        user_id = g.user_id
        file_path = request.args.get('path', '')
        
        if not file_path:
            return jsonify({'error': 'File path required'}), 400
        
        user_workspace = get_user_workspace(user_id)
        
        if not is_path_safe(user_workspace, file_path):
            return jsonify({'error': 'Invalid path'}), 403
        
        full_path = os.path.join(user_workspace, file_path)
        
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            return jsonify({'error': 'File not found'}), 404
        
        return send_file(full_path, as_attachment=True, download_name=os.path.basename(file_path))
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@file_manager_bp.route('/read', methods=['GET'])
@require_auth
def read_file():
    """Read file content (text files only)"""
    try:
        user_id = g.user_id
        file_path = request.args.get('path', '')
        
        if not file_path:
            return jsonify({'error': 'File path required'}), 400
        
        user_workspace = get_user_workspace(user_id)
        
        if not is_path_safe(user_workspace, file_path):
            return jsonify({'error': 'Invalid path'}), 403
        
        full_path = os.path.join(user_workspace, file_path)
        
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Check if it's a text file
        mime_type, _ = mimetypes.guess_type(full_path)
        if mime_type and not mime_type.startswith('text/'):
            return jsonify({'error': 'Not a text file'}), 400
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            return jsonify({'error': 'File is not text or uses unsupported encoding'}), 400
        
        return jsonify({
            'content': content,
            'filename': os.path.basename(file_path),
            'path': file_path
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@file_manager_bp.route('/write', methods=['POST'])
@require_auth
def write_file():
    """Write content to a file"""
    try:
        user_id = g.user_id
        data = request.get_json()
        
        file_path = data.get('path', '')
        content = data.get('content', '')
        
        if not file_path:
            return jsonify({'error': 'File path required'}), 400
        
        if not is_extension_allowed(os.path.basename(file_path)):
            return jsonify({'error': 'File type not allowed'}), 400
        
        user_workspace = get_user_workspace(user_id)
        
        if not is_path_safe(user_workspace, file_path):
            return jsonify({'error': 'Invalid path'}), 403
        
        full_path = os.path.join(user_workspace, file_path)
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Check content size
        if len(content.encode('utf-8')) > MAX_FILE_SIZE:
            return jsonify({'error': f'Content too large (max {MAX_FILE_SIZE // 1024 // 1024}MB)'}), 400
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return jsonify({'message': 'File saved successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@file_manager_bp.route('/delete', methods=['DELETE'])
@require_auth
def delete_item():
    """Delete a file or directory"""
    try:
        user_id = g.user_id
        item_path = request.args.get('path', '')
        
        if not item_path:
            return jsonify({'error': 'Item path required'}), 400
        
        user_workspace = get_user_workspace(user_id)
        
        if not is_path_safe(user_workspace, item_path):
            return jsonify({'error': 'Invalid path'}), 403
        
        full_path = os.path.join(user_workspace, item_path)
        
        if not os.path.exists(full_path):
            return jsonify({'error': 'Item not found'}), 404
        
        if os.path.isfile(full_path):
            os.remove(full_path)
        elif os.path.isdir(full_path):
            shutil.rmtree(full_path)
        
        return jsonify({'message': 'Item deleted successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@file_manager_bp.route('/rename', methods=['POST'])
@require_auth
def rename_item():
    """Rename a file or directory"""
    try:
        user_id = g.user_id
        data = request.get_json()
        
        old_path = data.get('oldPath', '')
        new_name = data.get('newName', '')
        
        if not old_path or not new_name:
            return jsonify({'error': 'Old path and new name required'}), 400
        
        if '..' in new_name or '/' in new_name or '\\' in new_name:
            return jsonify({'error': 'Invalid name'}), 400
        
        user_workspace = get_user_workspace(user_id)
        
        if not is_path_safe(user_workspace, old_path):
            return jsonify({'error': 'Invalid path'}), 403
        
        old_full_path = os.path.join(user_workspace, old_path)
        new_full_path = os.path.join(os.path.dirname(old_full_path), new_name)
        
        if not os.path.exists(old_full_path):
            return jsonify({'error': 'Item not found'}), 404
        
        if os.path.exists(new_full_path):
            return jsonify({'error': 'Name already exists'}), 400
        
        os.rename(old_full_path, new_full_path)
        
        return jsonify({'message': 'Item renamed successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@file_manager_bp.route('/workspace-stats', methods=['GET'])
@require_auth
def get_workspace_stats():
    """Get workspace statistics"""
    try:
        user_id = g.user_id
        user_workspace = get_user_workspace(user_id)
        
        total_size = 0
        file_count = 0
        dir_count = 0
        
        for root, dirs, files in os.walk(user_workspace):
            dir_count += len(dirs)
            for file in files:
                file_count += 1
                file_path = os.path.join(root, file)
                try:
                    total_size += os.path.getsize(file_path)
                except:
                    pass
        
        return jsonify({
            'totalSize': total_size,
            'fileCount': file_count,
            'directoryCount': dir_count,
            'quotaUsed': (total_size / MAX_FILE_SIZE) * 100,  # Percentage of single file limit
            'workspace': user_workspace
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@file_manager_bp.route('/health', methods=['GET'])
def file_manager_health():
    """File manager service health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'secure-file-manager',
        'version': '2.0.0',
        'maxFileSize': MAX_FILE_SIZE,
        'allowedExtensions': ALLOWED_EXTENSIONS
    })