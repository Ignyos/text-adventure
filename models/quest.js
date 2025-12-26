// Quest - Represents a quest/mission in the game
class Quest {
    constructor(data) {
        // Validate required fields
        if (!data.id) throw new Error('Quest must have an id');
        if (!data.name) throw new Error('Quest must have a name');
        if (!data.description) throw new Error('Quest must have a description');
        
        // Core properties
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        
        // Quest type
        this.isMainQuest = data.isMainQuest || false;  // Main quest ends game when completed
        
        // Quest state
        this.initialState = data.initialState || 'inactive'; // inactive, active, completed, failed
        
        // Objectives - array of objective objects
        // Each objective: { id, description, required (bool), completed (bool) }
        this.objectives = data.objectives || [];
        
        // Completion criteria
        this.requireAllObjectives = data.requireAllObjectives !== undefined ? data.requireAllObjectives : true;
        
        // Rewards
        this.scoreReward = data.scoreReward || 0;
        this.itemRewards = data.itemRewards || []; // Array of item IDs to give on completion
        
        // Triggers
        this.startTrigger = data.startTrigger || null;  // Condition to auto-start quest
        this.completionCheck = data.completionCheck || null; // Custom completion function
        
        // Messages
        this.startMessage = data.startMessage || null;
        this.completionMessage = data.completionMessage || null;
        this.failMessage = data.failMessage || null;
        
        // Custom flags
        this.flags = data.flags || {};
    }
    
    // Check if quest can be activated
    canActivate(gameState) {
        // Already active or completed
        const state = gameState.getQuestState(this.id);
        if (state === 'active' || state === 'completed') {
            return false;
        }
        
        // Check start trigger if defined
        if (this.startTrigger && typeof this.startTrigger === 'function') {
            return this.startTrigger(gameState);
        }
        
        return true; // Can be manually activated
    }
    
    // Check if quest is complete
    isComplete(gameState) {
        const state = gameState.getQuestState(this.id);
        if (state !== 'active') return false;
        
        // Custom completion check
        if (this.completionCheck && typeof this.completionCheck === 'function') {
            return this.completionCheck(gameState);
        }
        
        // Default: check objectives
        if (this.objectives.length === 0) return false;
        
        if (this.requireAllObjectives) {
            // All required objectives must be completed
            return this.objectives.every(obj => !obj.required || gameState.getFlag(`quest-${this.id}-objective-${obj.id}`));
        } else {
            // At least one objective must be completed
            return this.objectives.some(obj => gameState.getFlag(`quest-${this.id}-objective-${obj.id}`));
        }
    }
    
    // Get completion message
    getCompletionMessage() {
        return this.completionMessage || `You have completed the quest: ${this.name}!`;
    }
    
    // Get start message
    getStartMessage() {
        return this.startMessage || `Quest started: ${this.name}`;
    }
    
    // Get fail message
    getFailMessage() {
        return this.failMessage || `Quest failed: ${this.name}`;
    }
    
    // Serialize to JSON
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            isMainQuest: this.isMainQuest,
            initialState: this.initialState,
            objectives: this.objectives,
            requireAllObjectives: this.requireAllObjectives,
            scoreReward: this.scoreReward,
            itemRewards: this.itemRewards,
            startTrigger: this.startTrigger,
            completionCheck: this.completionCheck,
            startMessage: this.startMessage,
            completionMessage: this.completionMessage,
            failMessage: this.failMessage,
            flags: this.flags
        };
    }
    
    // Create Quest from JSON
    static fromJSON(data) {
        return new Quest(data);
    }
}
