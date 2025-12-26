// GameState - Tracks the runtime state of a game in progress
// Supports multiple players with shared world state
class GameState {
    constructor(game, existingState = null) {
        if (existingState) {
            // Load from existing state (for save/load)
            this.gameId = existingState.gameId;
            
            // Migrate old single-player saves to multiplayer structure
            if (existingState.currentLocation && !existingState.players) {
                // Old save format detected - migrate to multiplayer
                const legacyPlayerId = 'legacy-player-' + Date.now();
                this.players = {
                    [legacyPlayerId]: {
                        currentLocation: existingState.currentLocation,
                        score: existingState.score || 0,
                        turnCount: existingState.turnCount || 0,
                        visitedLocations: existingState.visitedLocations || [existingState.currentLocation],
                        flags: {}
                    }
                };
                this.activePlayerId = legacyPlayerId;
                
                // Migrate inventory items to player-specific keys
                const playerInventoryKey = `inventory-${legacyPlayerId}`;
                if (existingState.uniqueItemLocations) {
                    Object.keys(existingState.uniqueItemLocations).forEach(itemId => {
                        if (existingState.uniqueItemLocations[itemId] === 'inventory') {
                            existingState.uniqueItemLocations[itemId] = playerInventoryKey;
                        }
                    });
                }
                if (existingState.genericItemStacks && existingState.genericItemStacks['inventory']) {
                    existingState.genericItemStacks[playerInventoryKey] = existingState.genericItemStacks['inventory'];
                    delete existingState.genericItemStacks['inventory'];
                }
            } else {
                // New multiplayer format
                this.players = existingState.players || {};
                this.activePlayerId = existingState.activePlayerId || null;
            }
            
            // Shared world state
            this.uniqueItemLocations = existingState.uniqueItemLocations || {};
            this.genericItemStacks = existingState.genericItemStacks || {};
            this.npcLocations = existingState.npcLocations || {};
            this.containerStates = existingState.containerStates || {};
            this.exitStates = existingState.exitStates || {};
            this.flags = existingState.flags || {}; // Global game flags
            this.questStates = existingState.questStates || {};
        } else {
            // Initialize new game state from game definition
            this.gameId = game.id;
            
            // Multiplayer support - empty until players join
            this.players = {};
            this.activePlayerId = null;
            
            // Shared world state
            this.uniqueItemLocations = {};
            this.genericItemStacks = {};
            this.npcLocations = {};
            this.containerStates = {};
            this.exitStates = {};
            this.flags = {};
            this.questStates = {};
            
            // Initialize unique item locations from game definition
            if (game.uniqueItems) {
                game.uniqueItems.forEach(item => {
                    if (item.location) {
                        this.uniqueItemLocations[item.id] = item.location;
                    }
                    
                    // Initialize container contents
                    if (item.isContainer && item.contents && item.contents.length > 0) {
                        this.genericItemStacks[item.id] = [...item.contents];
                    }
                    
                    // Initialize container states
                    if (item.isContainer) {
                        this.containerStates[item.id] = {
                            isLocked: item.isLocked || false,
                            isOpen: !item.isClosed
                        };
                    }
                });
            }
            
            // Initialize NPC locations from game definition
            if (game.npcs) {
                game.npcs.forEach(npc => {
                    if (npc.location) {
                        this.npcLocations[npc.id] = npc.location;
                    }
                });
            }
            
            // Initialize quest states from game definition
            if (game.quests) {
                game.quests.forEach(quest => {
                    this.questStates[quest.id] = quest.initialState || 'inactive';
                });
            }
            
            // Initialize exit states from game definition
            if (game.locations) {
                game.locations.forEach(location => {
                    if (location.exits) {
                        location.exits.forEach(exit => {
                            const exitKey = `${location.id}-${exit.direction}`;
                            // Exits with requiredItem should start locked
                            this.exitStates[exitKey] = {
                                isLocked: exit.locked || (exit.requiredItem ? true : false)
                            };
                        });
                    }
                });
            }
        }
    }
    
    // ===== Player Management =====
    
    // Add a player to the game
    addPlayer(playerId, startLocation) {
        if (!this.players[playerId]) {
            this.players[playerId] = {
                currentLocation: startLocation,
                score: 0,
                turnCount: 0,
                visitedLocations: [startLocation],
                flags: {}
            };
            
            // If this is the first player, make them active
            if (!this.activePlayerId) {
                this.activePlayerId = playerId;
            }
        }
    }
    
    // Get active player
    getActivePlayer() {
        return this.players[this.activePlayerId];
    }
    
    // Get player by ID
    getPlayer(playerId) {
        return this.players[playerId];
    }
    
    // Set active player (for turn-based gameplay)
    setActivePlayer(playerId) {
        if (this.players[playerId]) {
            this.activePlayerId = playerId;
        }
    }
    
    // Get current location of active player
    getCurrentLocation() {
        const player = this.getActivePlayer();
        return player ? player.currentLocation : null;
    }
    
    // ===== Player Movement =====
    
    movePlayer(locationId, playerId = null) {
        const pid = playerId || this.activePlayerId;
        const player = this.players[pid];
        
        if (!player) return;
        
        player.currentLocation = locationId;
        if (!player.visitedLocations.includes(locationId)) {
            player.visitedLocations.push(locationId);
        }
        player.turnCount++;
    }
    
    hasVisitedLocation(locationId, playerId = null) {
        const pid = playerId || this.activePlayerId;
        const player = this.players[pid];
        return player ? player.visitedLocations.includes(locationId) : false;
    }
    
    // ===== Unique Item Management =====
    
    getUniqueItemLocation(itemId) {
        return this.uniqueItemLocations[itemId] || null;
    }
    
    moveUniqueItem(itemId, toLocation, playerId = null) {
        // If moving to inventory, use player-specific inventory key
        if (toLocation === 'inventory') {
            const pid = playerId || this.activePlayerId;
            toLocation = `inventory-${pid}`;
        }
        this.uniqueItemLocations[itemId] = toLocation;
    }
    
    isUniqueItemInInventory(itemId, playerId = null) {
        const pid = playerId || this.activePlayerId;
        return this.uniqueItemLocations[itemId] === `inventory-${pid}`;
    }
    
    isUniqueItemAtLocation(itemId, locationId) {
        return this.uniqueItemLocations[itemId] === locationId;
    }
    
    getUniqueItemsAtLocation(locationId) {
        return Object.keys(this.uniqueItemLocations)
            .filter(itemId => this.uniqueItemLocations[itemId] === locationId);
    }
    
    getUniqueItemsInInventory(playerId = null) {
        const pid = playerId || this.activePlayerId;
        return this.getUniqueItemsAtLocation(`inventory-${pid}`);
    }
    
    // ===== Generic Item Management =====
    
    // Get stack for a specific generic item in a container/location
    getGenericItemStack(containerId, itemId, playerId = null) {
        // Handle inventory requests
        if (containerId === 'inventory') {
            const pid = playerId || this.activePlayerId;
            containerId = `inventory-${pid}`;
        }
        
        if (!this.genericItemStacks[containerId]) {
            return null;
        }
        return this.genericItemStacks[containerId].find(stack => stack.itemId === itemId) || null;
    }
    
    // Get quantity of a generic item in a container/location
    getGenericItemQuantity(containerId, itemId, playerId = null) {
        const stack = this.getGenericItemStack(containerId, itemId, playerId);
        return stack ? stack.quantity : 0;
    }
    
    // Add generic items to a container/location
    addGenericItems(containerId, itemId, quantity, playerId = null) {
        // Handle inventory requests
        if (containerId === 'inventory') {
            const pid = playerId || this.activePlayerId;
            containerId = `inventory-${pid}`;
        }
        
        if (!this.genericItemStacks[containerId]) {
            this.genericItemStacks[containerId] = [];
        }
        
        const stack = this.getGenericItemStack(containerId, itemId, playerId);
        if (stack) {
            stack.quantity += quantity;
        } else {
            this.genericItemStacks[containerId].push({ itemId, quantity });
        }
    }
    
    // Remove generic items from a container/location
    removeGenericItems(containerId, itemId, quantity, playerId = null) {
        // Handle inventory requests
        if (containerId === 'inventory') {
            const pid = playerId || this.activePlayerId;
            containerId = `inventory-${pid}`;
        }
        
        if (!this.genericItemStacks[containerId]) {
            return false;
        }
        
        const stack = this.getGenericItemStack(containerId, itemId, playerId);
        if (!stack || stack.quantity < quantity) {
            return false;
        }
        
        stack.quantity -= quantity;
        
        // Remove stack if empty
        if (stack.quantity === 0) {
            this.genericItemStacks[containerId] = this.genericItemStacks[containerId]
                .filter(s => s.itemId !== itemId);
        }
        
        return true;
    }
    
    // Transfer generic items between containers/locations
    transferGenericItems(fromContainerId, toContainerId, itemId, quantity, playerId = null) {
        if (this.removeGenericItems(fromContainerId, itemId, quantity, playerId)) {
            this.addGenericItems(toContainerId, itemId, quantity, playerId);
            return true;
        }
        return false;
    }
    
    // Get all generic item stacks in a container/location
    getGenericItemStacksAt(containerId, playerId = null) {
        // Handle inventory requests
        if (containerId === 'inventory') {
            const pid = playerId || this.activePlayerId;
            containerId = `inventory-${pid}`;
        }
        return this.genericItemStacks[containerId] || [];
    }
    
    // Check if container/location has any generic items
    hasGenericItems(containerId, playerId = null) {
        const stacks = this.getGenericItemStacksAt(containerId, playerId);
        return stacks && stacks.length > 0;
    }
    
    // ===== Container State Management =====
    
    getContainerState(containerId) {
        return this.containerStates[containerId] || { isLocked: false, isOpen: true };
    }
    
    isContainerLocked(containerId) {
        const state = this.getContainerState(containerId);
        return state.isLocked;
    }
    
    isContainerOpen(containerId) {
        const state = this.getContainerState(containerId);
        return state.isOpen;
    }
    
    unlockContainer(containerId) {
        if (!this.containerStates[containerId]) {
            this.containerStates[containerId] = { isLocked: false, isOpen: false };
        }
        this.containerStates[containerId].isLocked = false;
    }
    
    openContainer(containerId) {
        if (!this.containerStates[containerId]) {
            this.containerStates[containerId] = { isLocked: false, isOpen: true };
        }
        this.containerStates[containerId].isOpen = true;
    }
    
    closeContainer(containerId) {
        if (!this.containerStates[containerId]) {
            this.containerStates[containerId] = { isLocked: false, isOpen: false };
        }
        this.containerStates[containerId].isOpen = false;
    }
    
    lockContainer(containerId) {
        if (!this.containerStates[containerId]) {
            this.containerStates[containerId] = { isLocked: true, isOpen: false };
        }
        this.containerStates[containerId].isLocked = true;
    }
    
    // ===== Exit State Management =====
    
    getExitState(locationId, direction) {
        const exitKey = `${locationId}-${direction}`;
        return this.exitStates[exitKey] || { isLocked: false };
    }
    
    isExitLocked(locationId, direction) {
        const state = this.getExitState(locationId, direction);
        return state.isLocked;
    }
    
    unlockExit(locationId, direction) {
        const exitKey = `${locationId}-${direction}`;
        if (!this.exitStates[exitKey]) {
            this.exitStates[exitKey] = { isLocked: false };
        }
        this.exitStates[exitKey].isLocked = false;
    }
    
    lockExit(locationId, direction) {
        const exitKey = `${locationId}-${direction}`;
        if (!this.exitStates[exitKey]) {
            this.exitStates[exitKey] = { isLocked: true };
        }
        this.exitStates[exitKey].isLocked = true;
    }
    
    // ===== NPC Management =====
    
    getNPCLocation(npcId) {
        return this.npcLocations[npcId] || null;
    }
    
    moveNPC(npcId, toLocation) {
        this.npcLocations[npcId] = toLocation;
    }
    
    isNPCAtLocation(npcId, locationId) {
        return this.npcLocations[npcId] === locationId;
    }
    
    getNPCsAtLocation(locationId) {
        return Object.keys(this.npcLocations)
            .filter(npcId => this.npcLocations[npcId] === locationId);
    }
    
    // ===== Flags & State Management =====
    
    // Global flags (shared across all players)
    setFlag(key, value) {
        this.flags[key] = value;
    }
    
    getFlag(key, defaultValue = null) {
        return this.flags.hasOwnProperty(key) ? this.flags[key] : defaultValue;
    }
    
    hasFlag(key) {
        return this.flags.hasOwnProperty(key);
    }
    
    removeFlag(key) {
        delete this.flags[key];
    }
    
    // Per-player flags
    setPlayerFlag(key, value, playerId = null) {
        const pid = playerId || this.activePlayerId;
        const player = this.players[pid];
        if (player) {
            player.flags[key] = value;
        }
    }
    
    getPlayerFlag(key, defaultValue = null, playerId = null) {
        const pid = playerId || this.activePlayerId;
        const player = this.players[pid];
        if (!player || !player.flags) return defaultValue;
        return player.flags.hasOwnProperty(key) ? player.flags[key] : defaultValue;
    }
    
    hasPlayerFlag(key, playerId = null) {
        const pid = playerId || this.activePlayerId;
        const player = this.players[pid];
        return player && player.flags && player.flags.hasOwnProperty(key);
    }
    
    removePlayerFlag(key, playerId = null) {
        const pid = playerId || this.activePlayerId;
        const player = this.players[pid];
        if (player && player.flags) {
            delete player.flags[key];
        }
    }
    
    // ===== Quest Management =====
    
    setQuestState(questId, state) {
        this.questStates[questId] = state;
    }
    
    getQuestState(questId) {
        return this.questStates[questId] || null;
    }
    
    isQuestActive(questId) {
        return this.questStates[questId] === 'active';
    }
    
    isQuestCompleted(questId) {
        return this.questStates[questId] === 'completed';
    }
    
    // ===== Score & Stats =====
    
    addScore(points, playerId = null) {
        const pid = playerId || this.activePlayerId;
        const player = this.players[pid];
        if (player) {
            player.score += points;
        }
    }
    
    getScore(playerId = null) {
        const pid = playerId || this.activePlayerId;
        const player = this.players[pid];
        return player ? player.score : 0;
    }
    
    getTurnCount(playerId = null) {
        const pid = playerId || this.activePlayerId;
        const player = this.players[pid];
        return player ? player.turnCount : 0;
    }
    
    // ===== Serialization =====
    
    toJSON() {
        return {
            gameId: this.gameId,
            players: this.players,
            activePlayerId: this.activePlayerId,
            uniqueItemLocations: this.uniqueItemLocations,
            genericItemStacks: this.genericItemStacks,
            npcLocations: this.npcLocations,
            containerStates: this.containerStates,
            exitStates: this.exitStates,
            flags: this.flags,
            questStates: this.questStates,
            timestamp: new Date().toISOString()
        };
    }
    
    static fromJSON(game, data) {
        return new GameState(game, data);
    }}