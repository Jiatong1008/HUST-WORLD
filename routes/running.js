const express = require('express');
const response = require('../utils/response');
const runningService = require('../services/runningService');

const router = express.Router();

router.post('/record', async (req, res, next) => {
  try {
    const result = await runningService.recordRun(req.body);
    return response.success(res, result, 'Campus run recorded successfully', 201);
  } catch (error) {
    next(error);
  }
});

router.get('/:characterId/stats', async (req, res, next) => {
  try {
    const { year, semester } = req.query;
    const stats = await runningService.getStats(req.params.characterId, year, semester);
    return response.success(res, stats);
  } catch (error) {
    next(error);
  }
});

router.get('/:characterId', async (req, res, next) => {
  try {
    const { year, semester } = req.query;
    const records = await runningService.getRuns(req.params.characterId, year, semester);
    return response.success(res, records);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
