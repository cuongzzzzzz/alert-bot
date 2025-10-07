#!/bin/sh

# Docker entrypoint script for Server Monitoring Bot

echo "🐳 Starting Server Monitoring Bot in Docker container..."
echo "📅 Container started at: $(date)"
echo "🌍 Timezone: $(date +%Z)"
echo "👤 Running as user: $(whoami)"
echo "📂 Working directory: $(pwd)"

# Check if environment variables are loaded
if [ -z "$LARK_WEBHOOK_URL" ] && [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found and no environment variables set."
    echo "💡 Make sure to mount your .env file or set environment variables."
else
    echo "✅ Environment configuration loaded successfully."
fi

# Validate required environment variables
if [ -z "$LARK_WEBHOOK_URL" ]; then
    echo "❌ Error: LARK_WEBHOOK_URL environment variable is required"
    echo "💡 Please set LARK_WEBHOOK_URL in your .env file or environment variables"
    exit 1
fi

# Display configuration (masked for security)
echo "🔧 Configuration:"
echo "   - Webhook URL: $(echo $LARK_WEBHOOK_URL | sed 's/\(.*\)\/\([^/]*\)$/\1\/***masked***/')"
echo "   - Server URLs: ${SERVER_URLS:-'Using default URLs'}"
echo "   - Monitoring Interval: ${MONITORING_INTERVAL:-'* * * * * (every minute)'}"
echo "   - Request Timeout: ${REQUEST_TIMEOUT:-'10000ms'}"
echo "   - Verbose Logging: ${VERBOSE_LOGGING:-'false'}"

echo "🚀 Starting monitoring bot..."
echo "----------------------------------------"

# Start the application
exec "$@"
