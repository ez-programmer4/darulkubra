# 🚀 DarulKubra Registration System - AWS Lightsail Deployment Guide

This guide will walk you through deploying your DarulKubra Registration System to AWS Lightsail.

## 📋 Prerequisites

- AWS Account
- Domain name (optional but recommended)
- Git repository with your code
- Database credentials

## 🎯 Step-by-Step Deployment

### **Step 1: Create AWS Lightsail Instance**

1. **Login to AWS Console**

   - Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com/)
   - Sign in with your AWS account

2. **Create Instance**

   - Click "Create instance"
   - Choose your region (closest to your users)
   - Select "Linux/Unix" platform
   - Choose "Ubuntu 22.04 LTS"
   - Select instance plan (recommended: $10/month for production)
   - Name your instance: `darulkubra-production`
   - Click "Create instance"

3. **Connect to Instance**
   - Wait for instance to be running (green status)
   - Click on your instance name
   - Go to "Networking" tab
   - Add custom port: `80` (HTTP) and `443` (HTTPS)
   - Click "Save"

### **Step 2: SSH into Your Instance**

```bash
# Download the default key pair or use your own
# Connect via SSH
ssh -i your-key.pem ubuntu@your-instance-ip
```

### **Step 3: Run Deployment Script**

1. **Upload the deployment script**

   ```bash
   # On your local machine
   scp -i your-key.pem deploy.sh ubuntu@your-instance-ip:~/
   ```

2. **Make script executable and run**
   ```bash
   # On the Lightsail instance
   chmod +x deploy.sh
   ./deploy.sh
   ```

### **Step 4: Configure Environment Variables**

After the script runs, edit the `.env` file:

```bash
nano /var/www/darulkubra/.env
```

Update with your actual values:

```env
# Database Configuration
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

### **Step 5: Set Up Database**

#### **Option A: MySQL on the same instance (for testing)**

```bash
# Install MySQL
sudo apt install mysql-server -y

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE darulkubra;
CREATE USER 'darulkubra'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON darulkubra.* TO 'darulkubra'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### **Option B: External Database (recommended for production)**

Use AWS RDS or any external MySQL database service.

### **Step 6: Run Database Migrations**

```bash
cd /var/www/darulkubra
npx prisma migrate deploy
npx prisma generate
```

### **Step 7: Set Up Domain and SSL**

1. **Point your domain to the Lightsail instance IP**

   - Add an A record in your DNS settings
   - Point to your Lightsail instance IP

2. **Install SSL Certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### **Step 8: Test Your Application**

1. **Check if the app is running**

   ```bash
   pm2 status
   pm2 logs darulkubra-registration
   ```

2. **Test the website**
   - Visit `https://your-domain.com`
   - Test all major functionality

## 🔧 Post-Deployment Configuration

### **Set Up Automatic Backups**

```bash
# Create backup script
sudo nano /usr/local/bin/backup-darulkubra.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/darulkubra"

mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u darulkubra -p darulkubra > $BACKUP_DIR/database_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/darulkubra

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x /usr/local/bin/backup-darulkubra.sh

# Add to crontab for daily backups
crontab -e
# Add this line: 0 2 * * * /usr/local/bin/backup-darulkubra.sh
```

### **Set Up Monitoring**

```bash
# Install monitoring tools
sudo apt install htop iotop -y

# Monitor with PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🚨 Troubleshooting

### **Common Issues and Solutions**

1. **Application not starting**

   ```bash
   pm2 logs darulkubra-registration
   cd /var/www/darulkubra
   npm install
   npm run build
   pm2 restart darulkubra-registration
   ```

2. **Database connection issues**

   ```bash
   # Test database connection
   mysql -u darulkubra -p darulkubra

   # Check if MySQL is running
   sudo systemctl status mysql
   ```

3. **Nginx issues**

   ```bash
   # Test nginx configuration
   sudo nginx -t

   # Check nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

4. **SSL certificate issues**
   ```bash
   # Renew SSL certificate
   sudo certbot renew --dry-run
   ```

### **Useful Commands**

```bash
# View application logs
pm2 logs darulkubra-registration

# Restart application
pm2 restart darulkubra-registration

# Monitor system resources
pm2 monit

# Check application status
pm2 status

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
free -h
```

## 📊 Monitoring and Maintenance

### **Regular Maintenance Tasks**

1. **Weekly**

   - Check application logs for errors
   - Monitor disk space usage
   - Review backup success

2. **Monthly**

   - Update system packages: `sudo apt update && sudo apt upgrade`
   - Renew SSL certificates: `sudo certbot renew`
   - Review and clean old logs

3. **Quarterly**
   - Review and update dependencies
   - Check security updates
   - Performance optimization review

### **Performance Monitoring**

```bash
# Monitor real-time performance
pm2 monit

# Check system resources
htop

# Monitor disk usage
df -h

# Monitor memory usage
free -h
```

## 🔒 Security Considerations

1. **Firewall Configuration**

   ```bash
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

2. **Regular Security Updates**

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Database Security**
   - Use strong passwords
   - Limit database access
   - Regular backups

## 💰 Cost Estimation

- **Lightsail Instance**: $10/month (2GB RAM, 1 vCPU)
- **Domain**: ~$12/year
- **SSL Certificate**: Free (Let's Encrypt)
- **Total**: ~$10/month + domain cost

## 🎉 Success Checklist

- [ ] Application is accessible via HTTPS
- [ ] Database migrations completed successfully
- [ ] All environment variables configured
- [ ] SSL certificate installed
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Security measures implemented
- [ ] Performance optimized

## 📞 Support

If you encounter issues during deployment:

1. Check the logs: `pm2 logs darulkubra-registration`
2. Verify environment variables
3. Test database connectivity
4. Check nginx configuration
5. Review system resources

---

**Happy Deploying! 🚀**
