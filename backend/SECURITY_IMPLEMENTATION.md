# Roolts Backend Security Implementation

## Overview

This document describes the comprehensive security implementation for the Roolts backend, addressing the critical security vulnerabilities in the terminal system and implementing enterprise-grade security features.

## Security Features Implemented

### 1. User Isolation System

#### Secure Workspaces

- **Individual User Directories**: Each authenticated user gets `user_workspaces/{user_id}/`
- **Path Validation**: All file operations are restricted to user's workspace
- **Directory Traversal Protection**: Prevents `../` and absolute path attacks
- **Anonymous User Handling**: Temporary directories for unauthenticated users

#### Benefits

- Complete isolation between users
- No cross-user data access
- Secure multi-tenant architecture
- Clean separation of concerns

### 2. Secure Terminal Implementation

#### Command Filtering

```python
ALLOWED_COMMANDS = [
    'ls', 'dir', 'pwd', 'echo', 'cat', 'type', 'head', 'tail',
    'grep', 'find', 'wc', 'sort', 'python', 'node', 'java', 'javac',
    'gcc', 'g++', 'go', 'pip', 'npm', 'mkdir', 'touch', 'cp', 'copy',
    'mv', 'move', 'clear', 'cls', 'which', 'where', 'help', 'man'
]
```

#### Blocked Dangerous Operations

- System administration commands (`rm`, `del`, `shutdown`, `net`)
- Directory traversal attempts (`..`, `\\`, `/`)
- PowerShell/CMD execution (`powershell`, `cmd`)
- Network operations (`curl`, `wget`)

#### Security Validations

- **Path Boundary Checks**: Ensure `cd` commands stay within workspace
- **Command Safety**: Whitelist approach for allowed operations
- **Output Limits**: 10KB limit to prevent memory exhaustion
- **Execution Timeout**: 60-second limit to prevent resource abuse

### 3. Secure Code Execution

#### File System Security

- **Temporary Isolation**: Each execution in separate temporary directory
- **Workspace Integration**: Option to execute in persistent user workspace
- **Filename Validation**: Prevent path injection in filenames
- **Extension Filtering**: Allow only safe file types

#### Resource Management

- **Memory Limits**: Controlled subprocess execution
- **CPU Timeouts**: 60-second execution limit
- **Output Truncation**: Prevent large output attacks
- **Clean Cleanup**: Automatic temporary file removal

### 4. Authentication & Authorization

#### JWT Token System

```python
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401

        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        request.user_id = payload.get('user_id')
        return f(*args, **kwargs)
    return decorated_function
```

#### Access Control

- **Mandatory Authentication**: All terminal and execution operations require valid JWT
- **User Context**: Operations performed in user-specific context
- **Session Management**: Secure session handling with expiration

### 5. File Management Security

#### File Upload Protection

- **Size Limits**: 10MB per file maximum
- **Type Validation**: Whitelist of allowed extensions
- **Path Sanitization**: Remove dangerous characters from filenames
- **Virus scanning ready**: Architecture supports future virus scanning

#### File Operations Security

```python
ALLOWED_EXTENSIONS = {
    'text': ['.py', '.js', '.java', '.cpp', '.c', '.go', '.html', '.css', '.txt', '.md', '.json'],
    'image': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'],
    'archive': ['.zip', '.tar', '.gz']
}

BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.bin', '.dll', '.so']
```

### 6. Security Middleware

#### Rate Limiting

- **Request Limits**: 60 requests per minute per IP
- **Burst Protection**: Prevents rapid-fire attacks
- **IP Blocking**: Automatic blocking of suspicious IPs

#### Request Validation

- **Input Sanitization**: Validate all incoming requests
- **SQL Injection Protection**: Pattern detection for common attacks
- **Path Traversal Detection**: Block suspicious path patterns
- **Content-Type validation**: Ensure proper JSON format

#### Security Headers

```python
response.headers['X-Content-Type-Options'] = 'nosniff'
response.headers['X-Frame-Options'] = 'DENY'
response.headers['X-XSS-Protection'] = '1; mode=block'
response.headers['Strict-Transport-Security'] = 'max-age=31536000'
response.headers['Content-Security-Policy'] = \"default-src 'self'\"
```

## API Endpoints

### Secure Terminal

- `POST /api/terminal/execute` - Execute commands securely
- `GET /api/terminal/cwd` - Get current working directory
- `POST /api/terminal/cwd` - Change directory (with validation)
- `GET /api/terminal/history` - Get command history (sanitized)
- `GET /api/terminal/workspace/info` - Get workspace information

### Secure File Manager

- `GET /api/file-manager/list` - List files/directories
- `POST /api/file-manager/create-folder` - Create directory
- `POST /api/file-manager/upload` - Upload file
- `GET /api/file-manager/download` - Download file
- `GET /api/file-manager/read` - Read text file content
- `POST /api/file-manager/write` - Write file content
- `DELETE /api/file-manager/delete` - Delete file/directory
- `POST /api/file-manager/rename` - Rename file/directory
- `GET /api/file-manager/workspace-stats` - Get usage statistics

### Secure Code Executor

- `POST /api/executor/execute` - Execute code with security
- `GET /api/executor/languages` - Get supported languages
- `GET /api/executor/health` - Service health check

## Deployment Security

### Docker Configuration

```dockerfile
# Non-root user execution
RUN useradd -m -u 1001 appuser
USER appuser

# Health checks
HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost:$PORT/api/health

# Resource limits
CMD ["gunicorn", "--workers", "4", "--timeout", "120", "--max-requests", "1000"]
```

### Production Settings

- **HTTPS Only**: Force SSL/TLS encryption
- **Environment Variables**: Secure configuration management
- **Log Monitoring**: Comprehensive security logging
- **Backup Strategy**: Regular user data backups

## Integration with Persistent Files

### Database Schema (Future Implementation)

```sql
CREATE TABLE user_files (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    content_type VARCHAR(100),
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_directories (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    directory_path TEXT NOT NULL,
    parent_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Synchronization Process

1. **Load Phase**: User files loaded from database to workspace before execution
2. **Execution Phase**: Code runs in workspace with full file access
3. **Sync Phase**: Changes detected and synchronized back to database
4. **Cleanup Phase**: Temporary files cleaned while preserving persistent data

## Monitoring & Logging

### Security Events Logged

- Authentication attempts (success/failure)
- Command executions with user context
- File operations and access attempts
- Rate limit violations
- Suspicious activity detection

### Metrics to Monitor

- Active user sessions
- Resource usage per user
- Error rates by endpoint
- Security violation attempts
- Performance metrics

## Best Practices for Administrators

### 1. Regular Security Audits

- Review user workspace sizes
- Monitor suspicious command patterns
- Check for unauthorized access attempts
- Validate security configurations

### 2. User Management

- Implement user quotas
- Regular cleanup of inactive accounts
- Monitor resource consumption
- Backup user data regularly

### 3. System Maintenance

- Keep dependencies updated
- Regular security patches
- Monitor system resources
- Implement log rotation

### 4. Incident Response

- Automated alerting for security violations
- IP blocking capabilities
- User suspension procedures
- Data breach response plan

## Migration from Insecure Version

### Phase 1: Backup Current State

1. Export existing user data (if any)
2. Document current configurations
3. Prepare rollback procedures

### Phase 2: Deploy Security Updates

1. Update codebase with security features
2. Configure authentication system
3. Set up user workspace directories
4. Enable security middleware

### Phase 3: User Migration

1. Create user accounts with secure workspaces
2. Import existing data into secure structure
3. Update frontend to use authentication
4. Train users on new security features

### Phase 4: Monitoring & Optimization

1. Monitor system performance
2. Adjust security parameters as needed
3. Collect user feedback
4. Optimize resource allocation

## Conclusion

This security implementation transforms Roolts from a vulnerable code execution platform into a secure, enterprise-grade development environment. The multi-layered security approach ensures:

- **Complete User Isolation**: No cross-user data access
- **Secure Execution Environment**: Protected from malicious code
- **Authenticated Access**: All operations require valid authentication
- **Comprehensive Monitoring**: Full audit trail of all activities
- **Scalable Architecture**: Ready for production deployment

The system is now ready for production deployment with confidence in its security posture.
