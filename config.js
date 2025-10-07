require('dotenv').config();

/**
 * Configuration settings for the server monitoring bot
 */
const config = {
  // Monitoring settings
  monitoringInterval: process.env.MONITORING_INTERVAL || '* * * * *', // Every minute by default
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 10000, // 10 seconds timeout
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
  retryDelay: parseInt(process.env.RETRY_DELAY) || 1000, // 1 second delay between retries

  // Webhook settings
  webhookUrl: process.env.LARK_WEBHOOK_URL,

  // Server URLs to monitor (comma-separated in env, or default list)
  serverUrls: process.env.SERVER_URLS
    ? process.env.SERVER_URLS.split(',').map(url => url.trim())
    : [
      'https://httpbin.org/status/200',
      'https://jsonplaceholder.typicode.com/posts/1',
      'https://api.github.com'
    ],

  // HTTP status codes considered as "server running"
  successStatusCodes: process.env.SUCCESS_STATUS_CODES
    ? process.env.SUCCESS_STATUS_CODES.split(',').map(code => parseInt(code.trim()))
    : [200, 201, 202, 204, 301, 302, 304],

  // Logging settings
  enableVerboseLogging: process.env.VERBOSE_LOGGING === 'true',

  // Recovery notifications
  sendRecoveryNotifications: process.env.SEND_RECOVERY_NOTIFICATIONS !== 'false'
};

/**
 * Validates the configuration settings
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateConfig() {
  const errors = [];

  if (!config.webhookUrl) {
    errors.push('LARK_WEBHOOK_URL environment variable is required');
  }

  if (!Array.isArray(config.serverUrls) || config.serverUrls.length === 0) {
    errors.push('At least one server URL must be configured');
  }

  // Validate URLs format
  config.serverUrls.forEach((url, index) => {
    try {
      new URL(url);
    } catch (error) {
      errors.push(`Invalid URL at index ${index}: ${url}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  config,
  validateConfig
};
