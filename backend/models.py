"""
User Model and Database Setup
Handles user authentication and social token storage
"""

import os
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """User account model."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100))
    profile_image = db.Column(db.String(500))
    bio = db.Column(db.Text)
    tagline = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # API Keys (encrypted in production)
    gemini_api_key = db.Column(db.String(500))
    claude_api_key = db.Column(db.String(500))
    deepseek_api_key = db.Column(db.String(500))
    qwen_api_key = db.Column(db.String(500))
    
    # Relationships
    social_tokens = db.relationship('SocialToken', back_populates='user', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set the user's password."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify the user's password."""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert user to dictionary (safe for JSON response)."""
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'profile_image': self.profile_image,
            'bio': self.bio,
            'tagline': self.tagline,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'has_gemini_key': bool(self.gemini_api_key),
            'has_claude_key': bool(self.claude_api_key),
            'has_deepseek_key': bool(self.deepseek_api_key),
            'has_qwen_key': bool(self.qwen_api_key),
            'connected_socials': [t.platform for t in self.social_tokens if t.is_valid()]
        }


class SocialToken(db.Model):
    """OAuth tokens for social media platforms."""
    __tablename__ = 'social_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    platform = db.Column(db.String(50), nullable=False)  # 'twitter' or 'linkedin'
    access_token = db.Column(db.String(1000), nullable=False)
    refresh_token = db.Column(db.String(1000))
    token_type = db.Column(db.String(50))
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Platform-specific data
    platform_user_id = db.Column(db.String(100))
    platform_username = db.Column(db.String(100))
    
    # Relationship
    user = db.relationship('User', back_populates='social_tokens')
    
    def is_valid(self):
        """Check if the token is still valid."""
        if not self.expires_at:
            return True
        return datetime.utcnow() < self.expires_at
    
    def to_dict(self):
        """Convert token to dictionary."""
        return {
            'platform': self.platform,
            'platform_user_id': self.platform_user_id,
            'platform_username': self.platform_username,
            'is_valid': self.is_valid(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }


def init_db(app):
    """Initialize the database with the Flask app."""
    # Configure SQLite database
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL', 
        'sqlite:///roolts.db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
    
    return db
