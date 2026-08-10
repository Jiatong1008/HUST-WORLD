// 基础参数校验工具
// 用于校验必填字段、数字类型、枚举值等

const validateRequired = (obj, fields) => {
  const missing = [];
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }
  return missing;
};

const validateNumber = (value, min = null, max = null) => {
  const num = Number(value);
  if (Number.isNaN(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;
  return true;
};

const validateEnum = (value, allowedValues) => {
  return allowedValues.includes(value);
};

const validateStringLength = (value, min = 0, max = Infinity) => {
  if (typeof value !== 'string') return false;
  return value.length >= min && value.length <= max;
};

const validateInteger = (value) => {
  if (value === undefined || value === null) return false;
  const num = Number(value);
  return Number.isInteger(num);
};

const validatePositiveInteger = (value) => {
  return validateInteger(value) && value >= 0;
};

const validateCharacterStat = (value, min = 0, max = 999999) => {
  if (value === undefined || value === null) return true;
  return validateNumber(value, min, max);
};

const validateSerializable = (value) => {
  try {
    JSON.stringify(value);
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  validateRequired,
  validateNumber,
  validateEnum,
  validateStringLength,
  validateInteger,
  validatePositiveInteger,
  validateCharacterStat,
  validateSerializable
};
