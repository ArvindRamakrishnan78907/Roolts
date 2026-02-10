"""
Workspace Manager
Handles user workspace creation and management
"""

import os
from pathlib import Path
from flask import current_app


def get_user_workspace(user_id):
    """Get the workspace path for a user"""
    # Get the backend directory as base
    backend_dir = Path(__file__).parent.parent
    workspaces_dir = backend_dir / "user_workspaces"
    
    # Create user-specific workspace directory
    user_workspace = workspaces_dir / str(user_id)
    return str(user_workspace)


def ensure_user_workspace(user_id):
    """Ensure user workspace exists, create if not"""
    workspace_path = get_user_workspace(user_id)
    
    # Create directory if it doesn't exist
    os.makedirs(workspace_path, exist_ok=True)
    
    # Create a welcome file for new workspaces
    welcome_file = Path(workspace_path) / "README.md"
    if not welcome_file.exists():
        with open(welcome_file, 'w', encoding='utf-8') as f:
            f.write(f"""# Welcome to Your Roolts Workspace!

This is your personal workspace where all your files are stored.

## What you can do:
- Create and edit files in real-time
- Organize your projects with folders
- Execute code directly in the terminal
- Share and collaborate on projects

User ID: {user_id}
Created: {Path(workspace_path).stat().st_ctime if Path(workspace_path).exists() else 'Now'}

Happy coding! 🚀
""")
    
    return workspace_path


def get_workspace_stats(user_id):
    """Get statistics about user's workspace"""
    workspace_path = get_user_workspace(user_id)
    
    if not os.path.exists(workspace_path):
        return {
            'exists': False,
            'fileCount': 0,
            'folderCount': 0,
            'totalSize': 0
        }
    
    file_count = 0
    folder_count = 0
    total_size = 0
    
    try:
        for root, dirs, files in os.walk(workspace_path):
            folder_count += len(dirs)
            for file in files:
                file_count += 1
                file_path = os.path.join(root, file)
                try:
                    total_size += os.path.getsize(file_path)
                except OSError:
                    pass  # Skip files we can't access
        
        return {
            'exists': True,
            'fileCount': file_count,
            'folderCount': folder_count,
            'totalSize': total_size,
            'path': workspace_path
        }
    except Exception as e:
        print(f"Error getting workspace stats: {e}")
        return {
            'exists': True,
            'fileCount': 0,
            'folderCount': 0,
            'totalSize': 0,
            'error': str(e)
        }


def cleanup_workspace(user_id):
    """Clean up temporary files in user's workspace"""
    workspace_path = get_user_workspace(user_id)
    
    if not os.path.exists(workspace_path):
        return 0
    
    cleaned_files = 0
    
    try:
        for root, dirs, files in os.walk(workspace_path):
            for file in files:
                # Remove temporary files
                if file.startswith('.tmp') or file.endswith('.tmp') or file.endswith('~'):
                    file_path = os.path.join(root, file)
                    try:
                        os.remove(file_path)
                        cleaned_files += 1
                    except OSError:
                        pass
                        
            # Remove empty directories
            for dir in dirs:
                dir_path = os.path.join(root, dir)
                try:
                    if not os.listdir(dir_path):  # Directory is empty
                        os.rmdir(dir_path)
                except OSError:
                    pass
        
        return cleaned_files
    except Exception as e:
        print(f"Error cleaning workspace: {e}")
        return 0


def list_all_workspaces():
    """List all user workspaces (admin function)"""
    backend_dir = Path(__file__).parent.parent
    workspaces_dir = backend_dir / "user_workspaces"
    
    if not workspaces_dir.exists():
        return []
    
    workspaces = []
    
    try:
        for item in workspaces_dir.iterdir():
            if item.is_dir():
                stats = get_workspace_stats(item.name)
                workspaces.append({
                    'userId': item.name,
                    'path': str(item),
                    'stats': stats
                })
    except Exception as e:
        print(f"Error listing workspaces: {e}")
    
    return workspaces


def validate_file_path(user_id, file_path):
    """Validate that a file path is within user's workspace"""
    workspace_path = get_user_workspace(user_id)
    
    try:
        # Resolve to absolute paths
        workspace_abs = Path(workspace_path).resolve()
        file_abs = Path(workspace_path, file_path.lstrip('/\\\\')).resolve()
        
        # Check if file path is within workspace
        return str(file_abs).startswith(str(workspace_abs))
    except Exception:
        return False


def get_safe_file_path(user_id, file_path):
    """Get a safe file path within user's workspace"""
    workspace_path = get_user_workspace(user_id)
    
    # Remove leading slashes and backslashes
    clean_path = file_path.lstrip('/\\\\')
    
    # Join with workspace path
    full_path = Path(workspace_path) / clean_path
    
    # Resolve and validate
    resolved_path = full_path.resolve()
    workspace_abs = Path(workspace_path).resolve()
    
    if str(resolved_path).startswith(str(workspace_abs)):
        return str(resolved_path)
    else:
        raise ValueError("Path is outside user workspace")