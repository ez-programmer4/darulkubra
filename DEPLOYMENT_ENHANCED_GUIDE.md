# Session Duration Tracking System - Enhanced Deployment Guide

## 🚀 Production-Ready Deployment Guide

This guide provides comprehensive instructions for deploying the enhanced session duration tracking system to production.

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Ensure these environment variables are set in your production environment:

```bash
# Required
DATABASE_URL=mysql://user:password@host:port/database
NEXTAUTH_SECRET=your-secure-random-secret-here
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Optional (for enhanced monitoring)
NODE_ENV=production
LOG_LEVEL=info
```

### 2. Database Migration

The database schema is already updated with session tracking fields. If you need to apply manually:

```sql
-- Add session tracking columns (if not already present)
ALTER TABLE wpos_zoom_links
ADD COLUMN session_ended_at DATETIME NULL,
ADD COLUMN session_duration_minutes INT NULL,
ADD COLUMN session_status ENUM('active', 'ended', 'timeout') DEFAULT 'active',
ADD COLUMN last_activity_at DATETIME NULL;

-- Add performance indexes
ALTER TABLE wpos_zoom_links
ADD INDEX idx_session_status (session_status),
ADD INDEX idx_last_activity (last_activity_at);
```

### 3. Validation Script

Run the validation script to ensure everything is ready:

```bash
# Make the script executable
chmod +x scripts/validate-session-tracking.js

# Run validation
node scripts/validate-session-tracking.js
```

## 🔧 Deployment Steps

### Step 1: Build and Deploy Application

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, AWS, etc.)
```

### Step 2: Set Up Cron Job

Choose one of the following methods:

#### Option A: Vercel Cron (Recommended for Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/session-timeout",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

#### Option B: External Cron Service

Use a service like cron-job.org or set up a server cron:

```bash
# Run every 2 hours
0 */2 * * * curl -s https://your-domain.com/api/cron/session-timeout
```

#### Option C: Server Cron Job

```bash
# Add to crontab
crontab -e

# Add this line (runs every 2 hours)
0 */2 * * * curl -s https://your-domain.com/api/cron/session-timeout
```

### Step 3: Test the System

#### Test Session Creation

```bash
curl -X POST https://your-domain.com/api/teachers/students/123/zoom \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"link": "https://zoom.us/j/123456789"}'
```

#### Test Session Tracking

Visit the tracking URL returned from the above request.

#### Test Admin Dashboard

Visit: `https://your-domain.com/admin/teacher-monitoring`

#### Test Auto-Timeout

```bash
curl -X POST https://your-domain.com/api/admin/auto-timeout
```

## 📊 Monitoring and Maintenance

### 1. Health Checks

Set up monitoring for these endpoints:

- `GET /api/cron/session-timeout` - Cron job health
- `GET /api/admin/teacher-sessions` - Admin API health
- `POST /api/zoom/heartbeat` - Session tracking health

### 2. Log Monitoring

Monitor these log patterns:

- `🕐 Starting auto-timeout process...` - Cron job execution
- `⏰ Timed out session` - Session timeouts
- `❌ Error in auto-timeout` - Error conditions
- `💓 Heartbeat received` - Active session monitoring

### 3. Performance Metrics

Track these metrics:

- **Session Duration**: Average session length
- **Timeout Rate**: Percentage of sessions that timeout
- **Active Sessions**: Current number of active sessions
- **Processing Time**: Auto-timeout job execution time

### 4. Database Maintenance

Run these queries periodically:

```sql
-- Check for orphaned sessions (sessions without proper cleanup)
SELECT COUNT(*) FROM wpos_zoom_links
WHERE session_status = 'active'
AND clicked_at < DATE_SUB(NOW(), INTERVAL 1 DAY);

-- Check session duration distribution
SELECT
  AVG(session_duration_minutes) as avg_duration,
  MIN(session_duration_minutes) as min_duration,
  MAX(session_duration_minutes) as max_duration,
  COUNT(*) as total_sessions
FROM wpos_zoom_links
WHERE session_duration_minutes IS NOT NULL;

-- Check for sessions with missing data
SELECT COUNT(*) FROM wpos_zoom_links
WHERE clicked_at IS NOT NULL
AND session_ended_at IS NULL
AND session_status = 'ended';
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Sessions Not Tracking

**Symptoms**: Sessions show as active but no duration is recorded
**Solutions**:

- Check if tracking URL is accessible
- Verify JavaScript is not blocked by browser
- Check network connectivity for heartbeat requests

#### 2. Auto-Timeout Not Working

**Symptoms**: Sessions remain active indefinitely
**Solutions**:

- Verify cron job is running: `curl https://your-domain.com/api/cron/session-timeout`
- Check database indexes are present
- Review auto-timeout logs for errors

#### 3. High Memory Usage

**Symptoms**: Server memory usage increases over time
**Solutions**:

- Check for memory leaks in session processing
- Verify batch processing is working (sessions processed in batches of 50)
- Monitor database connection pool

#### 4. Telegram Notifications Failing

**Symptoms**: Students don't receive Zoom links
**Solutions**:

- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check student `chat_id` values are valid
- Review retry logic in zoom link creation

### Debug Endpoints

Use these endpoints for debugging:

```bash
# Check system health
curl https://your-domain.com/api/cron/session-timeout

# Manual timeout trigger
curl -X POST https://your-domain.com/api/admin/auto-timeout

# Get session statistics
curl https://your-domain.com/api/admin/teacher-sessions
```

## 🔒 Security Considerations

### 1. Token Security

- Tracking tokens are randomly generated (32 characters)
- No sensitive data in tracking URLs
- Tokens are not predictable or sequential

### 2. API Security

- All admin endpoints require authentication
- Rate limiting should be implemented
- Input validation on all endpoints

### 3. Data Privacy

- Only session timing data is stored
- No personal information in tracking system
- Compliant with educational privacy requirements

## 📈 Performance Optimization

### 1. Database Optimization

- Indexes on `session_status` and `last_activity_at`
- Batch processing for large datasets
- Connection pooling for database queries

### 2. API Optimization

- Efficient queries with proper `select` statements
- Batch processing in auto-timeout (50 sessions per batch)
- Error handling to prevent cascading failures

### 3. Monitoring Optimization

- Structured logging with consistent format
- Performance metrics collection
- Health check endpoints

## 🎯 Success Metrics

Track these KPIs to measure system success:

1. **Session Tracking Accuracy**: >95% of sessions properly tracked
2. **Auto-Timeout Reliability**: >99% of inactive sessions cleaned up
3. **System Uptime**: >99.9% availability
4. **Response Time**: <2 seconds for all API endpoints
5. **Error Rate**: <1% of requests result in errors

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review application logs
3. Run the validation script
4. Check database connectivity and schema

## 🔄 Updates and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review session statistics and error logs
2. **Monthly**: Check database performance and cleanup old data
3. **Quarterly**: Review and update security measures
4. **As Needed**: Update dependencies and apply security patches

### Version Updates

When updating the system:

1. Run validation script before deployment
2. Test in staging environment first
3. Monitor logs closely after deployment
4. Have rollback plan ready

---

**Last Updated**: $(date)
**Version**: Enhanced Session Tracking v2.0
**Status**: Production Ready ✅
