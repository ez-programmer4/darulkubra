# Session Duration Tracking System

## Overview

The Session Duration Tracking System automatically monitors teacher-student Zoom sessions without requiring any involvement from teachers or students. The system tracks session start time, duration, and automatically ends inactive sessions.

## Key Features

- **Automatic Session Detection**: Records when students click Zoom links
- **Real-time Duration Tracking**: Monitors session length automatically
- **Invisible to Users**: Students and teachers don't see any tracking interface
- **Auto-timeout**: Automatically ends sessions after 2 hours of inactivity
- **Admin Monitoring**: Comprehensive dashboard for session oversight
- **Development/Production Support**: Works in both environments

## Database Schema Changes

### New Fields Added to `wpos_zoom_links` Table

```prisma
model wpos_zoom_links {
  // ... existing fields ...

  session_ended_at         DateTime?            @db.DateTime(0)
  session_duration_minutes Int?
  session_status           SessionStatus        @default(active)
  last_activity_at         DateTime?            @db.DateTime(0)

  // ... existing relations and indexes ...

  @@index([session_status], map: "idx_session_status")
  @@index([last_activity_at], map: "idx_last_activity")
}

enum SessionStatus {
  active
  ended
  timeout
}
```

### Field Descriptions

- **`session_ended_at`**: Timestamp when the session ended
- **`session_duration_minutes`**: Total session duration in minutes
- **`session_status`**: Current session state (`active`, `ended`, `timeout`)
- **`last_activity_at`**: Last time the session was active (for heartbeat)

## Affected Files

### 1. Database Schema

- **File**: `prisma/schema.prisma`
- **Changes**: Added 4 new fields and 1 enum to `wpos_zoom_links` model
- **Purpose**: Store session tracking data

### 2. Zoom Link Creation API

- **File**: `src/app/api/teachers/students/[id]/zoom/route.ts`
- **Changes**:
  - Enhanced to handle development/production environments
  - Added retry logic for Telegram API calls
  - Smart URL handling (tracking vs direct Zoom links)
- **Purpose**: Create zoom links with tracking tokens

### 3. Session Tracking API

- **File**: `src/app/api/zoom/track/route.ts`
- **Changes**:
  - Records `clicked_at` timestamp
  - Sets `session_status` to "active"
  - Updates `last_activity_at`
  - Returns invisible tracking page with JavaScript
- **Purpose**: Entry point for student clicks, starts session tracking

### 4. Heartbeat API

- **File**: `src/app/api/zoom/heartbeat/route.ts`
- **Changes**:
  - Updates `last_activity_at` every 30 seconds
  - Keeps sessions alive during activity
- **Purpose**: Maintain session activity status

### 5. Session End API

- **File**: `src/app/api/zoom/end-session/route.ts`
- **Changes**:
  - Records `session_ended_at` timestamp
  - Calculates and stores `session_duration_minutes`
  - Sets `session_status` to "ended"
- **Purpose**: End sessions and record duration

### 6. Auto-timeout System

- **File**: `src/lib/session-timeout.ts`
- **Changes**:
  - Finds inactive sessions (2+ hours without activity)
  - Automatically ends them with "timeout" status
  - Calculates duration from `clicked_at` to current time
- **Purpose**: Clean up abandoned sessions

### 7. Admin Sessions API

- **File**: `src/app/api/admin/teacher-sessions/route.ts`
- **Changes**:
  - Fetches sessions with real-time data
  - Calculates statistics (active, ended, timeout sessions)
  - Provides session duration analytics
- **Purpose**: Provide data for admin dashboard

### 8. Admin Monitoring Dashboard

- **File**: `src/app/admin/teacher-monitoring/page.tsx`
- **Changes**:
  - Real-time session statistics
  - Session filtering and search
  - CSV export functionality
  - Manual timeout trigger
- **Purpose**: Admin interface for session monitoring

### 9. Auto-timeout System

- **File**: `src/lib/session-timeout.ts`
- **Purpose**: Automatically end inactive sessions after 2 hours

## Functionality Flow

### 1. Session Creation

```
Teacher sends Zoom link → System creates tracking URL → Telegram notification sent
```

### 2. Session Start

```
Student clicks link → /api/zoom/track → Records clicked_at → Redirects to Zoom
```

### 3. Session Monitoring

```
Tracking page JavaScript → Heartbeat every 30s → Updates last_activity_at
```

### 4. Session End

```
User leaves/closes tab → JavaScript detects → /api/zoom/end-session → Records duration
```

### 5. Auto-timeout

```
Background job → Checks inactive sessions → Auto-ends after 2 hours
```

## Development vs Production Behavior

### Development Mode (localhost)

- **Telegram Button**: Links directly to Zoom (avoids localhost URL rejection)
- **Tracking URL**: Included in message text for testing
- **Session Tracking**: Still works via manual URL testing

### Production Mode

- **Telegram Button**: Links to tracking page (full session monitoring)
- **Session Tracking**: Fully automatic and invisible

## API Endpoints

### Core Tracking APIs

#### `GET /api/zoom/track?token={token}`

- **Purpose**: Entry point for student clicks
- **Behavior**: Records click, returns tracking page, redirects to Zoom
- **Response**: HTML page with JavaScript tracking

#### `POST /api/zoom/heartbeat`

- **Body**: `{ "token": "tracking_token" }`
- **Purpose**: Keep session alive
- **Response**: `{ "success": true }`

#### `POST /api/zoom/end-session`

- **Body**: `{ "token": "tracking_token", "duration": 45, "endTime": "2024-01-01T10:00:00Z" }`
- **Purpose**: End session and record duration
- **Response**: `{ "success": true, "duration": 45 }`

### Admin APIs

#### `GET /api/admin/teacher-sessions`

- **Query Params**: `teacherId`, `date`, `status`
- **Purpose**: Fetch session data for admin dashboard
- **Response**: Sessions array with statistics

#### `POST /api/admin/auto-timeout`

- **Purpose**: Manually trigger auto-timeout process
- **Response**: Number of sessions ended

## JavaScript Tracking Implementation

The tracking page includes JavaScript that:

```javascript
// Send heartbeat every 30 seconds
setInterval(sendHeartbeat, 30000);

// Detect when user leaves
window.addEventListener("beforeunload", endSession);
window.addEventListener("unload", endSession);
document.addEventListener("visibilitychange", handleVisibilityChange);

// Auto-redirect to Zoom after 2 seconds
setTimeout(() => {
  window.location.href = zoomLink;
}, 2000);
```

## Database Queries

### Find Active Sessions

```sql
SELECT * FROM wpos_zoom_links
WHERE session_status = 'active'
AND clicked_at IS NOT NULL
```

### Find Inactive Sessions (for auto-timeout)

```sql
SELECT * FROM wpos_zoom_links
WHERE session_status = 'active'
AND clicked_at IS NOT NULL
AND last_activity_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)
```

### Session Statistics

```sql
SELECT
  COUNT(*) as total_sessions,
  SUM(CASE WHEN session_status = 'active' THEN 1 ELSE 0 END) as active_sessions,
  SUM(CASE WHEN session_status = 'ended' THEN 1 ELSE 0 END) as ended_sessions,
  SUM(CASE WHEN session_status = 'timeout' THEN 1 ELSE 0 END) as timeout_sessions,
  AVG(session_duration_minutes) as avg_duration
FROM wpos_zoom_links
```

## Configuration

### Environment Variables

- `TELEGRAM_BOT_TOKEN`: Required for notifications
- Database connection via Prisma

### Settings

- **Auto-timeout Duration**: 2 hours (configurable in `session-timeout.ts`)
- **Heartbeat Interval**: 30 seconds (configurable in tracking page)
- **Redirect Delay**: 2 seconds (configurable in tracking page)

## Error Handling

### Network Issues

- Retry logic for Telegram API calls (3 attempts with exponential backoff)
- Graceful degradation if notifications fail

### Database Issues

- Fallback to raw SQL queries if Prisma fails
- Error logging for debugging

### Session Issues

- Auto-timeout prevents abandoned sessions
- Heartbeat failures don't immediately end sessions

## Monitoring and Analytics

### Admin Dashboard Features

- **Real-time Statistics**: Total, active, ended, timeout sessions
- **Duration Analytics**: Total and average session duration
- **Teacher Performance**: Session data per teacher
- **Date Filtering**: View sessions by date range
- **CSV Export**: Download session data

### Key Metrics Tracked

- Session start time (`clicked_at`)
- Session end time (`session_ended_at`)
- Session duration (`session_duration_minutes`)
- Session status (`session_status`)
- Last activity (`last_activity_at`)

## Security Considerations

### Token Security

- Tracking tokens are randomly generated
- Tokens are not predictable or sequential
- No sensitive data in tracking URLs

### Privacy

- No personal data stored in tracking system
- Only session timing and status information
- Compliant with educational privacy requirements

## Deployment Steps

### 1. Database Migration

```bash
npx prisma generate
npx prisma db push
```

### 2. Environment Setup

- Ensure `TELEGRAM_BOT_TOKEN` is configured
- Verify database connection

### 3. Testing

- Verify admin dashboard at `/admin/teacher-monitoring`
- Test session tracking by creating zoom links through the teacher interface

## Troubleshooting

### Common Issues

#### Sessions Not Tracking

- Check if database migration was applied
- Verify tracking URL is accessible
- Check browser console for JavaScript errors

#### Telegram Notifications Failing

- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check network connectivity
- Review retry logic logs

#### Auto-timeout Not Working

- Verify background job is running
- Check `last_activity_at` updates
- Review timeout configuration

### Debug Endpoints

- `POST /api/admin/auto-timeout`: Manual timeout trigger

## Future Enhancements

### Potential Improvements

- **Real-time Notifications**: WebSocket updates for admin dashboard
- **Session Quality Metrics**: Track connection quality, interruptions
- **Teacher Analytics**: Detailed performance metrics
- **Mobile App Integration**: Native mobile tracking
- **Advanced Filtering**: More granular session filtering options

### Scalability Considerations

- **Database Indexing**: Optimize queries for large session volumes
- **Caching**: Cache frequently accessed session data
- **Background Jobs**: Implement proper job queue for auto-timeout
- **Monitoring**: Add application performance monitoring

## Conclusion

The Session Duration Tracking System provides comprehensive, automatic monitoring of teacher-student Zoom sessions with minimal user involvement. The system is designed to be robust, scalable, and privacy-compliant while providing valuable insights for educational administration.

The implementation covers the complete lifecycle from session creation to monitoring, with proper error handling and both development and production environment support.
