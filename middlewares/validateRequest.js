const { validateRequired } = require('../utils/validate');
const response = require('../utils/response');

const validateBody = (requiredFields) => {
  return (req, res, next) => {
    const missing = validateRequired(req.body, requiredFields);
    if (missing.length > 0) {
      return response.fail(res, `缺少必填参数: ${missing.join(', ')}`, 400);
    }
    next();
  };
};

module.exports = { validateBody };
