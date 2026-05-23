# Deployment

## VPS spec

**Provider:** Any VPS Provider  
**Plan:** 2 vCPU, 4 GB RAM, 40 GB SSD 
**OS:** Ubuntu 22.04 LTS

## Initial server setup

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20 (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Install PM2 globally
npm install -g pm2

# Install MySQL 5.7 - 8.0
apt install mysql-server -y
mysql_secure_installation

# Create database and user
mysql -u root -p <<SQL
CREATE DATABASE deep_sonar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'deepsonar'@'localhost' IDENTIFIED BY 'strongpassword';
GRANT ALL PRIVILEGES ON deep_sonar.* TO 'deepsonar'@'localhost';
FLUSH PRIVILEGES;
SQL

# Install Nginx
apt install nginx -y
```

## Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh

# Pull the embedding model (~274 MB)
ollama pull nomic-embed-text

# Enable Ollama as a systemd service (auto-starts on reboot)
systemctl enable ollama
systemctl start ollama

# Verify
curl http://localhost:11434/api/tags
```

## Deploy the application

```bash
# Clone repo
git clone https://github.com/BlackAmda/deep-sonar.git /var/www/deep-sonar
cd /var/www/deep-sonar

# Install dependencies
npm install

# Set up environment file
cp .env.example .env.local
# Edit .env.local with real values

# Run Prisma migrations
npx prisma generate
npx prisma migrate deploy

# Build Next.js
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # follow the printed command to enable auto-start
```

## Environment requirements

| Variable | Requirement |
|---|---|
| `ENCRYPTION_KEY` | Exactly 64 hex chars (32 bytes). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXTAUTH_SECRET` or `ADMIN_TOKEN` | At least one must be set. App throws at startup if both missing. |

## PM2 ecosystem config

```js
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'deep-sonar',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,  // must stay 1 — rate limiter is process-local (in-memory Map)
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
};
```

> **Rate limiter constraint:** bucket state is stored in a module-level `Map`. Running multiple PM2 instances (`instances: N`) multiplies the effective rate limit by N. Keep `instances: 1` unless you replace the rate limiter with a shared store (Redis).

## Nginx config

```nginx
# /etc/nginx/sites-available/deep-sonar

server {
    listen 80;
    server_name your-vps-ip;

    # External search API - accessible to internal projects
    location /api/sessions { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }
    location /api/search   { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }
    location /api/ingest   { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }
    location /api/health   { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; }

    # Admin dashboard - restrict to internal IP range
    location / {
        allow 10.0.0.0/8;   # adjust to your internal network
        deny all;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable config
ln -s /etc/nginx/sites-available/deep-sonar /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## Useful PM2 commands

```bash
pm2 list                    # status
pm2 logs deep-sonar         # tail logs
pm2 restart deep-sonar      # restart
pm2 reload ecosystem.config.js  # zero-downtime reload
```

## Deploying updates

```bash
cd /var/www/deep-sonar
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 reload ecosystem.config.js
```

## Running tests

```bash
npm test           # watch mode
npm run test:coverage  # coverage report
```
