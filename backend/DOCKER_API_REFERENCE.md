# Docker-Backed API Endpoints Reference

## ⚠️ BREAKING CHANGES

The following endpoints have been **REMOVED** as they executed code on the host server:
- ❌ `POST /api/executor/execute` 
- ❌ `POST /api/terminal/execute`
- ❌ All `/api/files/*` endpoints

## ✅ New Docker-Only Endpoints

All operations now run inside isolated Docker containers via `/api/virtual-env/*` endpoints.

### Authentication Header

All requests require:
```
X-User-ID: <user_id>
```

---

## Environment Management

### Create Environment
```http
POST /api/virtual-env/environments
Content-Type: application/json

{
  "name": "My Project",
  "type": "python"  // Options: "nodejs", "python", "fullstack", "cpp"
}
```

**Response:**
```json
{
  "success": true,
  "environment": {
    "id": 1,
    "name": "My Project",
    "environment_type": "python",
    "status": "stopped",
    "container_id": "abc123...",
    "volume_name": "roolts_env_1_1"
  }
}
```

### List Environments
```http
GET /api/virtual-env/environments
```

### Get Environment Details
```http
GET /api/virtual-env/environments/{env_id}
```

### Start Environment
```http
POST /api/virtual-env/environments/{env_id}/start
```

### Stop Environment
```http
POST /api/virtual-env/environments/{env_id}/stop
```

### Delete Environment
```http
DELETE /api/virtual-env/environments/{env_id}
```

---

## Code Execution (Docker-Only)

### Execute Command/Code
**This replaces both `/api/executor/execute` AND `/api/terminal/execute`**

```http
POST /api/virtual-env/environments/{env_id}/execute
Content-Type: application/json

{
  "command": "python script.py",
  "timeout": 30  // Optional, default 30s
}
```

**Response:**
```json
{
  "success": true,
  "exit_code": 0,
  "stdout": "Hello World\n",
  "stderr": "",
  "execution_time": 0.15,
  "severity": "safe"
}
```

**Examples:**

Run Python code:
```json
{
  "command": "python -c 'print(\"Hello from Docker\")'"
}
```

Run Node.js code:
```json
{
  "command": "node -e 'console.log(\"Hello from Docker\")'"
}
```

Terminal commands:
```json
{
  "command": "ls -la"
}
```

### Get Execution Logs
```http
GET /api/virtual-env/environments/{env_id}/logs?limit=50&offset=0
```

---

## File Operations (Docker-Only)

### List Files
**Replaces `/api/files/`**

```http
GET /api/virtual-env/environments/{env_id}/files?path=/workspace
```

**Response:**
```json
{
  "success": true,
  "path": "/workspace",
  "files": [
    {
      "name": "script.py",
      "type": "file",
      "size": "1.2K",
      "permissions": "-rw-r--r--",
      "modified": "Feb 8 12:30"
    }
  ]
}
```

### Read File
**Replaces `/api/files/{file_id}`**

```http
GET /api/virtual-env/environments/{env_id}/files/script.py
```

**Response:**
```json
{
  "success": true,
  "path": "/workspace/script.py",
  "content": "print('Hello World')"
}
```

### Write/Update File
**Replaces `POST /api/files/` and `PUT /api/files/{file_id}`**

```http
PUT /api/virtual-env/environments/{env_id}/files/script.py
Content-Type: application/json

{
  "content": "print('Hello World')",
  "append": false  // Optional, default false
}
```

### Create File or Directory
```http
POST /api/virtual-env/environments/{env_id}/files/create
Content-Type: application/json

{
  "path": "src/main.py",
  "type": "file"  // "file" or "directory"
}
```

### Delete File
**Replaces `DELETE /api/files/{file_id}`**

```http
DELETE /api/virtual-env/environments/{env_id}/files/script.py
```

### Rename File
```http
POST /api/virtual-env/environments/{env_id}/files/rename
Content-Type: application/json

{
  "old_path": "old_name.py",
  "new_path": "new_name.py"
}
```

### Create Directory
```http
POST /api/virtual-env/environments/{env_id}/mkdir
Content-Type: application/json

{
  "path": "src/utils"
}
```

---

## Package Management (Docker-Only)

### Install Packages
```http
POST /api/virtual-env/environments/{env_id}/install
Content-Type: application/json

{
  "manager": "npm",  // Options: "npm", "yarn", "pip", "pip3", "apt-get", "apk"
  "packages": ["express", "axios"]
}
```

**Response:**
```json
{
  "success": true,
  "stdout": "added 50 packages...",
  "stderr": "",
  "execution_time": 15.3
}
```

### List Installed Packages
```http
GET /api/virtual-env/environments/{env_id}/packages?manager=npm
```

---

## Frontend Integration Guide

### 1. Run Button Implementation

**OLD (INSECURE):**
```javascript
// ❌ This executed on host server
fetch('/api/executor/execute', {
  method: 'POST',
  body: JSON.stringify({ code, language })
})
```

**NEW (SECURE):**
```javascript
// ✅ This executes in Docker container
const envId = getCurrentEnvironmentId(); // Get active environment

fetch(`/api/virtual-env/environments/${envId}/execute`, {
  method: 'POST',
  headers: {
    'X-User-ID': userId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    command: `python ${filename}` // or `node ${filename}`, etc.
  })
})
```

### 2. Terminal Implementation

**OLD (INSECURE):**
```javascript
// ❌ This executed PowerShell on host
fetch('/api/terminal/execute', {
  method: 'POST',
  body: JSON.stringify({ command })
})
```

**NEW (SECURE):**
```javascript
// ✅ This executes in Docker container
fetch(`/api/virtual-env/environments/${envId}/execute`, {
  method: 'POST',
  headers: {
    'X-User-ID': userId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ command })
})
```

### 3. File Explorer Implementation

**OLD (INSECURE):**
```javascript
// ❌ This used in-memory storage
fetch('/api/files/', { method: 'GET' })
fetch('/api/files/', { method: 'POST', body: JSON.stringify({ name, content }) })
fetch(`/api/files/${fileId}`, { method: 'PUT', body: JSON.stringify({ content }) })
fetch(`/api/files/${fileId}`, { method: 'DELETE' })
```

**NEW (SECURE):**
```javascript
// ✅ This uses Docker filesystem
const envId = getCurrentEnvironmentId();

// List files
fetch(`/api/virtual-env/environments/${envId}/files?path=/workspace`, {
  headers: { 'X-User-ID': userId }
})

// Create file
fetch(`/api/virtual-env/environments/${envId}/files/create`, {
  method: 'POST',
  headers: { 'X-User-ID': userId, 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: 'script.py', type: 'file' })
})

// Write file
fetch(`/api/virtual-env/environments/${envId}/files/script.py`, {
  method: 'PUT',
  headers: { 'X-User-ID': userId, 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'print("Hello")' })
})

// Delete file
fetch(`/api/virtual-env/environments/${envId}/files/script.py`, {
  method: 'DELETE',
  headers: { 'X-User-ID': userId }
})
```

---

## Security Features

All operations are now:
- ✅ Executed inside isolated Docker containers
- ✅ Validated by `SecurityValidator` before execution
- ✅ Resource-limited (CPU, memory, disk, PIDs)
- ✅ Network-isolated (except during package installation)
- ✅ Logged for audit trails
- ✅ Scoped to `/workspace` directory only

**Dangerous commands are automatically blocked:**
- System modification (`sudo`, `rm -rf /`, etc.)
- Container escape attempts (`/proc/self/exe`, `/var/run/docker.sock`)
- Network attacks (`nmap`, `netcat`)
- Privilege escalation (`/etc/passwd`, `setuid`)

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "reason": "Detailed explanation"  // Optional
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request / validation error
- `401` - Authentication required
- `403` - Command blocked for security
- `404` - Environment/file not found
- `500` - Server error
