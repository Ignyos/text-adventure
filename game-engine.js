// Game Engine - Handles game logic and command parsing
class GameEngine {
    constructor(game) {
        this.game = game;
        this.state = null;
        
        // Define verb synonyms (Zork-style normalization)
        this.verbSynonyms = {
            'LOOK': ['look', 'l', 'examine room', 'describe'],
            'GO': ['go', 'walk', 'run', 'move', 'head', 'travel'],
            'NORTH': ['north', 'n'],
            'SOUTH': ['south', 's'],
            'EAST': ['east', 'e'],
            'WEST': ['west', 'w'],
            'UP': ['up', 'u', 'climb up'],
            'DOWN': ['down', 'd', 'climb down'],
            'TAKE': ['take', 'get', 'grab', 'pick up', 'pick', 'acquire'],
            'DROP': ['drop', 'discard', 'put down', 'leave'],
            'INVENTORY': ['inventory', 'i', 'inv'],
            'EXAMINE': ['examine', 'ex', 'x', 'inspect', 'look at', 'check'],
            'OPEN': ['open', 'look inside', 'look in'],
            'UNLOCK': ['unlock'],
            'CLOSE': ['close', 'shut'],
            'USE': ['use', 'employ', 'activate'],
            'PUT': ['put', 'place', 'insert']
        };
        
        // Prepositions for complex commands
        this.prepositions = ['in', 'into', 'inside', 'on', 'onto', 'at', 'to', 'from', 'with', 'using'];
        
        // Articles to ignore
        this.articles = ['a', 'an', 'the', 'some', 'my'];
        
        // Number words mapping
        this.numberWords = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'all': 'all', 'everything': 'all'
        };
    }

    // Initialize or restore game state
    initState(savedState = null) {
        if (savedState) {
            this.state = GameState.fromJSON(this.game, savedState);
        } else {
            this.state = new GameState(this.game);
        }
    }

    // Get current game state for saving
    getState() {
        return this.state.toJSON();
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

    // Get current location description with items and NPCs
    getLocationDescription() {
        const currentLocation = this.state.getCurrentLocation();
        if (!currentLocation) {
            return "ERROR: No active player or location.";
        }
        
        const location = this.game.getLocation(currentLocation);
        if (!location) {
            return "ERROR: Location not found.";
        }
        
        let output = [`**${location.name}**`, location.description];
        
        // List unique items at this location
        const uniqueItems = this.state.getUniqueItemsAtLocation(currentLocation);
        if (uniqueItems.length > 0) {
            const visibleItems = uniqueItems
                .map(id => this.game.getUniqueItem(id))
                .filter(item => item && item.visible);
            
            if (visibleItems.length > 0) {
                output.push('\nYou see: ' + visibleItems.map(item => item.name).join(', '));
            }
        }
        
        // List generic item stacks at this location
        const genericStacks = this.state.getGenericItemStacksAt(currentLocation);
        if (genericStacks.length > 0) {
            const stackDescriptions = genericStacks.map(stack => {
                const item = this.game.getGenericItem(stack.itemId);
                if (item) {
                    return item.getDescription(stack.quantity);
                }
                return null;
            }).filter(d => d !== null);
            
            if (stackDescriptions.length > 0) {
                output.push('There are: ' + stackDescriptions.join(', '));
            }
        }
        
        // List obvious exits
        if (location.exits && location.exits.length > 0) {
            const exitDirs = location.exits.map(e => e.direction).join(', ');
            output.push(`\nObvious exits: ${exitDirs}`);
        }
        
        return output.join('\n');
    }

    // ===== PHASE 1 PARSER =====
    
    // Main parse and execute command
    parseCommand(input) {
        const command = input.trim();
        
        if (!command) {
            return "Please enter a command.";
        }
        
        // Tokenize the input
        const tokens = this.tokenize(command);
        
        if (tokens.length === 0) {
            return "I don't understand that.";
        }
        
        // Try to match command patterns
        const result = this.matchPattern(tokens);
        
        if (result.error) {
            return result.error;
        }
        
        // Execute the matched command
        return this.executeCommand(result);
    }
    
    // Tokenize input - break into words, normalize, remove articles
    tokenize(input) {
        // Convert to lowercase and split on whitespace
        let words = input.toLowerCase().trim().split(/\s+/);
        
        // Remove articles
        words = words.filter(word => !this.articles.includes(word));
        
        return words;
    }
    
    // Normalize verb to canonical form
    normalizeVerb(word) {
        for (const [canonical, synonyms] of Object.entries(this.verbSynonyms)) {
            if (synonyms.includes(word)) {
                return canonical;
            }
        }
        return null;
    }
    
    // Check if word is a preposition
    isPreposition(word) {
        return this.prepositions.includes(word);
    }
    
    // Match tokens against command patterns
    matchPattern(tokens) {
        if (tokens.length === 0) {
            return { error: "I don't understand that." };
        }
        
        // Try multi-word verb first (e.g., "pick up", "look at")
        let verb = null;
        let remainingTokens = [...tokens];
        
        // Try 2-word verbs
        if (tokens.length >= 2) {
            const twoWord = tokens[0] + ' ' + tokens[1];
            verb = this.normalizeVerb(twoWord);
            if (verb) {
                remainingTokens = tokens.slice(2);
            }
        }
        
        // Try 3-word verbs ("look in the")
        if (!verb && tokens.length >= 3) {
            const threeWord = tokens[0] + ' ' + tokens[1] + ' ' + tokens[2];
            verb = this.normalizeVerb(threeWord);
            if (verb) {
                remainingTokens = tokens.slice(3);
            }
        }
        
        // Try 1-word verb
        if (!verb) {
            verb = this.normalizeVerb(tokens[0]);
            remainingTokens = tokens.slice(1);
        }
        
        if (!verb) {
            return { error: `I don't know the word "${tokens[0]}".` };
        }
        
        // Direction shortcuts (NORTH, SOUTH, etc. are implicit GO commands)
        if (['NORTH', 'SOUTH', 'EAST', 'WEST', 'UP', 'DOWN'].includes(verb)) {
            return {
                verb: 'GO',
                directObject: verb.toLowerCase(),
                indirectObject: null,
                preposition: null
            };
        }
        
        // Parse remaining tokens for objects and prepositions
        return this.parseObjects(verb, remainingTokens);
    }
    
    // Parse direct object, preposition, and indirect object
    parseObjects(verb, tokens) {
        if (tokens.length === 0) {
            // No objects - valid for some verbs
            return {
                verb: verb,
                quantity: null,
                directObject: null,
                indirectObject: null,
                preposition: null
            };
        }
        
        // Extract quantity from beginning of tokens (e.g., "5", "five", "all")
        let quantity = null;
        let objectTokens = [...tokens];
        
        if (objectTokens.length > 0) {
            const firstToken = objectTokens[0];
            
            // Check if first token is a number
            if (!isNaN(firstToken)) {
                quantity = parseInt(firstToken);
                objectTokens = objectTokens.slice(1);
            } else if (this.numberWords[firstToken]) {
                quantity = this.numberWords[firstToken];
                objectTokens = objectTokens.slice(1);
            }
        }
        
        // Find preposition position
        let prepIndex = -1;
        for (let i = 0; i < objectTokens.length; i++) {
            if (this.isPreposition(objectTokens[i])) {
                prepIndex = i;
                break;
            }
        }
        
        let directObject = null;
        let preposition = null;
        let indirectObject = null;
        
        if (prepIndex === -1) {
            // VERB OBJECT pattern
            directObject = objectTokens.join(' ');
        } else {
            // VERB OBJECT PREP OBJECT pattern
            directObject = objectTokens.slice(0, prepIndex).join(' ');
            preposition = objectTokens[prepIndex];
            indirectObject = objectTokens.slice(prepIndex + 1).join(' ');
        }
        
        return {
            verb: verb,
            quantity: quantity,
            directObject: directObject || null,
            indirectObject: indirectObject || null,
            preposition: preposition || null
        };
    }
    
    // Execute parsed command
    executeCommand(parsed) {
        const { verb, quantity, directObject, indirectObject, preposition } = parsed;
        
        // Dispatch to appropriate handler
        switch (verb) {
            case 'LOOK':
                return this.cmdLook(directObject);
            case 'GO':
                return this.cmdGo(directObject);
            case 'TAKE':
                return this.cmdTake(directObject, indirectObject, preposition, quantity);
            case 'DROP':
                return this.cmdDrop(directObject, quantity);
            case 'INVENTORY':
                return this.cmdInventory();
            case 'EXAMINE':
                return this.cmdExamine(directObject);
            case 'OPEN':
                return this.cmdOpen(directObject);
            case 'UNLOCK':
                return this.cmdUnlock(directObject, indirectObject, preposition);
            case 'CLOSE':
                return this.cmdClose(directObject);
            case 'USE':
                return this.cmdUse(directObject, indirectObject, preposition);
            case 'PUT':
                return this.cmdPut(directObject, indirectObject, preposition);
            default:
                return `I don't know how to ${verb.toLowerCase()}.`;
        }
    }
    
    // ===== COMMAND HANDLERS =====
    
    // LOOK command
    cmdLook(target) {
        if (!target) {
            return this.getLocationDescription();
        }
        
        // Look at specific object - delegate to EXAMINE
        return this.cmdExamine(target);
    }
    
    // GO command
    cmdGo(direction) {
        if (!direction) {
            return "Go where?";
        }
        
        const currentLocation = this.state.getCurrentLocation();
        if (!currentLocation) {
            return "ERROR: No active player or location.";
        }
        
        const location = this.game.getLocation(currentLocation);
        if (!location || !location.exits) {
            return "You can't go anywhere from here.";
        }
        
        // Find matching exit
        const exit = location.exits.find(e => 
            e.direction.toLowerCase() === direction ||
            e.direction.toLowerCase().startsWith(direction)
        );
        
        if (!exit) {
            return `You can't go ${direction} from here.`;
        }
        
        // Check if exit is locked
        if (exit.locked) {
            return exit.lockedMessage || "That way is locked.";
        }
        
        // Move player
        this.state.movePlayer(exit.leadsTo);
        return this.getLocationDescription();
    }
    
    // TAKE command
    cmdTake(objectName, fromObject, prep, quantity) {
        if (!objectName) {
            return "Take what?";
        }
        
        // Check if taking from a container
        if (fromObject && prep) {
            return this.takeFromContainer(objectName, fromObject, quantity);
        }
        
        // Try to find unique item at location
        const uniqueItem = this.findUniqueItemAtLocation(objectName);
        if (uniqueItem) {
            if (!uniqueItem.canTake()) {
                return uniqueItem.getCantTakeMessage();
            }
            
            this.state.moveUniqueItem(uniqueItem.id, 'inventory');
            return uniqueItem.getTakeMessage();
        }
        
        // Try to find generic item stack at location
        const genericResult = this.findGenericItemAtLocation(objectName);
        if (genericResult) {
            // Default to 'all' if no quantity specified
            let takeQty = quantity === null ? 'all' : quantity;
            let actualQty;
            
            if (takeQty === 'all') {
                actualQty = genericResult.stack.quantity;
            } else {
                actualQty = Math.min(takeQty, genericResult.stack.quantity);
            }
            
            const currentLocation = this.state.getCurrentLocation();
            if (this.state.transferGenericItems(
                currentLocation,
                'inventory',
                genericResult.item.id,
                actualQty
            )) {
                return `You take ${genericResult.item.getDescription(actualQty)}.`;
            }
        }
        
        return "I don't see that here.";
    }
    
    // Take from container
    takeFromContainer(objectName, containerName, quantity) {
        // Find the container
        const container = this.findUniqueItemAtLocation(containerName);
        
        if (!container) {
            return `I don't see ${containerName} here.`;
        }
        
        if (!container.isContainer) {
            return `The ${container.name} is not a container.`;
        }
        
        // Check if closed
        if (!this.state.isContainerOpen(container.id)) {
            return container.closedMessage || `The ${container.name} is closed.`;
        }
        
        // Find generic item in container
        const stacks = this.state.getGenericItemStacksAt(container.id);
        const stack = stacks.find(s => {
            const item = this.game.getGenericItem(s.itemId);
            return item && this.matchesName(item, objectName);
        });
        
        if (!stack) {
            return `There's no ${objectName} in the ${container.name}.`;
        }
        
        const item = this.game.getGenericItem(stack.itemId);
        
        // Default to 'all' if no quantity specified
        let takeQty = quantity === null ? 'all' : quantity;
        let actualQty;
        
        if (takeQty === 'all') {
            actualQty = stack.quantity;
        } else {
            actualQty = Math.min(takeQty, stack.quantity);
            if (takeQty > stack.quantity) {
                return `There are only ${stack.quantity} ${item.getDisplayName(stack.quantity)} in the ${container.name}.`;
            }
        }
        
        if (this.state.transferGenericItems(container.id, 'inventory', item.id, actualQty)) {
            return `You take ${item.getDescription(actualQty)} from the ${container.name}.`;
        }
        
        return "You can't take that.";
    }
    
    // DROP command
    cmdDrop(objectName, quantity) {
        if (!objectName) {
            return "Drop what?";
        }
        
        const currentLocation = this.state.getCurrentLocation();
        
        // Try unique item
        const uniqueItem = this.findUniqueItemInInventory(objectName);
        if (uniqueItem) {
            this.state.moveUniqueItem(uniqueItem.id, currentLocation);
            return uniqueItem.getDropMessage();
        }
        
        // Try generic item
        const genericResult = this.findGenericItemInInventory(objectName);
        if (genericResult) {
            // Default to 'all' if no quantity specified
            let dropQty = quantity === null ? 'all' : quantity;
            let actualQty;
            
            if (dropQty === 'all') {
                actualQty = genericResult.stack.quantity;
            } else {
                actualQty = Math.min(dropQty, genericResult.stack.quantity);
                if (dropQty > genericResult.stack.quantity) {
                    return `You only have ${genericResult.stack.quantity} ${genericResult.item.getDisplayName(genericResult.stack.quantity)}.`;
                }
            }
            
            if (this.state.transferGenericItems(
                'inventory',
                currentLocation,
                genericResult.item.id,
                actualQty
            )) {
                return `You drop ${genericResult.item.getDescription(actualQty)}.`;
            }
        }
        
        return "You don't have that.";
    }
    
    // INVENTORY command
    cmdInventory() {
        const uniqueItems = this.state.getUniqueItemsInInventory();
        const genericStacks = this.state.getGenericItemStacksAt('inventory');
        
        if (uniqueItems.length === 0 && genericStacks.length === 0) {
            return "You aren't carrying anything.";
        }
        
        let output = ["You are carrying:"];
        
        // List unique items
        uniqueItems.forEach(id => {
            const item = this.game.getUniqueItem(id);
            if (item) {
                output.push(`  ${item.name}`);
            }
        });
        
        // List generic items
        genericStacks.forEach(stack => {
            const item = this.game.getGenericItem(stack.itemId);
            if (item) {
                output.push(`  ${item.getDescription(stack.quantity)}`);
            }
        });
        
        return output.join('\n');
    }
    
    // EXAMINE command
    cmdExamine(objectName) {
        if (!objectName) {
            return "Examine what?";
        }
        
        // Try unique item (location or inventory)
        let uniqueItem = this.findUniqueItemAtLocation(objectName);
        if (!uniqueItem) {
            uniqueItem = this.findUniqueItemInInventory(objectName);
        }
        
        if (uniqueItem) {
            return uniqueItem.examineText || uniqueItem.description;
        }
        
        // Try generic item
        let genericResult = this.findGenericItemAtLocation(objectName);
        if (!genericResult) {
            genericResult = this.findGenericItemInInventory(objectName);
        }
        
        if (genericResult) {
            return genericResult.item.examineText || genericResult.item.description;
        }
        
        return "I don't see that here.";
    }
    
    // OPEN command
    cmdOpen(objectName) {
        if (!objectName) {
            return "Open what?";
        }
        
        const uniqueItem = this.findUniqueItemAtLocation(objectName);
        if (!uniqueItem) {
            return "I don't see that here.";
        }
        
        if (!uniqueItem.isContainer) {
            return `You can't open the ${uniqueItem.name}.`;
        }
        
        // Check if locked
        if (this.state.isContainerLocked(uniqueItem.id)) {
            return uniqueItem.lockedMessage || `The ${uniqueItem.name} is locked.`;
        }
        
        // Check if already open
        if (this.state.isContainerOpen(uniqueItem.id)) {
            // Just show contents
            const stacks = this.state.getGenericItemStacksAt(uniqueItem.id);
            if (stacks.length === 0) {
                return `The ${uniqueItem.name} is already open and empty.`;
            }
            
            let output = [`The ${uniqueItem.name} is already open.\nInside you see:`];
            stacks.forEach(stack => {
                const item = this.game.getGenericItem(stack.itemId);
                if (item) {
                    output.push(`  ${item.getDescription(stack.quantity)}`);
                }
            });
            return output.join('\n');
        }
        
        // Open the container
        this.state.openContainer(uniqueItem.id);
        
        // List contents
        const stacks = this.state.getGenericItemStacksAt(uniqueItem.id);
        if (stacks.length === 0) {
            return `You open the ${uniqueItem.name}. It's empty.`;
        }
        
        let output = [uniqueItem.getOpenMessage(), "\nInside you see:"];
        
        stacks.forEach(stack => {
            const item = this.game.getGenericItem(stack.itemId);
            if (item) {
                output.push(`  ${item.getDescription(stack.quantity)}`);
            }
        });
        
        return output.join('\n');
    }
    
    // UNLOCK command
    cmdUnlock(objectName, keyName, prep) {
        if (!objectName) {
            return "Unlock what?";
        }
        
        const uniqueItem = this.findUniqueItemAtLocation(objectName);
        if (!uniqueItem) {
            return "I don't see that here.";
        }
        
        if (!uniqueItem.isContainer) {
            return `You can't unlock the ${uniqueItem.name}.`;
        }
        
        // Check if already unlocked
        if (!this.state.isContainerLocked(uniqueItem.id)) {
            return `The ${uniqueItem.name} is already unlocked.`;
        }
        
        // If key specified in command, check for it
        if (keyName && prep) {
            const key = this.findUniqueItemInInventory(keyName);
            if (!key) {
                return `You don't have ${keyName}.`;
            }
            
            if (uniqueItem.requiredKey && key.id !== uniqueItem.requiredKey) {
                return `The ${key.name} doesn't fit the lock.`;
            }
            
            this.state.unlockContainer(uniqueItem.id);
            return `You unlock the ${uniqueItem.name} with the ${key.name}.`;
        }
        
        // No key specified - check if player has required key
        if (uniqueItem.requiredKey) {
            const key = this.game.getUniqueItem(uniqueItem.requiredKey);
            if (key && this.state.isUniqueItemInInventory(key.id)) {
                this.state.unlockContainer(uniqueItem.id);
                return `You unlock the ${uniqueItem.name} with the ${key.name}.`;
            }
            return `You need a key to unlock the ${uniqueItem.name}.`;
        }
        
        // No key required
        this.state.unlockContainer(uniqueItem.id);
        return `You unlock the ${uniqueItem.name}.`;
    }
    
    // CLOSE command
    cmdClose(objectName) {
        if (!objectName) {
            return "Close what?";
        }
        
        const uniqueItem = this.findUniqueItemAtLocation(objectName);
        if (!uniqueItem) {
            return "I don't see that here.";
        }
        
        if (!uniqueItem.isContainer) {
            return `You can't close the ${uniqueItem.name}.`;
        }
        
        if (!this.state.isContainerOpen(uniqueItem.id)) {
            return `The ${uniqueItem.name} is already closed.`;
        }
        
        this.state.closeContainer(uniqueItem.id);
        return `You close the ${uniqueItem.name}.`;
    }
    
    // USE command
    cmdUse(objectName, targetName, prep) {
        if (!objectName) {
            return "Use what?";
        }
        
        const item = this.findUniqueItemInInventory(objectName);
        if (!item) {
            return "You don't have that.";
        }
        
        if (!item.usable) {
            return `You can't use the ${item.name}.`;
        }
        
        // Check if used with target
        if (targetName && !item.canUseWith(targetName)) {
            return `You can't use the ${item.name} with that.`;
        }
        
        return item.getUseMessage();
    }
    
    // PUT command
    cmdPut(objectName, containerName, prep) {
        if (!objectName || !containerName) {
            return "Put what where?";
        }
        
        return `Putting items in containers is not yet fully implemented.`;
    }
    
    // ===== HELPER METHODS =====
    
    // Find unique item at current location
    findUniqueItemAtLocation(name) {
        const currentLocation = this.state.getCurrentLocation();
        if (!currentLocation) return null;
        
        const itemIds = this.state.getUniqueItemsAtLocation(currentLocation);
        for (const id of itemIds) {
            const item = this.game.getUniqueItem(id);
            if (item && item.visible && this.matchesName(item, name)) {
                return item;
            }
        }
        return null;
    }
    
    // Find unique item in inventory
    findUniqueItemInInventory(name) {
        const itemIds = this.state.getUniqueItemsInInventory();
        for (const id of itemIds) {
            const item = this.game.getUniqueItem(id);
            if (item && this.matchesName(item, name)) {
                return item;
            }
        }
        return null;
    }
    
    // Find generic item at location
    findGenericItemAtLocation(name) {
        const currentLocation = this.state.getCurrentLocation();
        if (!currentLocation) return null;
        
        const stacks = this.state.getGenericItemStacksAt(currentLocation);
        for (const stack of stacks) {
            const item = this.game.getGenericItem(stack.itemId);
            if (item && this.matchesName(item, name)) {
                return { item, stack };
            }
        }
        return null;
    }
    
    // Find generic item in inventory
    findGenericItemInInventory(name) {
        const stacks = this.state.getGenericItemStacksAt('inventory');
        for (const stack of stacks) {
            const item = this.game.getGenericItem(stack.itemId);
            if (item && this.matchesName(item, name)) {
                return { item, stack };
            }
        }
        return null;
    }
    
    // Check if item name matches search string
    matchesName(item, searchName) {
        const itemName = item.name.toLowerCase();
        const search = searchName.toLowerCase();
        
        // Exact match on name
        if (itemName === search) return true;
        
        // Check plural form for GenericItems
        if (item.namePlural) {
            const pluralName = item.namePlural.toLowerCase();
            if (pluralName === search) return true;
            
            // Partial match on plural
            if (pluralName.includes(search) || search.includes(pluralName)) return true;
        }
        
        // Partial match (search is subset of name)
        if (itemName.includes(search)) return true;
        
        // Word match (any word in item name matches)
        const itemWords = itemName.split(/\s+/);
        const searchWords = search.split(/\s+/);
        
        // Check if all search words appear in item name
        return searchWords.every(sw => itemWords.some(iw => iw.startsWith(sw)));
    }
}
