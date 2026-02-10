"""
Security Middleware
Provides additional security layers for the Roolts backend
"""

import time
from flask import request, jsonify, g, current_app
from functools import wraps
from collections import defaultdict

class SecurityMiddleware:
    """Security middleware for rate limiting and request validation"""
    
    def __init__(self, app=None):
        self.app = app
        self.request_counts = defaultdict(list)  # IP -> [timestamps]
        self.blocked_ips = set()
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize security middleware with Flask app"""
        self.app = app  # Store app instance
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        
        # Security configuration
        app.config.setdefault('RATELIMIT_REQUESTS_PER_MINUTE', 60)
        app.config.setdefault('RATELIMIT_BURST_SIZE', 10)
        app.config.setdefault('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)  # 16MB
        
    def get_client_ip(self):
        """Get client IP address safely"""
        if request.headers.getlist("X-Forwarded-For"):
            return request.headers.getlist("X-Forwarded-For")[0].split(',')[0].strip()
        return request.environ.get('REMOTE_ADDR', '127.0.0.1')
    
    def is_rate_limited(self, ip):
        """Check if IP is rate limited"""
        now = time.time()
        window = 60  # 1 minute window
        
        # Clean old requests
        cutoff = now - window
        self.request_counts[ip] = [ts for ts in self.request_counts[ip] if ts > cutoff]
        
        # Check if over limit
        if len(self.request_counts[ip]) >= current_app.config['RATELIMIT_REQUESTS_PER_MINUTE']:
            return True
        
        # Add current request
        self.request_counts[ip].append(now)
        return False
    
    def validate_request(self):
        """Validate incoming request for security issues"""
        # Check for suspicious patterns in path
        suspicious_patterns = [
            '../', '..\\\\', '.env', 'config', 'admin', 'root',
            'passwd', 'shadow', 'hosts', 'etc/', 'var/', 'tmp/',
            'system32', 'windows', 'boot.ini'
        ]
        
        path = request.path.lower()
        for pattern in suspicious_patterns:
            if pattern in path:
                return False, f"Suspicious path pattern detected: {pattern}"
        
        # Check request size
        max_content_length = current_app.config.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)  # Default 16MB
        if request.content_length and max_content_length and request.content_length > max_content_length:
            return False, "Request too large"
        
        # Check for SQL injection patterns in query parameters
        sql_patterns = [
            'union select', 'drop table', 'delete from', 'insert into',
            '1=1', '1 or 1', 'or 1=1', '--', ';--'
        ]
        
        query_string = request.query_string.decode('utf-8', errors='ignore').lower()
        for pattern in sql_patterns:
            if pattern in query_string:
                return False, f"SQL injection attempt detected"
        
        return True, None
    
    def before_request(self):
        """Process request before handling"""
        g.start_time = time.time()
        
        # Skip security checks for health endpoint
        if request.path == '/api/health':
            return
        
        client_ip = self.get_client_ip()
        
        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            return jsonify({'error': 'IP blocked due to suspicious activity'}), 403
        
        # Rate limiting
        if self.is_rate_limited(client_ip):
            return jsonify({'error': 'Rate limit exceeded'}), 429
        
        # Request validation
        is_valid, error_msg = self.validate_request()
        if not is_valid:
            # Log suspicious activity (in production, log to security system)
            print(f"SECURITY WARNING: {client_ip} - {error_msg} - {request.path}")
            return jsonify({'error': 'Request blocked for security reasons'}), 400
    
    def after_request(self, response):
        """Process response after handling"""
        # Add security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Add processing time header (for debugging)
        if hasattr(g, 'start_time'):
            processing_time = time.time() - g.start_time
            response.headers['X-Processing-Time'] = f"{processing_time:.3f}s"
        
        return response

def require_valid_json(f):
    """Decorator to ensure request contains valid JSON"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method in ['POST', 'PUT', 'PATCH']:
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
            
            try:
                request.get_json(force=True)
            except Exception:
                return jsonify({'error': 'Invalid JSON in request body'}), 400
        
        return f(*args, **kwargs)
    return decorated_function

def sanitize_filename(filename):
    """Sanitize filename for security"""
    import re
    import os
    
    if not filename:
        return None
    
    # Remove path separators and dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    filename = re.sub(r'\\.\\.', '', filename)  # Remove ..
    filename = filename.strip('.')  # Remove leading/trailing dots
    
    # Ensure it's not empty after sanitization
    if not filename:
        return None
    
    # Limit filename length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:251 - len(ext)] + ext
    
    return filename

def validate_workspace_path(path, user_workspace):
    """Validate that a path is within the user's workspace"""
    import os
    
    if not path:
        return True
    
    try:
        # Resolve path and check if it's within workspace
        abs_path = os.path.abspath(os.path.join(user_workspace, path))
        abs_workspace = os.path.abspath(user_workspace)
        return abs_path.startswith(abs_workspace)
    except:
        return False