# How to Recreate Docker Containers

## Automatic Method (Recommended)

The backend automatically creates Docker containers when needed:

1. **Just refresh your browser**
2. The `backgroundEnvManager` will automatically:
   - Create a new `default-workspace` environment
   - Start the container
   - You're ready to code!

## Manual Method (If Automatic Fails)

### Option 1: Using the API

```bash
# Create a new environment
curl -X POST http://localhost:5000/api/virtual-env/environments \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 1" \
  -d '{"name": "default-workspace", "type": "fullstack"}'

# Start the environment (use the ID from response)
curl -X POST http://localhost:5000/api/virtual-env/environments/{env_id}/start \
  -H "X-User-ID: 1"
```

### Option 2: Restart Backend

```bash
# Stop backend (Ctrl+C)
# Restart backend
cd backend
python app.py
```

Then refresh your browser - the backend will auto-create the container.

## Verify Container is Running

```bash
docker ps
```

You should see a container with name like `roolts_env_1_1` or similar.

## What Happens Automatically

When you open the app:
1. `backgroundEnvManager.initialize()` runs
2. Checks if `default-workspace` environment exists
3. If not, creates it automatically
4. Starts the container
5. You can start coding immediately

## Troubleshooting

### Container Not Created?
- Check backend logs for errors
- Ensure Docker Desktop is running
- Check `docker ps -a` to see all containers

### Files Missing?
- Files are stored in Docker volumes
- If you deleted the container AND volume, files are gone
- Create new files - they'll be saved to the new container

### Backend Connection Error?
```
Error: connect ECONNREFUSED 127.0.0.1:5000
```
- Backend is not running
- Start backend: `cd backend && python app.py`
- Wait for "Running on http://127.0.0.1:5000"

## Summary

**You don't need to do anything special!** Just:
1. Make sure backend is running (`python app.py`)
2. Refresh your browser
3. Container auto-creates ✨
