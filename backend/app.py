"""
Roolts Backend - Flask Application
AI-Powered Portfolio with Multi-AI Integration
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file in the same directory as app.py
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# PATCH: Apply nest_asyncio to allow nested event loops (Fixes 500 errors with SocketIO + Async)
import nest_asyncio
nest_asyncio.apply()

# Import database models
from models import db, init_db

# Import compiler setup
from utils.compiler_manager import setup_compiler

# Import routes
from routes.files import files_bp
from routes.ai import ai_bp
from routes.auth import auth_bp
from routes.ai_hub import ai_hub_bp
from routes.terminal import terminal_bp
from routes.snippets import snippets_bp
from routes.portfolio import portfolio_bp
from routes.deployment import deployment_bp
from routes.executor import executor_bp
from routes.virtual_env import virtual_env_bp
from routes.extension_proxy import extension_proxy_bp


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Setup portable compilers and runtimes if needed
    try:
        from utils.compiler_manager import setup_all_runtimes
        runtime_paths = setup_all_runtimes()
        if runtime_paths:
            print(f"Added {len(runtime_paths)} portable runtimes to PATH")
    except Exception as e:
        print(f"Warning: Failed to setup portable runtimes: {e}")
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JSON_SORT_KEYS'] = False
    
    # Initialize database
    init_db(app)
    
    # Enable CORS for frontend access
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')      # Authentication
    app.register_blueprint(ai_hub_bp, url_prefix='/api/ai-hub')  # Multi-AI Chat
    app.register_blueprint(files_bp, url_prefix='/api/files')    # File management
    app.register_blueprint(ai_bp, url_prefix='/api/ai')          # AI learning features
    app.register_blueprint(terminal_bp, url_prefix='/api/terminal')  # Terminal
    app.register_blueprint(snippets_bp, url_prefix='/api/snippets')  # Snippets
    app.register_blueprint(portfolio_bp, url_prefix='/api/portfolio')  # Portfolio Generator
    app.register_blueprint(deployment_bp, url_prefix='/api/deployment')  # Deployment
    app.register_blueprint(executor_bp, url_prefix='/api/executor')  # Code Execution
    app.register_blueprint(virtual_env_bp, url_prefix='/api/virtual-env')  # Virtual Environments
    app.register_blueprint(extension_proxy_bp, url_prefix='/api/extensions')  # Extension Marketplace Proxy
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'roolts-backend',
            'version': '2.0.0',
            'features': {
                'authentication': True,
                'multi_ai': True,
                'social_publishing': True,
                'code_execution': True,
                'learning': True,
                'virtual_environments': True
            }
        })
    
    # Root endpoint
    @app.route('/')
    def index():
        return jsonify({
            'name': 'Roolts API',
            'version': '2.0.0',
            'description': 'AI-Powered Portfolio Backend with Multi-AI Integration',
            'endpoints': {
                'health': '/api/health',
                'auth': {
                    'register': 'POST /api/auth/register',
                    'login': 'POST /api/auth/login',
                    'me': 'GET /api/auth/me',
                    'profile': 'PUT /api/auth/profile',
                    'api_keys': 'PUT /api/auth/api-keys',
                    'twitter_connect': 'GET /api/auth/twitter/connect',
                    'linkedin_connect': 'GET /api/auth/linkedin/connect'
                },
                'ai_hub': {
                    'models': 'GET /api/ai-hub/models',
                    'chat': 'POST /api/ai-hub/chat',
                    'suggest': 'POST /api/ai-hub/suggest',
                    'analyze_prompt': 'POST /api/ai-hub/analyze-prompt'
                },
                'files': '/api/files',
                'github': '/api/github',
                'social': '/api/social',
                'ai': '/api/ai'
            }
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': str(error)}), 404
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
    
    @app.errorhandler(500)
    def internal_error(error):
        import traceback
        
        # Try to get the original exception if wrapped
        original_error = getattr(error, 'original_exception', error)
        
        print(f"!!! INTERNAL SERVER ERROR DETECTED: {original_error}")
        traceback.print_exc()  # Print stack trace of the *current* exception context
        
        # Format the traceback of the TRUE cause
        full_traceback = "".join(traceback.format_exception(type(original_error), original_error, original_error.__traceback__)) if hasattr(original_error, '__traceback__') else traceback.format_exc()
        
        return jsonify({
            'error': 'Internal server error',
            'message': full_traceback,
            'exception': str(original_error)
        }), 500
    
    return app


# Create the app instance
app = create_app()

# Initialize SocketIO
from flask_socketio import SocketIO, emit, join_room, leave_room

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Socket Events
@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

@socketio.on('join-room')
def handle_join_room(data):
    room = data.get('roomId')
    username = data.get('username')
    join_room(room)
    print(f"{username} joined room {room}")
    emit('user-joined', {'username': username, 'sid': request.sid}, to=room, include_self=False)

@socketio.on('signal')
def handle_signal(data):
    # Relay WebRTC signals (offer, answer, candidate) to the specific peer
    target_sid = data.get('target')
    if target_sid:
        emit('signal', {
            'signal': data.get('signal'),
            'sender': request.sid
        }, room=target_sid)

@socketio.on('request-control')
def handle_request_control(data):
    room = data.get('roomId')
    emit('request-control', {'requester': request.sid, 'username': data.get('username')}, to=room, include_self=False)

@socketio.on('grant-control')
def handle_grant_control(data):
    target_sid = data.get('target')
    if target_sid:
        emit('grant-control', {'granted': True, 'granter': request.sid}, room=target_sid)

@socketio.on('revoke-control')
def handle_revoke_control(data):
    room = data.get('roomId')
    emit('revoke-control', {}, to=room, include_self=False)

@socketio.on('code-change')
def handle_code_change(data):
    room = data.get('roomId')
    # Broadcast code changes to everyone else in the room
    emit('code-change', data, to=room, include_self=False)

@socketio.on('cursor-move')
def handle_cursor_move(data):
    room = data.get('roomId')
    emit('cursor-move', data, to=room, include_self=False)

@socketio.on('chat-message')
def handle_chat_message(data):
    room = data.get('roomId')
    emit('chat-message', data, to=room, include_self=False)

@socketio.on('track-toggle')
def handle_track_toggle(data):
    room = data.get('roomId')
    emit('track-toggle', data, to=room, include_self=False)

@socketio.on('leave-room')
def handle_leave_room(data):
    room = data.get('roomId')
    if room:
        leave_room(room)
        emit('user-left', {'sid': request.sid}, to=room, include_self=False)

# Remote control events
@socketio.on('remote-mouse-move')
def handle_remote_mouse_move(data):
    target_sid = data.get('target')
    if target_sid:
        emit('remote-mouse-move', data, room=target_sid)

@socketio.on('remote-click')
def handle_remote_click(data):
    target_sid = data.get('target')
    if target_sid:
        emit('remote-click', data, room=target_sid)

@socketio.on('remote-keypress')
def handle_remote_keypress(data):
    target_sid = data.get('target')
    if target_sid:
        emit('remote-keypress', data, room=target_sid)

@socketio.on('remote-scroll')
def handle_remote_scroll(data):
    target_sid = data.get('target')
    if target_sid:
        emit('remote-scroll', data, room=target_sid)


if __name__ == '__main__':
    print("\n>>> Roolts Backend Starting (with SocketIO)...")
    print("=" * 50)
    print("API Server: http://localhost:5000")
    print("SocketIO:   Enabled (Threading Mode)")
    print("Features:   Video Calling, Remote Control, Chat")
    print("=" * 50)
    print("\nPress Ctrl+C to stop\n")
    
    port = int(os.environ.get("PORT", 5000))
    # Use socketio.run instead of app.run
    # FORCE debug=True checks to confirm traceback
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)

