// IndexedDB Storage Manager
class StorageManager {
    constructor() {
        this.dbName = 'ignyos.text-adventure';
        this.dbVersion = 4;  // Incremented for players store
        this.db = null;
    }

    // Initialize the database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject('Failed to open database');
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store for save states
                if (!db.objectStoreNames.contains('saves')) {
                    const saveStore = db.createObjectStore('saves', { keyPath: 'id', autoIncrement: true });
                    saveStore.createIndex('gameId', 'gameId', { unique: false });
                    saveStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // Create object store for published games
                if (!db.objectStoreNames.contains('games')) {
                    const gameStore = db.createObjectStore('games', { keyPath: 'id' });
                    gameStore.createIndex('version', 'version', { unique: false });
                    gameStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // Create object store for game drafts (work in progress)
                if (!db.objectStoreNames.contains('game-drafts')) {
                    const draftStore = db.createObjectStore('game-drafts', { keyPath: 'id' });
                    draftStore.createIndex('lastModified', 'lastModified', { unique: false });
                    draftStore.createIndex('title', 'title', { unique: false });
                }
                
                // Create object store for players
                if (!db.objectStoreNames.contains('players')) {
                    const playerStore = db.createObjectStore('players', { keyPath: 'id' });
                    playerStore.createIndex('name', 'name', { unique: false });
                    playerStore.createIndex('createDate', 'createDate', { unique: false });
                    playerStore.createIndex('lastActive', 'lastActive', { unique: false });
                }
            };
        });
    }

    // Save game state
    async saveGameState(gameId, gameTitle, gameState) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readwrite');
            const store = transaction.objectStore('saves');

            const saveData = {
                gameId: gameId,
                gameTitle: gameTitle,
                gameState: gameState,
                timestamp: new Date().toISOString()
            };

            const request = store.add(saveData);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject('Failed to save game state');
            };
        });
    }

    // Get all save states
    async getAllSaves() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readonly');
            const store = transaction.objectStore('saves');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject('Failed to retrieve saves');
            };
        });
    }

    // Get save by ID
    async getSaveById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readonly');
            const store = transaction.objectStore('saves');
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject('Failed to retrieve save');
            };
        });
    }

    // Delete save by ID
    async deleteSave(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['saves'], 'readwrite');
            const store = transaction.objectStore('saves');
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject('Failed to delete save');
            };
        });
    }
    
    // ===== Game Store Methods =====
    
    // Save or update a game in the database
    async saveGame(gameData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games'], 'readwrite');
            const store = transaction.objectStore('games');
            
            const gameRecord = {
                id: gameData.id,
                title: gameData.title,
                description: gameData.description,
                version: gameData.version,
                author: gameData.author,
                gameData: gameData,
                timestamp: new Date().toISOString()
            };
            
            const request = store.put(gameRecord);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject('Failed to save game');
            };
        });
    }
    
    // Get a game by ID
    async getGame(gameId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games'], 'readonly');
            const store = transaction.objectStore('games');
            const request = store.get(gameId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject('Failed to retrieve game');
            };
        });
    }
    
    // Get all games
    async getAllGames() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games'], 'readonly');
            const store = transaction.objectStore('games');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject('Failed to retrieve games');
            };
        });
    }
    
    // Delete a game by ID
    async deleteGame(gameId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games'], 'readwrite');
            const store = transaction.objectStore('games');
            const request = store.delete(gameId);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject('Failed to delete game');
            };
        });
    }
    
    // ===== Game Draft Store Methods =====
    
    // Save or update a game draft
    async saveDraft(draftData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['game-drafts'], 'readwrite');
            const store = transaction.objectStore('game-drafts');
            
            const draftRecord = {
                id: draftData.id,
                title: draftData.title || 'Untitled Game',
                description: draftData.description || '',
                author: draftData.author || 'Unknown',
                draftData: draftData,
                lastModified: new Date().toISOString()
            };
            
            const request = store.put(draftRecord);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject('Failed to save draft');
            };
        });
    }
    
    // Get a draft by ID
    async getDraft(draftId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['game-drafts'], 'readonly');
            const store = transaction.objectStore('game-drafts');
            const request = store.get(draftId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject('Failed to retrieve draft');
            };
        });
    }
    
    // Get all drafts
    async getAllDrafts() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['game-drafts'], 'readonly');
            const store = transaction.objectStore('game-drafts');
            const request = store.getAll();
            
            request.onsuccess = () => {
                // Sort by lastModified descending
                const drafts = request.result.sort((a, b) => 
                    new Date(b.lastModified) - new Date(a.lastModified)
                );
                resolve(drafts);
            };
            
            request.onerror = () => {
                reject('Failed to retrieve drafts');
            };
        });
    }
    
    // Delete a draft by ID
    async deleteDraft(draftId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['game-drafts'], 'readwrite');
            const store = transaction.objectStore('game-drafts');
            const request = store.delete(draftId);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject('Failed to delete draft');
            };
        });
    }
    
    // Publish a draft (move to games store)
    async publishDraft(draftId) {
        return new Promise(async (resolve, reject) => {
            try {
                // Get the draft
                const draft = await this.getDraft(draftId);
                if (!draft) {
                    reject('Draft not found');
                    return;
                }
                
                // Save as published game
                await this.saveGame(draft.draftData);
                
                // Delete the draft
                await this.deleteDraft(draftId);
                
                resolve();
            } catch (error) {
                reject(`Failed to publish draft: ${error}`);
            }
        });
    }
    
    // ===== Player Store Methods =====
    
    // Save or update a player
    async savePlayer(playerData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['players'], 'readwrite');
            const store = transaction.objectStore('players');
            const request = store.put(playerData);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject('Failed to save player');
            };
        });
    }
    
    // Get a player by ID
    async getPlayer(playerId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['players'], 'readonly');
            const store = transaction.objectStore('players');
            const request = store.get(playerId);
            
            request.onsuccess = () => {
                const data = request.result;
                resolve(data ? new Player(data) : null);
            };
            
            request.onerror = () => {
                reject('Failed to retrieve player');
            };
        });
    }
    
    // Get all players
    async getAllPlayers() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['players'], 'readonly');
            const store = transaction.objectStore('players');
            const request = store.getAll();
            
            request.onsuccess = () => {
                // Convert to Player instances and sort by lastActive descending
                const players = request.result
                    .map(data => new Player(data))
                    .sort((a, b) => 
                        new Date(b.lastActive) - new Date(a.lastActive)
                    );
                resolve(players);
            };
            
            request.onerror = () => {
                reject('Failed to retrieve players');
            };
        });
    }
    
    // Delete a player by ID
    async deletePlayer(playerId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['players'], 'readwrite');
            const store = transaction.objectStore('players');
            const request = store.delete(playerId);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject('Failed to delete player');
            };
        });
    }
}
