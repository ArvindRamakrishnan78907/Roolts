
"""
Secure Executor Routes
Handles code execution with user isolation and security
"""

import subprocess
import os
import uuid
import tempfile
import shutil
import sys
import re
import jwt
from flask import Blueprint, jsonify, request, current_app, g
from functools import wraps
from pathlib import Path

from utils.compiler_manager import get_gcc_path, get_gplusplus_path, get_executable_path, get_runtime_root

executor_bp = Blueprint('executor', __name__)

def require_auth(f):
    """Decorator to require authentication for code execution"""
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
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            g.user_id = payload.get('user_id')
            g.username = payload.get('username')
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid authentication token'}), 401
        
        return f(*args, **kwargs)
    return decorated_function

def get_user_workspace(user_id):
    """Get user's secure workspace directory"""
    base_workspace = os.path.join(os.getcwd(), 'user_workspaces')
    user_workspace = os.path.join(base_workspace, str(user_id))
    os.makedirs(user_workspace, exist_ok=True)
    return user_workspace

@executor_bp.route('/execute', methods=['POST'])
@require_auth
def execute_code():
    """Execute code securely with user isolation"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
            
        code = data.get('code', '')
        language = data.get('language', 'python')
        filename = data.get('filename', '')
        stdin_input = data.get('input', '')
        use_workspace = data.get('useWorkspace', False)  # Option to run in user workspace
        
        if not code:
            return jsonify({'success': False, 'error': 'No code provided'}), 400

        # Get authenticated user
        user_id = g.user_id
        
        # Determine execution directory
        if use_workspace and user_id:
            # Execute in user's persistent workspace
            execution_dir = get_user_workspace(user_id)
            cleanup_required = False
        else:
            # Execute in temporary directory (default behavior)
            execution_dir = tempfile.mkdtemp(prefix=f'exec_{user_id}_')
            cleanup_required = True
    
        try:
            output = ""
            error = ""
            success = False
            
            if language == 'python':
                fname = filename if filename and filename.endswith('.py') else 'script.py'
                file_path = os.path.join(execution_dir, fname)
                
                # Security check: ensure filename is safe
                if '..' in fname or '/' in fname or '\\' in fname:
                    return jsonify({'success': False, 'error': 'Invalid filename'}), 400
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Execute Python using portable runtime if available
                python_exe = get_executable_path('python', 'python')
                
                # Execute Python with security restrictions
                result = subprocess.run(
                    [python_exe, '-u', file_path],
                    cwd=execution_dir,
                    capture_output=True,
                    text=True,
                    input=stdin_input,
                    timeout=60
                )
                output = result.stdout
                error = result.stderr
                success = result.returncode == 0
            
            elif language == 'javascript' or language == 'js':
                fname = filename if filename and filename.endswith('.js') else 'script.js'
                file_path = os.path.join(execution_dir, fname)
                
                # Security check: ensure filename is safe
                if '..' in fname or '/' in fname or '\\' in fname:
                    return jsonify({'success': False, 'error': 'Invalid filename'}), 400
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Execute Node.js using portable runtime if available
                node_exe = get_executable_path('nodejs', 'node')
                
                result = subprocess.run(
                    [node_exe, file_path],
                    cwd=execution_dir,
                    capture_output=True,
                    text=True,
                    input=stdin_input,
                    timeout=60
                )
                output = result.stdout
                error = result.stderr
                success = result.returncode == 0
            
            elif language == 'java':
                if filename:
                    fname = filename
                    if not fname.endswith('.java'):
                        fname += '.java'
                else:
                    fname = 'Main.java'

                # Security check: ensure filename is safe
                if '..' in fname or '/' in fname or '\\' in fname:
                    return jsonify({'success': False, 'error': 'Invalid filename'}), 400

                # Check for package declaration
                package_match = re.search(r'^\s*package\s+([a-zA-Z0-9_.]+)\s*;', code, re.MULTILINE)
                package_name = package_match.group(1) if package_match else None

                class_name = os.path.splitext(fname)[0]
                if package_name:
                    full_class_name = f"{package_name}.{class_name}"
                else:
                    full_class_name = class_name

                file_path = os.path.join(execution_dir, fname)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Compile Java using portable javac if available
                javac_exe = get_executable_path('java', 'javac')
                compile_cmd = [javac_exe, '-d', '.', fname]
                
                compile_result = subprocess.run(
                    compile_cmd,
                    cwd=execution_dir,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if compile_result.returncode != 0:
                    output = compile_result.stdout
                    error = "Compilation Error:\n" + compile_result.stderr
                    success = False
                else:
                    # Run Java using portable java if available
                    java_exe = get_executable_path('java', 'java')
                    run_result = subprocess.run(
                        [java_exe, full_class_name],
                        cwd=execution_dir,
                        capture_output=True,
                        text=True,
                        input=stdin_input,
                        timeout=60
                    )
                    output = run_result.stdout
                    error = run_result.stderr
                    success = run_result.returncode == 0
                
            elif language == 'c':
                fname = filename if filename and filename.endswith('.c') else 'main.c'
                file_path = os.path.join(execution_dir, fname)
                exe_path = os.path.join(execution_dir, 'program')
                if os.name == 'nt':
                    exe_path += '.exe'
                    
                # Security check: ensure filename is safe
                if '..' in fname or '/' in fname or '\\' in fname:
                    return jsonify({'success': False, 'error': 'Invalid filename'}), 400
                    
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Compile C using absolute path
                gcc_path = get_gcc_path()
                compile_cmd = [gcc_path, file_path, '-o', exe_path]
                
                compile_result = subprocess.run(
                    compile_cmd,
                    cwd=execution_dir,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if compile_result.returncode != 0:
                    output = compile_result.stdout
                    error = "Compilation Error:\n" + compile_result.stderr
                    success = False
                else:
                    # Run C Executable
                    run_result = subprocess.run(
                        [exe_path],
                        cwd=execution_dir,
                        capture_output=True,
                        text=True,
                        input=stdin_input,
                        timeout=60
                    )
                    output = run_result.stdout
                    error = run_result.stderr
                    success = run_result.returncode == 0

            elif language == 'cpp' or language == 'c++':
                fname = filename if filename and filename.endswith('.cpp') else 'main.cpp'
                file_path = os.path.join(execution_dir, fname)
                exe_path = os.path.join(execution_dir, 'program')
                if os.name == 'nt':
                    exe_path += '.exe'
                    
                # Security check: ensure filename is safe
                if '..' in fname or '/' in fname or '\\' in fname:
                    return jsonify({'success': False, 'error': 'Invalid filename'}), 400
                    
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Compile C++ using absolute path
                gpp_path = get_gplusplus_path()
                compile_cmd = [gpp_path, file_path, '-o', exe_path]
                
                compile_result = subprocess.run(
                    compile_cmd,
                    cwd=execution_dir,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if compile_result.returncode != 0:
                    output = compile_result.stdout
                    error = "Compilation Error:\n" + compile_result.stderr
                    success = False
                else:
                    # Run C++ Executable
                    run_result = subprocess.run(
                        [exe_path],
                        cwd=execution_dir,
                        capture_output=True,
                        text=True,
                        input=stdin_input,
                        timeout=60
                    )
                    output = run_result.stdout
                    error = run_result.stderr
                    success = run_result.returncode == 0
            
            elif language == 'go':
                fname = filename if filename and filename.endswith('.go') else 'main.go'
                file_path = os.path.join(execution_dir, fname)
                exe_path = os.path.join(execution_dir, 'program')
                if os.name == 'nt':
                    exe_path += '.exe'
                    
                # Security check: ensure filename is safe
                if '..' in fname or '/' in fname or '\\' in fname:
                    return jsonify({'success': False, 'error': 'Invalid filename'}), 400
                    
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(code)
                
                # Compile/Run Go using portable runtime if available
                go_exe = get_executable_path('go', 'go')
                go_root = get_runtime_root('go')
                
                # Prepare Go environment
                go_env = os.environ.copy()
                if go_root:
                    go_env['GOROOT'] = go_root
                    # Add bin to path just in case
                    go_env['PATH'] = os.path.join(go_root, 'bin') + os.pathsep + go_env.get('PATH', '')
                
                # Use stable paths in the compiler directory for GOPATH and GOCACHE to ensure persistence
                compiler_dir = Path(go_root).parent
                go_env['GOPATH'] = str((compiler_dir / "gopath").absolute())
                go_env['GOCACHE'] = str((compiler_dir / "gocache").absolute())
                go_env['GOTOOLCHAIN'] = 'local'
                
                # Use 'go build' to follow the pattern
                compile_cmd = [go_exe, 'build', '-o', exe_path, fname]
                
                compile_result = subprocess.run(
                    compile_cmd,
                    cwd=execution_dir,
                    capture_output=True,
                    text=True,
                    env=go_env,
                    timeout=60
                )
                
                if compile_result.returncode != 0:
                    output = compile_result.stdout
                    error = "Go Build Error:\n" + compile_result.stderr
                    success = False
                else:
                    # Run Go Executable
                    run_result = subprocess.run(
                        [exe_path],
                        cwd=execution_dir,
                        capture_output=True,
                        text=True,
                        input=stdin_input,
                        env=go_env,
                        timeout=60
                    )
                    output = run_result.stdout
                    error = run_result.stderr
                    success = run_result.returncode == 0
            
            else:
                return jsonify({'success': False, 'error': f'Unsupported language: {language}'}), 400

            # Limit output size for security
            max_output_size = 10000  # 10KB limit
            if len(output) > max_output_size:
                output = output[:max_output_size] + "\n... (output truncated for security)"
            if len(error) > max_output_size:
                error = error[:max_output_size] + "\n... (error truncated for security)"

            return jsonify({
                'success': success,
                'output': output,
                'error': error,
                'executionDir': execution_dir if use_workspace else None
            })

        except FileNotFoundError as e:
            # distinct handling for missing executables
            missing_file = e.filename or f"for {language}"
            return jsonify({
                'success': False,
                'error': f'Compiler or interpreter not found: {missing_file}. Please install it and add to PATH.'
            }), 400
        except subprocess.TimeoutExpired:
            return jsonify({
                'success': False,
                'error': 'Execution timed out (60s limit)'
            }), 408
        except Exception as e:
            # Check if it's a "file not found" error that wasn't caught by FileNotFoundError
            msg = str(e)
            if "The system cannot find the file specified" in msg:
                 return jsonify({
                    'success': False,
                    'error': 'System could not find the required executable. Please ensure the language runtime is installed.'
                }), 400
                
            return jsonify({
                'success': False,
                'error': f'Execution error: {str(e)}'
            }), 500
        finally:
            # Cleanup temporary directory only if not using workspace
            if cleanup_required:
                try:
                    shutil.rmtree(execution_dir)
                except:
                    pass
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Request processing error: {str(e)}'
        }), 500
            
@executor_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'online', 'service': 'code-executor'})

@executor_bp.route('/languages', methods=['GET'])
def get_languages():
    return jsonify([
        {'id': 'python', 'name': 'Python', 'version': '3.x'},
        {'id': 'javascript', 'name': 'JavaScript', 'version': 'Node.js'},
        {'id': 'java', 'name': 'Java', 'version': 'OpenJDK'},
        {'id': 'c', 'name': 'C', 'version': 'GCC'},
        {'id': 'cpp', 'name': 'C++', 'version': 'G++'},
        {'id': 'go', 'name': 'Go', 'version': '1.x'}
    ])
