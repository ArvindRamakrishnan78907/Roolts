
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

executor_bp = Blueprint('executor', __name__)

@executor_bp.route('/execute', methods=['POST'])
def execute_code():
    """Execute code in the specified language"""
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', 'python')
    filename = data.get('filename', '')
    
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
            with open(file_path, 'w') as f:
                f.write(code)
            
            # Execute Python using the current interpreter
            # Use -u for unbuffered output to improve speed of reading large outputs
            result = subprocess.run(
                [sys.executable, '-u', file_path],
                cwd=temp_dir,
                capture_output=True,
                text=True,
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
            
            # Execute Node.js
            result = subprocess.run(
                ['node', file_path],
                cwd=temp_dir,
                capture_output=True,
                text=True,
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
            
            # Compile Java
            compile_cmd = ['javac', '-d', '.', fname]
            
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
                # Run Java
                run_result = subprocess.run(
                    ['java', full_class_name],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
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

    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'error': 'Execution timed out (60s limit)'
        }), 408
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
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
        {'id': 'java', 'name': 'Java', 'version': 'OpenJDK'}
    ])
