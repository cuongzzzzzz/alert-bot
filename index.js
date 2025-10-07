const axios = require('axios');
const cron = require('node-cron');
const { config, validateConfig } = require('./config');

/**
 * Server monitoring bot that checks server health and sends alerts via Lark/Feishu webhook
 */
class ServerMonitoringBot {
  constructor() {
    this.serverStatus = new Map(); // Track server status to detect changes
    this.isRunning = false;
    this.cronJob = null;
  }

  /**
   * Initialize and start the monitoring bot
   */
  async start() {
    try {
      // Validate configuration
      const validation = validateConfig();
      if (!validation.isValid) {
        console.error('❌ Configuration validation failed:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }

      console.log('🚀 Starting Server Monitoring Bot...');
      console.log(`📊 Monitoring ${config.serverUrls.length} servers`);
      console.log(`⏰ Check interval: ${config.monitoringInterval}`);
      console.log(`🔗 Webhook URL: ${this.maskWebhookUrl(config.webhookUrl)}`);

      // Initialize server status
      config.serverUrls.forEach(url => {
        this.serverStatus.set(url, { isUp: true, lastCheck: null, consecutiveFailures: 0 });
      });

      // Schedule monitoring
      this.scheduleMonitoring();

      // Perform initial check
      await this.performHealthCheck();

      this.isRunning = true;
      console.log('✅ Server Monitoring Bot started successfully');
    } catch (error) {
      console.error('❌ Failed to start monitoring bot:', error.message);
      process.exit(1);
    }
  }

  /**
   * Schedule periodic health checks using cron
   */
  scheduleMonitoring() {
    this.cronJob = cron.schedule(
      config.monitoringInterval,
      async () => {
        await this.performHealthCheck();
      },
      {
        scheduled: false
      }
    );

    this.cronJob.start();
  }

  /**
   * Perform health check on all configured servers
   */
  async performHealthCheck() {
    const timestamp = this.formatVietnamTime();
    console.log(`\n🔍 [${timestamp}] Starting health check...`);

    const checkPromises = config.serverUrls.map(url => this.checkServerHealth(url));
    const results = await Promise.allSettled(checkPromises);

    let upCount = 0;
    let downCount = 0;

    results.forEach((result, _index) => {
      if (result.status === 'fulfilled' && result.value.isUp) {
        upCount++;
      } else {
        downCount++;
      }
    });

    console.log(`📈 Health check completed: ${upCount} up, ${downCount} down`);
  }

  /**
   * Check health of a single server
   * @param {string} url - Server URL to check
   * @returns {Promise<Object>} Health check result
   */
  async checkServerHealth(url) {
    const previousStatus = this.serverStatus.get(url);
    let currentStatus = { isUp: false, lastCheck: new Date(), consecutiveFailures: 0, error: null };

    try {
      const response = await this.makeHttpRequest(url);
      const isUp = config.successStatusCodes.includes(response.status);

      currentStatus = {
        isUp,
        lastCheck: new Date(),
        consecutiveFailures: isUp ? 0 : previousStatus.consecutiveFailures + 1,
        statusCode: response.status,
        responseTime: response.responseTime,
        error: null
      };

      if (config.enableVerboseLogging) {
        console.log(
          `✅ ${url} - Status: ${response.status}, Response time: ${response.responseTime}ms`
        );
      }
    } catch (error) {
      currentStatus = {
        isUp: false,
        lastCheck: new Date(),
        consecutiveFailures: previousStatus.consecutiveFailures + 1,
        error: error.message
      };

      console.log(`❌ ${url} - Error: ${error.message}`);
    }

    // Update status and check for state changes
    this.serverStatus.set(url, currentStatus);
    await this.handleStatusChange(url, previousStatus, currentStatus);

    return currentStatus;
  }

  /**
   * Make HTTP request with timeout and retry logic
   * @param {string} url - URL to request
   * @returns {Promise<Object>} Response object with status and timing
   */
  async makeHttpRequest(url) {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        const response = await axios.get(url, {
          timeout: config.requestTimeout,
          validateStatus: () => true, // Don't throw on HTTP error status
          headers: {
            'User-Agent': 'Server-Monitoring-Bot/1.0.0'
          }
        });

        return {
          status: response.status,
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        if (attempt === config.retryAttempts) {
          throw new Error(
            `Request failed after ${config.retryAttempts} attempts: ${error.message}`
          );
        }

        // Wait before retry
        await this.sleep(config.retryDelay * attempt);
      }
    }
  }

  /**
   * Handle server status changes and send notifications
   * @param {string} url - Server URL
   * @param {Object} previousStatus - Previous server status
   * @param {Object} currentStatus - Current server status
   */
  async handleStatusChange(url, previousStatus, currentStatus) {
    // Server went down
    if (previousStatus.isUp && !currentStatus.isUp) {
      console.log(`🚨 Server DOWN detected: ${url}`);
      await this.sendDownAlert(url, currentStatus);
    }

    // Server recovered
    if (!previousStatus.isUp && currentStatus.isUp && config.sendRecoveryNotifications) {
      console.log(`🎉 Server RECOVERED: ${url}`);
      await this.sendRecoveryAlert(url, currentStatus);
    }
  }

  /**
   * Send server down alert to Lark webhook
   * @param {string} url - Server URL that is down
   * @param {Object} status - Current server status
   */
  async sendDownAlert(url, status) {
    const message = {
      msg_type: 'text',
      content: {
        text:
          '🚨 SERVER DOWN ALERT 🚨\n\n' +
          `Server: ${url}\n` +
          'Status: DOWN\n' +
          `Error: ${status.error || 'No response'}\n` +
          `Consecutive Failures: ${status.consecutiveFailures}\n` +
          `Last Check: ${this.formatVietnamTime(status.lastCheck)}\n` +
          '\nPlease investigate immediately!'
      }
    };

    await this.sendWebhookMessage(message, 'DOWN alert');
  }

  /**
   * Send server recovery alert to Lark webhook
   * @param {string} url - Server URL that recovered
   * @param {Object} status - Current server status
   */
  async sendRecoveryAlert(url, status) {
    const message = {
      msg_type: 'text',
      content: {
        text:
          '✅ SERVER RECOVERY NOTIFICATION ✅\n\n' +
          `Server: ${url}\n` +
          'Status: UP\n' +
          `Status Code: ${status.statusCode}\n` +
          `Response Time: ${status.responseTime}ms\n` +
          `Recovery Time: ${this.formatVietnamTime(status.lastCheck)}\n` +
          '\nServer is back online!'
      }
    };

    await this.sendWebhookMessage(message, 'recovery notification');
  }

  /**
   * Send message to Lark webhook
   * @param {Object} message - Message payload
   * @param {string} messageType - Type of message for logging
   */
  async sendWebhookMessage(message, messageType) {
    try {
      const response = await axios.post(config.webhookUrl, message, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        console.log(`📤 Successfully sent ${messageType} to Lark webhook`);
      } else {
        console.error(`❌ Failed to send ${messageType}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error sending ${messageType} to webhook:`, error.message);
    }
  }

  /**
   * Mask webhook URL for secure logging
   * @param {string} url - Webhook URL
   * @returns {string} Masked URL
   */
  maskWebhookUrl(url) {
    if (!url) {
      return 'Not configured';
    }
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}/*****`;
  }

  /**
   * Format date to Vietnam timezone
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatVietnamTime(date = new Date()) {
    return date.toLocaleString('vi-VN', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Sleep utility function
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gracefully stop the monitoring bot
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('⏹️  Monitoring stopped');
    }
    this.isRunning = false;
  }

  /**
   * Get current status of all monitored servers
   * @returns {Object} Status summary
   */
  getStatusSummary() {
    const summary = {
      totalServers: config.serverUrls.length,
      upServers: 0,
      downServers: 0,
      servers: []
    };

    for (const [url, status] of this.serverStatus) {
      if (status.isUp) {
        summary.upServers++;
      } else {
        summary.downServers++;
      }

      summary.servers.push({
        url,
        isUp: status.isUp,
        lastCheck: status.lastCheck,
        consecutiveFailures: status.consecutiveFailures,
        error: status.error
      });
    }

    return summary;
  }
}

// Initialize and start the bot
const bot = new ServerMonitoringBot();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  bot.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('❌ Uncaught Exception:', error);
  bot.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  bot.stop();
  process.exit(1);
});

// Start the bot
bot.start().catch(error => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});

module.exports = ServerMonitoringBot;
