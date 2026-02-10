#!/usr/bin/env python3
"""
Development Server Startup Script
Automatically loads development environment and starts the Roolts backend
"""

import os
import sys
from pathlib import Path

def load_dev_env():
    """Load development environment variables"""
    env_file = Path(__file__).parent / '.env.dev'
    if env_file.exists():
        print(f"📁 Loading development environment from {env_file}")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
                    print(f"   {key}={value}")
    else:
        print(f"⚠️  Development environment file not found: {env_file}")
        print("   Using default development settings")

def start_dev_server():
    """Start the development server"""
    print("\n🚀 Starting Roolts Backend Development Server")
    print("=" * 50)
    
    # Load development environment
    load_dev_env()
    
    # Import and run the Flask app
    try:
        from app import create_app
        app = create_app()
        
        print("\n🎯 Development Features Enabled:")
        print("   ✅ Authentication bypass for terminal/executor")
        print("   ✅ Development user: dev_user_123")
        print("   ✅ Relaxed security for testing")
        print("   ✅ Debug mode enabled")
        
        print("\n🔗 Available endpoints:")
        print("   Terminal: POST /api/terminal/execute")
        print("   Executor: POST /api/executor/execute") 
        print("   Files: GET /api/file-manager/list")
        print("   Dev Login: POST /api/dev-auth/dev-login")
        print("   Health: GET /api/health")
        
        print("\n🌐 Server starting on http://localhost:5000")
        print("   Press Ctrl+C to stop the server")
        print("=" * 50)
        
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=True,
            use_reloader=True
        )
        
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    start_dev_server()