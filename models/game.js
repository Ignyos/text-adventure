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
        
        // Initialize collections
        this.locations = data.locations || [];
        this.genericItems = data.genericItems || [];
        this.uniqueItems = data.uniqueItems || [];
        this.npcs = data.npcs || [];
        
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
            npcs: this.npcs
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
