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
dev_env_path = Path(__file__).parent / '.env.dev'

# Load development environment if it exists and no .env file is found
if not env_path.exists() and dev_env_path.exists():
    print("📁 Loading development environment from .env.dev")
    load_dotenv(dotenv_path=dev_env_path)
else:
    load_dotenv(dotenv_path=env_path)

# Import database models
from models import db, init_db

# Import compiler setup
from utils.compiler_manager import setup_compiler
from utils.security_middleware import SecurityMiddleware

# Import routes
from routes.files import files_bp
from routes.github import github_bp
from routes.social import social_bp
from routes.ai import ai_bp
from routes.auth import auth_bp
from routes.ai_hub import ai_hub_bp
from routes.terminal import terminal_bp
from routes.snippets import snippets_bp
from routes.portfolio import portfolio_bp
from routes.deployment import deployment_bp
from routes.executor import executor_bp
from routes.virtual_env import virtual_env_bp
from routes.file_manager import file_manager_bp
from routes.file_sync import file_sync_bp
from routes.file_sync_websockets import register_file_sync_events
from routes.dev_auth import dev_auth_bp


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Initialize security middleware
    security = SecurityMiddleware()
    security.init_app(app)
    
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
    
    # Development configuration - bypass authentication for development
    app.config['FLASK_ENV'] = os.getenv('FLASK_ENV', 'development')
    app.config['DEV_MODE_BYPASS_AUTH'] = os.getenv('DEV_MODE_BYPASS_AUTH', 'true').lower() == 'true'
    
    print(f"Running in {app.config['FLASK_ENV']} mode")
    if app.config['DEV_MODE_BYPASS_AUTH']:
        print("⚠️  Development mode: Authentication bypass enabled")
        print("🔓 Terminal and code execution available without login")
    
    # Initialize database
    init_db(app)
    
    # Enable CORS for frontend access
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')      # Authentication
    app.register_blueprint(ai_hub_bp, url_prefix='/api/ai-hub')  # Multi-AI Chat
    app.register_blueprint(files_bp, url_prefix='/api/files')    # File management
    app.register_blueprint(file_manager_bp, url_prefix='/api/file-manager')  # Secure File Manager
    app.register_blueprint(file_sync_bp, url_prefix='/api/file-sync')  # Real-time File Sync
    app.register_blueprint(github_bp, url_prefix='/api/github')  # GitHub integration
    app.register_blueprint(social_bp, url_prefix='/api/social')  # Social posting
    app.register_blueprint(ai_bp, url_prefix='/api/ai')          # AI learning features
    app.register_blueprint(terminal_bp, url_prefix='/api/terminal')  # Secure Terminal
    app.register_blueprint(snippets_bp, url_prefix='/api/snippets')  # Snippets
    app.register_blueprint(portfolio_bp, url_prefix='/api/portfolio')  # Portfolio Generator
    app.register_blueprint(deployment_bp, url_prefix='/api/deployment')  # Deployment
    app.register_blueprint(executor_bp, url_prefix='/api/executor')  # Secure Code Execution
    app.register_blueprint(virtual_env_bp, url_prefix='/api/virtual-env')  # Virtual Environments
    
    # Development authentication (only in development mode)
    if app.config.get('FLASK_ENV') == 'development':
        app.register_blueprint(dev_auth_bp, url_prefix='/api/dev-auth')
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'roolts-backend',
            'version': '2.0.0',
            'security': {
                'user_isolation': True,
                'secure_execution': True,
                'authenticated_access': True,
                'path_validation': True,
                'command_filtering': True
            },
            'features': {
                'authentication': True,
                'multi_ai': True,
                'social_publishing': True,
                'secure_code_execution': True,
                'secure_terminal': True,
                'file_management': True,
                'learning': True,
                'virtual_environments': True,
                'persistent_workspaces': True
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
        return jsonify({'error': 'Internal server error', 'message': str(error)}), 500
    
    return app


# Create the app instance
app = create_app()

# Initialize SocketIO with fallback
try:
    from flask_socketio import SocketIO, emit, join_room, leave_room
    
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')
    
    # Store socketio instance in app for access by other modules
    app.socketio = socketio
    
    # Register file sync WebSocket events
    register_file_sync_events(socketio)
    
    SOCKETIO_AVAILABLE = True
    print("SocketIO initialized successfully")
    
except ImportError:
    print("Warning: Flask-SocketIO not installed. Real-time features disabled.")
    SOCKETIO_AVAILABLE = False
    socketio = None
    
    # Create dummy socketio for fallback
    class DummySocketIO:
        def emit(self, *args, **kwargs):
            pass
        def run(self, *args, **kwargs):
            # Fallback to regular Flask development server
            app.run(host=kwargs.get('host', '0.0.0.0'), 
                   port=kwargs.get('port', 5000), 
                   debug=kwargs.get('debug', False))
    
    socketio = DummySocketIO()
    app.socketio = socketio

# Socket Events (only if SocketIO is available)
if SOCKETIO_AVAILABLE:
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
    print("\\n>>> Roolts Backend Starting...")
    print("=" * 50)
    print("API Server: http://localhost:5000")
    
    if SOCKETIO_AVAILABLE:
        print("SocketIO:   Enabled")
        print("Features:   Video Calling, Remote Control, Chat, File Sync")
    else:
        print("SocketIO:   Disabled (flask-socketio not installed)")
        print("Features:   Basic API only")
    
    print("=" * 50)
    print("\\nPress Ctrl+C to stop\\n")
    
    port = int(os.environ.get("PORT", 5000))
    # Use socketio.run if available, otherwise regular Flask
    socketio.run(app, host='0.0.0.0', port=port, debug=os.environ.get("FLASK_DEBUG", "True") == "True")

