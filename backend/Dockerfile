# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Install system dependencies
# - openjdk-17-jre-headless: For executing Java code
# - nodejs & npm: For executing JavaScript code
# - curl: For health checks
RUN apt-get update && apt-get install -y \
    openjdk-17-jre-headless \
    nodejs \
    npm \
    build-essential \
    golang-go \
    curl \
    unzip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create user workspaces directory with proper permissions
RUN mkdir -p user_workspaces && chmod 755 user_workspaces

# Create non-root user for security
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app && \
    chmod -R 755 /app

# Switch to non-root user
USER appuser

# Set environment variable for the port (default 5000, Render overrides this)
ENV PORT=5000

# Expose the port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health || exit 1

# Command to run the application using gunicorn with security settings
# Multi-worker setup with proper timeout and security
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --worker-class sync --max-requests 1000 --max-requests-jitter 100 app:app"]
