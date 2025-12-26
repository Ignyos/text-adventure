// Demo Game Definition - Built using GameBuilder API
function getDemoGame() {
    const builder = new GameBuilder();
    
    // Set game metadata
    builder.id = 'demo-game';
    builder.setTitle('The Mysterious Cave');
    builder.setAuthor('Ignyos');
    builder.setVersion('1.2');
    builder.setDescription('Explore a mysterious cave system and find the hidden treasure');
    builder.setObjective('You find yourself at the entrance of a mysterious cave. Your objective is to explore and find the hidden treasure.');
    
    // Add locations
    builder.addLocation({
        id: 'cave-entrance',
        name: 'Cave Entrance',
        description: 'You are standing at the entrance of a dark, foreboding cave. The cave mouth is wide and tall, disappearing into darkness. To the north, you can see a faint light coming from deeper within. To the south is the forest you came from.',
        exits: [
            { direction: 'north', leadsTo: 'main-chamber' },
            { direction: 'south', leadsTo: 'forest-path' }
        ]
    });
    
    builder.addLocation({
        id: 'main-chamber',
        name: 'Main Chamber',
        description: 'You are in a large chamber with high ceilings. Stalactites hang from above, and the sound of dripping water echoes throughout. There are passages to the north and east, and the entrance is to the south. Something glints on the ground near the center of the chamber.',
        exits: [
            { direction: 'north', leadsTo: 'treasure-room' },
            { direction: 'east', leadsTo: 'dark-tunnel' },
            { direction: 'south', leadsTo: 'cave-entrance' }
        ]
    });
    
    builder.addLocation({
        id: 'treasure-room',
        name: 'Treasure Room',
        description: "You've found it! A small chamber with an ornate treasure chest in the center.",
        exits: [
            { direction: 'south', leadsTo: 'main-chamber' }
        ]
    });
    
    builder.addLocation({
        id: 'dark-tunnel',
        name: 'Dark Tunnel',
        description: "You are in a narrow, winding tunnel. It's very dark here, and the walls are damp and cold. The tunnel continues to the east, or you can go back west to the main chamber.",
        exits: [
            { direction: 'west', leadsTo: 'main-chamber' },
            { direction: 'east', leadsTo: 'dead-end' }
        ]
    });
    
    builder.addLocation({
        id: 'dead-end',
        name: 'Dead End',
        description: "The tunnel comes to an abrupt end. The walls are solid rock with no way forward. You'll need to go back west.",
        exits: [
            { direction: 'west', leadsTo: 'dark-tunnel' }
        ]
    });
    
    builder.addLocation({
        id: 'forest-path',
        name: 'Forest Path',
        description: 'You are on a winding forest path. Tall trees surround you on all sides. The path leads north back to the cave entrance, or you could head south deeper into the forest.',
        exits: [
            { direction: 'north', leadsTo: 'cave-entrance' },
            { direction: 'south', leadsTo: 'forest-clearing' }
        ]
    });
    
    builder.addLocation({
        id: 'forest-clearing',
        name: 'Forest Clearing',
        description: "You've reached a peaceful forest clearing. Sunlight streams through the canopy above, and birds chirp in the trees. A path leads north back through the forest. To the west, you notice an old wooden shed.",
        exits: [
            { direction: 'north', leadsTo: 'forest-path' },
            { direction: 'west', leadsTo: 'old-shed', requiredItem: 'rusty-key' }
        ]
    });
    
    builder.addLocation({
        id: 'old-shed',
        name: 'Old Shed',
        description: 'You are inside a weathered wooden shed. Dust covers everything, and cobwebs hang in the corners. A small amount of light filters through gaps in the wooden walls. The door leads back east to the clearing.',
        exits: [
            { direction: 'east', leadsTo: 'forest-clearing' }
        ]
    });
    
    // Add generic items (stackable)
    builder.addGenericItem({
        id: 'gold-coin',
        name: 'Gold Coin',
        namePlural: 'Gold Coins',
        description: 'A shiny gold coin with ancient markings.',
        examineText: 'The coin is old but still gleams. It has strange symbols etched on both sides.'
    });
    
    builder.addGenericItem({
        id: 'gem',
        name: 'Gem',
        namePlural: 'Gems',
        description: 'A precious gemstone that sparkles in the light.',
        examineText: 'The gem is perfectly cut and reflects rainbow colors.'
    });
    
    // Add unique items
    builder.addUniqueItem({
        id: 'rusty-key',
        name: 'Rusty Key',
        description: 'A small rusty key.',
        location: 'main-chamber',
        takeable: true,
        visible: true,
        examineText: 'The key is heavily rusted but still functional. It looks like it might fit a simple lock.',
        takeText: 'You pick up the rusty key.'
    });
    
    builder.addUniqueItem({
        id: 'iron-key',
        name: 'Iron Key',
        description: 'A heavy iron key with rust spots.',
        location: 'old-shed',
        takeable: true,
        visible: true,
        examineText: 'The key is old but sturdy. It looks like it might fit a large lock.',
        takeText: 'You pick up the iron key. It feels cold and heavy in your hand.'
    });
    
    builder.addUniqueItem({
        id: 'treasure-chest',
        name: 'Treasure Chest',
        description: 'An ornate wooden chest bound with iron.',
        location: 'treasure-room',
        takeable: false,
        visible: true,
        isContainer: true,
        isLocked: true,
        isClosed: true,
        requiredKey: 'iron-key',
        contents: [
            { itemId: 'gold-coin', quantity: 100 },
            { itemId: 'gem', quantity: 25 }
        ],
        examineText: 'The chest is beautifully carved with intricate patterns. It has a heavy iron padlock.',
        openText: 'You open the chest.',
        lockedMessage: 'The chest is locked with a heavy iron padlock.',
        closedMessage: 'The chest is closed.',
        cantTakeText: "The chest is far too heavy to carry."
    });
    
    builder.addUniqueItem({
        id: 'rusty-lantern',
        name: 'Rusty Lantern',
        description: 'An old lantern covered in rust.',
        location: 'cave-entrance',
        takeable: true,
        visible: true,
        usable: true,
        examineText: 'The lantern is rusty but might still work. It has a small amount of oil left.',
        takeText: 'You pick up the rusty lantern.',
        useText: 'You light the lantern. It flickers to life, casting a warm glow.'
    });
    
    // Set start location
    builder.setStartLocation('cave-entrance');
    
    // Add Side Quest - Explore the Shed
    builder.addQuest({
        id: 'explore-shed',
        name: 'Explore the Old Shed',
        description: 'There appears to be an old shed in the forest clearing. Find a way to unlock it and see what\'s inside.',
        isMainQuest: false,
        initialState: 'inactive',
        objectives: [
            {
                id: 'enter-shed',
                description: 'Enter the old shed',
                required: true
            }
        ],
        requireAllObjectives: true,
        scoreReward: 25,
        completionMessage: 'Quest complete! You\'ve explored the old shed and discovered what was hidden inside.',
        startMessage: 'New quest: Explore the Old Shed!\nUse QUEST or QUESTS to check your progress.'
    });
    
    // Add Main Quest - Find the Treasure
    builder.addQuest({
        id: 'find-treasure',
        name: 'Find the Lost Treasure',
        description: 'Legend speaks of a great treasure hidden deep within these caves. Find the treasure chest and claim your reward!',
        isMainQuest: true,
        initialState: 'active',
        objectives: [
            {
                id: 'collect-treasure',
                description: 'Take the gold and gems from the treasure chest',
                required: true
            }
        ],
        requireAllObjectives: true,
        scoreReward: 100,
        completionMessage: '\n=== QUEST COMPLETE ===\nCongratulations! You have found the lost treasure and completed your quest!\n\nThank you for playing!',
        startMessage: 'Your quest begins: Find the Lost Treasure!\nUse QUEST or QUESTS to check your progress.'
    });
    
    // Build and return the immutable Game
    return builder.toGame();
}
