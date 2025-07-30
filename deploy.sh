#!/bin/bash

# DarulKubra Registration System - AWS Lightsail Deployment Script
# This script sets up a complete deployment environment on AWS Lightsail

set -e  # Exit on any error

echo "🚀 Starting DarulKubra Registration System Deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install nginx -y

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/darulkubra
sudo chown $USER:$USER /var/www/darulkubra

# Clone the repository (you'll need to update this with your actual repo URL)
echo "📥 Cloning repository..."
cd /var/www/darulkubra
git clone https://github.com/yourusername/darulkubra-registration.git .

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build the application
echo "🔨 Building the application..."
npm run build

# Create environment file
echo "🔧 Creating environment file..."
cat > .env << EOF
# Database Configuration
DATABASE_URL="mysql://darulkubra:your_password@localhost:3306/darulkubra"

# NextAuth Configuration
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# SMS Configuration
AFROMSG_API_TOKEN="your-afromessage-api-token"
AFROMSG_SENDER_UID="your-sender-uid"
AFROMSG_SENDER_NAME="DarulKubra"

# Other Configuration
NODE_ENV="production"
EOF

# Create PM2 ecosystem file
echo "🔧 Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'darulkubra-registration',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/darulkubra',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/darulkubra-error.log',
      out_file: '/var/log/pm2/darulkubra-out.log',
      log_file: '/var/log/pm2/darulkubra-combined.log',
      time: true
    }
  ]
};
EOF

# Create PM2 log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Start the application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx
echo "🔧 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/darulkubra << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/darulkubra /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Install and configure SSL with Certbot (optional)
echo "🔒 Setting up SSL certificate..."
sudo apt install certbot python3-certbot-nginx -y

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update the .env file with your actual configuration"
echo "2. Run database migrations: npx prisma migrate deploy"
echo "3. Set up SSL certificate: sudo certbot --nginx -d your-domain.com"
echo "4. Configure your domain DNS to point to this server"
echo ""
echo "🔍 Useful commands:"
echo "- View logs: pm2 logs darulkubra-registration"
echo "- Restart app: pm2 restart darulkubra-registration"
echo "- Monitor: pm2 monit"
echo "- Status: pm2 status" 