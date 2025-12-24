// Main Application Controller
class TextAdventureApp {
    constructor() {
        this.storage = new StorageManager();
        this.gameEngine = null;
        this.currentSaveId = null;
        this.currentGameId = null;
        this.availableGames = [];
        
        this.initElements();
        this.attachEventListeners();
        this.setupGlobalErrorHandling();
        this.init();
    }

    // Initialize DOM element references
    initElements() {
        // Screens
        this.menuScreen = document.getElementById('menu-screen');
        this.gameSelectScreen = document.getElementById('game-select-screen');
        this.saveSelectScreen = document.getElementById('save-select-screen');
        this.playerSelectScreen = document.getElementById('player-select-screen');
        this.gameScreen = document.getElementById('game-screen');

        // Buttons
        this.newGameBtn = document.getElementById('new-game-btn');
        this.continueBtn = document.getElementById('continue-btn');
        this.backToMenuBtn = document.getElementById('back-to-menu-btn');
        this.backToMenuBtn2 = document.getElementById('back-to-menu-btn-2');
        this.backToGamesBtn = document.getElementById('back-to-games-btn');
        this.addNewPlayerBtn = document.getElementById('add-new-player-btn');
        this.addExistingPlayerBtn = document.getElementById('add-existing-player-btn');
        this.startGameBtn = document.getElementById('start-game-btn');

        // Lists
        this.gameList = document.getElementById('game-list');
        this.saveList = document.getElementById('save-list');
        this.selectedPlayersList = document.getElementById('selected-players-list');
        this.existingPlayersSelect = document.getElementById('existing-players-select');

        // Input elements
        this.playerNameInput = document.getElementById('player-name-input');
        this.commandInput = document.getElementById('command-input');

        // Game elements
        this.outputSection = document.getElementById('output-section');
        this.turnIndicator = document.getElementById('turn-indicator');
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
        
        // Game session state
        this.selectedGame = null;
        this.selectedPlayers = [];
    }

    // Setup global error handling
    setupGlobalErrorHandling() {
        window.onerror = (message, source, lineno, colno, error) => {
            console.error('Global error:', { message, source, lineno, colno, error });
            this.showToast('An unexpected error occurred. Please refresh the page.', 'error');
            return true; // Prevent default error handling
        };

        window.onunhandledrejection = (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showToast('An unexpected error occurred. Please try again.', 'error');
        };
    }

    // Show toast notification
    showToast(message, type = 'error') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);
        
        // Remove toast after animation completes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    // Attach event listeners
    attachEventListeners() {
        this.newGameBtn.addEventListener('click', () => this.showGameSelect());
        this.continueBtn.addEventListener('click', () => this.showSaveSelect());
        this.backToMenuBtn.addEventListener('click', () => this.showMenu());
        this.backToMenuBtn2.addEventListener('click', () => this.showMenu());
        this.backToGamesBtn.addEventListener('click', () => this.showGameSelect());
        
        this.addNewPlayerBtn.addEventListener('click', () => this.addNewPlayer());
        this.addExistingPlayerBtn.addEventListener('click', () => this.addExistingPlayer());
        this.startGameBtn.addEventListener('click', () => this.startGameWithPlayers());
        
        this.playerNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addNewPlayer();
            }
        });
        
        this.commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleCommand();
            }
        });
    }

    // Initialize the application
    async init() {
        try {
            await this.storage.init();
            await this.syncGamesWithRegistry();
            await this.loadAvailableGames();
            this.showMenu();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize application. Please refresh the page.', 'error');
        }
    }
    
    // Sync hard-coded registry games with IndexedDB
    async syncGamesWithRegistry() {
        try {
            for (const game of getRegisteredGames()) {
                // Check if game exists in DB
                const existingGame = await this.storage.getGame(game.id);
                
                // If game doesn't exist or version is different, save it
                if (!existingGame || existingGame.version !== game.version) {
                    console.log(`Syncing game: ${game.id} v${game.version}`);
                    
                    try {
                        // Save Game instance to database
                        await this.storage.saveGame(game.toJSON());
                        console.log(`Successfully saved game: ${game.id}`);
                    } catch (error) {
                        console.error(`Failed to save game ${game.id}:`, error);
                        this.showToast(`Failed to sync game: ${game.title}`, 'warning');
                    }
                }
            }
        } catch (error) {
            console.error('Error syncing games:', error);
            throw error;
        }
    }

    // Load available games from IndexedDB
    async loadAvailableGames() {
        try {
            const games = await this.storage.getAllGames();
            
            // Map to simplified format for display
            this.availableGames = games.map(game => ({
                id: game.id,
                title: game.title,
                description: game.description,
                version: game.version
            }));
            
            console.log(`Loaded ${this.availableGames.length} games from database`);
        } catch (error) {
            console.error('Error loading games:', error);
            this.availableGames = [];
            throw error;
        }
    }

    // Show main menu
    showMenu() {
        this.hideAllScreens();
        this.menuScreen.classList.remove('hidden');
    }

    // Show game selection screen
    async showGameSelect() {
        this.hideAllScreens();
        this.gameSelectScreen.classList.remove('hidden');
        this.populateGameList();
    }

    // Show save selection screen
    async showSaveSelect() {
        this.hideAllScreens();
        this.saveSelectScreen.classList.remove('hidden');
        await this.populateSaveList();
    }

    // Populate game list
    populateGameList() {
        this.gameList.innerHTML = '';

        if (this.availableGames.length === 0) {
            this.gameList.innerHTML = '<div class="no-items-message">No games available.</div>';
            return;
        }

        this.availableGames.forEach(game => {
            const item = document.createElement('div');
            item.className = 'selection-item';
            item.innerHTML = `
                <div class="selection-item-title">${game.title}</div>
                <div class="selection-item-info">${game.description}</div>
            `;
            item.addEventListener('click', () => this.selectGameForPlayers(game));
            this.gameList.appendChild(item);
        });
    }

    // Populate save list
    async populateSaveList() {
        this.saveList.innerHTML = '';

        try {
            const saves = await this.storage.getAllSaves();

            if (saves.length === 0) {
                this.saveList.innerHTML = '<div class="no-items-message">No saved games found. Please start a new game first.</div>';
                return;
            }

            saves.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            saves.forEach(save => {
                const item = document.createElement('div');
                item.className = 'selection-item';
                const date = new Date(save.timestamp).toLocaleString();
                item.innerHTML = `
                    <div class="selection-item-title">${save.gameTitle}</div>
                    <div class="selection-item-info">Saved: ${date}</div>
                `;
                item.addEventListener('click', () => this.loadGame(save));
                this.saveList.appendChild(item);
            });
        } catch (error) {
            console.error('Error loading saves:', error);
            this.saveList.innerHTML = '<div class="no-items-message">Error loading saved games.</div>';
            this.showToast('Failed to load saved games.', 'error');
        }
    }

    // Select game and proceed to player selection
    async selectGameForPlayers(game) {
        this.selectedGame = game;
        this.selectedPlayers = [];
        await this.showPlayerSelect();
    }

    // Show player selection screen
    async showPlayerSelect() {
        this.hideAllScreens();
        this.playerSelectScreen.classList.remove('hidden');
        
        // Load existing players for dropdown
        await this.populateExistingPlayers();
        
        // Clear input and selected players list
        this.playerNameInput.value = '';
        this.updateSelectedPlayersList();
        this.startGameBtn.disabled = true;
    }

    // Populate existing players dropdown
    async populateExistingPlayers() {
        try {
            const players = await this.storage.getAllPlayers();
            
            // Get IDs of already selected players
            const selectedPlayerIds = this.selectedPlayers.map(p => p.id);
            
            // Filter out already selected players
            const availablePlayers = players.filter(p => !selectedPlayerIds.includes(p.id));
            
            this.existingPlayersSelect.innerHTML = '<option value="">Select existing player...</option>';
            
            availablePlayers.forEach(player => {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = player.name;
                this.existingPlayersSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading players:', error);
            this.showToast('Failed to load existing players.', 'error');
        }
    }

    // Add a new player
    async addNewPlayer() {
        const name = this.playerNameInput.value.trim();
        
        if (!name) {
            this.showToast('Please enter a player name.', 'error');
            return;
        }
        
        // Check if player with this name already added
        if (this.selectedPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            this.showToast('A player with this name is already added.', 'error');
            return;
        }
        
        try {
            // Create and save new player
            const newPlayer = new Player({ name: name });
            await this.storage.savePlayer(newPlayer);
            
            // Add to selected players
            this.selectedPlayers.push(newPlayer);
            
            // Update UI
            this.playerNameInput.value = '';
            this.updateSelectedPlayersList();
            await this.populateExistingPlayers();
            
            this.showToast(`${name} added!`, 'success');
        } catch (error) {
            console.error('Error adding player:', error);
            this.showToast('Failed to add player.', 'error');
        }
    }

    // Add an existing player
    async addExistingPlayer() {
        const playerId = this.existingPlayersSelect.value;
        
        if (!playerId) {
            this.showToast('Please select a player.', 'error');
            return;
        }
        
        // Check if player already added
        if (this.selectedPlayers.some(p => p.id === playerId)) {
            this.showToast('This player is already added.', 'error');
            return;
        }
        
        try {
            const player = await this.storage.getPlayer(playerId);
            
            if (!player) {
                this.showToast('Player not found.', 'error');
                return;
            }
            
            // Update last active
            player.updateActivity();
            await this.storage.savePlayer(player);
            
            // Add to selected players
            this.selectedPlayers.push(player);
            
            // Update UI
            this.existingPlayersSelect.value = '';
            this.updateSelectedPlayersList();
            await this.populateExistingPlayers();
            
            this.showToast(`${player.name} added!`, 'success');
        } catch (error) {
            console.error('Error adding player:', error);
            this.showToast('Failed to add player.', 'error');
        }
    }

    // Remove a player from selected list
    async removePlayer(playerId) {
        this.selectedPlayers = this.selectedPlayers.filter(p => p.id !== playerId);
        this.updateSelectedPlayersList();
        await this.populateExistingPlayers();
    }

    // Update the selected players list UI
    updateSelectedPlayersList() {
        this.selectedPlayersList.innerHTML = '';
        
        if (this.selectedPlayers.length === 0) {
            this.selectedPlayersList.innerHTML = '<div class="no-items-message">No players added yet.</div>';
            this.startGameBtn.disabled = true;
            return;
        }
        
        this.selectedPlayers.forEach((player, index) => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.innerHTML = `
                <span class="player-name">${player.name}</span>
                <span class="player-order">Player ${index + 1}</span>
                <button class="remove-player-btn\" data-player-id="${player.id}">×</button>
            `;
            
            const removeBtn = playerItem.querySelector('.remove-player-btn');
            removeBtn.addEventListener('click', () => this.removePlayer(player.id));
            
            this.selectedPlayersList.appendChild(playerItem);
        });
        
        this.startGameBtn.disabled = false;
    }

    // Start game with selected players
    async startGameWithPlayers() {
        if (this.selectedPlayers.length === 0) {
            this.showToast('Please add at least one player.', 'error');
            return;
        }
        
        try {
            // Load game data from IndexedDB
            const gameRecord = await this.storage.getGame(this.selectedGame.id);
            
            if (!gameRecord || !gameRecord.gameData) {
                this.showToast('Game data not found!', 'error');
                return;
            }

            // Reconstruct Game instance from stored data
            const gameInstance = new Game(gameRecord.gameData);

            this.currentGameId = this.selectedGame.id;
            this.currentSaveId = null;
            this.gameEngine = new GameEngine(gameInstance);
            
            // Initialize game state
            this.gameEngine.initState();
            
            // Add all selected players to the game state
            this.selectedPlayers.forEach(player => {
                this.gameEngine.state.addPlayer(player.id, gameInstance.startLocation);
            });

            this.showGameScreen();
            this.clearOutput();
            this.addOutput(this.gameEngine.getStartText(), 'game-output');
            this.updateTurnIndicator();
            
            // Save initial state
            await this.saveGame();
        } catch (error) {
            console.error('Error starting game:', error);
            this.showToast('Failed to start game. Please try again.', 'error');
        }
    }

    // Start a new game (legacy single-player - kept for backward compatibility)
    async startNewGame(game) {
        try {
            // Load game data from IndexedDB
            const gameRecord = await this.storage.getGame(game.id);
            
            if (!gameRecord || !gameRecord.gameData) {
                this.showToast('Game data not found!', 'error');
                return;
            }

            // Reconstruct Game instance from stored data
            const gameInstance = new Game(gameRecord.gameData);

            this.currentGameId = game.id;
            this.currentSaveId = null;
            this.gameEngine = new GameEngine(gameInstance);
            
            // Create default player for single-player games
            const defaultPlayer = new Player("Player 1");
            await this.storage.savePlayer(defaultPlayer);
            
            this.gameEngine.initState();
            this.gameEngine.state.addPlayer(defaultPlayer.id, gameInstance.startLocation);

            this.showGameScreen();
            this.clearOutput();
            this.addOutput(this.gameEngine.getStartText(), 'game-output');
            
            // Save initial state
            await this.saveGame();
        } catch (error) {
            console.error('Error loading game:', error);
            this.showToast('Failed to start game. Please try again.', 'error');
        }
    }

    // Load a saved game
    async loadGame(save) {
        try {
            // Load game data from IndexedDB
            const gameRecord = await this.storage.getGame(save.gameId);
            
            if (!gameRecord || !gameRecord.gameData) {
                this.showToast('Game not found!', 'error');
                return;
            }

            // Reconstruct Game instance from stored data
            const gameInstance = new Game(gameRecord.gameData);

            this.currentGameId = save.gameId;
            this.currentSaveId = save.id;
            this.gameEngine = new GameEngine(gameInstance);
            this.gameEngine.initState(save.gameState);

            // Load player objects for all players in the saved game
            this.selectedPlayers = [];
            if (save.gameState.players && Object.keys(save.gameState.players).length > 0) {
                // New multiplayer save format
                for (const playerId of Object.keys(save.gameState.players)) {
                    try {
                        // Check if this is a legacy player ID
                        if (playerId.startsWith('legacy-player-')) {
                            // Create a temporary player object for display
                            this.selectedPlayers.push(new Player({
                                id: playerId,
                                name: 'Player'
                            }));
                        } else {
                            const player = await this.storage.getPlayer(playerId);
                            if (player) {
                                this.selectedPlayers.push(player);
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to load player ${playerId}:`, error);
                    }
                }
            } else {
                // Very old save format without players - create a default player
                const defaultPlayer = new Player({ name: 'Player' });
                this.selectedPlayers.push(defaultPlayer);
            }

            this.showGameScreen();
            this.clearOutput();
            this.addOutput('=== Game Loaded ===\n', 'system-message');
            this.addOutput(this.gameEngine.getLocationDescription(), 'game-output');
            this.updateTurnIndicator();
        } catch (error) {
            console.error('Error loading game:', error);
            this.showToast('Failed to load saved game.', 'error');
        }
    }

    // Update turn indicator
    updateTurnIndicator() {
        if (!this.gameEngine || !this.gameEngine.state) {
            this.turnIndicator.textContent = '';
            return;
        }
        
        const activePlayer = this.gameEngine.state.getActivePlayer();
        if (!activePlayer) {
            this.turnIndicator.textContent = '';
            return;
        }
        
        // Find the player object to get the name
        const player = this.selectedPlayers.find(p => p.id === this.gameEngine.state.activePlayerId);
        if (player) {
            const currentLocation = this.gameEngine.state.getCurrentLocation();
            const location = this.gameEngine.game.getLocation(currentLocation);
            const locationName = location ? location.name : 'Unknown';
            this.turnIndicator.textContent = `${player.name}'s turn (${locationName})`;
        } else {
            this.turnIndicator.textContent = "Player's turn";
        }
    }

    // Show game screen
    showGameScreen() {
        this.hideAllScreens();
        this.gameScreen.classList.remove('hidden');
        this.commandInput.focus();
    }

    // Hide all screens
    hideAllScreens() {
        this.menuScreen.classList.add('hidden');
        this.gameSelectScreen.classList.add('hidden');
        this.saveSelectScreen.classList.add('hidden');
        this.playerSelectScreen.classList.add('hidden');
        this.gameScreen.classList.add('hidden');
    }

    // Handle user command
    async handleCommand() {
        const input = this.commandInput.value.trim();
        
        if (!input) {
            return;
        }

        // Get current player for display
        const activePlayerId = this.gameEngine.state.activePlayerId;
        const activePlayer = this.selectedPlayers.find(p => p.id === activePlayerId);
        const playerName = activePlayer ? activePlayer.name : 'Player';

        // Display user input with player name
        this.addOutput(`${playerName} > ${input}`, 'user-input');
        
        // Clear input field
        this.commandInput.value = '';

        // Process command
        const response = this.gameEngine.parseCommand(input);
        this.addOutput(response, 'game-output');

        // Advance to next player's turn (if multiple players)
        if (this.selectedPlayers.length > 1) {
            this.addOutput('', 'separator'); // Empty line for readability
            this.advanceToNextPlayer();
        }

        // Auto-save after each command
        await this.saveGame();

        // Scroll to bottom
        this.scrollToBottom();
    }

    // Advance to the next player's turn
    advanceToNextPlayer() {
        const currentIndex = this.selectedPlayers.findIndex(
            p => p.id === this.gameEngine.state.activePlayerId
        );
        
        if (currentIndex === -1) return;
        
        // Get next player (wrap around to first if at end)
        const nextIndex = (currentIndex + 1) % this.selectedPlayers.length;
        const nextPlayer = this.selectedPlayers[nextIndex];
        
        // Set the next player as active
        this.gameEngine.state.setActivePlayer(nextPlayer.id);
        
        // Update the turn indicator
        this.updateTurnIndicator();
        
        // Show the new player's current location
        this.addOutput(this.gameEngine.getLocationDescription(), 'game-output');
    }

    // Save game state
    async saveGame() {
        try {
            const gameState = this.gameEngine.getState();
            const gameInfo = this.availableGames.find(g => g.id === this.currentGameId);
            
            if (this.currentSaveId) {
                // Delete old save and create new one (IndexedDB doesn't support update easily)
                await this.storage.deleteSave(this.currentSaveId);
            }
            
            this.currentSaveId = await this.storage.saveGameState(
                this.currentGameId,
                gameInfo.title,
                gameState
            );
        } catch (error) {
            console.error('Error saving game:', error);
        }
    }

    // Add output to the screen
    addOutput(text, className = 'game-output') {
        const line = document.createElement('div');
        line.className = `output-line ${className}`;
        line.textContent = text;
        this.outputSection.appendChild(line);
    }

    // Clear output screen
    clearOutput() {
        this.outputSection.innerHTML = '';
    }

    // Scroll output to bottom
    scrollToBottom() {
        this.outputSection.scrollTop = this.outputSection.scrollHeight;
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TextAdventureApp();
});
