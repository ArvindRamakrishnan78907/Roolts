
"""
Executor Routes
Handles code execution for the Roolts IDE
"""

import subprocess
import os
import uuid
import tempfile
import shutil
from flask import Blueprint, jsonify, request

executor_bp = Blueprint('executor', __name__)

@executor_bp.route('/execute', methods=['POST'])
def execute_code():
    """Execute code in the specified language"""
    data = request.get_json()
    code = data.get('code', '')
    language = data.get('language', '').lower()
    
    if not code:
        return jsonify({'success': False, 'error': 'No code provided'}), 400

    # Create a unique temporary directory for this execution
    temp_dir = tempfile.mkdtemp(prefix='roolts_exec_')
    
    try:
        output = ""
        error = ""
        success = False
        
        if language == 'python':
            file_path = os.path.join(temp_dir, 'script.py')
            with open(file_path, 'w') as f:
                f.write(code)
            
            # Execute Python
            result = subprocess.run(
                ['python', file_path],
                cwd=temp_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            output = result.stdout
            error = result.stderr
            success = result.returncode == 0
            
        elif language == 'javascript' or language == 'js':
            file_path = os.path.join(temp_dir, 'script.js')
            with open(file_path, 'w') as f:
                f.write(code)
            
            # Execute Node.js
            result = subprocess.run(
                ['node', file_path],
                cwd=temp_dir,
                capture_output=True,
                text=True,
                timeout=30,
                shell=True # Needed for windows node path sometimes
            )
            output = result.stdout
            error = result.stderr
            success = result.returncode == 0
            
        elif language == 'java':
            file_path = os.path.join(temp_dir, 'Main.java')
            with open(file_path, 'w') as f:
                f.write(code)
            
            # Compile Java
            compile_result = subprocess.run(
                ['javac', 'Main.java'],
                cwd=temp_dir,
                capture_output=True,
                text=True,
                timeout=30,
                shell=True
            )
            
            if compile_result.returncode != 0:
                output = compile_result.stdout
                error = "Compilation Error:\n" + compile_result.stderr
                success = False
            else:
                # Run Java
                run_result = subprocess.run(
                    ['java', 'Main'],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    shell=True
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
            'error': 'Execution timed out (30s limit)'
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
