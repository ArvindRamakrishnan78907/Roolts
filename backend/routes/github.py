"""
GitHub Integration Routes
Handles GitHub OAuth and repository operations
"""

import os
from flask import Blueprint, jsonify, request, redirect, session
import requests

github_bp = Blueprint('github', __name__)

# GitHub OAuth Configuration
GITHUB_CLIENT_ID = os.getenv('GITHUB_CLIENT_ID', '')
GITHUB_CLIENT_SECRET = os.getenv('GITHUB_CLIENT_SECRET', '')
GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize'
GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
GITHUB_API_URL = 'https://api.github.com'

# In-memory token storage (use database in production)
github_tokens = {}


@github_bp.route('/auth', methods=['GET'])
def github_auth():
    """Initiate GitHub OAuth flow."""
    if not GITHUB_CLIENT_ID:
        return jsonify({
            'error': 'GitHub OAuth not configured',
            'message': 'Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET'
        }), 400
    
    callback_url = request.args.get('callback', 'http://localhost:3000/callback/github')
    scope = 'repo user'
    
    auth_url = (
        f'{GITHUB_OAUTH_URL}?'
        f'client_id={GITHUB_CLIENT_ID}&'
        f'redirect_uri={callback_url}&'
        f'scope={scope}'
    )
    
    return jsonify({
        'auth_url': auth_url,
        'message': 'Redirect user to auth_url to complete authentication'
    })


@github_bp.route('/callback', methods=['POST'])
def github_callback():
    """Handle GitHub OAuth callback and exchange code for token."""
    data = request.get_json()
    code = data.get('code')
    
    if not code:
        return jsonify({'error': 'Authorization code is required'}), 400
    
    # Exchange code for access token
    response = requests.post(
        GITHUB_TOKEN_URL,
        headers={'Accept': 'application/json'},
        data={
            'client_id': GITHUB_CLIENT_ID,
            'client_secret': GITHUB_CLIENT_SECRET,
            'code': code
        }
    )
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to exchange code for token'}), 400
    
    token_data = response.json()
    
    if 'error' in token_data:
        return jsonify({'error': token_data.get('error_description', 'OAuth error')}), 400
    
    access_token = token_data.get('access_token')
    
    # Get user info
    user_response = requests.get(
        f'{GITHUB_API_URL}/user',
        headers={
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json'
        }
    )
    
    user = user_response.json()
    user_id = str(user.get('id'))
    
    # Store token
    github_tokens[user_id] = access_token
    
    return jsonify({
        'message': 'GitHub authentication successful',
        'user': {
            'id': user_id,
            'login': user.get('login'),
            'name': user.get('name'),
            'avatar_url': user.get('avatar_url'),
            'email': user.get('email')
        }
    })


@github_bp.route('/user', methods=['GET'])
def get_github_user():
    """Get authenticated GitHub user info."""
    token = request.headers.get('X-GitHub-Token')
    
    if not token:
        return jsonify({'error': 'GitHub token required'}), 401
    
    response = requests.get(
        f'{GITHUB_API_URL}/user',
        headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        }
    )
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch user'}), response.status_code
    
    user = response.json()
    
    return jsonify({
        'user': {
            'id': str(user.get('id')),
            'login': user.get('login'),
            'name': user.get('name'),
            'avatar_url': user.get('avatar_url'),
            'email': user.get('email')
        }
    })


@github_bp.route('/repos', methods=['GET'])
def list_repositories():
    """List user's GitHub repositories."""
    token = request.headers.get('X-GitHub-Token')
    
    if not token:
        return jsonify({'error': 'GitHub token required'}), 401
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 30, type=int)
    
    response = requests.get(
        f'{GITHUB_API_URL}/user/repos',
        headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        },
        params={
            'page': page,
            'per_page': per_page,
            'sort': 'updated',
            'direction': 'desc'
        }
    )
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch repositories'}), response.status_code
    
    repos = response.json()
    
    return jsonify({
        'repositories': [
            {
                'id': repo['id'],
                'name': repo['name'],
                'full_name': repo['full_name'],
                'description': repo.get('description'),
                'private': repo['private'],
                'html_url': repo['html_url'],
                'clone_url': repo['clone_url'],
                'default_branch': repo['default_branch'],
                'updated_at': repo['updated_at']
            }
            for repo in repos
        ],
        'page': page,
        'per_page': per_page
    })


@github_bp.route('/repos', methods=['POST'])
def create_repository():
    """Create a new GitHub repository."""
    token = request.headers.get('X-GitHub-Token')
    
    if not token:
        return jsonify({'error': 'GitHub token required'}), 401
    
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Repository name is required'}), 400
    
    response = requests.post(
        f'{GITHUB_API_URL}/user/repos',
        headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        },
        json={
            'name': data['name'],
            'description': data.get('description', ''),
            'private': data.get('private', False),
            'auto_init': data.get('auto_init', True)
        }
    )
    
    if response.status_code not in [200, 201]:
        error_data = response.json()
        return jsonify({
            'error': 'Failed to create repository',
            'details': error_data.get('message')
        }), response.status_code
    
    repo = response.json()
    
    return jsonify({
        'message': 'Repository created successfully',
        'repository': {
            'id': repo['id'],
            'name': repo['name'],
            'full_name': repo['full_name'],
            'html_url': repo['html_url'],
            'clone_url': repo['clone_url'],
            'default_branch': repo['default_branch']
        }
    }), 201


@github_bp.route('/repos/<owner>/<repo>/push', methods=['POST'])
def push_to_repository(owner, repo):
    """Push files to a repository."""
    token = request.headers.get('X-GitHub-Token')
    
    if not token:
        return jsonify({'error': 'GitHub token required'}), 401
    
    data = request.get_json()
    files = data.get('files', [])
    commit_message = data.get('message', 'Update from Roolts')
    branch = data.get('branch', 'main')
    
    if not files:
        return jsonify({'error': 'No files to push'}), 400
    
    pushed_files = []
    errors = []
    
    for file_data in files:
        file_path = file_data.get('path', '').lstrip('/')
        content = file_data.get('content', '')
        
        if not file_path:
            continue
        
        # Get file SHA if it exists (for updates)
        sha = None
        check_response = requests.get(
            f'{GITHUB_API_URL}/repos/{owner}/{repo}/contents/{file_path}',
            headers={
                'Authorization': f'Bearer {token}',
                'Accept': 'application/json'
            },
            params={'ref': branch}
        )
        
        if check_response.status_code == 200:
            sha = check_response.json().get('sha')
        
        # Create or update file
        import base64
        encoded_content = base64.b64encode(content.encode()).decode()
        
        put_data = {
            'message': commit_message,
            'content': encoded_content,
            'branch': branch
        }
        
        if sha:
            put_data['sha'] = sha
        
        response = requests.put(
            f'{GITHUB_API_URL}/repos/{owner}/{repo}/contents/{file_path}',
            headers={
                'Authorization': f'Bearer {token}',
                'Accept': 'application/json'
            },
            json=put_data
        )
        
        if response.status_code in [200, 201]:
            pushed_files.append(file_path)
        else:
            errors.append({
                'file': file_path,
                'error': response.json().get('message', 'Unknown error')
            })
    
    return jsonify({
        'message': f'Pushed {len(pushed_files)} file(s)',
        'pushed_files': pushed_files,
        'errors': errors,
        'repository': f'{owner}/{repo}',
        'branch': branch
    })


@github_bp.route('/repos/<owner>/<repo>/clone', methods=['POST'])
def clone_repository(owner, repo):
    """Get contents of a repository for importing."""
    token = request.headers.get('X-GitHub-Token')
    
    if not token:
        return jsonify({'error': 'GitHub token required'}), 401
    
    branch = request.args.get('branch', 'main')
    
    # Get repository tree
    response = requests.get(
        f'{GITHUB_API_URL}/repos/{owner}/{repo}/git/trees/{branch}',
        headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/json'
        },
        params={'recursive': '1'}
    )
    
    if response.status_code != 200:
        return jsonify({'error': 'Failed to fetch repository contents'}), response.status_code
    
    tree = response.json()
    files = []
    
    # Get file contents (limit to prevent large downloads)
    for item in tree.get('tree', [])[:50]:
        if item['type'] == 'blob':
            file_response = requests.get(
                f'{GITHUB_API_URL}/repos/{owner}/{repo}/contents/{item["path"]}',
                headers={
                    'Authorization': f'Bearer {token}',
                    'Accept': 'application/json'
                },
                params={'ref': branch}
            )
            
            if file_response.status_code == 200:
                file_data = file_response.json()
                if file_data.get('encoding') == 'base64':
                    import base64
                    content = base64.b64decode(file_data['content']).decode('utf-8', errors='replace')
                else:
                    content = file_data.get('content', '')
                
                files.append({
                    'path': item['path'],
                    'content': content,
                    'size': item.get('size', 0)
                })
    
    return jsonify({
        'message': f'Cloned {len(files)} files from {owner}/{repo}',
        'files': files,
        'repository': f'{owner}/{repo}',
        'branch': branch
    })
