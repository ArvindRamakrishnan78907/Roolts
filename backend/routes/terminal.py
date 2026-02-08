"""
Terminal Routes
Provides terminal-like interface using virtual environments
"""
from flask import Blueprint, request, jsonify
from models import VirtualEnvironment, db
from services.docker_manager import get_docker_manager
from services.security_validator import get_security_validator

terminal_bp = Blueprint('terminal', __name__)

# Initialize services
docker_manager = get_docker_manager()
security_validator = get_security_validator()


@terminal_bp.route('/cwd', methods=['GET'])
def get_cwd():
    """Get current working directory for terminal session."""
    session_id = request.args.get('sessionId', 'default')
    # For now, always return /workspace as the working directory
    return jsonify({'cwd': '/workspace'}), 200


@terminal_bp.route('/execute', methods=['POST'])
def execute_terminal_command():
    """Execute a terminal command in the default environment."""
    try:
        data = request.get_json()
        if not data or 'command' not in data:
            return jsonify({'error': 'Missing required field: command'}), 400
        
        command = data.get('command', '')
        
        # Get user ID from header
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        try:
            user_id = int(user_id)
        except ValueError:
            return jsonify({'error': 'Invalid user ID'}), 401
        
        # Get or find a default environment for terminal
        # Use the first available running environment for this user
        env = VirtualEnvironment.query.filter_by(
            user_id=user_id,
            status='running'
        ).first()
        
        if not env:
            # Try to find any environment (even stopped ones)
            env = VirtualEnvironment.query.filter_by(
                user_id=user_id
            ).first()
            
            if not env:
                return jsonify({
                    'error': 'No environment found',
                    'message': 'Please create a virtual environment first'
                }), 404
            
            # Start the environment if it's stopped
            if env.status != 'running':
                try:
                    docker_manager.start_container(env.container_id)
                    env.status = 'running'
                    db.session.commit()
                except Exception as e:
                    return jsonify({
                        'error': 'Failed to start environment',
                        'message': str(e)
                    }), 500
        
        # Validate command for security
        is_safe, severity, message = security_validator.validate_command(command)
        if not is_safe:
            return jsonify({
                'error': 'Command blocked for security reasons',
                'reason': message
            }), 403
        
        # Execute command in the environment
        exit_code, stdout, stderr = docker_manager.execute_command(
            env.container_id,
            command,
            timeout=data.get('timeout', 30)
        )
        
        # Update environment access time
        env.update_access_time()
        db.session.commit()
        
        return jsonify({
            'success': exit_code == 0,
            'output': stdout or stderr,
            'exitCode': exit_code,
            'stdout': stdout,
            'stderr': stderr
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500
