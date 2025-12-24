# Multiplayer Architecture

## Overview

The GameState class has been restructured to support multiple players with both shared world state and per-player state tracking.

## State Organization

### Shared World State (All Players See This)
- `uniqueItemLocations` - Where items are in the world
- `genericItemStacks` - Item quantities in locations/containers
- `npcLocations` - NPC positions
- `containerStates` - Locked/open status of containers
- `flags` - Global game flags that affect all players
- `questStates` - Shared quest progress

### Per-Player State (Individual to Each Player)
Each entry in the `players` object contains:
- `currentLocation` - Where the player is
- `score` - Player's score
- `turnCount` - Number of turns taken
- `visitedLocations` - Array of locations visited
- `flags` - Per-player flags

### Active Player Tracking
- `activePlayerId` - ID of the player whose turn it is
- When a command is executed, it operates on the active player's state

## Inventory System

Player inventories use a unique key pattern: `inventory-{playerId}`

- Unique items: `this.uniqueItemLocations['sword-123'] = 'inventory-player1'`
- Generic items: `this.genericItemStacks['inventory-player1'] = [{itemId: 'gold-coin', quantity: 5}]`

All inventory methods accept an optional `playerId` parameter that defaults to the active player:
- `getUniqueItemsInInventory(playerId)`
- `getGenericItemStacksAt('inventory', playerId)`
- `isUniqueItemInInventory(itemId, playerId)`

## API Changes

### Player Management
```javascript
// Add a player to the game
gameState.addPlayer(playerId, startLocation)

// Get active player data
const player = gameState.getActivePlayer()

// Get specific player data
const player = gameState.getPlayer(playerId)

// Change active player (for turn-based gameplay)
gameState.setActivePlayer(playerId)

// Get current location of active player
const locationId = gameState.getCurrentLocation()
```

### Movement
```javascript
// Move active player
gameState.movePlayer(locationId)

// Move specific player
gameState.movePlayer(locationId, playerId)

// Check if active player visited a location
gameState.hasVisitedLocation(locationId)

// Check if specific player visited a location
gameState.hasVisitedLocation(locationId, playerId)
```

### Items
All item methods now accept an optional `playerId` parameter:
```javascript
// Unique items
gameState.moveUniqueItem(itemId, 'inventory', playerId)
gameState.isUniqueItemInInventory(itemId, playerId)
gameState.getUniqueItemsInInventory(playerId)

// Generic items
gameState.addGenericItems('inventory', itemId, quantity, playerId)
gameState.removeGenericItems('inventory', itemId, quantity, playerId)
gameState.getGenericItemStacksAt('inventory', playerId)
```

### Flags
```javascript
// Global flags (shared)
gameState.setFlag(key, value)
gameState.getFlag(key, defaultValue)
gameState.hasFlag(key)
gameState.removeFlag(key)

// Per-player flags
gameState.setPlayerFlag(key, value, playerId)
gameState.getPlayerFlag(key, defaultValue, playerId)
gameState.hasPlayerFlag(key, playerId)
gameState.removePlayerFlag(key, playerId)
```

### Score & Stats
```javascript
gameState.addScore(points, playerId)
gameState.getScore(playerId)
gameState.getTurnCount(playerId)
```

## Serialization

The `toJSON()` method saves the complete multiplayer state:
```javascript
{
  gameId: "...",
  players: {
    "player1-guid": {
      currentLocation: "entrance",
      score: 100,
      turnCount: 15,
      visitedLocations: ["entrance", "hallway"],
      flags: {}
    },
    "player2-guid": {
      currentLocation: "library",
      score: 50,
      turnCount: 8,
      visitedLocations: ["entrance", "library"],
      flags: {}
    }
  },
  activePlayerId: "player1-guid",
  uniqueItemLocations: {
    "sword-123": "inventory-player1-guid",
    "key-456": "entrance"
  },
  genericItemStacks: {
    "inventory-player1-guid": [{itemId: "gold-coin", quantity: 10}],
    "entrance": [{itemId: "gem", quantity: 3}]
  },
  containerStates: {...},
  flags: {},
  questStates: {}
}
```

## Backward Compatibility

The system maintains backward compatibility with single-player games:
- When no `playerId` is specified, methods use `activePlayerId`
- Old saves with `currentLocation` at the root will need migration
- All GameEngine methods work with the active player automatically

## Usage in Single-Player Games

For single-player games, the app creates a default player:
```javascript
const defaultPlayer = new Player("Player 1");
await storage.savePlayer(defaultPlayer);

gameEngine.initState();
gameEngine.state.addPlayer(defaultPlayer.id, game.startLocation);
```

All commands then operate on this single active player transparently.

## Future: Turn-Based Multiplayer

To implement turn-based multiplayer:
1. Create/load multiple Player records
2. Add all players to GameState with `addPlayer()`
3. Execute command for active player
4. Call `setActivePlayer(nextPlayerId)` to switch turns
5. Repeat

Each player maintains their own:
- Current location (can be in different rooms)
- Inventory (separate items)
- Score and stats
- Visited locations
- Personal flags

But all players share:
- World state (item locations outside inventories)
- Container states
- NPC positions
- Global game flags
- Quest progress
