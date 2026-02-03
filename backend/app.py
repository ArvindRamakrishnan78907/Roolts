"""
Roolts Backend - Flask Application
AI-Powered Portfolio with Multi-AI Integration
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database models
from models import db, init_db

# Import routes
from routes.files import files_bp
from routes.github import github_bp
from routes.social import social_bp
from routes.ai import ai_bp
from routes.auth import auth_bp
from routes.ai_hub import ai_hub_bp


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JSON_SORT_KEYS'] = False
    
    # Initialize database
    init_db(app)
    
    # Enable CORS for frontend access
    CORS(app, origins=[
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',  # Vite default
        'http://127.0.0.1:5173'
    ], supports_credentials=True)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')      # Authentication
    app.register_blueprint(ai_hub_bp, url_prefix='/api/ai-hub')  # Multi-AI Chat
    app.register_blueprint(files_bp, url_prefix='/api/files')    # File management
    app.register_blueprint(github_bp, url_prefix='/api/github')  # GitHub integration
    app.register_blueprint(social_bp, url_prefix='/api/social')  # Social posting
    app.register_blueprint(ai_bp, url_prefix='/api/ai')          # AI learning features
    
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
                'learning': True
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

if __name__ == '__main__':
    print("\n🚀 Roolts Backend Starting...")
    print("=" * 50)
    print("📡 API Server: http://localhost:5000")
    print("📚 API Docs:   http://localhost:5000/")
    print("🔑 Auth:       /api/auth/*")
    print("🤖 AI Hub:     /api/ai-hub/*")
    print("=" * 50)
    print("\nPress Ctrl+C to stop\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
