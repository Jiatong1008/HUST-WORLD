const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const activeLevel = LEVELS[configuredLevel] || LEVELS.info;

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;

  const redacted = {};
  for (const [key, entry] of Object.entries(value)) {
    if (/password|secret|token|authorization/i.test(key)) {
      redacted[key] = entry ? '[redacted]' : entry;
    } else {
      redacted[key] = redact(entry);
    }
  }
  return redacted;
}

function formatMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ` ${JSON.stringify(redact(meta))}`;
  } catch (error) {
    return ` ${String(meta)}`;
  }
}

function write(level, message, meta = {}) {
  if (LEVELS[level] < activeLevel) return;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const logger = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta)
};

module.exports = { logger, redact };
