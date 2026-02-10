"""
Development Authentication Routes
Provides simple authentication for development mode
"""

from flask import Blueprint, jsonify, request
import jwt
from datetime import datetime, timedelta
import os

dev_auth_bp = Blueprint('dev_auth', __name__)

@dev_auth_bp.route('/dev-login', methods=['POST'])
def dev_login():
    """Development login endpoint - only works in development mode"""
    from flask import current_app
    
    # Only allow in development mode
    if current_app.config.get('FLASK_ENV') != 'development':
        return jsonify({'error': 'Development login only available in development mode'}), 403
    
    # Create a simple JWT token for development
    payload = {
        'user_id': 'dev_user_123',
        'username': 'developer',
        'exp': datetime.utcnow() + timedelta(hours=24)  # 24 hour expiration
    }
    
    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    
    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'id': 'dev_user_123',
            'username': 'developer'
        },
        'message': 'Development login successful'
    })

@dev_auth_bp.route('/dev-status', methods=['GET'])
def dev_status():
    """Check development authentication status"""
    from flask import current_app
    
    return jsonify({
        'development_mode': current_app.config.get('FLASK_ENV') == 'development',
        'auth_bypass': current_app.config.get('DEV_MODE_BYPASS_AUTH', False),
        'dev_user_id': 'dev_user_123'
    })