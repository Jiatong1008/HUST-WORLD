const runningRepository = require('../repositories/runningRepository');

async function recordRun({ characterId, semester, distance, duration, status }) {
  if (!characterId || !semester || !distance || !duration) {
    throw Object.assign(new Error('Missing required fields: characterId, semester, distance, duration'), { statusCode: 400 });
  }
  const runId = await runningRepository.createRun(characterId, semester, distance, duration, status);
  return { runId, characterId, semester, distance, duration, status: status || 'completed' };
}

async function getRuns(characterId, year, semester) {
  return await runningRepository.getRuns(characterId, year, semester);
}

async function getStats(characterId, year, semester) {
  return await runningRepository.getStats(characterId, year, semester);
}

module.exports = { recordRun, getRuns, getStats };
