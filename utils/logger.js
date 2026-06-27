// utils/logger.js
require('dotenv').config();

const LOG_LEVELS = {
  ERR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const configuredLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
const normalizedLevel = configuredLevel === 'ERROR' ? 'ERR' : configuredLevel;
const currentLevel = LOG_LEVELS[normalizedLevel] ?? LOG_LEVELS.INFO;

function formatMessage(level, source, message) {
  return `${new Date().toISOString()} - ${source} - ${level} - ${message}`;
}

function write(level, source, message) {
  if (currentLevel < LOG_LEVELS[level]) {
    return;
  }

  const line = formatMessage(level, source, message);
  if (level === 'ERR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  error: (source, message) => write('ERR', source, message),
  warn: (source, message) => write('WARN', source, message),
  info: (source, message) => write('INFO', source, message),
  debug: (source, message) => write('DEBUG', source, message),
};
