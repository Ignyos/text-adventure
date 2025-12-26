// Game Model - Represents a complete game definition
class Game {
    constructor(data) {
        // Validate and set properties
        this.validateGameData(data);
        
        this.id = data.id;
        this.title = data.title;
        this.author = data.author || 'Unknown';
        this.version = data.version;
        this.description = data.description || '';
        this.objective = data.objective || '';
        this.startLocation = data.startLocation;
        
        // Initialize collections with proper class instances
        this.locations = (data.locations || []).map(loc => new Location(loc));
        this.genericItems = (data.genericItems || []).map(item => new GenericItem(item));
        this.uniqueItems = (data.uniqueItems || []).map(item => new UniqueItem(item));
        this.npcs = data.npcs || [];
        this.quests = (data.quests || []).map(quest => new Quest(quest));
        
        // Validate structure
        this.validate();
        
        // Build lookup maps for efficient access
        this.buildLookupMaps();
    }
    
    // Validate game data requirements
    validateGameData(gameData) {
        if (!gameData) {
            throw new Error('Game must have data');
        }
        
        const required = ['id', 'title', 'version', 'startLocation'];
        for (const field of required) {
            if (!gameData[field]) {
                throw new Error(`Game missing required field: ${field}`);
            }
        }
    }
    
    // Validate game structure
    validate() {
        // Validate locations array
        if (!Array.isArray(this.locations)) {
            throw new Error('Game locations must be an array');
        }
        
        if (this.locations.length === 0) {
            throw new Error('Game must have at least one location');
        }
        
        // Validate each location has required fields
        this.locations.forEach((loc, index) => {
            if (!loc.id) {
                throw new Error(`Location at index ${index} missing id`);
            }
            if (!loc.name) {
                throw new Error(`Location ${loc.id} missing name`);
            }
            if (!loc.description) {
                throw new Error(`Location ${loc.id} missing description`);
            }
        });
        
        // Validate start location exists
        const startExists = this.locations.some(loc => loc.id === this.startLocation);
        if (!startExists) {
            throw new Error(`Start location '${this.startLocation}' not found in locations`);
        }
        
        // Validate items arrays
        if (!Array.isArray(this.genericItems)) {
            throw new Error('Game genericItems must be an array');
        }
        
        if (!Array.isArray(this.uniqueItems)) {
            throw new Error('Game uniqueItems must be an array');
        }
        
        // Validate NPCs array
        if (!Array.isArray(this.npcs)) {
            throw new Error('Game npcs must be an array');
        }
        
        // Validate quests array
        if (!Array.isArray(this.quests)) {
            throw new Error('Game quests must be an array');
        }
        
        // Validate main quest exists if any quests defined
        if (this.quests.length > 0) {
            const mainQuests = this.quests.filter(q => q.isMainQuest);
            if (mainQuests.length === 0) {
                throw new Error('Game must have at least one main quest');
            }
            if (mainQuests.length > 1) {
                throw new Error('Game can only have one main quest');
            }
        }
        
        // Validate exit references
        this.validateExits();
    }
    
    // Validate that all exits point to valid locations
    validateExits() {
        const locationIds = new Set(this.locations.map(loc => loc.id));
        
        this.locations.forEach(location => {
            if (!location.exits) return;
            
            location.exits.forEach((exit, index) => {
                if (!exit.direction) {
                    throw new Error(`Exit at index ${index} in location ${location.id} missing direction`);
                }
                if (!exit.leadsTo) {
                    throw new Error(`Exit ${exit.direction} in location ${location.id} missing leadsTo`);
                }
                if (!locationIds.has(exit.leadsTo)) {
                    throw new Error(`Exit ${exit.direction} in location ${location.id} leads to non-existent location: ${exit.leadsTo}`);
                }
            });
        });
    }
    
    // Build lookup maps for efficient access
    buildLookupMaps() {
        this.locationMap = new Map();
        this.genericItemMap = new Map();
        this.uniqueItemMap = new Map();
        this.npcMap = new Map();
        this.questMap = new Map();
        
        this.locations.forEach(location => {
            this.locationMap.set(location.id, location);
        });
        
        this.genericItems.forEach(item => {
            this.genericItemMap.set(item.id, item);
        });
        
        this.uniqueItems.forEach(item => {
            this.uniqueItemMap.set(item.id, item);
        });
        
        this.npcs.forEach(npc => {
            this.npcMap.set(npc.id, npc);
        });
        
        this.quests.forEach(quest => {
            this.questMap.set(quest.id, quest);
        });
    }
    
    // Get a location by ID
    getLocation(locationId) {
        return this.locationMap.get(locationId);
    }
    
    // Get a generic item by ID
    getGenericItem(itemId) {
        return this.genericItemMap.get(itemId);
    }
    
    // Get a unique item by ID
    getUniqueItem(itemId) {
        return this.uniqueItemMap.get(itemId);
    }
    
    // Get an NPC by ID
    getNPC(npcId) {
        return this.npcMap.get(npcId);
    }
    
    // Get a quest by ID
    getQuest(questId) {
        return this.questMap.get(questId);
    }
    
    // Get the main quest
    getMainQuest() {
        return this.quests.find(q => q.isMainQuest) || null;
    }
    
    // Get all locations
    getLocations() {
        return this.locations;
    }
    
    // Get all generic items
    getGenericItems() {
        return this.genericItems;
    }
    
    // Get all unique items
    getUniqueItems() {
        return this.uniqueItems;
    }
    
    // Get all NPCs
    getNPCs() {
        return this.npcs;
    }
    
    // Get all quests
    getQuests() {
        return this.quests;
    }
    
    // Serialize to plain object for storage
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            author: this.author,
            version: this.version,
            description: this.description,
            objective: this.objective,
            startLocation: this.startLocation,
            locations: this.locations,
            genericItems: this.genericItems,
            uniqueItems: this.uniqueItems,
            npcs: this.npcs,
            quests: this.quests
        };
    }
    
    // Create Game instance from plain object
    static fromJSON(data) {
        return new Game(data);
    }
    
    // Create a game record for IndexedDB storage
    toStorageRecord() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            version: this.version,
            author: this.author,
            gameData: this.toJSON(),
            timestamp: new Date().toISOString()
        };
    }
}
