const { pool } = require('../config/db');
const { logger } = require('../utils/logger');
const { validateConfig } = require('../utils/configHealth');

const checkHealth = async () => {
  let database = 'ok';
  try {
    await pool.execute('SELECT 1');
  } catch (error) {
    database = 'error';
    logger.warn('Health check database probe failed', { code: error.code, message: error.message });
  }

  const config = validateConfig();

  return {
    service: 'HUST WORLD',
    version: process.env.npm_package_version || '1.0.0',
    status: 'ok',
    database,
    config: {
      status: config.status,
      warningCount: config.warnings.length,
      errorCount: config.errors.length,
      port: config.effective.port,
      dbHost: config.effective.dbHost,
      dbName: config.effective.dbName
    },
    timestamp: new Date().toISOString()
  };
};

module.exports = { checkHealth };
