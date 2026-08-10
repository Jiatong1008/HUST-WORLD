const characterRepository = require('../repositories/characterRepository');

const create = async (data) => {
  const characterId = await characterRepository.create(data);
  return { characterId };
};

const findByUserId = async (userId) => {
  return await characterRepository.findByUserId(userId);
};

const findById = async (id) => {
  const character = await characterRepository.findById(id);
  if (!character) {
    throw Object.assign(new Error('Character not found'), { statusCode: 404 });
  }
  return character;
};

const update = async (id, fields) => {
  const affectedRows = await characterRepository.update(id, fields);
  return { affectedRows };
};

const getCharacterSave = async (id) => {
  const character = await characterRepository.getSave(id);
  if (!character) {
    throw Object.assign(new Error('Character not found'), { statusCode: 404 });
  }
  if (character.game_progress && typeof character.game_progress === 'string') {
    try {
      character.game_progress = JSON.parse(character.game_progress);
    } catch (error) {
      character.game_progress = null;
    }
  }
  return character;
};

const updateCharacterSave = async (id, fields) => {
  const allowed = {};
  const permitted = ['level', 'experience', 'money', 'physical', 'social', 'knowledge', 'mood',
    'current_map_id', 'position_x', 'position_y', 'grade', 'semester', 'week', 'game_progress'];
  for (const key of permitted) {
    if (fields[key] !== undefined) {
      allowed[key] = fields[key];
    }
  }
  const affectedRows = await characterRepository.updateSave(id, allowed);
  return { affectedRows };
};

const resetCharacterSave = async (id) => {
  const affectedRows = await characterRepository.resetSave(id);
  return { affectedRows };
};

const addItem = async (characterId, itemId, quantity) => {
  const characterItemId = await characterRepository.addItem(characterId, itemId, quantity);
  return { characterItemId };
};

const findItems = async (characterId) => {
  return await characterRepository.findItems(characterId);
};

const addSkill = async (characterId, skillId) => {
  const characterSkillId = await characterRepository.addSkill(characterId, skillId);
  return { characterSkillId };
};

const findSkills = async (characterId) => {
  return await characterRepository.findSkills(characterId);
};

module.exports = {
  create, findByUserId, findById, update, getCharacterSave, updateCharacterSave, resetCharacterSave,
  addItem, findItems, addSkill, findSkills
};
