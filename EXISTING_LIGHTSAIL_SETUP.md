# 🚀 Existing Lightsail Setup Guide

This guide is for deploying to your existing Lightsail instance with Apache and MySQL.

## 📋 Current Environment

- ✅ AWS Lightsail Instance
- ✅ MySQL Database
- ✅ Apache Web Server

## 🎯 Quick Deployment Steps

### **Step 1: Connect to Your Instance**

```bash
# Via SSH or browser terminal
ssh -i your-key.pem ubuntu@your-instance-ip
```

### **Step 2: Download and Run Deployment Script**

```bash
# Download the Apache deployment script
wget https://raw.githubusercontent.com/ez-programmer4/darulkubra/main/deploy-apache.sh

# Make it executable
chmod +x deploy-apache.sh

# Run the deployment
./deploy-apache.sh
```

### **Step 3: Configure Database**

Since you already have MySQL, let's create the database and user:

```bash
# Connect to MySQL
sudo mysql -u root -p
```

In MySQL:

```sql
CREATE DATABASE darulkubra;
CREATE USER 'darulkubra'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON darulkubra.* TO 'darulkubra'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### **Step 4: Update Environment Variables**

```bash
# Edit the environment file
nano /var/www/darulkubra/.env
```

Update with your actual values:

```env
# Database Configuration (use your existing MySQL)
DATABASE_URL="mysql://darulkubra:your_secure_password@localhost:3306/darulkubra"

# NextAuth Configuration
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-very-long-random-secret-key"

# SMS Configuration
AFROMSG_API_TOKEN="your-afromessage-api-token"
AFROMSG_SENDER_UID="your-sender-uid"
AFROMSG_SENDER_NAME="DarulKubra"

# Other Configuration
NODE_ENV="production"
```

### **Step 5: Run Database Migrations**

```bash
cd /var/www/darulkubra
npx prisma migrate deploy
npx prisma generate
```

### **Step 6: Test Your Application**

```bash
# Check if the app is running
pm2 status
pm2 logs darulkubra-registration

# Visit your application
# http://your-instance-ip
```

## 🔧 Apache Configuration Details

The deployment script will:

1. **Install Node.js 18.x** and PM2
2. **Clone your repository** to `/var/www/darulkubra`
3. **Build the Next.js application**
4. **Configure Apache** as a reverse proxy to port 3000
5. **Set up PM2** to manage the Node.js process

### **Apache Virtual Host**

The script creates this Apache configuration:

```apache
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
    ErrorLog ${APACHE_LOG_DIR}/darulkubra_error.log
    CustomLog ${APACHE_LOG_DIR}/darulkubra_access.log combined
</VirtualHost>
```

## 🔍 Monitoring Commands

```bash
# Application logs
pm2 logs darulkubra-registration

# Application status
pm2 status

# Monitor resources
pm2 monit

# Apache logs
sudo tail -f /var/log/apache2/darulkubra_access.log
sudo tail -f /var/log/apache2/darulkubra_error.log

# System resources
htop
df -h
free -h
```

## 🚨 Troubleshooting

### **If the application doesn't start:**

```bash
# Check PM2 logs
pm2 logs darulkubra-registration

# Restart the application
pm2 restart darulkubra-registration

# Check if port 3000 is in use
sudo netstat -tlnp | grep :3000
```

### **If Apache shows errors:**

```bash
# Test Apache configuration
sudo apache2ctl configtest

# Check Apache error logs
sudo tail -f /var/log/apache2/error.log

# Restart Apache
sudo systemctl restart apache2
```

### **If database connection fails:**

```bash
# Test MySQL connection
mysql -u darulkubra -p darulkubra

# Check if MySQL is running
sudo systemctl status mysql

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

## 🔒 SSL Certificate (Optional)

To add HTTPS:

```bash
# Install Certbot for Apache
sudo apt install certbot python3-certbot-apache -y

# Get SSL certificate
sudo certbot --apache -d your-domain.com
```

## 📊 What You'll Get

### **✅ Admin Features:**

- Configurable earnings rates
- Real-time rate updates
- Rate history tracking

### **✅ Controller Features:**

- Motivational messages
- Achievement badges
- Performance tips
- Detailed earnings explanations

### **✅ Technical Features:**

- Production-ready setup
- Automatic process management (PM2)
- Apache reverse proxy
- Database migrations
- Logging and monitoring

## 🎉 Success Checklist

- [ ] Application is accessible via HTTP/HTTPS
- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] PM2 process running
- [ ] Apache proxy working
- [ ] SSL certificate installed (optional)

---

**Ready to deploy! 🚀**
