// HUST WORLD 前端 API 封装
// 负责与后端 /api/* 交互，包括认证、角色、地图、NPC、任务、物品、技能等。

(function (global) {
  const API = {};

  const baseUrl = (global.__API_BASE__) ? global.__API_BASE__ : (
    (typeof location !== 'undefined' && location.port)
      ? `http://localhost:${location.port}/api`
      : 'http://localhost:8080/api'
  );

  function getAuthHeaders() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('hust_world_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function request(method, path, body = null, extraHeaders = {}) {
    const url = `${baseUrl}${path}`;
    const headers = {
      ...getAuthHeaders(),
      ...extraHeaders
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    const options = {
      method,
      headers
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      data = { success: false, message: text };
    }
    if (!response.ok || (data && data.success === false)) {
      const error = new Error((data && data.message) ? data.message : `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  API.resolveData = (body) => (body && body.data !== undefined) ? body.data : body;

  API.getBaseUrl = () => baseUrl;

  API.register = async (username, password, email) => {
    const body = await request('POST', '/auth/register', { username, password, email });
    return API.resolveData(body);
  };

  API.login = async (username, password) => {
    const body = await request('POST', '/auth/login', { username, password });
    return API.resolveData(body);
  };

  API.verifyToken = async () => {
    const body = await request('GET', '/auth/verify');
    return API.resolveData(body);
  };

  API.createCharacter = async (userId, characterName, gender, college) => {
    const body = await request('POST', '/character/create', {
      userId,
      characterName,
      gender,
      college
    });
    return API.resolveData(body);
  };

  API.getCharactersByUser = async (userId) => {
    const body = await request('GET', `/character/user/${userId}`);
    return API.resolveData(body);
  };

  API.getCharacterById = async (characterId) => {
    const body = await request('GET', `/character/${characterId}`);
    return API.resolveData(body);
  };

  API.updateCharacter = async (characterId, fields) => {
    const body = await request('PUT', `/character/${characterId}`, fields);
    return API.resolveData(body);
  };

  API.getCharacterItems = async (characterId) => {
    const body = await request('GET', `/character/${characterId}/items`);
    return API.resolveData(body);
  };

  API.addCharacterItem = async (characterId, itemId, quantity) => {
    const body = await request('POST', `/character/${characterId}/items`, { itemId, quantity });
    return API.resolveData(body);
  };

  API.getCharacterSkills = async (characterId) => {
    const body = await request('GET', `/character/${characterId}/skills`);
    return API.resolveData(body);
  };

  API.addCharacterSkill = async (characterId, skillId) => {
    const body = await request('POST', `/character/${characterId}/skills`, { skillId });
    return API.resolveData(body);
  };

  // 新增：存档相关接口
  API.getCharacterSave = async (characterId) => {
    const body = await request('GET', `/character/${characterId}/save`);
    return API.resolveData(body);
  };

  API.updateCharacterSave = async (characterId, saveData) => {
    const body = await request('PUT', `/character/${characterId}/save`, saveData);
    return API.resolveData(body);
  };

  API.resetCharacterSave = async (characterId) => {
    const body = await request('POST', `/character/${characterId}/save/reset`, {});
    return API.resolveData(body);
  };

  API.getMaps = async () => {
    const body = await request('GET', '/maps');
    return API.resolveData(body);
  };

  API.getNpcs = async () => {
    const body = await request('GET', '/npcs');
    return API.resolveData(body);
  };

  API.getNpcsByType = async (type) => {
    const body = await request('GET', `/npcs/type/${type}`);
    return API.resolveData(body);
  };

  API.getTasks = async () => {
    const body = await request('GET', '/tasks');
    return API.resolveData(body);
  };

  API.getClubs = async () => {
    const body = await request('GET', '/clubs');
    return API.resolveData(body);
  };

  API.getExplorations = async () => {
    const body = await request('GET', '/exploration');
    return API.resolveData(body);
  };

  API.getRunningStats = async (characterId) => {
    const body = await request('GET', `/running/${characterId}/stats`);
    return API.resolveData(body);
  };

  API.getRunningHistory = async (characterId, options = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    const query = params.toString() ? `?${params.toString()}` : '';
    const body = await request('GET', `/running/${characterId}/history${query}`);
    return API.resolveData(body);
  };

  API.recordRun = async (characterId, distance, duration, calories) => {
    const body = await request('POST', `/running/${characterId}/record`, {
      distance,
      duration,
      calories
    });
    return API.resolveData(body);
  };

  API.getRunningLeaderboard = async (options = {}) => {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);
    const query = params.toString() ? `?${params.toString()}` : '';
    const body = await request('GET', `/running/leaderboard${query}`);
    return API.resolveData(body);
  };

  API.setToken = (token) => {
    if (typeof localStorage === 'undefined') return;
    if (token) {
      localStorage.setItem('hust_world_token', token);
    } else {
      localStorage.removeItem('hust_world_token');
    }
  };

  global.API = API;
  global.api = API;
})(typeof window !== 'undefined' ? window : global);
