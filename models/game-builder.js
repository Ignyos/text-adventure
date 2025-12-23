// GameBuilder - For creating and editing games
class GameBuilder {
    constructor(existingGame = null) {
        if (existingGame) {
            // Edit existing game
            this.id = existingGame.id;
            this.title = existingGame.title;
            this.author = existingGame.author;
            this.version = existingGame.version;
            this.description = existingGame.description;
            this.objective = existingGame.objective;
            this.startLocation = existingGame.startLocation;
            this.locations = [...existingGame.locations];
            this.genericItems = [...existingGame.genericItems];
            this.uniqueItems = [...existingGame.uniqueItems];
            this.npcs = [...existingGame.npcs];
        } else {
            // New game
            this.id = this.generateId();
            this.title = 'Untitled Game';
            this.author = 'Unknown';
            this.version = '1.0';
            this.description = '';
            this.objective = '';
            this.startLocation = null;
            this.locations = [];
            this.genericItems = [];
            this.uniqueItems = [];
            this.npcs = [];
        }
    }
    
    // Generate unique ID
    generateId() {
        return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Set basic properties
    setProperty(key, value) {
        if (this.hasOwnProperty(key)) {
            this[key] = value;
        }
    }
    
    setTitle(title) { this.title = title; }
    setAuthor(author) { this.author = author; }
    setVersion(version) { this.version = version; }
    setDescription(description) { this.description = description; }
    setObjective(objective) { this.objective = objective; }
    setStartLocation(locationId) { this.startLocation = locationId; }
    
    // Location management
    addLocation(location) {
        // Validate location has required fields
        if (!location.id) {
            return { success: false, error: 'Location must have an id' };
        }
        if (!location.name) {
            return { success: false, error: 'Location must have a name' };
        }
        if (!location.description) {
            return { success: false, error: 'Location must have a description' };
        }
        
        // Check for duplicate ID
        if (this.locations.some(loc => loc.id === location.id)) {
            return { success: false, error: `Location with id '${location.id}' already exists` };
        }
        
        this.locations.push({
            id: location.id,
            name: location.name,
            description: location.description,
            exits: location.exits || []
        });
        
        return { success: true };
    }
    
    updateLocation(locationId, changes) {
        const index = this.locations.findIndex(loc => loc.id === locationId);
        if (index === -1) {
            return { success: false, error: 'Location not found' };
        }
        
        this.locations[index] = {
            ...this.locations[index],
            ...changes
        };
        
        return { success: true };
    }
    
    removeLocation(locationId) {
        const index = this.locations.findIndex(loc => loc.id === locationId);
        if (index === -1) {
            return { success: false, error: 'Location not found' };
        }
        
        // Check if it's the start location
        if (this.startLocation === locationId) {
            return { success: false, error: 'Cannot remove start location. Set a different start location first.' };
        }
        
        // Check if any exits reference this location
        const referencedBy = [];
        this.locations.forEach(loc => {
            if (loc.exits) {
                loc.exits.forEach(exit => {
                    if (exit.leadsTo === locationId) {
                        referencedBy.push(loc.id);
                    }
                });
            }
        });
        
        if (referencedBy.length > 0) {
            return { 
                success: false, 
                error: `Location is referenced by exits from: ${referencedBy.join(', ')}` 
            };
        }
        
        this.locations.splice(index, 1);
        return { success: true };
    }
    
    getLocation(locationId) {
        return this.locations.find(loc => loc.id === locationId);
    }
    
    // Generic Item management
    addGenericItem(item) {
        if (!item.id) {
            return { success: false, error: 'GenericItem must have an id' };
        }
        if (!item.name) {
            return { success: false, error: 'GenericItem must have a name' };
        }
        
        // Check for duplicate ID
        if (this.genericItems.some(i => i.id === item.id)) {
            return { success: false, error: `GenericItem with id '${item.id}' already exists` };
        }
        
        this.genericItems.push(item);
        return { success: true };
    }
    
    updateGenericItem(itemId, changes) {
        const index = this.genericItems.findIndex(item => item.id === itemId);
        if (index === -1) {
            return { success: false, error: 'GenericItem not found' };
        }
        
        this.genericItems[index] = {
            ...this.genericItems[index],
            ...changes
        };
        
        return { success: true };
    }
    
    removeGenericItem(itemId) {
        const index = this.genericItems.findIndex(item => item.id === itemId);
        if (index === -1) {
            return { success: false, error: 'GenericItem not found' };
        }
        this.genericItems.splice(index, 1);
        return { success: true };
    }
    
    getGenericItem(itemId) {
        return this.genericItems.find(item => item.id === itemId);
    }
    
    // Unique Item management
    addUniqueItem(item) {
        if (!item.id) {
            return { success: false, error: 'UniqueItem must have an id' };
        }
        if (!item.name) {
            return { success: false, error: 'UniqueItem must have a name' };
        }
        
        // Check for duplicate ID
        if (this.uniqueItems.some(i => i.id === item.id)) {
            return { success: false, error: `UniqueItem with id '${item.id}' already exists` };
        }
        
        this.uniqueItems.push(item);
        return { success: true };
    }
    
    updateUniqueItem(itemId, changes) {
        const index = this.uniqueItems.findIndex(item => item.id === itemId);
        if (index === -1) {
            return { success: false, error: 'UniqueItem not found' };
        }
        
        this.uniqueItems[index] = {
            ...this.uniqueItems[index],
            ...changes
        };
        
        return { success: true };
    }
    
    removeUniqueItem(itemId) {
        const index = this.uniqueItems.findIndex(item => item.id === itemId);
        if (index === -1) {
            return { success: false, error: 'UniqueItem not found' };
        }
        this.uniqueItems.splice(index, 1);
        return { success: true };
    }
    
    getUniqueItem(itemId) {
        return this.uniqueItems.find(item => item.id === itemId);
    }
    
    // NPC management (basic structure for future)
    addNPC(npc) {
        if (!npc.id) {
            return { success: false, error: 'NPC must have an id' };
        }
        this.npcs.push(npc);
        return { success: true };
    }
    
    removeNPC(npcId) {
        const index = this.npcs.findIndex(npc => npc.id === npcId);
        if (index === -1) {
            return { success: false, error: 'NPC not found' };
        }
        this.npcs.splice(index, 1);
        return { success: true };
    }
    
    // Validation - returns array of issues instead of throwing
    validate() {
        const issues = [];
        
        if (!this.id) issues.push('Game must have an id');
        if (!this.title) issues.push('Game must have a title');
        if (!this.version) issues.push('Game must have a version');
        
        if (this.locations.length === 0) {
            issues.push('Game must have at least one location');
        }
        
        if (!this.startLocation) {
            issues.push('Game must have a start location');
        } else {
            const startExists = this.locations.some(loc => loc.id === this.startLocation);
            if (!startExists) {
                issues.push(`Start location '${this.startLocation}' not found`);
            }
        }
        
        // Validate exit references
        this.locations.forEach(location => {
            if (location.exits) {
                location.exits.forEach(exit => {
                    if (!this.locations.some(loc => loc.id === exit.leadsTo)) {
                        issues.push(`Exit '${exit.direction}' in location '${location.id}' leads to non-existent location '${exit.leadsTo}'`);
                    }
                });
            }
        });
        
        return issues;
    }
    
    // Check if game can be published
    canPublish() {
        return this.validate().length === 0;
    }
    
    // Convert to immutable Game instance (for publishing)
    toGame() {
        const issues = this.validate();
        if (issues.length > 0) {
            throw new Error(`Cannot create Game: ${issues.join(', ')}`);
        }
        
        return new Game(this.toJSON());
    }
    
    // Serialize to JSON (for saving draft)
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
    
    // Create GameBuilder from existing data
    static fromJSON(data) {
        const builder = new GameBuilder();
        builder.id = data.id;
        builder.title = data.title;
        builder.author = data.author;
        builder.version = data.version;
        builder.description = data.description;
        builder.objective = data.objective;
        builder.startLocation = data.startLocation;
        builder.locations = data.locations || [];
        builder.genericItems = data.genericItems || [];
        builder.uniqueItems = data.uniqueItems || [];
        builder.npcs = data.npcs || [];
        return builder;
    }
    
    // Create GameBuilder from published Game
    static fromGame(game) {
        return new GameBuilder(game);
    }
}
