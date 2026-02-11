
"""
Executor Routes
Handles code execution for the Roolts IDE
"""

import subprocess
import os
import uuid
import tempfile
import shutil
import sys
import re
from flask import Blueprint, jsonify, request
import traceback
from pathlib import Path
from utils.compiler_manager import get_gcc_path, get_gplusplus_path, get_executable_path, get_runtime_root

executor_bp = Blueprint('executor', __name__)

@executor_bp.route('/execute', methods=['POST'])
def execute_code():
    """Execute code in the specified language"""
    try:
        data = request.get_json(silent=True)
    except Exception as e:
        return jsonify({'success': False, 'error': f'Invalid JSON: {str(e)}'}), 400
    
    if data is None:
        return jsonify({'success': False, 'error': 'No data provided in request body'}), 400

    if not isinstance(data, dict):

        return jsonify({
            'success': False, 
            'error': 'Invalid request format. Expected a JSON object.'
        }), 400

    code = data.get('code', '')
    language = data.get('language', 'python')
    filename = data.get('filename', '')
    stdin_input = data.get('input', '')
    
    if not code:
        return jsonify({'success': False, 'error': 'No code provided'}), 400

    # Create a unique temporary directory for this execution
    temp_dir = tempfile.mkdtemp(prefix='roolts_exec_')
    
    try:
        output = ""
        error = ""
        success = False
        
        if language == 'python':
            fname = filename if filename and filename.endswith('.py') else 'script.py'
            file_path = os.path.join(temp_dir, fname)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Execute Python using portable runtime if available
            python_exe = get_executable_path('python', 'python')
            
            # Execute Python
            result = subprocess.run(
                [python_exe, '-u', file_path],
                cwd=temp_dir,
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
            file_path = os.path.join(temp_dir, fname)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Execute Node.js using portable runtime if available
            node_exe = get_executable_path('nodejs', 'node')
            
            result = subprocess.run(
                [node_exe, file_path],
                cwd=temp_dir,
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

            # Check for package declaration
            package_match = re.search(r'^\s*package\s+([a-zA-Z0-9_.]+)\s*;', code, re.MULTILINE)
            package_name = package_match.group(1) if package_match else None

            class_name = os.path.splitext(fname)[0]
            if package_name:
                full_class_name = f"{package_name}.{class_name}"
            else:
                full_class_name = class_name

            file_path = os.path.join(temp_dir, fname)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Compile Java using portable javac if available
            javac_exe = get_executable_path('java', 'javac')
            compile_cmd = [javac_exe, '-d', '.', fname]
            
            compile_result = subprocess.run(
                compile_cmd,
                cwd=temp_dir,
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
                    cwd=temp_dir,
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
            file_path = os.path.join(temp_dir, fname)
            exe_path = os.path.join(temp_dir, 'program')
            if os.name == 'nt':
                exe_path += '.exe'
                
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Compile C using absolute path
            gcc_path = get_gcc_path()
            compile_cmd = [gcc_path, file_path, '-o', exe_path]
            
            compile_result = subprocess.run(
                compile_cmd,
                cwd=temp_dir,
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
                    cwd=temp_dir,
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
            file_path = os.path.join(temp_dir, fname)
            exe_path = os.path.join(temp_dir, 'program')
            if os.name == 'nt':
                exe_path += '.exe'
                
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Compile C++ using absolute path
            gpp_path = get_gplusplus_path()
            compile_cmd = [gpp_path, file_path, '-o', exe_path]
            
            compile_result = subprocess.run(
                compile_cmd,
                cwd=temp_dir,
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
                    cwd=temp_dir,
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
            file_path = os.path.join(temp_dir, fname)
            exe_path = os.path.join(temp_dir, 'program')
            if os.name == 'nt':
                exe_path += '.exe'
                
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
            
            # Use 'go run' for faster performance on script-like execution
            # Ensure GOPATH and GOCACHE dirs exist to prevent startup delays/errors
            if go_root:
                gopath = go_env.get('GOPATH')
                gocache = go_env.get('GOCACHE')
                if gopath: os.makedirs(gopath, exist_ok=True)
                if gocache: os.makedirs(gocache, exist_ok=True)

            run_result = subprocess.run(
                [go_exe, 'run', fname],
                cwd=temp_dir,
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

        return jsonify({
            'success': success,
            'output': output,
            'error': error
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
    except PermissionError as e:
        # Handling common permission issues (e.g., file in use)
        return jsonify({
            'success': False,
            'error': f'Permission denied: {str(e)}. The executable might be blocked or already running.'
        }), 403
    except Exception as e:
        # Log the full error to console for the developer
        print(f"[ERROR] Exception in execute_code ({language}): {str(e)}")
        traceback.print_exc()
        
        # Check if it's a "file not found" error that wasn't caught by FileNotFoundError
        msg = str(e)
        if "The system cannot find the file specified" in msg:
             return jsonify({
                'success': False,
                'error': f'System could not find the required executable for {language}. Please ensure portable runtimes are set up correctly.'
            }), 400
            
        error_details = traceback.format_exc() if os.environ.get('FLASK_DEBUG') == '1' else None
        
        return jsonify({
            'success': False,
            'error': f"Internal Server Error: {str(e)}",
            'details': error_details
        }), 500
    finally:
        # Cleanup temporary directory
        try:
            shutil.rmtree(temp_dir)
        except:
            pass
            
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
