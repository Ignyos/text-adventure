// GameState - Tracks the runtime state of a game in progress
class GameState {
    constructor(game, existingState = null) {
        if (existingState) {
            // Load from existing state (for save/load)
            this.gameId = existingState.gameId;
            this.currentLocation = existingState.currentLocation;
            this.uniqueItemLocations = existingState.uniqueItemLocations || {};
            this.genericItemStacks = existingState.genericItemStacks || {};
            this.npcLocations = existingState.npcLocations || {};
            this.flags = existingState.flags || {};
            this.questStates = existingState.questStates || {};
            this.turnCount = existingState.turnCount || 0;
            this.score = existingState.score || 0;
            this.visitedLocations = existingState.visitedLocations || [];
        } else {
            // Initialize new game state from game definition
            this.gameId = game.id;
            this.currentLocation = game.startLocation;
            this.uniqueItemLocations = {};
            this.genericItemStacks = {};
            this.npcLocations = {};
            this.flags = {};
            this.questStates = {};
            this.turnCount = 0;
            this.score = 0;
            this.visitedLocations = [game.startLocation];
            
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
        }
    }
    
    // ===== Player Movement =====
    
    movePlayer(locationId) {
        this.currentLocation = locationId;
        if (!this.visitedLocations.includes(locationId)) {
            this.visitedLocations.push(locationId);
        }
        this.turnCount++;
    }
    
    hasVisitedLocation(locationId) {
        return this.visitedLocations.includes(locationId);
    }
    
    // ===== Unique Item Management =====
    
    getUniqueItemLocation(itemId) {
        return this.uniqueItemLocations[itemId] || null;
    }
    
    moveUniqueItem(itemId, toLocation) {
        this.uniqueItemLocations[itemId] = toLocation;
    }
    
    isUniqueItemInInventory(itemId) {
        return this.uniqueItemLocations[itemId] === 'inventory';
    }
    
    isUniqueItemAtLocation(itemId, locationId) {
        return this.uniqueItemLocations[itemId] === locationId;
    }
    
    getUniqueItemsAtLocation(locationId) {
        return Object.keys(this.uniqueItemLocations)
            .filter(itemId => this.uniqueItemLocations[itemId] === locationId);
    }
    
    getUniqueItemsInInventory() {
        return this.getUniqueItemsAtLocation('inventory');
    }
    
    // ===== Generic Item Management =====
    
    // Get stack for a specific generic item in a container/location
    getGenericItemStack(containerId, itemId) {
        if (!this.genericItemStacks[containerId]) {
            return null;
        }
        return this.genericItemStacks[containerId].find(stack => stack.itemId === itemId) || null;
    }
    
    // Get quantity of a generic item in a container/location
    getGenericItemQuantity(containerId, itemId) {
        const stack = this.getGenericItemStack(containerId, itemId);
        return stack ? stack.quantity : 0;
    }
    
    // Add generic items to a container/location
    addGenericItems(containerId, itemId, quantity) {
        if (!this.genericItemStacks[containerId]) {
            this.genericItemStacks[containerId] = [];
        }
        
        const stack = this.getGenericItemStack(containerId, itemId);
        if (stack) {
            stack.quantity += quantity;
        } else {
            this.genericItemStacks[containerId].push({ itemId, quantity });
        }
    }
    
    // Remove generic items from a container/location
    removeGenericItems(containerId, itemId, quantity) {
        if (!this.genericItemStacks[containerId]) {
            return false;
        }
        
        const stack = this.getGenericItemStack(containerId, itemId);
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
    transferGenericItems(fromContainerId, toContainerId, itemId, quantity) {
        if (this.removeGenericItems(fromContainerId, itemId, quantity)) {
            this.addGenericItems(toContainerId, itemId, quantity);
            return true;
        }
        return false;
    }
    
    // Get all generic item stacks in a container/location
    getGenericItemStacksAt(containerId) {
        return this.genericItemStacks[containerId] || [];
    }
    
    // Check if container/location has any generic items
    hasGenericItems(containerId) {
        const stacks = this.genericItemStacks[containerId];
        return stacks && stacks.length > 0;
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
    
    addScore(points) {
        this.score += points;
    }
    
    getTurnCount() {
        return this.turnCount;
    }
    
    // ===== Serialization =====
    
    toJSON() {
        return {
            gameId: this.gameId,
            currentLocation: this.currentLocation,
            uniqueItemLocations: this.uniqueItemLocations,
            genericItemStacks: this.genericItemStacks,
            npcLocations: this.npcLocations,
            flags: this.flags,
            questStates: this.questStates,
            turnCount: this.turnCount,
            score: this.score,
            visitedLocations: this.visitedLocations,
            timestamp: new Date().toISOString()
        };
    }
    
    static fromJSON(game, data) {
        return new GameState(game, data);
    }
}
