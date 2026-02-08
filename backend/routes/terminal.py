"""
Terminal Routes
Integrated PowerShell terminal for the Roolts IDE
"""

import subprocess
import os
import threading
import queue
import time
from flask import Blueprint, jsonify, request

terminal_bp = Blueprint('terminal', __name__)

# Store active terminal sessions (in production, use user-specific sessions)
terminal_sessions = {}

class TerminalSession:
    """Manages a persistent PowerShell session"""
    
    def __init__(self, working_dir=None):
        self.working_dir = working_dir or os.getcwd()
        self.history = []
        self.process = None
        self.output_queue = queue.Queue()
        
    def execute(self, command):
        """Execute a command and return the output"""
        try:
            # Update working directory if command is cd
            if command.strip().lower().startswith('cd '):
                new_dir = command.strip()[3:].strip()
                if new_dir == '..':
                    self.working_dir = os.path.dirname(self.working_dir)
                elif os.path.isabs(new_dir):
                    if os.path.isdir(new_dir):
                        self.working_dir = new_dir
                else:
                    potential_path = os.path.join(self.working_dir, new_dir)
                    if os.path.isdir(potential_path):
                        self.working_dir = os.path.abspath(potential_path)
                    else:
                        return {
                            'success': False,
                            'output': '',
                            'error': f"The system cannot find the path specified: {new_dir}",
                            'cwd': self.working_dir
                        }
                return {
                    'success': True,
                    'output': '',
                    'error': None,
                    'cwd': self.working_dir
                }
            
            # Execute command using PowerShell
            result = subprocess.run(
                ['powershell', '-NoProfile', '-Command', command],
                cwd=self.working_dir,
                capture_output=True,
                text=True,
                timeout=120,  # 2 minute timeout for long operations like pip install
                shell=False
            )
            
            output = result.stdout
            error = result.stderr
            
            # Store in history
            self.history.append({
                'command': command,
                'output': output,
                'error': error,
                'cwd': self.working_dir,
                'timestamp': time.time()
            })
            
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
                'error': 'Command timed out after 120 seconds',
                'cwd': self.working_dir
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'cwd': self.working_dir
            }


def get_session(session_id='default'):
    """Get or create a terminal session"""
    if session_id not in terminal_sessions:
        # Default to the roolts project directory
        project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        terminal_sessions[session_id] = TerminalSession(project_dir)
    return terminal_sessions[session_id]


@terminal_bp.route('/execute', methods=['POST'])
def execute_command():
    """Execute a command in the terminal"""
    data = request.get_json()
    command = data.get('command', '').strip()
    session_id = data.get('sessionId', 'default')
    
    if not command:
        return jsonify({'error': 'Command is required'}), 400
    
    session = get_session(session_id)
    result = session.execute(command)
    
    return jsonify(result)


@terminal_bp.route('/cwd', methods=['GET'])
def get_cwd():
    """Get current working directory"""
    session_id = request.args.get('sessionId', 'default')
    session = get_session(session_id)
    
    return jsonify({
        'cwd': session.working_dir
    })


@terminal_bp.route('/cwd', methods=['POST'])
def set_cwd():
    """Set current working directory"""
    data = request.get_json()
    new_cwd = data.get('cwd', '')
    session_id = data.get('sessionId', 'default')
    
    if not new_cwd or not os.path.isdir(new_cwd):
        return jsonify({'error': 'Invalid directory'}), 400
    
    session = get_session(session_id)
    session.working_dir = os.path.abspath(new_cwd)
    
    return jsonify({
        'cwd': session.working_dir
    })


@terminal_bp.route('/history', methods=['GET'])
def get_history():
    """Get command history"""
    session_id = request.args.get('sessionId', 'default')
    session = get_session(session_id)
    
    return jsonify({
        'history': session.history[-50:]  # Last 50 commands
    })


@terminal_bp.route('/clear', methods=['POST'])
def clear_history():
    """Clear terminal history"""
    session_id = request.get_json().get('sessionId', 'default')
    session = get_session(session_id)
    session.history = []
    
    return jsonify({'message': 'History cleared'})
