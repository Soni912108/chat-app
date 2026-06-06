// utils/logger.js
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];

const logger = {
  error: (msg) => {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error(msg);
    }
  },
  warn: (msg) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn(msg);
    }
  },
  info: (msg) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.log(msg);
    }
  },
  debug: (msg) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', msg);
    }
  }
};

module.exports = logger;
