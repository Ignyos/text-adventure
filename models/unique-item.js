// UniqueItem - Represents a specific object in the game world
// These are tracked individually and have complex behavior
class UniqueItem {
    constructor(data) {
        // Validate required fields
        if (!data.id) throw new Error('UniqueItem must have an id');
        if (!data.name) throw new Error('UniqueItem must have a name');
        
        // Core properties
        this.id = data.id;
        this.name = data.name;
        this.description = data.description || '';
        
        // Initial location (location-id or 'inventory')
        this.location = data.location || null;
        
        // Item properties
        this.takeable = data.takeable !== undefined ? data.takeable : true;  // Can be picked up?
        this.visible = data.visible !== undefined ? data.visible : true;     // Can be seen?
        this.usable = data.usable || false;                                  // Can be used?
        this.consumable = data.consumable || false;                          // Destroyed on use?
        
        // Container properties
        this.isContainer = data.isContainer || false;                        // Can hold generic items?
        this.contents = data.contents || [];                                 // [{itemId, quantity}]
        this.containerCapacity = data.containerCapacity || null;             // Max items (null = unlimited)
        this.isLocked = data.isLocked || false;                              // Initially locked?
        this.isClosed = data.isClosed !== undefined ? data.isClosed : true;  // Initially closed?
        this.requiredKey = data.requiredKey || null;                         // Item ID needed to unlock
        this.lockedMessage = data.lockedMessage || null;                     // Message when locked
        this.closedMessage = data.closedMessage || null;                     // Message when closed
        
        // Interaction text
        this.examineText = data.examineText || this.description;  // Detail when examined
        this.takeText = data.takeText || null;                    // Message when taken
        this.dropText = data.dropText || null;                    // Message when dropped
        this.useText = data.useText || null;                      // Message when used
        this.cantTakeText = data.cantTakeText || null;            // Message if not takeable
        this.openText = data.openText || null;                    // Message when opened (containers)
        
        // Usage properties
        this.usesWith = data.usesWith || null;        // Item/location ID this can be used with
        this.onUse = data.onUse || null;              // Script/function when used
        this.onOpen = data.onOpen || null;            // Script/function when opened (containers)
        
        // Custom flags for game logic
        this.flags = data.flags || {};
    }
    
    // Check if item can be taken
    canTake() {
        return this.takeable && this.visible;
    }
    
    // Check if item can be used
    canUse() {
        return this.usable;
    }
    
    // Check if item can be used with a target
    canUseWith(targetId) {
        if (!this.usable) return false;
        if (!this.usesWith) return true;  // Can be used anywhere
        
        // Check if target matches
        if (Array.isArray(this.usesWith)) {
            return this.usesWith.includes(targetId);
        }
        return this.usesWith === targetId;
    }
    
    // Check if item can hold more generic items
    canAddToContainer(quantity = 1) {
        if (!this.isContainer) return false;
        if (this.containerCapacity === null) return true;  // Unlimited
        
        const currentTotal = this.contents.reduce((sum, stack) => sum + stack.quantity, 0);
        return (currentTotal + quantity) <= this.containerCapacity;
    }
    
    // Get total items in container
    getContainerItemCount() {
        if (!this.isContainer) return 0;
        return this.contents.reduce((sum, stack) => sum + stack.quantity, 0);
    }
    
    // Get the appropriate message for an action
    getTakeMessage() {
        return this.takeText || `You take the ${this.name}.`;
    }
    
    getDropMessage() {
        return this.dropText || `You drop the ${this.name}.`;
    }
    
    getUseMessage() {
        return this.useText || `You use the ${this.name}.`;
    }
    
    getCantTakeMessage() {
        return this.cantTakeText || `You can't take the ${this.name}.`;
    }
    
    getOpenMessage() {
        if (this.openText) return this.openText;
        if (this.isContainer) return `You open the ${this.name}.`;
        return `You can't open the ${this.name}.`;
    }
    
    // Serialize to JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            location: this.location,
            takeable: this.takeable,
            visible: this.visible,
            usable: this.usable,
            consumable: this.consumable,
            isContainer: this.isContainer,
            contents: this.contents,
            containerCapacity: this.containerCapacity,
            isLocked: this.isLocked,
            isClosed: this.isClosed,
            requiredKey: this.requiredKey,
            lockedMessage: this.lockedMessage,
            closedMessage: this.closedMessage,
            examineText: this.examineText,
            takeText: this.takeText,
            dropText: this.dropText,
            useText: this.useText,
            cantTakeText: this.cantTakeText,
            openText: this.openText,
            usesWith: this.usesWith,
            onUse: this.onUse,
            onOpen: this.onOpen,
            flags: this.flags
        };
    }
    
    // Create UniqueItem from JSON
    static fromJSON(data) {
        return new UniqueItem(data);
    }
}
