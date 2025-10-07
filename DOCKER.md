# Docker Deployment Guide

Hướng dẫn triển khai Server Monitoring Bot bằng Docker.

## 📋 Yêu cầu

- Docker Engine 20.10+
- Docker Compose 2.0+
- File `.env` đã được cấu hình

## 🚀 Cách sử dụng

### 1. Chuẩn bị môi trường

```bash
# Copy file cấu hình mẫu
cp env.example .env

# Chỉnh sửa file .env với thông tin thực tế
nano .env
```

### 2. Build và chạy với Docker Compose (Khuyến nghị)

```bash
# Build và start container
docker-compose up -d

# Xem logs
docker-compose logs -f

# Stop container
docker-compose down
```

### 3. Build và chạy với Docker trực tiếp

```bash
# Build image
docker build -t server-monitoring-bot .

# Chạy container
docker run -d \
  --name server-monitor \
  --env-file .env \
  --restart unless-stopped \
  server-monitoring-bot

# Xem logs
docker logs -f server-monitor

# Stop container
docker stop server-monitor
docker rm server-monitor
```

## 🔧 Cấu hình nâng cao

### Environment Variables

Các biến môi trường có thể được set trực tiếp:

```bash
docker run -d \
  --name server-monitor \
  -e LARK_WEBHOOK_URL="https://open.larksuite.com/open-apis/bot/v2/hook/your-token" \
  -e SERVER_URLS="https://api.example.com,https://app.example.com" \
  -e MONITORING_INTERVAL="*/5 * * * *" \
  -e VERBOSE_LOGGING="true" \
  --restart unless-stopped \
  server-monitoring-bot
```

### Resource Limits

```bash
docker run -d \
  --name server-monitor \
  --env-file .env \
  --memory="256m" \
  --cpus="0.5" \
  --restart unless-stopped \
  server-monitoring-bot
```

### Volume Mounts (Optional)

```bash
# Mount logs directory
docker run -d \
  --name server-monitor \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  server-monitoring-bot
```

## 📊 Monitoring & Debugging

### Xem logs

```bash
# Docker Compose
docker-compose logs -f server-monitor

# Docker trực tiếp
docker logs -f server-monitor

# Chỉ xem logs mới nhất
docker logs --tail 50 server-monitor
```

### Health Check

```bash
# Kiểm tra trạng thái container
docker ps

# Xem chi tiết health check
docker inspect server-monitor | grep -A 10 Health
```

### Truy cập container

```bash
# Vào container để debug
docker exec -it server-monitor sh

# Chạy lệnh trong container
docker exec server-monitor node -e "console.log('Test command')"
```

## 🔄 Cập nhật ứng dụng

```bash
# Pull code mới
git pull

# Rebuild và restart
docker-compose down
docker-compose up -d --build

# Hoặc với Docker trực tiếp
docker stop server-monitor
docker rm server-monitor
docker build -t server-monitoring-bot .
docker run -d --name server-monitor --env-file .env server-monitoring-bot
```

## 🛠 Troubleshooting

### Container không start được

```bash
# Kiểm tra logs
docker logs server-monitor

# Kiểm tra cấu hình
docker run --rm --env-file .env server-monitoring-bot node -e "
const { validateConfig } = require('./config');
const result = validateConfig();
console.log(result);
"
```

### Lỗi kết nối webhook

```bash
# Test webhook từ container
docker exec server-monitor node -e "
const axios = require('axios');
axios.post(process.env.LARK_WEBHOOK_URL, {
  msg_type: 'text',
  content: { text: 'Test from Docker container' }
}).then(() => console.log('✅ Webhook OK'))
  .catch(err => console.log('❌ Webhook Error:', err.message));
"
```

### Container sử dụng quá nhiều tài nguyên

```bash
# Kiểm tra resource usage
docker stats server-monitor

# Giới hạn tài nguyên
docker update --memory="128m" --cpus="0.25" server-monitor
```

## 🏗 Production Deployment

### Docker Swarm

```yaml
# docker-stack.yml
version: '3.8'
services:
  server-monitor:
    image: server-monitoring-bot:latest
    env_file:
      - .env
    deploy:
      replicas: 1
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

```bash
# Deploy stack
docker stack deploy -c docker-stack.yml monitoring
```

### Kubernetes

```yaml
# k8s-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: server-monitoring-bot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: server-monitoring-bot
  template:
    metadata:
      labels:
        app: server-monitoring-bot
    spec:
      containers:
      - name: server-monitor
        image: server-monitoring-bot:latest
        envFrom:
        - secretRef:
            name: monitoring-secrets
        resources:
          limits:
            memory: "256Mi"
            cpu: "500m"
          requests:
            memory: "128Mi"
            cpu: "250m"
```

## 🔐 Security Best Practices

1. **Không hardcode secrets** trong Dockerfile
2. **Sử dụng non-root user** (đã implement)
3. **Giới hạn tài nguyên** container
4. **Cập nhật base image** thường xuyên
5. **Scan vulnerabilities**:

```bash
# Scan image với Docker Scout
docker scout cves server-monitoring-bot

# Hoặc với Trivy
trivy image server-monitoring-bot
```

## 📝 Logs và Monitoring

### Centralized Logging

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  server-monitor:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: localhost:24224
        tag: server-monitoring-bot
```

### Metrics Collection

```bash
# Thêm Prometheus metrics (future enhancement)
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  prom/prometheus
```
