require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/db');
const response = require('./utils/response');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const healthService = require('./services/healthService');
const { logger } = require('./utils/logger');
const { validateConfig, describeStartupError, formatConfigSummary } = require('./utils/configHealth');

const app = express();
const configReport = validateConfig();

if (configReport.errors.length > 0) {
  logger.error('Invalid runtime configuration', { errors: configReport.errors });
  process.exit(1);
}

if (configReport.warnings.length > 0) {
  logger.warn('Runtime configuration has warnings', {
    warnings: configReport.warnings,
    config: formatConfigSummary(configReport)
  });
} else {
  logger.info('Runtime configuration loaded', { config: formatConfigSummary(configReport) });
}

const PORT = configReport.effective.port;

app.use(cors());
app.use(express.json());
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use('/game', express.static(path.join(__dirname, 'game')));
app.use('/map', express.static(path.join(__dirname, 'map')));
app.use('/tools', express.static(path.join(__dirname, 'tools')));
app.use(express.static(path.join(__dirname, 'game')));

const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/character');
const taskRoutes = require('./routes/tasks');
const mapRoutes = require('./routes/maps');
const npcRoutes = require('./routes/npcs');
const itemRoutes = require('./routes/items');
const skillRoutes = require('./routes/skills');
const clubRoutes = require('./routes/clubs');
const explorationRoutes = require('./routes/exploration');
const runningRoutes = require('./routes/running');
const initRoutes = require('./routes/init');

app.use('/api/auth', authRoutes);
app.use('/api/character', characterRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/npcs', npcRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/exploration', explorationRoutes);
app.use('/api/running', runningRoutes);
app.use('/api/init', initRoutes);

app.get('/api/health', async (req, res, next) => {
  try {
    const data = await healthService.checkHealth();
    return response.success(res, data, '服务运行正常');
  } catch (error) {
    next(error);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'game', 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'game', 'index.html'));
});

app.get('/test-character-images.html', (req, res) => {
  res.redirect('/tools/tests/test-character-images.html');
});

app.get('/test-running-api.html', (req, res) => {
  res.redirect('/tools/tests/test-running-api.html');
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'game', 'index.html'));
});

app.get('/game/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'game', 'index.html'));
});

app.use(notFoundHandler);

app.use(errorHandler);

function startHttpServer() {
  const server = app.listen(PORT, () => {
    logger.info('HUST WORLD server started', {
      port: PORT,
      url: `http://localhost:${PORT}`
    });
  });

  server.on('error', (error) => {
    logger.error('HUST WORLD server failed to start', describeStartupError(error));
    process.exit(1);
  });

  return server;
}

initDatabase()
  .then(() => {
    logger.info('Database connected and initialized successfully');
  })
  .catch((error) => {
    logger.warn('Database initialization failed; server will start in degraded mode', describeStartupError(error));
  })
  .finally(() => {
    startHttpServer();
  });
