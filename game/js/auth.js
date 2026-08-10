/**
 * HUST WORLD AuthSystem
 * 负责登录、注册、登出、角色创建与角色选择，并将 token/user/角色列表/当前角色
 * 统一写入 SessionManager，确保 SaveManager 与融合系统能正确判断登录态。
 */
class AuthSystem {
    constructor() {
        this.init();
    }

    init() {
        if (typeof sessionManager !== 'undefined') {
            sessionManager.loadSession();
            if (sessionManager.getToken()) {
                this.checkSession();
            }
        }
    }

    async checkSession() {
        try {
            const result = await api.verifyToken();
            const normalized = typeof sessionManager !== 'undefined' 
                ? sessionManager.normalizeUser(result) 
                : { userId: result.userId || result.user_id, username: result.username };
            
            if (typeof sessionManager !== 'undefined') {
                sessionManager.setUser(normalized);
                if (result.characters) {
                    const characters = result.characters.map(c => sessionManager.normalizeCharacter(c));
                    sessionManager.setCharacters(characters);
                    // 恢复当前角色：优先使用 localStorage 中缓存的 ID，否则选择第一个角色
                    const savedCharId = sessionManager.getCurrentCharacterId();
                    const hasSavedChar = savedCharId && characters.some(c => 
                        (c.characterId || c.character_id) == savedCharId
                    );
                    if (!hasSavedChar && characters.length > 0) {
                        const first = characters[0];
                        sessionManager.setCurrentCharacterId(
                            first.characterId || first.character_id || first.id
                        );
                    }
                    sessionManager.saveSession();
                }
            }
            return true;
        } catch (error) {
            this.logout();
            return false;
        }
    }

    async register(username, password, email) {
        try {
            const result = await api.register(username, password, email);
            const token = result.token;
            if (token && typeof sessionManager !== 'undefined') {
                sessionManager.setToken(token);
                sessionManager.setUser({
                    userId: result.userId || result.user_id,
                    username
                });
            }
            return result;
        } catch (error) {
            throw error;
        }
    }

    async login(username, password) {
        try {
            const result = await api.login(username, password);
            const token = result.token;
            const userId = result.userId || result.user_id;
            const characters = result.characters || [];
            
            if (typeof sessionManager !== 'undefined') {
                sessionManager.setToken(token);
                sessionManager.setUser({ userId, username });
                sessionManager.setCharacters(characters.map(c => sessionManager.normalizeCharacter(c)));
                
                // 已有角色则选最近一个角色，无角色则后续引导创建
                if (characters.length > 0) {
                    const first = characters[0];
                    sessionManager.setCurrentCharacterId(
                        first.characterId || first.character_id || first.id
                    );
                } else {
                    sessionManager.clearCurrentCharacterId();
                }
                sessionManager.saveSession();
            }
            
            if (typeof api !== 'undefined' && typeof api.setToken === 'function') {
                api.setToken(token);
            }
            return result;
        } catch (error) {
            throw error;
        }
    }

    logout() {
        if (typeof sessionManager !== 'undefined') {
            sessionManager.logout();
        }
        if (typeof api !== 'undefined' && typeof api.setToken === 'function') {
            api.setToken(null);
        }
    }

    async createCharacter(characterName, gender, college) {
        try {
            if (!this.isLoggedIn()) {
                throw new Error('未登录，无法创建角色');
            }
            const userId = sessionManager.getUser().userId;
            const result = await api.createCharacter(userId, characterName, gender, college);
            const characterId = result.characterId || result.character_id || result.id;
            
            const newCharacter = {
                characterId,
                userId,
                characterName,
                gender,
                college,
                grade: 1,
                semester: 1,
                week: 1,
                level: 1,
                experience: 0,
                money: 1000,
                physical: 50,
                social: 50,
                knowledge: 50,
                mood: 50
            };
            
            if (typeof sessionManager !== 'undefined') {
                sessionManager.addCharacter(newCharacter);
                sessionManager.setCurrentCharacterId(characterId);
                sessionManager.saveSession();
            }
            return newCharacter;
        } catch (error) {
            throw error;
        }
    }

    async updateCharacter(data) {
        try {
            const currentCharacter = this.getCurrentCharacter();
            if (!currentCharacter) {
                throw new Error('未选择角色');
            }
            const characterId = currentCharacter.characterId || currentCharacter.character_id;
            const result = await api.updateCharacter(characterId, data);
            Object.assign(currentCharacter, data);
            if (typeof sessionManager !== 'undefined') {
                sessionManager.addCharacter(currentCharacter);
            }
            return result;
        } catch (error) {
            throw error;
        }
    }

    selectCharacter(character) {
        if (typeof sessionManager !== 'undefined') {
            sessionManager.setCurrentCharacterId(
                character.characterId || character.character_id || character.id
            );
            sessionManager.addCharacter(character);
        }
    }

    getCurrentCharacter() {
        if (typeof sessionManager !== 'undefined') {
            return sessionManager.getCurrentCharacter();
        }
        return null;
    }

    isLoggedIn() {
        return typeof sessionManager !== 'undefined' && sessionManager.isLoggedIn();
    }

    hasCharacters() {
        return typeof sessionManager !== 'undefined' && sessionManager.hasCharacters();
    }
}

const authSystem = new AuthSystem();
