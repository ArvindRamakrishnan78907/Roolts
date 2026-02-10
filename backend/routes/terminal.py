"""
Terminal Routes - SECURE VERSION
Integrated PowerShell terminal with user isolation and security
"""

import subprocess
import os
import threading
import queue
import time
import tempfile
import jwt
from flask import Blueprint, jsonify, request, current_app, g
from pathlib import Path
from functools import wraps

terminal_bp = Blueprint('terminal', __name__)

# Store active terminal sessions
terminal_sessions = {}

# Security configuration
ALLOWED_COMMANDS = [
    'ls', 'dir', 'pwd', 'echo', 'cat', 'type', 'head', 'tail', 
    'grep', 'find', 'wc', 'sort', 'python', 'node', 'java', 'javac',
    'gcc', 'g++', 'go', 'pip', 'npm', 'mkdir', 'touch', 'cp', 'copy',
    'mv', 'move', 'clear', 'cls', 'which', 'where', 'help', 'man',
    'get-childitem', 'set-location', 'get-location', 'write-host',
    'get-content', 'set-content', 'new-item', 'remove-item'
]

BLOCKED_PATTERNS = [
    'rm ', 'del ', 'erase ', 'rd ', 'rmdir ',
    'format ', 'fdisk', 'diskpart',
    'net ', 'sc ', 'reg ', 'regedit',
    'shutdown', 'restart', 'reboot',
    'taskkill', 'tasklist', 'ps',
    'systeminfo', 'whoami', 'netstat',
    'powershell', 'cmd', 'bash',
    'curl', 'wget', 'invoke-webrequest'
]

class SecureTerminalSession:
    """Secure terminal session with user isolation"""
    
    def __init__(self, user_id=None, allowed_root=None):
        # Set up user-specific directory structure
        if user_id:
            self.user_id = user_id
            base_workspace = os.path.join(os.getcwd(), 'user_workspaces')
            os.makedirs(base_workspace, exist_ok=True)
            self.allowed_root = os.path.join(base_workspace, str(user_id))
            os.makedirs(self.allowed_root, exist_ok=True)
            self.working_dir = self.allowed_root
        else:
            # Anonymous user gets temp directory
            self.user_id = None
            self.allowed_root = tempfile.mkdtemp(prefix='terminal_')
            self.working_dir = self.allowed_root
            
        self.history = []
        self.process = None
        self.output_queue = queue.Queue()
        
    def _is_path_allowed(self, path):
        """Ensure path stays within allowed root directory"""
        if not path:
            return False
            
        try:
            abs_path = os.path.abspath(path)
            abs_root = os.path.abspath(self.allowed_root)
            return abs_path.startswith(abs_root)
        except:
            return False
    
    def _is_command_safe(self, command):
        """Check if command is allowed"""
        cmd_lower = command.lower().strip()
        
        # Block dangerous patterns
        for pattern in BLOCKED_PATTERNS:
            if pattern in cmd_lower:
                return False, f"Command blocked for security: {pattern.strip()}"
        
        # Check for directory traversal attempts
        if '..' in command or '\\' in command.replace('\\\\', '') or command.count('/') > 3:
            return False, "Path traversal attempt blocked"
        
        # Allow only whitelisted commands (first word)
        first_word = cmd_lower.split()[0] if cmd_lower.split() else ''
        if first_word and first_word not in ALLOWED_COMMANDS and not cmd_lower.startswith('cd '):
            return False, f"Command not allowed: {first_word}"
            
        return True, None
        
    def _get_env(self):
        """Prepare safe environment with portable runtimes"""
        from utils.compiler_manager import RUNTIME_CONFIG, get_runtime_root
        
        env = os.environ.copy()
        
        # Add portable bin paths to PATH
        bin_paths = []
        for lang in RUNTIME_CONFIG:
            root = get_runtime_root(lang)
            if root:
                bin_path = Path(root) / RUNTIME_CONFIG[lang]['bin_path']
                if bin_path.exists():
                    bin_paths.append(str(bin_path.absolute()))
                
                # Special case for Python Scripts (for pip)
                if lang == 'python':
                    scripts_path = Path(root) / "Scripts"
                    if scripts_path.exists():
                        bin_paths.append(str(scripts_path.absolute()))
        
        if bin_paths:
            env["PATH"] = os.pathsep.join(bin_paths) + os.pathsep + env.get("PATH", "")
            
        # Remove sensitive environment variables for security
        sensitive_vars = ['HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP']
        for var in sensitive_vars:
            env.pop(var, None)
            
        # Set safe temp directory within user workspace
        env['TEMP'] = self.allowed_root
        env['TMP'] = self.allowed_root
            
        # Special environment variables
        go_root = get_runtime_root('go')
        if go_root:
            env['GOROOT'] = go_root
            # Set GOPATH to a stable location in the compiler directory
            compiler_dir = Path(go_root).parent
            env['GOPATH'] = str((compiler_dir / "gopath").absolute())
            env['GOCACHE'] = str((compiler_dir / "gocache").absolute())
            
        return env

    def execute(self, command):
        """Execute command with comprehensive security checks"""
        try:
            command = command.strip()
            if not command:
                return {'success': False, 'output': '', 'error': 'Empty command', 'cwd': self.working_dir}

            # Handle cd commands with security validation
            if command.lower().startswith('cd '):
                new_dir = command[3:].strip()
                
                # Remove quotes if present
                if new_dir.startswith('"') and new_dir.endswith('"'):
                    new_dir = new_dir[1:-1]
                
                # Calculate potential new directory
                if new_dir == '..':
                    potential_dir = os.path.dirname(self.working_dir)
                elif new_dir == '.':
                    potential_dir = self.working_dir
                elif os.path.isabs(new_dir):
                    potential_dir = new_dir
                else:
                    potential_dir = os.path.join(self.working_dir, new_dir)
                
                # SECURITY: Ensure within allowed boundaries
                if not self._is_path_allowed(potential_dir):
                    return {
                        'success': False,
                        'output': '',
                        'error': 'Access denied: Cannot navigate outside workspace',
                        'cwd': self.working_dir
                    }
                
                if os.path.isdir(potential_dir):
                    self.working_dir = os.path.abspath(potential_dir)
                    return {
                        'success': True,
                        'output': f'Changed directory to: {os.path.basename(self.working_dir)}',
                        'error': None,
                        'cwd': self.working_dir
                    }
                else:
                    return {
                        'success': False,
                        'output': '',
                        'error': f'Directory not found: {new_dir}',
                        'cwd': self.working_dir
                    }
            
            # Check command safety
            is_safe, error_msg = self._is_command_safe(command)
            if not is_safe:
                return {
                    'success': False,
                    'output': '',
                    'error': error_msg,
                    'cwd': self.working_dir
                }
            
            # Execute safe command with restricted environment
            result = subprocess.run(
                ['powershell', '-NoProfile', '-ExecutionPolicy', 'Restricted', '-Command', command],
                cwd=self.working_dir,
                capture_output=True,
                text=True,
                timeout=60,  # Reduced timeout for security
                shell=False,
                env=self._get_env()
            )
            
            output = result.stdout
            error = result.stderr
            
            # Limit output size for security
            max_output_size = 10000  # 10KB limit
            if len(output) > max_output_size:
                output = output[:max_output_size] + "\n... (output truncated for security)"
            
            # Store in history with size limit
            self.history.append({
                'command': command,
                'output': output,
                'error': error,
                'cwd': self.working_dir,
                'timestamp': time.time()
            })
            
            # Keep only last 50 commands in history
            if len(self.history) > 50:
                self.history = self.history[-50:]
            
            return {
                'success': result.returncode == 0,
                'output': output,
                'error': error if error else None,
                'cwd': self.working_dir,
                'exitCode': result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'Command timed out (60s limit)',
                'cwd': self.working_dir
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': f'Error executing command: {str(e)}',
                'cwd': self.working_dir
            }

def require_auth(f):
    """Decorator to require authentication for terminal access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Development bypass - disable authentication in development mode
        if current_app.config.get('FLASK_ENV') == 'development' or current_app.config.get('DEV_MODE_BYPASS_AUTH', False):
            # Set default development user
            g.user_id = 'dev_user_123'
            g.username = 'developer'
            return f(*args, **kwargs)
        
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        try:
            token = auth_header.split(' ')[1]
            # Simple token validation - integrate with your auth system
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            g.user_id = payload.get('user_id')
            g.username = payload.get('username')
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

def get_session(session_id='default', user_id=None):
    """Get or create a secure terminal session"""
    session_key = f"{user_id}_{session_id}" if user_id else session_id
    
    if session_key not in terminal_sessions:
        terminal_sessions[session_key] = SecureTerminalSession(user_id)
    return terminal_sessions[session_key]


@terminal_bp.route('/execute', methods=['POST'])
@require_auth
def execute_command():
    """Execute a command securely in the terminal"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        command = data.get('command', '').strip()
        session_id = data.get('sessionId', 'default')
        
        if not command:
            return jsonify({'error': 'Command is required'}), 400
        
        # Get user from authenticated request
        user_id = g.user_id
        
        session = get_session(session_id, user_id)
        result = session.execute(command)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Terminal error: {str(e)}',
            'output': '',
            'cwd': '/'
        }), 500


@terminal_bp.route('/cwd', methods=['GET'])
@require_auth
def get_cwd():
    """Get current working directory"""
    try:
        session_id = request.args.get('sessionId', 'default')
        user_id = getattr(request, 'user_id', None)
        session = get_session(session_id, user_id)
        
        return jsonify({
            'cwd': session.working_dir,
            'allowedRoot': session.allowed_root
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@terminal_bp.route('/cwd', methods=['POST'])
@require_auth
def set_cwd():
    """Set current working directory with security validation"""
    try:
        data = request.get_json()
        new_cwd = data.get('cwd', '')
        session_id = data.get('sessionId', 'default')
        
        if not new_cwd:
            return jsonify({'error': 'Directory path required'}), 400
        
        user_id = g.user_id
        session = get_session(session_id, user_id)
        
        # Security check: ensure directory is within allowed boundaries
        if not session._is_path_allowed(new_cwd) or not os.path.isdir(new_cwd):
            return jsonify({'error': 'Access denied or directory not found'}), 403
        
        session.working_dir = os.path.abspath(new_cwd)
        
        return jsonify({
            'cwd': session.working_dir
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@terminal_bp.route('/history', methods=['GET'])
@require_auth
def get_history():
    """Get command history"""
    try:
        session_id = request.args.get('sessionId', 'default')
        user_id = g.user_id
        session = get_session(session_id, user_id)
        
        # Return only command and timestamp for security
        safe_history = [{
            'command': entry['command'],
            'timestamp': entry['timestamp'],
            'success': entry.get('output', '') and not entry.get('error', '')
        } for entry in session.history[-20:]]  # Last 20 commands only
        
        return jsonify({
            'history': safe_history
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@terminal_bp.route('/clear', methods=['POST'])
@require_auth
def clear_history():
    """Clear terminal history"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId', 'default') if data else 'default'
        user_id = g.user_id
        session = get_session(session_id, user_id)
        session.history = []
        
        return jsonify({'message': 'History cleared'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@terminal_bp.route('/workspace/info', methods=['GET'])
@require_auth
def get_workspace_info():
    """Get workspace information for the user"""
    try:
        user_id = g.user_id
        session_id = request.args.get('sessionId', 'default')
        session = get_session(session_id, user_id)
        
        return jsonify({
            'workspaceRoot': session.allowed_root,
            'currentDirectory': session.working_dir,
            'userId': user_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@terminal_bp.route('/health', methods=['GET'])
def terminal_health():
    """Terminal service health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'secure-terminal',
        'version': '2.0.0',
        'features': {
            'user_isolation': True,
            'command_filtering': True,
            'path_validation': True,
            'authentication_required': True
        }
    })
