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
            'END': ['end', 'end turn', 'wait', 'pass'],
            'INVENTORY': ['inventory', 'i', 'inv'],
            'EXAMINE': ['examine', 'ex', 'x', 'inspect', 'look at', 'check'],
            'OPEN': ['open', 'look inside', 'look in'],
            'UNLOCK': ['unlock'],
            'LOCK': ['lock'],
            'CLOSE': ['close', 'shut'],
            'USE': ['use', 'employ', 'activate'],
            'PUT': ['put', 'place', 'insert'],
            'QUEST': ['quest', 'q', 'mission'],
            'QUESTS': ['quests', 'missions', 'objectives']
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
        
        // Show only the main quest start message
        const mainQuest = this.game.getMainQuest();
        if (mainQuest && this.state.getQuestState(mainQuest.id) === 'active' && mainQuest.startMessage) {
            output.push(mainQuest.startMessage);
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
        
        // Check if location requires light and if any player has a light source
        if (location.requiresLight) {
            const playersHere = this.state.getPlayersAtLocation(currentLocation);
            const hasLight = playersHere.some(playerId => {
                return this.playerHasItemWithTag(playerId, 'light-source');
            });
            
            if (!hasLight) {
                return `**${location.name}**\nIt's pitch black. You can't see anything. You need a light source.`;
            }
        }
        
        let output = [`**${location.name}**`, location.description];
        
        // List unique items at this location
        const uniqueItems = this.state.getUniqueItemsAtLocation(currentLocation);
        if (uniqueItems.length > 0) {
            const visibleItems = uniqueItems
                .map(id => this.game.getUniqueItem(id))
                .filter(item => item && this.isItemVisible(item, currentLocation));
            
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
        
        // List obvious exits (filter out hidden exits that aren't revealed)
        if (location.exits && location.exits.length > 0) {
            const visibleExits = location.exits.filter(exit => {
                if (!exit.hidden) return true; // Not hidden, always visible
                return this.isExitRevealed(currentLocation, exit);
            });
            
            if (visibleExits.length > 0) {
                const exitDirs = visibleExits.map(e => e.direction).join(', ');
                output.push(`\nObvious exits: ${exitDirs}`);
            }
        }
        
        // Check for quest discovery triggers
        const questDiscoveryMessage = this.checkQuestDiscovery(currentLocation);
        if (questDiscoveryMessage) {
            output.push('\n' + questDiscoveryMessage);
        }
        
        return output.join('\n');
    }

    // ===== PHASE 1 PARSER =====
    
    // Main parse and execute command
    parseCommand(input) {
        const command = input.trim();
        
        if (!command) {
            return { response: "Please enter a command.", consumesTurn: false };
        }
        
        // Tokenize the input
        const tokens = this.tokenize(command);
        
        if (tokens.length === 0) {
            return { response: "I don't understand that.", consumesTurn: false };
        }
        
        // Try to match command patterns
        const result = this.matchPattern(tokens);
        
        if (result.error) {
            return { response: result.error, consumesTurn: false };
        }
        
        // For QUEST commands, use the original input to preserve articles in quest names
        if (result.verb === 'QUEST' || result.verb === 'QUESTS') {
            const questMatch = command.match(/^(?:quest|quests)\s+(.+)$/i);
            if (questMatch) {
                result.directObject = questMatch[1].trim();
            }
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
        
        // Commands that don't consume a turn (informational commands)
        const nonTurnCommands = ['LOOK', 'INVENTORY', 'EXAMINE', 'QUEST', 'QUESTS'];
        const consumesTurn = !nonTurnCommands.includes(verb);
        
        let response;
        
        // Dispatch to appropriate handler
        switch (verb) {
            case 'LOOK':
                response = this.cmdLook(directObject);
                break;
            case 'GO':
                response = this.cmdGo(directObject);
                break;
            case 'TAKE':
                response = this.cmdTake(directObject, indirectObject, preposition, quantity);
                break;
            case 'DROP':
                response = this.cmdDrop(directObject, quantity);
                break;
            case 'INVENTORY':
                response = this.cmdInventory();
                break;
            case 'EXAMINE':
                response = this.cmdExamine(directObject);
                break;
            case 'OPEN':
                response = this.cmdOpen(directObject);
                break;
            case 'END':
                response = this.cmdEndTurn(); // end players turn
                break;
            case 'UNLOCK':
                response = this.cmdUnlock(directObject, indirectObject, preposition);
                break;
            case 'LOCK':
                response = this.cmdLock(directObject, indirectObject, preposition);
                break;
            case 'CLOSE':
                response = this.cmdClose(directObject);
                break;
            case 'USE':
                response = this.cmdUse(directObject, indirectObject, preposition);
                break;
            case 'PUT':
                response = this.cmdPut(directObject, indirectObject, preposition);
                break;
            case 'QUEST':
            case 'QUESTS':
                response = this.cmdQuest(directObject);
                break;
            default:
                response = `I don't know how to ${verb.toLowerCase()}.`;
                break;
        }
        
        return { response, consumesTurn };
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
        
        // Check if exit is locked (use dynamic state, not static definition)
        if (this.state.isExitLocked(currentLocation, exit.direction)) {
            // Check if player has required item to unlock
            if (exit.requiredItem) {
                if (this.state.isUniqueItemInInventory(exit.requiredItem)) {
                    // Automatically unlock with required item
                    const item = this.game.getUniqueItem(exit.requiredItem);
                    this.state.unlockExit(currentLocation, exit.direction);
                    
                    return `You use the ${item.name} to unlock the way ${exit.direction}.\n\n` + 
                           this.cmdGo(direction); // Recursively try movement again
                }
            }
            return exit.lockedMessage || "That way is locked.";
        }
        
        // Move player
        this.state.movePlayer(exit.leadsTo);
        
        // Track quest objectives for entering specific locations
        if (exit.leadsTo === 'old-shed') {
            this.state.setFlag('quest-explore-shed-objective-enter-shed', true);
        }
        
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
            // Track quest objective for collecting treasure from chest
            if (container.id === 'treasure-chest' && (item.id === 'gold-coin' || item.id === 'gem')) {
                this.state.setFlag('quest-find-treasure-objective-collect-treasure', true);
            }
            
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

    // END TURN command
    cmdEndTurn() {
        return "You end your turn.";
    }
    
    // UNLOCK command
    cmdUnlock(objectName, keyName, prep) {
        if (!objectName) {
            return "Unlock what?";
        }
        
        // Try to unlock a container first
        const uniqueItem = this.findUniqueItemAtLocation(objectName);
        if (uniqueItem && uniqueItem.isContainer) {
            // Check if already unlocked
            if (!this.state.isContainerLocked(uniqueItem.id)) {
                return `The ${uniqueItem.name} is already unlocked.`;
            }
            
            // If key specified in command, check for it
            if (keyName && prep) {
                // Find all items in inventory that match the key name
                const itemIds = this.state.getUniqueItemsInInventory();
                const matchingKeys = [];
                for (const id of itemIds) {
                    const item = this.game.getUniqueItem(id);
                    if (item && this.matchesName(item, keyName)) {
                        matchingKeys.push(item);
                    }
                }
                
                if (matchingKeys.length === 0) {
                    return `You don't have ${keyName}.`;
                }
                
                // If container requires a specific key, find it among the matching keys
                if (uniqueItem.requiredKey) {
                    const correctKey = matchingKeys.find(k => k.id === uniqueItem.requiredKey);
                    if (correctKey) {
                        this.state.unlockContainer(uniqueItem.id);
                        return `You unlock the ${uniqueItem.name} with the ${correctKey.name}.`;
                    }
                    // Player has keys but none work
                    return `None of your keys fit the lock.`;
                }
                
                // No specific key required, use first matching key
                this.state.unlockContainer(uniqueItem.id);
                return `You unlock the ${uniqueItem.name} with the ${matchingKeys[0].name}.`;
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
        
        // Try to unlock an exit/door/direction
        const currentLocation = this.state.getCurrentLocation();
        const location = this.game.getLocation(currentLocation);
        
        if (!location || !location.exits) {
            return "I don't see that here.";
        }
        
        // Find matching exit by direction or name
        const exit = location.exits.find(e => 
            e.direction.toLowerCase() === objectName.toLowerCase() ||
            e.direction.toLowerCase().startsWith(objectName.toLowerCase()) ||
            objectName.toLowerCase().includes(e.direction.toLowerCase())
        );
        
        if (!exit) {
            return "I don't see that here.";
        }
        
        // Check if already unlocked
        if (!this.state.isExitLocked(currentLocation, exit.direction)) {
            return `The way ${exit.direction} is already unlocked.`;
        }
        
        // If key specified in command, check for it
        if (keyName && prep) {
            // Find all items in inventory that match the key name
            const itemIds = this.state.getUniqueItemsInInventory();
            const matchingKeys = [];
            for (const id of itemIds) {
                const item = this.game.getUniqueItem(id);
                if (item && this.matchesName(item, keyName)) {
                    matchingKeys.push(item);
                }
            }
            
            if (matchingKeys.length === 0) {
                return `You don't have ${keyName}.`;
            }
            
            // If exit requires a specific item, find it among the matching keys
            if (exit.requiredItem) {
                const correctKey = matchingKeys.find(k => k.id === exit.requiredItem);
                if (correctKey) {
                    this.state.unlockExit(currentLocation, exit.direction);
                    return `You unlock the way ${exit.direction} with the ${correctKey.name}.`;
                }
                // Player has keys but none work
                return `None of your keys fit the lock.`;
            }
            
            // No specific key required, use first matching key
            this.state.unlockExit(currentLocation, exit.direction);
            return `You unlock the way ${exit.direction} with the ${matchingKeys[0].name}.`;
        }
        
        // No key specified - check if player has required item
        if (exit.requiredItem) {
            const item = this.game.getUniqueItem(exit.requiredItem);
            if (item && this.state.isUniqueItemInInventory(item.id)) {
                this.state.unlockExit(currentLocation, exit.direction);
                return `You unlock the way ${exit.direction} with the ${item.name}.`;
            }
            return `You need something to unlock the way ${exit.direction}.`;
        }
        
        // No item required
        this.state.unlockExit(currentLocation, exit.direction);
        return `You unlock the way ${exit.direction}.`;
    }
    
    // LOCK command
    cmdLock(objectName, keyName, prep) {
        if (!objectName) {
            return "Lock what?";
        }
        
        // Try to lock a container first
        const uniqueItem = this.findUniqueItemAtLocation(objectName);
        if (uniqueItem && uniqueItem.isContainer) {
            // Check if already locked
            if (this.state.isContainerLocked(uniqueItem.id)) {
                return `The ${uniqueItem.name} is already locked.`;
            }
            
            // Container must be closed to lock it
            if (this.state.isContainerOpen(uniqueItem.id)) {
                return `You need to close the ${uniqueItem.name} before you can lock it.`;
            }
            
            // If key specified in command, check for it
            if (keyName && prep) {
                // Find all items in inventory that match the key name
                const itemIds = this.state.getUniqueItemsInInventory();
                const matchingKeys = [];
                for (const id of itemIds) {
                    const item = this.game.getUniqueItem(id);
                    if (item && this.matchesName(item, keyName)) {
                        matchingKeys.push(item);
                    }
                }
                
                if (matchingKeys.length === 0) {
                    return `You don't have ${keyName}.`;
                }
                
                // If container requires a specific key, find it among the matching keys
                if (uniqueItem.requiredKey) {
                    const correctKey = matchingKeys.find(k => k.id === uniqueItem.requiredKey);
                    if (correctKey) {
                        this.state.lockContainer(uniqueItem.id);
                        return `You lock the ${uniqueItem.name} with the ${correctKey.name}.`;
                    }
                    // Player has keys but none work
                    return `None of your keys fit the lock.`;
                }
                
                // No specific key required, use first matching key
                this.state.lockContainer(uniqueItem.id);
                return `You lock the ${uniqueItem.name} with the ${matchingKeys[0].name}.`;
            }
            
            // No key specified - check if player has required key
            if (uniqueItem.requiredKey) {
                const key = this.game.getUniqueItem(uniqueItem.requiredKey);
                if (key && this.state.isUniqueItemInInventory(key.id)) {
                    this.state.lockContainer(uniqueItem.id);
                    return `You lock the ${uniqueItem.name} with the ${key.name}.`;
                }
                return `You need a key to lock the ${uniqueItem.name}.`;
            }
            
            // No key required
            this.state.lockContainer(uniqueItem.id);
            return `You lock the ${uniqueItem.name}.`;
        }
        
        // Try to lock an exit/door/direction
        const currentLocation = this.state.getCurrentLocation();
        const location = this.game.getLocation(currentLocation);
        
        if (!location || !location.exits) {
            return "I don't see that here.";
        }
        
        // Find matching exit by direction or name
        const exit = location.exits.find(e => 
            e.direction.toLowerCase() === objectName.toLowerCase() ||
            e.direction.toLowerCase().startsWith(objectName.toLowerCase()) ||
            objectName.toLowerCase().includes(e.direction.toLowerCase())
        );
        
        if (!exit) {
            return "I don't see that here.";
        }
        
        // Check if already locked
        if (this.state.isExitLocked(currentLocation, exit.direction)) {
            return `The way ${exit.direction} is already locked.`;
        }
        
        // If key specified in command, check for it
        if (keyName && prep) {
            // Find all items in inventory that match the key name
            const itemIds = this.state.getUniqueItemsInInventory();
            const matchingKeys = [];
            for (const id of itemIds) {
                const item = this.game.getUniqueItem(id);
                if (item && this.matchesName(item, keyName)) {
                    matchingKeys.push(item);
                }
            }
            
            if (matchingKeys.length === 0) {
                return `You don't have ${keyName}.`;
            }
            
            // If exit requires a specific item, find it among the matching keys
            if (exit.requiredItem) {
                const correctKey = matchingKeys.find(k => k.id === exit.requiredItem);
                if (correctKey) {
                    this.state.lockExit(currentLocation, exit.direction);
                    return `You lock the way ${exit.direction} with the ${correctKey.name}.`;
                }
                // Player has keys but none work
                return `None of your keys fit the lock.`;
            }
            
            // No specific key required, use first matching key
            this.state.lockExit(currentLocation, exit.direction);
            return `You lock the way ${exit.direction} with the ${matchingKeys[0].name}.`;
        }
        
        // No key specified - check if player has required item
        if (exit.requiredItem) {
            const item = this.game.getUniqueItem(exit.requiredItem);
            if (item && this.state.isUniqueItemInInventory(item.id)) {
                this.state.lockExit(currentLocation, exit.direction);
                return `You lock the way ${exit.direction} with the ${item.name}.`;
            }
            return `You need something to lock the way ${exit.direction}.`;
        }
        
        // No item required
        this.state.lockExit(currentLocation, exit.direction);
        return `You lock the way ${exit.direction}.`;
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
    
    // Check if a hidden exit should be revealed
    isExitRevealed(locationId, exit) {
        if (!exit.hidden) return true; // Not hidden
        if (!exit.revealCondition) return false; // Hidden with no reveal condition
        
        const condition = exit.revealCondition;
        
        switch (condition.type) {
            case 'has-item':
                if (condition.anyPlayerAtLocation) {
                    // Check if ANY player at this location has the item
                    const playersAtLocation = Object.keys(this.state.players).filter(
                        playerId => {
                            const playerData = this.state.players[playerId];
                            const playerLocation = playerData.currentLocation; // Fixed: use currentLocation
                            return playerLocation === locationId;
                        }
                    );
                    const result = playersAtLocation.some(playerId => {
                        const hasItem = this.state.isUniqueItemInInventory(condition.itemId, playerId);
                        return hasItem;
                    });
                    return result;
                } else {
                    // Check if current player has the item
                    return this.state.isUniqueItemInInventory(condition.itemId);
                }
                
            case 'has-item-with-tag':
                if (condition.anyPlayerAtLocation) {
                    // Check if ANY player at this location has an item with the tag
                    const playersAtLocation = Object.keys(this.state.players).filter(
                        playerId => this.state.players[playerId].currentLocation === locationId
                    );
                    return playersAtLocation.some(playerId => {
                        return this.playerHasItemWithTag(playerId, condition.tag);
                    });
                } else {
                    // Check if current player has an item with the tag
                    return this.playerHasItemWithTag(this.state.activePlayerId, condition.tag);
                }
                
            case 'flag-set':
                return this.state.getFlag(condition.flagName) === true;
                
            case 'custom':
                if (typeof condition.check === 'function') {
                    return condition.check(this.state);
                }
                return false;
                
            default:
                return false;
        }
    }
    
    // Check if an item should be visible
    isItemVisible(item, locationId) {
        // If item doesn't have base visibility, it's never visible
        if (!item.visible) return false;
        
        // Check for visibility condition
        if (item.visibilityCondition) {
            const condition = item.visibilityCondition;
            
            switch (condition.type) {
                case 'player-at-location':
                    // Visible if any player is at the specified location
                    const playersAtLocation = Object.keys(this.state.players).filter(
                        playerId => this.state.players[playerId].currentLocation === (condition.locationId || locationId)
                    );
                    return playersAtLocation.length > 0;
                    
                case 'has-item':
                    if (condition.anyPlayerAtLocation) {
                        const playersAtLocation = Object.keys(this.state.players).filter(
                            playerId => this.state.players[playerId].currentLocation === locationId
                        );
                        return playersAtLocation.some(playerId => 
                            this.state.isUniqueItemInInventory(condition.itemId, playerId)
                        );
                    } else {
                        return this.state.isUniqueItemInInventory(condition.itemId);
                    }
                    
                case 'has-item-with-tag':
                    if (condition.anyPlayerAtLocation) {
                        const playersAtLocation = Object.keys(this.state.players).filter(
                            playerId => this.state.players[playerId].currentLocation === locationId
                        );
                        return playersAtLocation.some(playerId => 
                            this.playerHasItemWithTag(playerId, condition.tag)
                        );
                    } else {
                        return this.playerHasItemWithTag(this.state.activePlayerId, condition.tag);
                    }
                    
                case 'flag-set':
                    return this.state.getFlag(condition.flagName) === true;
                    
                case 'custom':
                    if (typeof condition.check === 'function') {
                        return condition.check(this.state);
                    }
                    return false;
                    
                default:
                    return true;
            }
        }
        
        // No visibility condition, use base visibility
        return true;
    }
    
    // Check if a player has an item with a specific tag
    playerHasItemWithTag(playerId, tag) {
        // Get all unique items in player's inventory
        const inventoryKey = `inventory-${playerId}`;
        const itemsInInventory = Object.keys(this.state.uniqueItemLocations).filter(
            itemId => this.state.uniqueItemLocations[itemId] === inventoryKey
        );
        
        // Check if any item has the required tag
        return itemsInInventory.some(itemId => {
            const item = this.game.getUniqueItem(itemId);
            return item && item.tags && item.tags.includes(tag);
        });
    }
    
    // QUEST command - List or view quests
    cmdQuest(questName) {
        const quests = this.game.getQuests();
        
        if (!quests || quests.length === 0) {
            return "There are no quests in this game.";
        }
        
        // If no quest specified, list all quests
        if (!questName) {
            let output = ["=== QUESTS ==="];
            let discoveredQuests = [];
            
            quests.forEach(quest => {
                const state = this.state.getQuestState(quest.id);
                
                // Skip inactive quests - they haven't been discovered yet
                if (state === 'inactive') {
                    return;
                }
                
                let statusIcon = '';
                
                switch (state) {
                    case 'active':
                        statusIcon = '[ACTIVE]';
                        break;
                    case 'completed':
                        statusIcon = '[COMPLETE]';
                        break;
                    case 'failed':
                        statusIcon = '[FAILED]';
                        break;
                }
                
                const questType = quest.isMainQuest ? ' (MAIN QUEST)' : '';
                discoveredQuests.push(`${statusIcon} ${quest.name}${questType}`);
                
                if (state === 'active' && quest.objectives.length > 0) {
                    quest.objectives.forEach(obj => {
                        const completed = this.state.getFlag(`quest-${quest.id}-objective-${obj.id}`);
                        const checkmark = completed ? '[✓]' : '[ ]';
                        discoveredQuests.push(`    ${checkmark} ${obj.description}`);
                    });
                }
            });
            
            if (discoveredQuests.length === 0) {
                return "You haven't discovered any quests yet.";
            }
            
            output.push(...discoveredQuests);
            
            output.push("\nUse QUEST <name> to view details of a specific quest.");
            return output.join('\n');
        }
        
        // Find specific quest
        const quest = quests.find(q => 
            q.name.toLowerCase().includes(questName.toLowerCase()) ||
            q.id.toLowerCase() === questName.toLowerCase()
        );
        
        if (!quest) {
            return `Quest '${questName}' not found. Use QUESTS to see all quests.`;
        }
        
        // Display quest details
        const state = this.state.getQuestState(quest.id);
        let output = [`=== ${quest.name.toUpperCase()} ===`];
        
        if (quest.isMainQuest) {
            output.push("[MAIN QUEST]");
        }
        
        output.push(`\nStatus: ${state.toUpperCase()}`);
        output.push(`\n${quest.description}`);
        
        if (quest.objectives.length > 0 && state === 'active') {
            output.push("\nObjectives:");
            quest.objectives.forEach(obj => {
                const completed = this.state.getFlag(`quest-${quest.id}-objective-${obj.id}`);
                const checkmark = completed ? '[✓]' : '[ ]';
                output.push(`  ${checkmark} ${obj.description}`);
            });
        }
        
        if (state === 'completed' && quest.scoreReward > 0) {
            output.push(`\nReward: ${quest.scoreReward} points`);
        }
        
        return output.join('\n');
    }
    
    // Check and update quest progress
    checkQuestProgress() {
        const quests = this.game.getQuests();
        if (!quests) return null;
        
        let questMessages = [];
        
        quests.forEach(quest => {
            const state = this.state.getQuestState(quest.id);
            
            // Only check active quests
            if (state !== 'active') return;
            
            // Check if quest is complete
            if (quest.isComplete(this.state)) {
                // Complete the quest
                this.state.setQuestState(quest.id, 'completed');
                
                // Add score reward
                if (quest.scoreReward > 0) {
                    this.state.addScore(quest.scoreReward);
                }
                
                // Add item rewards
                if (quest.itemRewards && quest.itemRewards.length > 0) {
                    quest.itemRewards.forEach(itemId => {
                        const inventoryKey = `inventory-${this.state.activePlayerId}`;
                        this.state.uniqueItemLocations[itemId] = inventoryKey;
                    });
                }
                
                questMessages.push(quest.getCompletionMessage());
                
                // Check if this is the main quest
                if (quest.isMainQuest) {
                    questMessages.push("\n=== GAME COMPLETE ===\nYou have completed the main quest!");
                }
            }
        });
        
        return questMessages.length > 0 ? questMessages.join('\n\n') : null;
    }
    
    // Check for quest discovery triggers based on location
    checkQuestDiscovery(locationId) {
        // Discover "Explore the Old Shed" quest when player reaches forest-clearing
        if (locationId === 'forest-clearing') {
            const shedQuest = this.game.getQuests()?.find(q => q.id === 'explore-shed');
            if (shedQuest && this.state.getQuestState('explore-shed') === 'inactive') {
                this.state.setQuestState('explore-shed', 'active');
                // The quest start message will be displayed after the location description
                // We'll return it so it can be appended to output
                return shedQuest.startMessage;
            }
        }
        return null;
    }
}
