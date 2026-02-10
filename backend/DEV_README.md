# Roolts Development Quick Start

## 🚀 Running in Development Mode

### Option 1: Using the Development Server (Recommended)

```bash
python dev_server.py
```

### Option 2: Using Regular Flask

```bash
python app.py
```

## 🔧 Development Features

### Authentication Bypass

- ✅ **No login required** in development mode
- ✅ **Default dev user**: `dev_user_123`
- ✅ **All secure endpoints** work without JWT tokens

### Terminal Access

```bash
# These commands now work without authentication:
curl -X POST http://localhost:5000/api/terminal/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls"}'

curl -X POST http://localhost:5000/api/terminal/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "python --version"}'
```

### Code Execution

```bash
curl -X POST http://localhost:5000/api/executor/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello World!\")", "language": "python"}'
```

### File Management

```bash
# List files in dev user workspace
curl http://localhost:5000/api/file-manager/list

# Get workspace stats
curl http://localhost:5000/api/file-manager/workspace-stats
```

## 🧪 Testing

Run the test script to verify everything is working:

```bash
python test_terminal.py
```

## 📁 User Workspaces

In development mode, all files are stored in:

```
user_workspaces/dev_user_123/
```

This directory is automatically created and persists between sessions.

## 🔒 Security in Development

### What's Disabled:

- JWT token requirements
- Strict authentication validation
- Rate limiting (increased limits)

### What's Still Active:

- Command filtering (safe commands only)
- Path validation (no directory traversal)
- User workspace isolation
- File type validation
- Resource limits

## 🌐 Available Endpoints

### Core Services

- `GET /api/health` - Service health check
- `GET /api/terminal/health` - Terminal service health
- `GET /api/executor/health` - Executor service health

### Development Auth

- `POST /api/dev-auth/dev-login` - Get development JWT token
- `GET /api/dev-auth/dev-status` - Check development status

### Terminal

- `POST /api/terminal/execute` - Execute terminal commands
- `GET /api/terminal/cwd` - Get current working directory
- `GET /api/terminal/workspace/info` - Get workspace information

### Code Execution

- `POST /api/executor/execute` - Execute code
- `GET /api/executor/languages` - Get supported languages

### File Management

- `GET /api/file-manager/list` - List files/folders
- `POST /api/file-manager/upload` - Upload files
- `GET /api/file-manager/read` - Read file content
- `POST /api/file-manager/write` - Write file content

## 🔄 Switching to Production

When deploying to production:

1. **Remove** `.env.dev` file
2. **Create** `.env` file with production settings:
   ```
   FLASK_ENV=production
   DEV_MODE_BYPASS_AUTH=false
   SECRET_KEY=your-production-secret-key
   ```
3. **Set up** proper JWT authentication
4. **Configure** database and external services

## ⚠️ Important Notes

- **Development mode** should NEVER be used in production
- **Authentication bypass** creates security vulnerabilities
- **Always test** with authentication enabled before deploying
- **User data** in development persists in `user_workspaces/`

## 🐛 Troubleshooting

### Terminal Returns 500 Errors

1. Check if server is running: `curl http://localhost:5000/api/health`
2. Verify development mode: `curl http://localhost:5000/api/dev-auth/dev-status`
3. Run test script: `python test_terminal.py`

### Commands Blocked

- Check if command is in allowed list (see `ALLOWED_COMMANDS` in terminal.py)
- Some dangerous commands are blocked for security

### File Permission Issues

```bash
# Fix workspace permissions (if needed)
chmod -R 755 user_workspaces/
```

---

Happy coding! 🎉
