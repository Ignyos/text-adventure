// Game Engine - Handles game logic and command parsing
class GameEngine {
    constructor(game) {
        // Accept Game instance
        this.game = game;
        this.currentLocation = game.startLocation;
        this.inventory = [];
        this.gameState = {};
        this.turnCount = 0;
        this.knownVerbs = ['go', 'take', 'drop', 'look', 'examine', 'use', 'open', 'close', 'read', 'talk', 'hit', 'climb', 'push', 'pull'];
    }

    // Initialize or restore game state
    initState(savedState = null) {
        if (savedState) {
            this.currentLocation = savedState.currentLocation;
            this.inventory = savedState.inventory || [];
            this.gameState = savedState.gameState || {};
            this.turnCount = savedState.turnCount || 0;
        } else {
            this.currentLocation = this.game.startLocation;
            this.inventory = [];
            this.gameState = {};
            this.turnCount = 0;
        }
    }

    // Get current game state for saving
    getState() {
        return {
            currentLocation: this.currentLocation,
            inventory: this.inventory,
            gameState: this.gameState,
            turnCount: this.turnCount
        };
    }

    // Get the initial game description
    getStartText() {
        let output = [];
        
        if (this.game.title) {
            output.push(`=== ${this.game.title} ===`);
        }
        
        if (this.game.description) {
            output.push(this.game.description);
        }
        
        if (this.game.objective) {
            output.push(this.game.objective);
        }
        
        output.push(this.getLocationDescription());
        
        return output.join('\n\n');
    }

    // Get current location description
    getLocationDescription() {
        console.log('Getting location for:', this.currentLocation);
        console.log('Location map has:', Array.from(this.game.locationMap.keys()));
        const location = this.game.getLocation(this.currentLocation);
        if (!location) {
            console.error('Location not found:', this.currentLocation);
            return "ERROR: Location not found.";
        }
        return location.description;
    }

    // Parse and execute command
    parseCommand(input) {
        this.turnCount++;
        
        const command = input.trim().toLowerCase();
        
        if (!command) {
            return "Please enter a command.";
        }

        // Split command into words
        const words = command.split(/\s+/);
        const verb = words[0];
        const args = words.slice(1);

        // Check if verb is recognized
        if (!this.knownVerbs.includes(verb)) {
            return this.handleUnknownCommand(verb, args);
        }

        // Handle different commands
        switch (verb) {
            case 'go':
                return this.handleGo(args);
            case 'look':
                return this.handleLook();
            case 'take':
                return this.handleTake(args);
            case 'drop':
                return this.handleDrop(args);
            case 'examine':
                return this.handleExamine(args);
            case 'inventory':
                return this.handleInventory();
            default:
                return `The command "${verb}" is recognized, but not yet implemented in this game.`;
        }
    }

    // Handle unknown commands
    handleUnknownCommand(verb, args) {
        let response = `"${verb}" is not a recognized verb.`;
        
        // Check if any of the arguments are recognized nouns
        const location = this.game.getLocation(this.currentLocation);
        if (location && args.length > 0) {
            const noun = args.join(' ');
            
            // Check exits
            if (location.exits) {
                for (let exit of location.exits) {
                    if (exit.direction.toLowerCase().includes(noun) || exit.leadsTo.toLowerCase().includes(noun)) {
                        response += ` I know what "${noun}" is, though.`;
                        break;
                    }
                }
            }
        }
        
        return response;
    }

    // Handle movement
    handleGo(args) {
        if (args.length === 0) {
            return "Go where?";
        }

        const direction = args.join(' ');
        const location = this.game.getLocation(this.currentLocation);

        if (!location || !location.exits) {
            return "You can't go anywhere from here.";
        }

        // Find the exit that matches the direction
        const exit = location.exits.find(e => e.direction === direction);
        
        if (!exit) {
            return `You can't go ${direction} from here.`;
        }

        this.currentLocation = exit.leadsTo;
        return this.getLocationDescription();
    }

    // Handle look command
    handleLook() {
        return this.getLocationDescription();
    }

    // Handle take command
    handleTake(args) {
        if (args.length === 0) {
            return "Take what?";
        }

        const item = args.join(' ');
        return `Taking items is not yet implemented. You tried to take: ${item}`;
    }

    // Handle drop command
    handleDrop(args) {
        if (args.length === 0) {
            return "Drop what?";
        }

        const item = args.join(' ');
        return `Dropping items is not yet implemented. You tried to drop: ${item}`;
    }

    // Handle examine command
    handleExamine(args) {
        if (args.length === 0) {
            return "Examine what?";
        }

        const item = args.join(' ');
        return `Examining items is not yet implemented. You tried to examine: ${item}`;
    }

    // Handle inventory command
    handleInventory() {
        if (this.inventory.length === 0) {
            return "You are not carrying anything.";
        }
        return "Inventory: " + this.inventory.join(', ');
    }
}
