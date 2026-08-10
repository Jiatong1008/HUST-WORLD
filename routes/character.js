const express = require('express');
const response = require('../utils/response');
const validate = require('../utils/validate');
const characterService = require('../services/characterService');
const { optionalAuthenticate } = require('../middlewares/auth');

const router = express.Router();

const parseCharacterId = (value) => {
  const id = Number(value);
  if (!validate.validatePositiveInteger(id) || id <= 0) {
    return null;
  }
  return id;
};

const validateSaveBody = (body) => {
  const numericFields = {
    level: [1, 999],
    experience: [0, 999999999],
    money: [0, 999999999],
    physical: [0, 1000],
    social: [0, 1000],
    knowledge: [0, 1000],
    mood: [0, 1000],
    current_map_id: [0, 999999999],
    position_x: [-999999, 999999],
    position_y: [-999999, 999999],
    grade: [1, 10],
    semester: [1, 20],
    week: [1, 999]
  };

  const errors = [];
  for (const [field, [min, max]] of Object.entries(numericFields)) {
    if (body[field] !== undefined && !validate.validateNumber(body[field], min, max)) {
      errors.push(`${field} 必须是 ${min} ~ ${max} 范围内的数字`);
    }
  }

  if (body.game_progress !== undefined && !validate.validateSerializable(body.game_progress)) {
    errors.push('game_progress 必须可 JSON 序列化');
  }

  const forbidden = ['user_id', 'character_id', 'created_at', 'updated_at', 'last_saved_at'];
  for (const field of forbidden) {
    if (body[field] !== undefined) {
      errors.push(`不允许更新 ${field}`);
    }
  }

  return errors;
};

const characterOwnership = async (req, res, next) => {
  const characterId = parseCharacterId(req.params.id);
  if (!characterId) {
    return response.fail(res, 'characterId 必须是正整数', 400);
  }
  req.characterId = characterId;

  if (req.userId) {
    try {
      const character = await characterService.findById(characterId);
      if (String(character.user_id) !== String(req.userId)) {
        return response.fail(res, '无权访问该角色', 403);
      }
    } catch (error) {
      return response.fail(res, error.message || '角色不存在', 404);
    }
  }

  next();
};

router.post('/create', async (req, res, next) => {
  try {
    const { characterId } = await characterService.create(req.body);
    return response.success(res, { characterId }, 'Character created', 201);
  } catch (error) {
    next(error);
  }
});

router.get('/user/:userId', async (req, res, next) => {
  try {
    const characters = await characterService.findByUserId(req.params.userId);
    return response.success(res, characters);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/save', optionalAuthenticate, characterOwnership, async (req, res, next) => {
  try {
    const save = await characterService.getCharacterSave(req.characterId);
    return response.success(res, save);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/save', optionalAuthenticate, characterOwnership, async (req, res, next) => {
  try {
    const validationErrors = validateSaveBody(req.body);
    if (validationErrors.length > 0) {
      return response.fail(res, validationErrors.join('; '), 400);
    }
    const { affectedRows } = await characterService.updateCharacterSave(req.characterId, req.body);
    return response.success(res, { affectedRows }, 'Save updated');
  } catch (error) {
    next(error);
  }
});

router.post('/:id/save/reset', optionalAuthenticate, characterOwnership, async (req, res, next) => {
  try {
    const { affectedRows } = await characterService.resetCharacterSave(req.characterId);
    return response.success(res, { affectedRows }, 'Save reset');
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const character = await characterService.findById(req.params.id);
    return response.success(res, character);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { affectedRows } = await characterService.update(req.params.id, req.body);
    return response.success(res, { affectedRows });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/items', async (req, res, next) => {
  try {
    const { itemId, quantity } = req.body;
    const { characterItemId } = await characterService.addItem(req.params.id, itemId, quantity);
    return response.success(res, { characterItemId }, 'Item added', 201);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/items', async (req, res, next) => {
  try {
    const items = await characterService.findItems(req.params.id);
    return response.success(res, items);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/skills', async (req, res, next) => {
  try {
    const { skillId } = req.body;
    const { characterSkillId } = await characterService.addSkill(req.params.id, skillId);
    return response.success(res, { characterSkillId }, 'Skill acquired', 201);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/skills', async (req, res, next) => {
  try {
    const skills = await characterService.findSkills(req.params.id);
    return response.success(res, skills);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
