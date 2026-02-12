---
description: How to host Roolts on Netlify (Frontend) and Render (Backend)
---

# Hosting Roolts (Split-Stack)

Since Roolts uses a React frontend and a Flask backend, the easiest way to host it is by splitting the deployment.

## 1. Hosting the Backend (Render)
Render is a great free/cheap tier option for Flask apps.

1. Create a [Render](https://render.com) account.
2. Create a "Web Service" and connect your GitHub repository.
3. Use the following settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Add **Environment Variables**:
   - `SECRET_KEY`: Your secret key.
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `DEEPSEEK_API_KEY`: Your DeepSeek API key.
   - `FLASK_ENV`: `production`
5. Note your backend URL (e.g., `https://roolts-api.onrender.com`).

## 2. Hosting the Frontend (Netlify)
1. Go to your [Netlify](https://www.netlify.com) dashboard.
2. Select "Add new site" > "Import from an existing project".
3. Connect your GitHub repository.
4. Use the following settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click **Deploy**.
6. **IMPORTANT**: Update your API URL:
   - Your `netlify.toml` is already configured to proxy `/api` to your backend.
   - Update the `to` field in `frontend/netlify.toml` to match your Render URL.

## 3. Post-Deployment
- Ensure the Render backend allows CORS from your Netlify domain.
- Update any OAuth redirect URIs (GitHub/Twitter) to point to your newproduction URLs.
