# Server Monitoring Bot

A Node.js application that monitors server health by periodically checking a list of URLs and sends alerts via Lark/Feishu webhook when servers are down.

## Features

- 🔍 **Periodic Health Checks**: Monitors servers every minute (configurable)
- 🚨 **Real-time Alerts**: Sends immediate notifications via Lark/Feishu webhook when servers go down
- 🎉 **Recovery Notifications**: Optional alerts when servers come back online
- 🔄 **Retry Logic**: Configurable retry attempts for failed requests
- 📊 **Status Tracking**: Tracks consecutive failures and response times
- 🛡️ **Error Handling**: Comprehensive error handling and graceful shutdown
- ⚙️ **Configurable**: Flexible configuration via environment variables
- 📝 **Detailed Logging**: Verbose logging options for debugging

## Prerequisites

- Node.js 16.0.0 or higher
- A Lark/Feishu bot with webhook URL

## Installation

### Option 1: Docker (Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd alert-bot

# 2. Configure environment
cp env.example .env
# Edit .env with your settings

# 3. Run with Docker Compose
docker-compose up -d

# 4. View logs
docker-compose logs -f
```

### Option 2: Node.js Direct

1. **Clone or download the project files**

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp env.example .env
   ```

   Edit `.env` file with your configuration:

   ```env
   LARK_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-token-here
   SERVER_URLS=https://api.example.com,https://app.example.com
   ```

## Lark/Feishu Bot Setup

1. **Create a Custom Bot in Lark/Feishu**
   - Go to your Lark/Feishu group chat
   - Click on group settings → Bots → Add Bot → Custom Bot
   - Configure bot name and description
   - Copy the webhook URL

2. **Configure Webhook URL**
   - Add the webhook URL to your `.env` file as `LARK_WEBHOOK_URL`

For detailed instructions, refer to the [Lark Bot Documentation](https://open.larksuite.com/document/client-docs/bot-v3/add-custom-bot).

## Configuration Options

| Variable                      | Description                             | Default                       | Example                                            |
| ----------------------------- | --------------------------------------- | ----------------------------- | -------------------------------------------------- |
| `LARK_WEBHOOK_URL`            | **Required** Lark webhook URL           | -                             | `https://open.feishu.cn/open-apis/bot/v2/hook/xxx` |
| `SERVER_URLS`                 | Comma-separated list of URLs to monitor | Demo URLs                     | `https://api.example.com,https://app.example.com`  |
| `MONITORING_INTERVAL`         | Cron expression for check frequency     | `* * * * *` (every minute)    | `*/5 * * * *` (every 5 minutes)                    |
| `REQUEST_TIMEOUT`             | HTTP request timeout (ms)               | `10000`                       | `5000`                                             |
| `RETRY_ATTEMPTS`              | Number of retry attempts                | `3`                           | `5`                                                |
| `RETRY_DELAY`                 | Delay between retries (ms)              | `1000`                        | `2000`                                             |
| `SUCCESS_STATUS_CODES`        | HTTP codes considered as "up"           | `200,201,202,204,301,302,304` | `200,201`                                          |
| `VERBOSE_LOGGING`             | Enable detailed logging                 | `false`                       | `true`                                             |
| `SEND_RECOVERY_NOTIFICATIONS` | Send recovery alerts                    | `true`                        | `false`                                            |

## Usage

### Start the Bot

#### With Docker
```bash
# Start with Docker Compose
npm run docker:up

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

#### Direct Node.js
```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

### Example Output

```
🚀 Starting Server Monitoring Bot...
📊 Monitoring 3 servers
⏰ Check interval: * * * * *
🔗 Webhook URL: https://open.feishu.cn/*****
✅ Server Monitoring Bot started successfully

🔍 [2024-01-15T10:00:00.000Z] Starting health check...
✅ https://api.example.com - Status: 200, Response time: 245ms
❌ https://down.example.com - Error: Request failed after 3 attempts: connect ECONNREFUSED
📤 Successfully sent DOWN alert to Lark webhook
📈 Health check completed: 2 up, 1 down
```

### Stopping the Bot

- Press `Ctrl+C` to gracefully stop the bot
- The bot will complete current health checks before shutting down

## Alert Messages

### Server Down Alert

```
🚨 SERVER DOWN ALERT 🚨

Server: https://api.example.com
Status: DOWN
Error: Request failed after 3 attempts: connect ECONNREFUSED
Consecutive Failures: 1
Last Check: 2024-01-15T10:00:00.000Z

Please investigate immediately!
```

### Server Recovery Alert

```
✅ SERVER RECOVERY NOTIFICATION ✅

Server: https://api.example.com
Status: UP
Status Code: 200
Response Time: 245ms
Recovery Time: 2024-01-15T10:05:00.000Z

Server is back online!
```

## Monitoring Intervals

The bot uses cron expressions for scheduling. Common patterns:

- `* * * * *` - Every minute
- `*/5 * * * *` - Every 5 minutes
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours

## Error Handling

The bot includes comprehensive error handling:

- **Network Errors**: Automatic retries with exponential backoff
- **Invalid URLs**: Configuration validation on startup
- **Webhook Failures**: Logged but don't stop monitoring
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals
- **Uncaught Exceptions**: Logged and bot stops safely

## Development

### Code Structure

```
├── index.js          # Main application and ServerMonitoringBot class
├── config.js         # Configuration management and validation
├── package.json      # Dependencies and scripts
├── env.example       # Environment variables template
└── README.md         # Documentation
```

### Key Classes and Methods

- `ServerMonitoringBot`: Main bot class
  - `start()`: Initialize and start monitoring
  - `performHealthCheck()`: Check all servers
  - `checkServerHealth(url)`: Check single server
  - `sendDownAlert()`: Send down notification
  - `sendRecoveryAlert()`: Send recovery notification

### Adding Features

The modular design makes it easy to extend:

- Add new notification channels in `sendWebhookMessage()`
- Implement custom health check logic in `checkServerHealth()`
- Add metrics collection in `performHealthCheck()`

## Troubleshooting

### Common Issues

1. **"Configuration validation failed"**
   - Ensure `LARK_WEBHOOK_URL` is set in `.env`
   - Check that all URLs in `SERVER_URLS` are valid

2. **"Failed to send alert to webhook"**
   - Verify webhook URL is correct
   - Check network connectivity
   - Ensure bot has permission to send messages

3. **High CPU usage**
   - Increase `MONITORING_INTERVAL` (e.g., `*/5 * * * *`)
   - Reduce number of monitored URLs
   - Increase `REQUEST_TIMEOUT`

### Debug Mode

Enable verbose logging to see detailed information:

```env
VERBOSE_LOGGING=true
```

This will log successful health checks with response times.

## License

MIT License - feel free to use and modify as needed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues related to:

- **Lark/Feishu Bot Setup**: Check the [official documentation](https://open.larksuite.com/document/client-docs/bot-v3/add-custom-bot)
- **Node.js Issues**: Ensure you're using Node.js 16+ and all dependencies are installed
- **Configuration**: Review the configuration options and examples above
