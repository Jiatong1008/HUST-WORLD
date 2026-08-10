// 统一 API 响应格式
// 成功: { success: true, data, message }
// 失败: { success: false, error, ...extraFields }

const success = (res, data = null, message = '', statusCode = 200) => {
  const payload = { success: true };
  if (data !== null && data !== undefined) payload.data = data;
  if (message) payload.message = message;
  return res.status(statusCode).json(payload);
};

const fail = (res, error = '请求失败', statusCode = 400) => {
  const payload = { success: false };

  if (typeof error === 'string') {
    payload.error = error;
  } else if (error && typeof error === 'object') {
    payload.error = error.message || error.error || '请求失败';
    // 保留对象中的其他字段（如 canJoin、reason 等），但排除 success 和标准字段重复
    Object.keys(error).forEach((key) => {
      if (key !== 'success' && key !== 'message' && key !== 'error' && !(key in payload)) {
        payload[key] = error[key];
      }
    });
  } else {
    payload.error = error;
  }

  return res.status(statusCode).json(payload);
};

const error = (res, message = '服务器内部错误', statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: message
  });
};

module.exports = { success, fail, error };
