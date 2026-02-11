"""
Real-time File Synchronization System
VS Code-like file management with real-time sync
"""

import os
import json
import time
import threading
from pathlib import Path
from datetime import datetime
from flask import Blueprint, jsonify, request, g
from werkzeug.utils import secure_filename
import mimetypes

# Define dummy classes first to ensure they're always available
class DummyFileSystemEventHandler:
    """Dummy FileSystemEventHandler when watchdog is not available"""
    def __init__(self):
        pass
    
    def on_any_event(self, event):
        pass
        
    def on_moved(self, event):
        pass
        
    def on_created(self, event):
        pass
        
    def on_deleted(self, event):
        pass
        
    def on_modified(self, event):
        pass

class DummyObserver:
    """Dummy Observer when watchdog is not available"""
    def __init__(self):
        pass
        
    def schedule(self, *args, **kwargs):
        pass
        
    def start(self):
        pass
        
    def stop(self):
        pass
        
    def join(self):
        pass

# Try to import watchdog, fallback to dummy classes if not available
try:
    from watchdog.observers import Observer  # type: ignore
    from watchdog.events import FileSystemEventHandler as WatchdogFileSystemEventHandler  # type: ignore
    WATCHDOG_AVAILABLE = True
    # Use the real watchdog class
    BaseFileSystemEventHandler = WatchdogFileSystemEventHandler
    BaseObserver = Observer
except ImportError:
    print("Warning: watchdog not installed. File watching disabled.")
    WATCHDOG_AVAILABLE = False
    # Use our dummy classes
    BaseFileSystemEventHandler = DummyFileSystemEventHandler
    BaseObserver = DummyObserver
            
# Try to import flask-socketio, fallback if not available
try:
    from flask_socketio import emit, join_room, leave_room  # type: ignore
    SOCKETIO_AVAILABLE = True
except ImportError:
    print("Warning: flask-socketio not installed. Real-time sync disabled.")
    SOCKETIO_AVAILABLE = False
    
    # Dummy functions for fallback
    def emit(*args, **kwargs):
        pass
    def join_room(*args, **kwargs):
        pass
    def leave_room(*args, **kwargs):
        pass

# Remove auth import since we're not using it
# from routes.auth import require_auth
from utils.workspace_manager import get_user_workspace, ensure_user_workspace

file_sync_bp = Blueprint('file_sync', __name__)

# Global file watchers for each user
user_watchers = {}
active_connections = {}


class FileChangeHandler(BaseFileSystemEventHandler):  # type: ignore
    """Handle file system changes and emit to connected clients"""
    
    def __init__(self, user_id, socketio_instance):
        super().__init__()
        self.user_id = user_id
        self.socketio = socketio_instance
        self.last_events = {}  # Debounce rapid events
        
    def on_modified(self, event):
        if not event.is_directory:
            self._emit_file_change('modified', event.src_path)
    
    def on_created(self, event):
        if not event.is_directory:
            self._emit_file_change('created', event.src_path)
        else:
            self._emit_directory_change('created', event.src_path)
    
    def on_deleted(self, event):
        if not event.is_directory:
            self._emit_file_change('deleted', event.src_path)
        else:
            self._emit_directory_change('deleted', event.src_path)
    
    def on_moved(self, event):
        if not event.is_directory:
            self._emit_file_move(event.src_path, event.dest_path)
        else:
            self._emit_directory_move(event.src_path, event.dest_path)
    
    def _emit_file_change(self, action, file_path):
        """Emit file change to user's room with debouncing"""
        current_time = time.time()
        key = f"{action}:{file_path}"
        
        # Debounce rapid events (within 100ms)
        if key in self.last_events and current_time - self.last_events[key] < 0.1:
            return
        
        self.last_events[key] = current_time
        
        try:
            file_info = self._get_file_info(file_path) if action != 'deleted' else None
            if SOCKETIO_AVAILABLE and self.socketio:
                self.socketio.emit('file_change', {
                    'action': action,
                    'path': file_path.replace(os.sep, '/'),
                    'fileInfo': file_info,
                    'timestamp': datetime.now().isoformat()
                }, room=f"user_{self.user_id}")
        except Exception as e:
            print(f"Error emitting file change: {e}")
    
    def _emit_directory_change(self, action, dir_path):
        """Emit directory change to user's room"""
        try:
            if SOCKETIO_AVAILABLE and self.socketio:
                self.socketio.emit('directory_change', {
                    'action': action,
                    'path': dir_path.replace(os.sep, '/'),
                    'timestamp': datetime.now().isoformat()
                }, room=f"user_{self.user_id}")
        except Exception as e:
            print(f"Error emitting directory change: {e}")
    
    def _emit_file_move(self, src_path, dest_path):
        """Emit file move event"""
        try:
            file_info = self._get_file_info(dest_path)
            if SOCKETIO_AVAILABLE and self.socketio:
                self.socketio.emit('file_moved', {
                    'oldPath': src_path,
                    'newPath': dest_path,
                    'fileInfo': file_info,
                    'timestamp': datetime.now().isoformat()
                }, room=f"user_{self.user_id}")
        except Exception as e:
            print(f"Error emitting file move: {e}")
    
    def _emit_directory_move(self, src_path, dest_path):
        """Emit directory move event"""
        try:
            if SOCKETIO_AVAILABLE and self.socketio:
                self.socketio.emit('directory_moved', {
                    'oldPath': src_path,
                    'newPath': dest_path,
                    'timestamp': datetime.now().isoformat()
                }, room=f"user_{self.user_id}")
        except Exception as e:
            print(f"Error emitting directory move: {e}")
    
    def _get_file_info(self, file_path):
        """Get comprehensive file information"""
        try:
            if not os.path.exists(file_path):
                return None
                
            stat_info = os.stat(file_path)
            file_size = stat_info.st_size
            modified_time = datetime.fromtimestamp(stat_info.st_mtime)
            
            # Get file content for text files (limit size)
            content = None
            mime_type = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
            
            if file_size < 1024 * 1024 and mime_type.startswith('text/'):  # 1MB limit for text files
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                except (UnicodeDecodeError, PermissionError):
                    content = None
            
            return {
                'name': os.path.basename(file_path),
                'path': file_path,
                'size': file_size,
                'modified': modified_time.isoformat(),
                'mimeType': mime_type,
                'content': content,
                'extension': os.path.splitext(file_path)[1],
                'isDirectory': os.path.isdir(file_path)
            }
        except Exception as e:
            print(f"Error getting file info: {e}")
            return None


def start_file_watcher(user_id, socketio_instance):
    """Start file watcher for user's workspace"""
    if not WATCHDOG_AVAILABLE:
        print(f"File watching disabled for user {user_id} (watchdog not available)")
        return
        
    if user_id in user_watchers:
        return  # Already watching
    
    workspace_path = get_user_workspace(user_id)
    if not os.path.exists(workspace_path):
        ensure_user_workspace(user_id)
    
    event_handler = FileChangeHandler(user_id, socketio_instance)
    observer = BaseObserver()
    observer.schedule(event_handler, workspace_path, recursive=True)
    observer.start()
    
    user_watchers[user_id] = observer
    print(f"Started file watcher for user {user_id} at {workspace_path}")


def stop_file_watcher(user_id):
    """Stop file watcher for user"""
    if not WATCHDOG_AVAILABLE:
        return
        
    if user_id in user_watchers:
        user_watchers[user_id].stop()
        user_watchers[user_id].join()
        del user_watchers[user_id]
        print(f"Stopped file watcher for user {user_id}")


@file_sync_bp.route('/tree', methods=['GET'])
def get_file_tree():
    """Get complete file tree for user's workspace"""
    try:
        user_id = g.get('user_id') or 'dev_user_123'  # Fallback for dev mode
        workspace_path = get_user_workspace(user_id)
        
        if not os.path.exists(workspace_path):
            ensure_user_workspace(user_id)
            
        # Define excluded directories
        EXCLUDED_DIRS = {
            'node_modules', 'venv', '.git', '.idea', '.vscode', 
            '__pycache__', 'dist', 'build', '.next', 'coverage'
        }
            
        def build_tree(path, max_depth=10, current_depth=0):
            """Recursively build file tree"""
            if current_depth > max_depth:
                return None
                
            items = []
            try:
                for item in sorted(os.listdir(path)):
                    if item.startswith('.'):  # Skip hidden files
                        continue
                        
                    if item in EXCLUDED_DIRS:  # Skip excluded directories
                        continue
                        
                    item_path = os.path.join(path, item)
                    # Normalize path to use forward slashes locally for consistency
                    relative_path = os.path.relpath(item_path, workspace_path).replace('\\', '/')
                    
                    stat_info = os.stat(item_path)
                    is_dir = os.path.isdir(item_path)
                    
                    node = {
                        'name': item,
                        'path': relative_path,
                        'absolutePath': item_path,
                        'isDirectory': is_dir,
                        'size': stat_info.st_size if not is_dir else None,
                        'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                        'extension': os.path.splitext(item)[1] if not is_dir else None,
                        'mimeType': mimetypes.guess_type(item_path)[0] if not is_dir else None
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
        
        tree = build_tree(workspace_path)
        
        return jsonify({
            'success': True,
            'tree': tree,
            'workspacePath': workspace_path,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error getting file tree: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@file_sync_bp.route('/read', methods=['GET'])
def read_file():
    """Read file content"""
    try:
        user_id = g.get('user_id') or 'dev_user_123'  # Fallback for dev mode
        file_path = request.args.get('path')
        
        if not file_path:
            return jsonify({'success': False, 'error': 'No file path provided'}), 400
        
        workspace_path = get_user_workspace(user_id)
        absolute_path = os.path.join(workspace_path, file_path.lstrip('/\\'))
        
        # Security check
        if not absolute_path.startswith(workspace_path):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        if not os.path.exists(absolute_path):
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        if os.path.isdir(absolute_path):
            return jsonify({'success': False, 'error': 'Cannot read directory'}), 400
        
        # Check file size (limit to 10MB)
        file_size = os.path.getsize(absolute_path)
        if file_size > 10 * 1024 * 1024:
            return jsonify({'success': False, 'error': 'File too large to read'}), 413
        
        # Try to read as text
        try:
            with open(absolute_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
            encoding = 'utf-8'
            content_output = text_content
        except UnicodeDecodeError:
            # Try binary read for non-text files
            with open(absolute_path, 'rb') as f:
                binary_content = f.read()
            encoding = 'binary'
            content_output = binary_content.hex()
        
        stat_info = os.stat(absolute_path)
        
        return jsonify({
            'success': True,
            'content': content_output,
            'encoding': encoding,
            'size': file_size,
            'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            'mimeType': mimetypes.guess_type(absolute_path)[0],
            'path': file_path
        })
        
    except Exception as e:
        print(f"Error reading file: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@file_sync_bp.route('/write', methods=['POST'])
def write_file():
    """Write or create file"""
    try:
        user_id = g.get('user_id') or 'dev_user_123'  # Fallback for dev mode
        data = request.get_json()
        
        file_path = data.get('path')
        content = data.get('content', '')
        encoding = data.get('encoding', 'utf-8')
        create_dirs = data.get('createDirectories', True)
        
        if not file_path:
            return jsonify({'success': False, 'error': 'No file path provided'}), 400
        
        workspace_path = get_user_workspace(user_id)
        absolute_path = os.path.join(workspace_path, file_path.lstrip('/\\'))
        
        # Security check
        if not absolute_path.startswith(workspace_path):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Create directories if needed
        if create_dirs:
            os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
        
        # Write file
        if encoding == 'binary':
            with open(absolute_path, 'wb') as f:
                f.write(bytes.fromhex(content))
        else:
            with open(absolute_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        stat_info = os.stat(absolute_path)
        
        # Emit real-time update (only if socketio is available)
        if SOCKETIO_AVAILABLE:
            try:
                # Import socketio from current app context to avoid circular import
                from flask import current_app
                socketio_instance = getattr(current_app, 'socketio', None)
                if socketio_instance:
                    socketio_instance.emit('file_updated', {
                        'path': file_path,
                        'content': content if encoding == 'utf-8' else '[Binary Content]',
                        'size': stat_info.st_size,
                        'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                        'timestamp': datetime.now().isoformat()
                    }, room=f"user_{user_id}")
            except Exception as e:
                print(f"Warning: Could not emit real-time update: {e}")
        
        return jsonify({
            'success': True,
            'path': file_path,
            'size': stat_info.st_size,
            'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
        })
        
    except Exception as e:
        print(f"Error writing file: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@file_sync_bp.route('/create', methods=['POST'])
def create_item():
    """Create file or directory"""
    try:
        user_id = g.get('user_id') or 'dev_user_123'  # Fallback for dev mode
        data = request.get_json()
        
        path = data.get('path')
        item_type = data.get('type', 'file')  # 'file' or 'directory'
        content = data.get('content', '')
        
        if not path:
            return jsonify({'success': False, 'error': 'No path provided'}), 400
        
        workspace_path = get_user_workspace(user_id)
        absolute_path = os.path.join(workspace_path, path.lstrip('/\\'))
        
        # Security check
        if not absolute_path.startswith(workspace_path):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        if os.path.exists(absolute_path):
            return jsonify({'success': False, 'error': 'Item already exists'}), 409
        
        # Create parent directories
        os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
        
        if item_type == 'directory':
            os.makedirs(absolute_path)
            if SOCKETIO_AVAILABLE:
                try:
                    from flask import current_app
                    if hasattr(current_app, 'socketio'):
                        socketio_instance = getattr(current_app, 'socketio', None)
                        if socketio_instance:
                            socketio_instance.emit('directory_created', {
                            'path': path,
                            'timestamp': datetime.now().isoformat()
                        }, room=f"user_{user_id}")
                except Exception as e:
                    print(f"Warning: Could not emit directory creation: {e}")
        else:
            with open(absolute_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            stat_info = os.stat(absolute_path)
            if SOCKETIO_AVAILABLE:
                try:
                    from flask import current_app
                    if hasattr(current_app, 'socketio'):
                        socketio_instance = getattr(current_app, 'socketio', None)
                        if socketio_instance:
                            socketio_instance.emit('file_created', {
                            'path': path,
                            'content': content,
                            'size': stat_info.st_size,
                            'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                            'timestamp': datetime.now().isoformat()
                        }, room=f"user_{user_id}")
                except Exception as e:
                    print(f"Warning: Could not emit file creation: {e}")
        
        return jsonify({
            'success': True,
            'path': path,
            'type': item_type
        })
        
    except Exception as e:
        print(f"Error creating item: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@file_sync_bp.route('/delete', methods=['DELETE'])
def delete_item():
    """Delete file or directory"""
    try:
        user_id = g.get('user_id') or 'dev_user_123'  # Fallback for dev mode
        path = request.args.get('path')
        
        if not path:
            return jsonify({'success': False, 'error': 'No path provided'}), 400
        
        workspace_path = get_user_workspace(user_id)
        absolute_path = os.path.join(workspace_path, path.lstrip('/\\'))
        
        # Security check
        if not absolute_path.startswith(workspace_path):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        if not os.path.exists(absolute_path):
            return jsonify({'success': False, 'error': 'Item not found'}), 404
        
        is_dir = os.path.isdir(absolute_path)
        
        if is_dir:
            import shutil
            shutil.rmtree(absolute_path)
            if SOCKETIO_AVAILABLE:
                try:
                    from flask import current_app
                    if hasattr(current_app, 'socketio'):
                        socketio_instance = getattr(current_app, 'socketio', None)
                        if socketio_instance:
                            socketio_instance.emit('directory_deleted', {
                            'path': path,
                            'timestamp': datetime.now().isoformat()
                        }, room=f"user_{user_id}")
                except Exception as e:
                    print(f"Warning: Could not emit directory deletion: {e}")
        else:
            os.remove(absolute_path)
            if SOCKETIO_AVAILABLE:
                try:
                    from flask import current_app
                    if hasattr(current_app, 'socketio'):
                        socketio_instance = getattr(current_app, 'socketio', None)
                        if socketio_instance:
                            socketio_instance.emit('file_deleted', {
                            'path': path,
                            'timestamp': datetime.now().isoformat()
                        }, room=f"user_{user_id}")
                except Exception as e:
                    print(f"Warning: Could not emit file deletion: {e}")
        
        return jsonify({
            'success': True,
            'path': path,
            'type': 'directory' if is_dir else 'file'
        })
        
    except Exception as e:
        print(f"Error deleting item: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@file_sync_bp.route('/rename', methods=['PUT'])
def rename_item():
    """Rename file or directory"""
    try:
        user_id = g.get('user_id') or 'dev_user_123'  # Fallback for dev mode
        data = request.get_json()
        
        old_path = data.get('oldPath')
        new_path = data.get('newPath')
        
        if not old_path or not new_path:
            return jsonify({'success': False, 'error': 'Missing path information'}), 400
        
        workspace_path = get_user_workspace(user_id)
        old_absolute_path = os.path.join(workspace_path, old_path.lstrip('/\\'))
        new_absolute_path = os.path.join(workspace_path, new_path.lstrip('/\\'))
        
        # Security checks
        if not old_absolute_path.startswith(workspace_path) or not new_absolute_path.startswith(workspace_path):
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        if not os.path.exists(old_absolute_path):
            return jsonify({'success': False, 'error': 'Source item not found'}), 404
        
        if os.path.exists(new_absolute_path):
            return jsonify({'success': False, 'error': 'Destination already exists'}), 409
        
        # Create parent directories for new path
        os.makedirs(os.path.dirname(new_absolute_path), exist_ok=True)
        
        is_dir = os.path.isdir(old_absolute_path)
        os.rename(old_absolute_path, new_absolute_path)
        
        # Emit real-time update
        if SOCKETIO_AVAILABLE:
            try:
                from flask import current_app
                if hasattr(current_app, 'socketio'):
                    if is_dir:
                        socketio_instance = getattr(current_app, 'socketio', None)
                        if socketio_instance:
                            socketio_instance.emit('directory_renamed', {
                            'oldPath': old_path,
                            'newPath': new_path,
                            'timestamp': datetime.now().isoformat()
                        }, room=f"user_{user_id}")
                    else:
                        socketio_instance = getattr(current_app, 'socketio', None)
                        if socketio_instance:
                            socketio_instance.emit('file_renamed', {
                            'oldPath': old_path,
                            'newPath': new_path,
                            'timestamp': datetime.now().isoformat()
                        }, room=f"user_{user_id}")
            except Exception as e:
                print(f"Warning: Could not emit rename event: {e}")
        
        return jsonify({
            'success': True,
            'oldPath': old_path,
            'newPath': new_path,
            'type': 'directory' if is_dir else 'file'
        })
        
    except Exception as e:
        print(f"Error renaming item: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@file_sync_bp.route('/search', methods=['GET'])
def search_files():
    """Search files by name or content"""
    try:
        user_id = g.get('user_id') or 'dev_user_123'  # Fallback for dev mode
        query = request.args.get('query', '').strip()
        search_content = request.args.get('content', 'false').lower() == 'true'
        max_results = int(request.args.get('limit', '50'))
        
        if not query:
            return jsonify({'success': False, 'error': 'No search query provided'}), 400
        
        workspace_path = get_user_workspace(user_id)
        results = []
        
        def search_recursive(path, depth=0):
            if depth > 10:  # Prevent infinite recursion
                return
                
            try:
                for item in os.listdir(path):
                    if item.startswith('.'):
                        continue
                        
                    
                    item_path = os.path.join(path, item)
                    # Normalize path to use forward slashes locally for consistency
                    relative_path = os.path.relpath(item_path, workspace_path).replace('\\', '/')
                    
                    # Search by filename
                    if query.lower() in item.lower():
                        stat_info = os.stat(item_path)
                        results.append({
                            'path': relative_path,
                            'name': item,
                            'isDirectory': os.path.isdir(item_path),
                            'size': stat_info.st_size,
                            'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                            'matchType': 'filename'
                        })
                    
                    # Search content in text files
                    if search_content and os.path.isfile(item_path):
                        try:
                            file_size = os.path.getsize(item_path)
                            if file_size < 1024 * 1024:  # Only search files < 1MB
                                with open(item_path, 'r', encoding='utf-8') as f:
                                    content = f.read()
                                    if query.lower() in content.lower():
                                        stat_info = os.stat(item_path)
                                        results.append({
                                            'path': relative_path,
                                            'name': item,
                                            'isDirectory': False,
                                            'size': stat_info.st_size,
                                            'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                                            'matchType': 'content'
                                        })
                        except (UnicodeDecodeError, PermissionError):
                            pass
                    
                    # Recurse into directories
                    if os.path.isdir(item_path) and len(results) < max_results:
                        search_recursive(item_path, depth + 1)
                        
            except PermissionError:
                pass
        
        search_recursive(workspace_path)
        
        # Remove duplicates and limit results  
        seen = set()
        unique_results = []
        for result in results:
            if result['path'] not in seen and len(unique_results) < max_results:
                seen.add(result['path'])
                unique_results.append(result)
        
        return jsonify({
            'success': True,
            'results': unique_results,
            'query': query,
            'totalFound': len(unique_results)
        })
        
    except Exception as e:
        print(f"Error searching files: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500