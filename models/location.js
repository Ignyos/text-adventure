// Location - Represents a place in the game world
class Location {
    constructor(data) {
        // Validate required fields
        if (!data.id) throw new Error('Location must have an id');
        if (!data.name) throw new Error('Location must have a name');
        if (!data.description) throw new Error('Location must have a description');
        
        // Core properties (immutable definition)
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        
        // Exits - array of {direction, leadsTo, [locked], [lockedMessage], [requiredItem]}
        this.exits = data.exits || [];
        
        // Optional properties
        this.examineText = data.examineText || null;  // Additional detail when examined
        this.onEnter = data.onEnter || null;          // Script/function when entering
        this.onExit = data.onExit || null;            // Script/function when leaving
        this.flags = data.flags || {};                // Custom flags for this location
    }
    
    // Get all available exits
    getExits() {
        return this.exits;
    }
    
    // Get a specific exit by direction
    getExit(direction) {
        return this.exits.find(exit => 
            exit.direction.toLowerCase() === direction.toLowerCase()
        );
    }
    
    // Check if exit exists in a direction
    hasExit(direction) {
        return this.getExit(direction) !== undefined;
    }
    
    // Get list of available directions
    getAvailableDirections() {
        return this.exits.map(exit => exit.direction);
    }
    
    // Get description with dynamic content
    getDescription(gameState = null) {
        let desc = this.description;
        
        // Could add dynamic content based on game state
        // For example, mentioning items or NPCs present
        if (gameState) {
            const itemsHere = gameState.getItemsAtLocation(this.id);
            const npcsHere = gameState.getNPCsAtLocation(this.id);
            
            if (itemsHere && itemsHere.length > 0) {
                // Could add item descriptions
            }
            
            if (npcsHere && npcsHere.length > 0) {
                // Could add NPC presence
            }
        }
        
        return desc;
    }
    
    // Serialize to JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            exits: this.exits,
            examineText: this.examineText,
            onEnter: this.onEnter,
            onExit: this.onExit,
            flags: this.flags
        };
    }
    
    // Create Location from JSON
    static fromJSON(data) {
        return new Location(data);
    }
}

// Exit helper - not a class, just a structure
// {
//   direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | custom,
//   leadsTo: 'location-id',
//   locked: false,              // optional - is this exit locked?
//   lockedMessage: 'text',      // optional - message when trying locked exit
//   requiredItem: 'key-id'      // optional - item needed to unlock
// }
