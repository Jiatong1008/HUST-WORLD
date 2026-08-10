const DEFAULTS = {
  PORT: '8080',
  DB_HOST: 'localhost',
  DB_USER: 'root',
  DB_PASSWORD: '123456',
  DB_NAME: 'hust_world',
  DB_PORT: '3306',
  JWT_SECRET: 'hust-world-secret-key-2024'
};

function getValue(env, key) {
  return env[key] !== undefined && env[key] !== '' ? String(env[key]) : DEFAULTS[key];
}

function parsePort(rawPort) {
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { port: rawPort, error: `PORT must be an integer between 1 and 65535, got "${rawPort}"` };
  }
  return { port };
}

function validateConfig(env = process.env) {
  const warnings = [];
  const errors = [];
  const rawPort = getValue(env, 'PORT');
  const parsedPort = parsePort(rawPort);
  const rawDbPort = getValue(env, 'DB_PORT');
  const parsedDbPort = parsePort(rawDbPort);

  if (parsedPort.error) errors.push(parsedPort.error);
  if (parsedDbPort.error) errors.push(`DB_${parsedDbPort.error}`);

  for (const key of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET']) {
    if (env[key] === undefined || env[key] === '') {
      warnings.push(`${key} is not set; using default value.`);
    }
  }

  if (getValue(env, 'DB_PASSWORD') === DEFAULTS.DB_PASSWORD) {
    warnings.push('DB_PASSWORD uses the development default. Change it outside local development.');
  }

  if (getValue(env, 'JWT_SECRET') === DEFAULTS.JWT_SECRET) {
    warnings.push('JWT_SECRET uses the development default. Change it before deployment.');
  }

  return {
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok',
    errors,
    warnings,
    effective: {
      port: parsedPort.error ? rawPort : parsedPort.port,
      dbHost: getValue(env, 'DB_HOST'),
      dbPort: parsedDbPort.error ? rawDbPort : parsedDbPort.port,
      dbUser: getValue(env, 'DB_USER'),
      dbName: getValue(env, 'DB_NAME'),
      nodeEnv: env.NODE_ENV || 'development',
      jwtSecret: getValue(env, 'JWT_SECRET') === DEFAULTS.JWT_SECRET ? 'development-default' : 'custom'
    }
  };
}

function describeStartupError(error) {
  if (!error) return { message: 'Unknown error' };

  const adviceByCode = {
    ECONNREFUSED: 'MySQL is not reachable. Start MySQL80 or run the project development database script.',
    ER_ACCESS_DENIED_ERROR: 'MySQL username or password is wrong. Check DB_USER and DB_PASSWORD in .env.',
    ENOTFOUND: 'Database host cannot be resolved. Check DB_HOST in .env.',
    EADDRINUSE: 'The server port is already in use. Stop the existing process or change PORT in .env.',
    ER_BAD_DB_ERROR: 'The configured database does not exist and could not be created. Check DB_NAME and permissions.'
  };

  return {
    code: error.code || error.name || 'UNKNOWN',
    message: error.message || String(error),
    advice: adviceByCode[error.code] || 'Check the previous stack trace and runtime configuration.'
  };
}

function formatConfigSummary(report) {
  return {
    status: report.status,
    warnings: report.warnings.length,
    errors: report.errors.length,
    effective: report.effective
  };
}

module.exports = {
  DEFAULTS,
  validateConfig,
  describeStartupError,
  formatConfigSummary
};
