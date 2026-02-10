"""
WebSocket handlers for real-time file synchronization
"""

# Try to import flask-socketio, fallback if not available
try:
    from flask_socketio import emit, join_room, leave_room, disconnect
    from flask import request as flask_request
    SOCKETIO_AVAILABLE = True
except ImportError:
    print("Warning: flask-socketio not installed. WebSocket features disabled.")
    SOCKETIO_AVAILABLE = False
    
    # Dummy functions for fallback
    def emit(*args, **kwargs):
        pass
    def join_room(*args, **kwargs):
        pass
    def leave_room(*args, **kwargs):
        pass
    def disconnect(*args, **kwargs):
        pass
    
    # Create a dummy request object
    class DummyRequest:
        sid = 'dummy_session'
    
    flask_request = DummyRequest()

from routes.file_sync import start_file_watcher, stop_file_watcher, active_connections
import jwt
import os


def register_file_sync_events(socketio):
    """Register all file synchronization WebSocket events"""
    
    if not SOCKETIO_AVAILABLE:
        print("Warning: Flask-SocketIO not available. WebSocket events not registered.")
        return socketio
    
    @socketio.on('join_file_sync')
    def handle_join_file_sync(data):
        """Client wants to join file synchronization"""
        try:
            # Get user ID from token or development mode
            token = data.get('token')
            
            if os.getenv('DEV_MODE_BYPASS_AUTH', 'false').lower() == 'true':
                # Development mode - bypass authentication
                user_id = 'dev_user_123'
            elif token:
                try:
                    payload = jwt.decode(token, os.getenv('SECRET_KEY', 'dev-secret-key'), algorithms=['HS256'])
                    user_id = payload.get('user_id')
                except jwt.InvalidTokenError:
                    emit('file_sync_error', {'error': 'Invalid authentication token'})
                    return
            else:
                emit('file_sync_error', {'error': 'No authentication provided'})
                return
            
            if not user_id:
                emit('file_sync_error', {'error': 'Invalid user'})
                return
            
            # Join user's private room
            room_name = f"user_{user_id}"
            join_room(room_name)
            
            # Track active connection
            session_id = getattr(flask_request, 'sid', 'unknown_session')
            active_connections[session_id] = {
                'user_id': user_id,
                'room': room_name,
                'joined_at': None
            }
            
            # Start file watcher for this user
            start_file_watcher(user_id, socketio)
            
            emit('file_sync_joined', {
                'status': 'connected',
                'userId': user_id,
                'room': room_name
            })
            
            print(f"User {user_id} joined file sync (session: {session_id})")
            
        except Exception as e:
            print(f"Error in join_file_sync: {e}")
            emit('file_sync_error', {'error': 'Failed to join file sync'})
    
    @socketio.on('leave_file_sync')
    def handle_leave_file_sync():
        """Client wants to leave file synchronization"""
        try:
            session_id = getattr(flask_request, 'sid', 'unknown_session')
            
            if session_id in active_connections:
                connection_info = active_connections[session_id]
                user_id = connection_info['user_id']
                room_name = connection_info['room']
                
                leave_room(room_name)
                del active_connections[session_id]
                
                # Check if this was the last connection for this user
                user_has_other_connections = any(
                    conn['user_id'] == user_id 
                    for conn in active_connections.values()
                )
                
                if not user_has_other_connections:
                    stop_file_watcher(user_id)
                
                emit('file_sync_left', {'status': 'disconnected'})
                print(f"User {user_id} left file sync (session: {session_id})")
            
        except Exception as e:
            print(f"Error in leave_file_sync: {e}")
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnect"""
        try:
            session_id = getattr(flask_request, 'sid', 'unknown_session')
            
            if session_id in active_connections:
                connection_info = active_connections[session_id]
                user_id = connection_info['user_id']
                
                del active_connections[session_id]
                
                # Check if this was the last connection for this user
                user_has_other_connections = any(
                    conn['user_id'] == user_id 
                    for conn in active_connections.values()
                )
                
                if not user_has_other_connections:
                    stop_file_watcher(user_id)
                
                print(f"User {user_id} disconnected from file sync (session: {session_id})")
            
        except Exception as e:
            print(f"Error in disconnect handler: {e}")
    
    @socketio.on('request_file_tree')
    def handle_request_file_tree():
        """Client requests current file tree"""
        try:
            session_id = getattr(flask_request, 'sid', 'unknown_session')
            
            if session_id not in active_connections:
                emit('file_sync_error', {'error': 'Not connected to file sync'})
                return
            
            user_id = active_connections[session_id]['user_id']
            
            # Import here to avoid circular imports
            from routes.file_sync import get_user_workspace
            from utils.workspace_manager import ensure_user_workspace
            import os
            import mimetypes
            from datetime import datetime
            
            workspace_path = get_user_workspace(user_id)
            if not os.path.exists(workspace_path):
                ensure_user_workspace(user_id)
            
            def build_tree(path, max_depth=10, current_depth=0):
                if current_depth > max_depth:
                    return None
                    
                items = []
                try:
                    for item in sorted(os.listdir(path)):
                        if item.startswith('.'):
                            continue
                            
                        item_path = os.path.join(path, item)
                        relative_path = os.path.relpath(item_path, workspace_path)
                        
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
                    pass
                    
                return items
            
            tree = build_tree(workspace_path)
            
            emit('file_tree_update', {
                'tree': tree,
                'workspacePath': workspace_path,
                'timestamp': datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"Error in request_file_tree: {e}")
            emit('file_sync_error', {'error': 'Failed to get file tree'})
    
    @socketio.on('file_content_changed')
    def handle_file_content_changed(data):
        """Handle real-time file content changes from client"""
        try:
            session_id = getattr(flask_request, 'sid', 'unknown_session')
            
            if session_id not in active_connections:
                emit('file_sync_error', {'error': 'Not connected to file sync'})
                return
            
            user_id = active_connections[session_id]['user_id']
            room_name = f"user_{user_id}"
            
            # Broadcast to other clients in the same room (collaborative editing)
            socketio.emit('file_content_update', {
                'path': data.get('path'),
                'content': data.get('content'),
                'cursor': data.get('cursor'),
                'selection': data.get('selection'),
                'timestamp': data.get('timestamp'),
                'fromSession': session_id
            }, room=room_name, skip_sid=session_id)  # Skip sender
            
        except Exception as e:
            print(f"Error in file_content_changed: {e}")
    
    @socketio.on('cursor_position_changed')
    def handle_cursor_position_changed(data):
        """Handle cursor position changes for collaborative editing"""
        try:
            session_id = getattr(flask_request, 'sid', 'unknown_session')
            
            if session_id not in active_connections:
                return
            
            user_id = active_connections[session_id]['user_id']
            room_name = f"user_{user_id}"
            
            socketio.emit('cursor_update', {
                'path': data.get('path'),
                'cursor': data.get('cursor'),
                'selection': data.get('selection'),
                'userId': user_id,
                'sessionId': session_id,
                'timestamp': data.get('timestamp')
            }, room=room_name, skip_sid=session_id)
            
        except Exception as e:
            print(f"Error in cursor_position_changed: {e}")
    
    return socketio