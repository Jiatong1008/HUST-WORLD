const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { pool } = require('../../config/db');
const { logger } = require('../../utils/logger');
const { validateConfig, describeStartupError, formatConfigSummary } = require('../../utils/configHealth');

async function checkDatabase() {
  const [rows] = await pool.execute('SELECT 1 AS ok');
  return rows?.[0]?.ok === 1;
}

async function main() {
  const report = validateConfig();
  logger.info('Configuration health check started', { config: formatConfigSummary(report) });

  for (const warning of report.warnings) {
    logger.warn('Configuration warning', { warning });
  }

  if (report.errors.length > 0) {
    for (const error of report.errors) {
      logger.error('Configuration error', { error });
    }
    process.exitCode = 1;
    return;
  }

  try {
    const databaseOk = await checkDatabase();
    if (!databaseOk) {
      logger.error('Database health probe returned an unexpected result');
      process.exitCode = 1;
      return;
    }
    logger.info('Database health probe passed', {
      dbHost: report.effective.dbHost,
      dbName: report.effective.dbName,
      dbUser: report.effective.dbUser
    });
  } catch (error) {
    logger.error('Database health probe failed', describeStartupError(error));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch(async (error) => {
  logger.error('Configuration health check crashed', describeStartupError(error));
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
