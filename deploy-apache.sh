#!/bin/bash

# DarulKubra Registration System - Apache Deployment Script
# For existing Lightsail instance with MySQL and Apache

set -e  # Exit on any error

echo "🚀 Starting DarulKubra Registration System Deployment (Apache)..."

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

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/darulkubra
sudo chown $USER:$USER /var/www/darulkubra

# Clone the repository
echo "📥 Cloning repository..."
cd /var/www/darulkubra
git clone https://github.com/ez-programmer4/darulkubra.git .

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

# Configure Apache as reverse proxy
echo "🔧 Configuring Apache as reverse proxy..."

# Create Apache virtual host configuration
sudo tee /etc/apache2/sites-available/darulkubra.conf << EOF
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    # Proxy settings
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Enable compression
    <Location />
        SetOutputFilter DEFLATE
        SetEnvIfNoCase Request_URI \.(?:gif|jpe?g|png|rar|zip|exe|flv|mov|wma|mp3|avi|swf|mp?g|mp4|webm|webp)$ no-gzip dont-vary
        SetEnvIfNoCase Request_URI \.(?:css|js)$ no-gzip dont-vary
    </Location>
    
    # Logs
    ErrorLog \${APACHE_LOG_DIR}/darulkubra_error.log
    CustomLog \${APACHE_LOG_DIR}/darulkubra_access.log combined
</VirtualHost>
EOF

# Enable required Apache modules
echo "🔧 Enabling Apache modules..."
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod deflate
sudo a2enmod rewrite

# Disable default site and enable our site
sudo a2dissite 000-default.conf
sudo a2ensite darulkubra.conf

# Test Apache configuration
echo "🔧 Testing Apache configuration..."
sudo apache2ctl configtest

# Restart Apache
echo "🔧 Restarting Apache..."
sudo systemctl restart apache2
sudo systemctl enable apache2

# Install and configure SSL with Certbot (optional)
echo "🔒 Setting up SSL certificate..."
sudo apt install certbot python3-certbot-apache -y

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update the .env file with your actual configuration"
echo "2. Run database migrations: npx prisma migrate deploy"
echo "3. Set up SSL certificate: sudo certbot --apache -d your-domain.com"
echo "4. Configure your domain DNS to point to this server"
echo ""
echo "🔍 Useful commands:"
echo "- View logs: pm2 logs darulkubra-registration"
echo "- Restart app: pm2 restart darulkubra-registration"
echo "- Monitor: pm2 monit"
echo "- Status: pm2 status"
echo "- Apache logs: sudo tail -f /var/log/apache2/darulkubra_access.log" 