# Roolts Production Deployment Guide

## Pre-Deployment Checklist

### Environment Setup

- [ ] Set strong `SECRET_KEY` in environment variables
- [ ] Configure database connection strings
- [ ] Set up SSL/TLS certificates
- [ ] Configure domain and DNS
- [ ] Prepare monitoring and logging systems

### Security Configuration

- [ ] Review and adjust rate limiting parameters
- [ ] Configure JWT token expiration
- [ ] Set up backup procedures for user workspaces
- [ ] Configure firewall rules
- [ ] Set up intrusion detection

## Docker Deployment

### 1. Build Docker Image

```bash
# Build the secure Docker image
docker build -t roolts-backend:v2.0 .

# Tag for registry
docker tag roolts-backend:v2.0 your-registry/roolts-backend:v2.0
```

### 2. Environment Configuration

Create `.env.prod` file:

```env
FLASK_ENV=production
SECRET_KEY=your-super-secret-key-here
DATABASE_URL=postgresql://user:password@localhost/roolts_production
JWT_SECRET_KEY=another-secret-for-jwt
RATELIMIT_REQUESTS_PER_MINUTE=60
MAX_CONTENT_LENGTH=16777216
```

### 3. Docker Compose Production

```yaml
version: "3.8"
services:
  roolts-backend:
    image: roolts-backend:v2.0
    restart: unless-stopped
    ports:
      - "5000:5000"
    env_file:
      - .env.prod
    volumes:
      - ./user_workspaces:/app/user_workspaces
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /app/user_workspaces
    ulimits:
      nproc: 65535
      nofile:
        soft: 65535
        hard: 65535
```

## Cloud Platform Deployment

### AWS ECS/Fargate

```json
{
  "family": "roolts-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "roolts-backend",
      "image": "your-ecr-repo/roolts-backend:v2.0",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "FLASK_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:roolts-secrets"
        }
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:5000/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/roolts-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Run

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: roolts-backend
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/memory: "2Gi"
        run.googleapis.com/cpu: "2"
        run.googleapis.com/max-scale: "10"
    spec:
      serviceAccountName: roolts-backend-sa
      containers:
        - image: gcr.io/project-id/roolts-backend:v2.0
          ports:
            - containerPort: 5000
          env:
            - name: FLASK_ENV
              value: production
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: roolts-secrets
                  key: secret-key
          resources:
            limits:
              memory: "2Gi"
              cpu: "2000m"
```

### Heroku

```bash
# Create Heroku app
heroku create roolts-backend-prod

# Set environment variables
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=your-secret-key

# Deploy using container
heroku container:push web
heroku container:release web

# Enable health checks
heroku features:enable runtime-heroku-metrics
```

## Nginx Reverse Proxy

### SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.roolts.com;

    ssl_certificate /etc/ssl/certs/roolts.pem;
    ssl_certificate_key /etc/ssl/private/roolts.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    location / {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.roolts.com;
    return 301 https://$server_name$request_uri;
}
```

## Database Setup

### PostgreSQL (Recommended)

```sql
-- Create database and user
CREATE DATABASE roolts_production;
CREATE USER roolts_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE roolts_production TO roolts_user;

-- Create tables (run via Flask migrate)
flask db upgrade
```

### SQLite (Development Only)

```python
# In production, use PostgreSQL
DATABASE_URL = 'sqlite:///roolts_production.db'  # NOT recommended for production
```

## Monitoring Setup

### Health Check Endpoints

```bash
# Application health
curl -f https://api.roolts.com/api/health

# Service-specific health
curl -f https://api.roolts.com/api/terminal/health
curl -f https://api.roolts.com/api/executor/health
curl -f https://api.roolts.com/api/file-manager/health
```

### Prometheus Metrics (Optional)

```python
# metrics.py
from prometheus_client import Counter, Histogram, generate_latest

REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency')

@app.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype='text/plain')
```

### Log Management

```python
# logging_config.py
import logging
from logging.handlers import RotatingFileHandler

if app.config['FLASK_ENV'] == 'production':
    file_handler = RotatingFileHandler('logs/roolts.log', maxBytes=10240000, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
```

## Security Hardening

### 1. Server Hardening

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install fail2ban for intrusion prevention
sudo apt install fail2ban -y

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 2. Application Security

```bash
# Run security scan
docker run --rm -v $(pwd):/app python:3.11-slim sh -c "pip install bandit && bandit -r /app"

# Check for vulnerabilities
pip install safety
safety check
```

### 3. SSL/TLS Setup

```bash
# Using Let's Encrypt
sudo certbot --nginx -d api.roolts.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Performance Optimization

### 1. Gunicorn Configuration

```python
# gunicorn_config.py
bind = "0.0.0.0:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 120
keepalive = 5
preload_app = True
```

### 2. Caching Strategy

```python
# Add Redis for session storage
REDIS_URL = 'redis://localhost:6379/0'
SESSION_TYPE = 'redis'
SESSION_REDIS = redis.from_url(REDIS_URL)
```

### 3. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_user_files_user_id ON user_files(user_id);
CREATE INDEX idx_user_directories_user_id ON user_directories(user_id);
CREATE INDEX idx_user_files_path ON user_files(file_path);
```

## Backup Strategy

### 1. Database Backup

```bash
#!/bin/bash
# backup_db.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump roolts_production > "/backups/roolts_db_$DATE.sql"

# Cleanup old backups (keep last 7 days)
find /backups -name "roolts_db_*.sql" -mtime +7 -delete
```

### 2. User Workspace Backup

```bash
#!/bin/bash
# backup_workspaces.sh
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "/backups/workspaces_$DATE.tar.gz" user_workspaces/

# Cleanup old backups
find /backups -name "workspaces_*.tar.gz" -mtime +30 -delete
```

### 3. Automated Backup with Cron

```bash
# Add to crontab
0 2 * * * /path/to/backup_db.sh
0 3 * * * /path/to/backup_workspaces.sh
```

## Troubleshooting

### Common Issues

#### 1. Permission Errors

```bash
# Fix workspace permissions
sudo chown -R appuser:appuser user_workspaces/
sudo chmod -R 755 user_workspaces/
```

#### 2. Memory Issues

```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.yml
memory: 4G
```

#### 3. Database Connection Issues

```python
# Check database connectivity
flask shell
>>> from app import db
>>> db.engine.execute('SELECT 1')
```

#### 4. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/roolts.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew --force-renewal
```

### Monitoring Commands

```bash
# Check application logs
docker logs -f roolts-backend

# Monitor resource usage
htop

# Check disk space
df -h

# Monitor network connections
netstat -tulpn | grep :5000
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Verify all services are healthy
curl -f https://api.roolts.com/api/health
curl -f https://api.roolts.com/api/terminal/health
curl -f https://api.roolts.com/api/executor/health
```

### 2. Security Tests

```bash
# Test authentication
curl -X POST https://api.roolts.com/api/terminal/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls"}'
# Should return 401 Unauthorized

# Test rate limiting
for i in {1..100}; do curl https://api.roolts.com/api/health; done
# Should start returning 429 after limit
```

### 3. Performance Tests

```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://api.roolts.com/api/health

# Or with wrk
wrk -t12 -c400 -d30s https://api.roolts.com/api/health
```

This production deployment guide ensures your Roolts backend is deployed securely and efficiently with proper monitoring and maintenance procedures.
