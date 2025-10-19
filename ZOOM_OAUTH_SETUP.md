# Zoom OAuth Integration Setup Guide

## Step 1: Create Zoom OAuth App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click "Develop" → "Build App"
3. Choose **OAuth** app type
4. Fill in basic information:
   - App Name: "Darul Kubra Teacher Portal"
   - Description: "Teacher Zoom integration for class management"
   - Developer Contact: your email

## Step 2: Configure OAuth Settings

### Redirect URL

```
http://localhost:3000/api/zoom/oauth/callback
```

### OAuth Scopes (Required)

- `meeting:write:admin` - Create meetings
- `meeting:read:admin` - Read meeting details
- `user:read:admin` - Read user profile
- `recording:read:admin` - Read meeting recordings (optional)

### Webhook Event Subscriptions

Enable these events:

- `meeting.started`
- `meeting.ended`
- `meeting.participant_joined`
- `meeting.participant_left`

### Webhook Endpoint URL

```
http://localhost:3000/api/zoom/webhooks
```

> **Note**: For local testing, use ngrok: `ngrok http 3000`
> Then use: `https://your-ngrok-url.ngrok.io/api/zoom/webhooks`

## Step 3: Add Environment Variables

Add these to your `.env.local` file:

```env
# Zoom OAuth
ZOOM_CLIENT_ID="your_zoom_client_id_here"
ZOOM_CLIENT_SECRET="your_zoom_client_secret_here"
ZOOM_REDIRECT_URI="http://localhost:3000/api/zoom/oauth/callback"
ZOOM_WEBHOOK_SECRET_TOKEN="your_webhook_secret_token"
```

## Step 4: Database Migration

Run the Prisma migration to add Zoom fields:

```bash
npx prisma migrate dev --name add_zoom_oauth_fields
```

## Step 5: Test OAuth Flow

1. Login as a teacher
2. Go to Settings → Connect Zoom Account
3. Authorize the app
4. You should be redirected back with success message

## Features Enabled

✅ Teachers use their own Zoom accounts (free or paid)
✅ System creates meetings via Zoom API
✅ Automatic duration tracking (30-min sessions)
✅ Real-time webhook updates when meeting ends
✅ Integrated with salary calculation
✅ No additional cost to academy

## Notes for Local Development

- Sessions are 30 minutes (free Zoom accounts work - 40 min limit)
- For webhook testing, use [ngrok](https://ngrok.com/) or [localtunnel](https://localtunnel.github.io/www/)
- Make sure your local server is running on port 3000
