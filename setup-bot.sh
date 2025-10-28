#!/bin/bash

# Telegram Bot Setup Script
# Run this after creating your bot with BotFather

echo "🤖 Telegram Bot Setup Script"
echo "=============================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it first."
    exit 1
fi

# Get bot token from user
echo "Enter your bot token from BotFather:"
read BOT_TOKEN

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Bot token is required!"
    exit 1
fi

# Update .env file
echo "📝 Updating .env file..."
sed -i "s/TELEGRAM_BOT_TOKEN=.*/TELEGRAM_BOT_TOKEN=$BOT_TOKEN/" .env

# Set webhook
echo "🔗 Setting webhook..."
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3001/api/telegram/bot-webhook"}'

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Find your bot in Telegram"
echo "2. Send /start to test"
echo "3. Send /myprogress to test mini app"
echo ""
echo "Note: Make sure your server is running on localhost:3001"
