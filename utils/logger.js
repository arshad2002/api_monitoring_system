const { createLogger, format, transports } = require('winston');
const path = require('path');

// Custom format: timestamp + level + message
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`
      : `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport — colorized for readability in development
    new transports.Console({
      format: format.combine(format.colorize({ all: true }), logFormat),
    }),

    // Persistent error log file
    new transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
    }),

    // Combined log file for all levels
    new transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
    }),
  ],
});

module.exports = logger;

