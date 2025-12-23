// GenericItem - Template for stackable items (coins, arrows, etc.)
// These have no location in the definition - they are placed in game state
class GenericItem {
    constructor(data) {
        // Validate required fields
        if (!data.id) throw new Error('GenericItem must have an id');
        if (!data.name) throw new Error('GenericItem must have a name');
        
        // Core properties
        this.id = data.id;
        this.name = data.name;                                      // Singular form
        this.namePlural = data.namePlural || `${data.name}s`;       // Plural form
        this.description = data.description || '';
        
        // Display text
        this.examineText = data.examineText || this.description;
        
        // Custom flags for game logic
        this.flags = data.flags || {};
    }
    
    // Get display name based on quantity
    getDisplayName(quantity = 1) {
        return quantity === 1 ? this.name : this.namePlural;
    }
    
    // Get formatted description with quantity
    getDescription(quantity = 1) {
        const name = this.getDisplayName(quantity);
        if (quantity > 1) {
            return `${quantity} ${name}`;
        }
        return name;
    }
    
    // Serialize to JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            namePlural: this.namePlural,
            description: this.description,
            examineText: this.examineText,
            flags: this.flags
        };
    }
    
    // Create GenericItem from JSON
    static fromJSON(data) {
        return new GenericItem(data);
    }
}
