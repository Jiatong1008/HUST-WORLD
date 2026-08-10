/**
 * HUST WORLD SessionManager
 * 统一前端登录态管理：token、user、currentCharacterId 的读写与持久化。
 * 不处理游戏内具体业务，仅作为会话与角色身份的状态中枢。
 */
(function (global) {
  const TOKEN_KEY = 'hust_world_token';
  const USER_KEY = 'hust_world_user';
  const CHARACTER_ID_KEY = 'hust_world_current_character_id';
  const CHARACTERS_KEY = 'hust_world_characters';

  class SessionManager {
    constructor() {
      this.loadSession();
    }

    // ========== Token ==========
    getToken() {
      return this._token;
    }

    setToken(token) {
      this._token = token || null;
      if (typeof localStorage !== 'undefined') {
        if (this._token) {
          localStorage.setItem(TOKEN_KEY, this._token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      }
      if (typeof global.API !== 'undefined' && typeof global.API.setToken === 'function') {
        global.API.setToken(this._token);
      }
    }

    clearToken() {
      this.setToken(null);
    }

    // ========== User ==========
    getUser() {
      return this._user;
    }

    setUser(user) {
      this._user = user || null;
      if (typeof localStorage !== 'undefined') {
        if (this._user) {
          localStorage.setItem(USER_KEY, JSON.stringify(this._user));
        } else {
          localStorage.removeItem(USER_KEY);
        }
      }
    }

    clearUser() {
      this.setUser(null);
    }

    // ========== Characters List ==========
    getCharacters() {
      return this._characters || [];
    }

    setCharacters(characters) {
      this._characters = Array.isArray(characters) ? characters : [];
      if (typeof localStorage !== 'undefined') {
        if (this._characters.length > 0) {
          localStorage.setItem(CHARACTERS_KEY, JSON.stringify(this._characters));
        } else {
          localStorage.removeItem(CHARACTERS_KEY);
        }
      }
    }

    clearCharacters() {
      this.setCharacters([]);
    }

    addCharacter(character) {
      const list = this.getCharacters();
      const existing = list.findIndex(
        c => c && (c.characterId === character.characterId || c.character_id === character.character_id)
      );
      if (existing >= 0) {
        list[existing] = character;
      } else {
        list.push(character);
      }
      this.setCharacters(list);
    }

    // ========== Current Character Id ==========
    getCurrentCharacterId() {
      return this._currentCharacterId;
    }

    setCurrentCharacterId(id) {
      this._currentCharacterId = id || null;
      if (typeof localStorage !== 'undefined') {
        if (this._currentCharacterId) {
          localStorage.setItem(CHARACTER_ID_KEY, String(this._currentCharacterId));
        } else {
          localStorage.removeItem(CHARACTER_ID_KEY);
        }
      }
    }

    clearCurrentCharacterId() {
      this.setCurrentCharacterId(null);
    }

    // ========== Derived ==========
    isLoggedIn() {
      return !!this._token && !!this._user;
    }

    hasCharacters() {
      return this._characters && this._characters.length > 0;
    }

    getCurrentCharacter() {
      const id = this._currentCharacterId;
      if (!id || !this._characters) return null;
      return this._characters.find(
        c => c && (c.characterId === id || c.character_id === id)
      ) || null;
    }

    // ========== Session Lifecycle ==========
    saveSession() {
      if (typeof localStorage === 'undefined') return;
      if (this._token) localStorage.setItem(TOKEN_KEY, this._token);
      if (this._user) localStorage.setItem(USER_KEY, JSON.stringify(this._user));
      if (this._characters && this._characters.length > 0) {
        localStorage.setItem(CHARACTERS_KEY, JSON.stringify(this._characters));
      } else {
        localStorage.removeItem(CHARACTERS_KEY);
      }
      if (this._currentCharacterId) {
        localStorage.setItem(CHARACTER_ID_KEY, String(this._currentCharacterId));
      } else {
        localStorage.removeItem(CHARACTER_ID_KEY);
      }
    }

    loadSession() {
      this._token = null;
      this._user = null;
      this._characters = [];
      this._currentCharacterId = null;

      if (typeof localStorage !== 'undefined') {
        try {
          const token = localStorage.getItem(TOKEN_KEY);
          if (token && token !== 'null' && token !== 'undefined') {
            this._token = token;
          }
        } catch (e) {}

        try {
          const userRaw = localStorage.getItem(USER_KEY);
          if (userRaw) this._user = JSON.parse(userRaw);
        } catch (e) {
          console.warn('[SessionManager] 用户数据解析失败，已清除');
          localStorage.removeItem(USER_KEY);
        }

        try {
          const charsRaw = localStorage.getItem(CHARACTERS_KEY);
          if (charsRaw) this._characters = JSON.parse(charsRaw);
        } catch (e) {
          console.warn('[SessionManager] 角色列表解析失败，已清除');
          localStorage.removeItem(CHARACTERS_KEY);
        }

        try {
          const charId = localStorage.getItem(CHARACTER_ID_KEY);
          if (charId) this._currentCharacterId = charId;
        } catch (e) {}
      }

      if (typeof global.API !== 'undefined' && typeof global.API.setToken === 'function') {
        global.API.setToken(this._token);
      }
    }

    logout() {
      this.clearToken();
      this.clearUser();
      this.clearCharacters();
      this.clearCurrentCharacterId();
      // 注意：不删除游客本地存档和远程存档
    }

    // 获取 login/register 后的通用快照字段
    normalizeUser(result, username) {
      if (!result) return null;
      return {
        userId: result.userId || result.user_id || result.id || null,
        username: result.username || username || null
      };
    }

    normalizeCharacter(character) {
      if (!character) return null;
      return {
        characterId: character.characterId || character.character_id || character.id || null,
        userId: character.userId || character.user_id || null,
        characterName: character.characterName || character.character_name || character.name || null,
        gender: character.gender || null,
        college: character.college || null,
        grade: character.grade || 1,
        semester: character.semester || 1,
        week: character.week || 1,
        level: character.level || 1,
        experience: character.experience || 0,
        money: character.money || 1000,
        physical: character.physical || 50,
        social: character.social || 50,
        knowledge: character.knowledge || 50,
        mood: character.mood || 50
      };
    }
  }

  const sessionManager = new SessionManager();

  if (typeof global !== 'undefined') {
    global.SessionManager = SessionManager;
    global.sessionManager = sessionManager;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SessionManager, sessionManager };
  }
})(typeof window !== 'undefined' ? window : global);
