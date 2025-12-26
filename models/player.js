// Player - Represents a player identity (stored in players store)
// Game-specific state (location, inventory, etc.) is stored in GameState
class Player {
    constructor(data = {}) {
        // Generate or use existing ID
        this.id = data.id || this.generateGUID();
        
        // Player identity
        this.name = data.name || 'Player';
        this.createDate = data.createDate || new Date().toISOString();
        
        // Metadata
        this.lastActive = data.lastActive || new Date().toISOString();
        this.deleted = data.deleted || false; // Soft delete flag
    }
    
    // Generate a GUID for the player
    generateGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Update last active timestamp
    updateActivity() {
        this.lastActive = new Date().toISOString();
    }
    
    // Serialize to JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            createDate: this.createDate,
            lastActive: this.lastActive,
            deleted: this.deleted
        };
    }
    
    // Create Player from JSON
    static fromJSON(data) {
        return new Player(data);
    }
}
