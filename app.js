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
        this.playerManagementScreen = document.getElementById('player-management-screen');
        this.gameScreen = document.getElementById('game-screen');

        // Buttons
        this.newGameBtn = document.getElementById('new-game-btn');
        this.continueBtn = document.getElementById('continue-btn');
        this.backToMenuBtn = document.getElementById('back-to-menu-btn');
        this.backToMenuBtn2 = document.getElementById('back-to-menu-btn-2');
        this.backToGamesBtn = document.getElementById('back-to-games-btn');
        this.backToMenuFromPlayersBtn = document.getElementById('back-to-menu-from-players-btn');
        this.addNewPlayerBtn = document.getElementById('add-new-player-btn');
        this.addExistingPlayerBtn = document.getElementById('add-existing-player-btn');
        this.startGameBtn = document.getElementById('start-game-btn');

        // Lists
        this.gameList = document.getElementById('game-list');
        this.saveList = document.getElementById('save-list');
        this.selectedPlayersList = document.getElementById('selected-players-list');
        this.existingPlayersSelect = document.getElementById('existing-players-select');
        this.playerManagementList = document.getElementById('player-management-list');

        // Input elements
        this.playerNameInput = document.getElementById('player-name-input');
        this.commandInput = document.getElementById('command-input');

        // Game elements
        this.outputSection = document.getElementById('output-section');
        this.turnIndicator = document.getElementById('turn-indicator');
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
        
        // Modal elements
        this.modalOverlay = document.getElementById('modal-overlay');
        this.modalTitle = document.getElementById('modal-title');
        this.modalContent = document.getElementById('modal-content');
        this.modalCloseBtn = document.getElementById('modal-close-btn');
        this.modalOkBtn = document.getElementById('modal-ok-btn');
        
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

    // Show modal
    showModal(title, content) {
        this.modalTitle.textContent = title;
        this.modalContent.innerHTML = content;
        this.modalOverlay.classList.remove('hidden');
    }

    // Hide modal
    hideModal() {
        this.modalOverlay.classList.add('hidden');
        this.modalContent.innerHTML = '';
        this.modalTitle.textContent = '';
    }

    // Attach event listeners
    attachEventListeners() {
        this.newGameBtn.addEventListener('click', () => this.showGameSelect());
        this.continueBtn.addEventListener('click', () => this.showSaveSelect());
        this.backToMenuBtn.addEventListener('click', () => this.showMenu());
        this.backToMenuBtn2.addEventListener('click', () => this.showMenu());
        this.backToGamesBtn.addEventListener('click', () => this.showGameSelect());
        this.backToMenuFromPlayersBtn.addEventListener('click', () => this.showMenu());
        
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
        
        // Modal event listeners
        this.modalCloseBtn.addEventListener('click', () => this.hideModal());
        this.modalOkBtn.addEventListener('click', () => this.hideModal());
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.hideModal();
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
        
        // Clear game state
        this.gameEngine = null;
        this.currentSaveId = null;
        this.currentGameId = null;
        this.selectedPlayers = [];
        
        // Clear output section
        if (this.outputSection) {
            this.outputSection.innerHTML = '';
        }
        
        // Clear command input
        if (this.commandInput) {
            this.commandInput.value = '';
            this.commandInput.disabled = false;
            this.commandInput.placeholder = 'Enter command...';
        }
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

    // Show player management screen
    async showPlayerManagement() {
        this.hideAllScreens();
        this.playerManagementScreen.classList.remove('hidden');
        await this.populatePlayerManagementList();
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

            for (const save of saves) {
                const item = document.createElement('div');
                item.className = 'selection-item';
                const date = new Date(save.timestamp).toLocaleString();
                
                // Get player names for this save
                let playerNames = [];
                if (save.gameState && save.gameState.players) {
                    const playerIds = Object.keys(save.gameState.players);
                    for (const playerId of playerIds) {
                        try {
                            // Check if legacy player
                            if (playerId.startsWith('legacy-player-')) {
                                playerNames.push('Player');
                            } else {
                                const player = await this.storage.getPlayer(playerId);
                                if (player) {
                                    playerNames.push(player.name);
                                }
                            }
                        } catch (error) {
                            console.error(`Failed to load player ${playerId}:`, error);
                        }
                    }
                }
                
                const playersText = playerNames.length > 0 ? ` | Players: ${playerNames.join(', ')}` : '';
                
                item.innerHTML = `
                    <div class="selection-item-content" style="flex: 1; cursor: pointer;">
                        <div class="selection-item-title">${save.gameTitle}</div>
                        <div class="selection-item-info">Saved: ${date}${playersText}</div>
                    </div>
                    <button class="delete-save-btn" data-save-id="${save.id}" style="margin-left: 10px; padding: 8px 12px; background: #d9534f; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                `;
                
                // Add click handler for loading the game (only on the content area)
                const contentArea = item.querySelector('.selection-item-content');
                contentArea.addEventListener('click', () => this.loadGame(save));
                
                // Add click handler for delete button
                const deleteBtn = item.querySelector('.delete-save-btn');
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent triggering the load game handler
                    await this.deleteSave(save.id);
                });
                
                this.saveList.appendChild(item);
            }
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
            
            // Filter out deleted players
            const activePlayers = players.filter(p => !p.deleted);
            
            // Get IDs of already selected players
            const selectedPlayerIds = this.selectedPlayers.map(p => p.id);
            
            // Filter out already selected players
            const availablePlayers = activePlayers.filter(p => !selectedPlayerIds.includes(p.id));
            
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

    // Populate player management list
    async populatePlayerManagementList() {
        try {
            const allPlayers = await this.storage.getAllPlayers();
            
            // Filter out deleted players
            const activePlayers = allPlayers.filter(p => !p.deleted);
            
            this.playerManagementList.innerHTML = '';
            
            if (activePlayers.length === 0) {
                this.playerManagementList.innerHTML = '<div class="no-items-message" style="padding: 20px; text-align: center;">No players found. Create players when starting a new game.</div>';
                return;
            }
            
            activePlayers.forEach(player => {
                const item = document.createElement('div');
                item.className = 'player-management-item';
                item.dataset.playerId = player.id;
                
                const created = new Date(player.createDate).toLocaleDateString();
                const lastActive = new Date(player.lastActive).toLocaleDateString();
                
                item.innerHTML = `
                    <div class="player-info">
                        <div class="player-name-display">${player.name}</div>
                        <div class="player-meta">Created: ${created} | Last Active: ${lastActive}</div>
                    </div>
                    <form class="player-rename-form">
                        <input type="text" class="player-rename-input" value="${player.name}" maxlength="30">
                        <button type="submit" class="player-action-btn success">Save</button>
                        <button type="button" class="player-action-btn cancel-rename-btn">Cancel</button>
                    </form>
                    <div class="player-management-actions">
                        <button class="player-action-btn rename-btn">Rename</button>
                        <button class="player-action-btn danger delete-btn">Delete</button>
                    </div>
                `;
                
                // Get elements
                const renameBtn = item.querySelector('.rename-btn');
                const deleteBtn = item.querySelector('.delete-btn');
                const renameForm = item.querySelector('.player-rename-form');
                const playerInfo = item.querySelector('.player-info');
                const actions = item.querySelector('.player-management-actions');
                const cancelRenameBtn = item.querySelector('.cancel-rename-btn');
                const renameInput = item.querySelector('.player-rename-input');
                
                // Rename button
                renameBtn.addEventListener('click', () => {
                    playerInfo.style.display = 'none';
                    actions.style.display = 'none';
                    renameForm.classList.add('active');
                    renameInput.focus();
                    renameInput.select();
                });
                
                // Cancel rename
                cancelRenameBtn.addEventListener('click', () => {
                    renameForm.classList.remove('active');
                    playerInfo.style.display = 'flex';
                    actions.style.display = 'flex';
                    renameInput.value = player.name;
                });
                
                // Save rename
                renameForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const newName = renameInput.value.trim();
                    
                    if (!newName) {
                        this.showToast('Player name cannot be empty.', 'error');
                        return;
                    }
                    
                    if (newName === player.name) {
                        // No change
                        renameForm.classList.remove('active');
                        playerInfo.style.display = 'flex';
                        actions.style.display = 'flex';
                        return;
                    }
                    
                    await this.renamePlayer(player.id, newName);
                });
                
                // Delete button
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(`Are you sure you want to delete ${player.name}? They will no longer appear in player lists, but existing games with this player will still work.`)) {
                        await this.deletePlayer(player.id);
                    }
                });
                
                this.playerManagementList.appendChild(item);
            });
        } catch (error) {
            console.error('Error populating player management list:', error);
            this.showToast('Failed to load players.', 'error');
        }
    }

    // Rename a player
    async renamePlayer(playerId, newName) {
        try {
            const player = await this.storage.getPlayer(playerId);
            
            if (!player) {
                this.showToast('Player not found.', 'error');
                return;
            }
            
            player.name = newName;
            player.updateActivity();
            await this.storage.savePlayer(player);
            
            this.showToast(`Player renamed to ${newName}!`, 'success');
            await this.populatePlayerManagementList();
        } catch (error) {
            console.error('Error renaming player:', error);
            this.showToast('Failed to rename player.', 'error');
        }
    }

    // Soft delete a player
    async deletePlayer(playerId) {
        try {
            const player = await this.storage.getPlayer(playerId);
            
            if (!player) {
                this.showToast('Player not found.', 'error');
                return;
            }
            
            player.deleted = true;
            player.updateActivity();
            await this.storage.savePlayer(player);
            
            this.showToast(`${player.name} deleted.`, 'success');
            await this.populatePlayerManagementList();
        } catch (error) {
            console.error('Error deleting player:', error);
            this.showToast('Failed to delete player.', 'error');
        }
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
            
            // Show whose turn it is
            const firstPlayer = this.selectedPlayers[0];
            this.addOutput(`=== ${firstPlayer.name}'s turn ===`, 'turn-indicator');
            
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

    // Delete a saved game
    async deleteSave(saveId) {
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this save? This cannot be undone.')) {
            return;
        }

        try {
            await this.storage.deleteSave(saveId);
            this.showToast('Save deleted successfully', 'success');
            
            // Refresh the save list
            await this.populateSaveList();
        } catch (error) {
            console.error('Error deleting save:', error);
            this.showToast('Failed to delete save', 'error');
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
            
            // Show whose turn it is
            const activePlayer = this.selectedPlayers.find(p => p.id === this.gameEngine.state.activePlayerId);
            if (activePlayer) {
                this.addOutput(`**${activePlayer.name}'s turn**`, 'turn-indicator');
            }
            
            this.addOutput(this.gameEngine.getLocationDescription(), 'game-output');
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
        
        // Ensure command input is enabled
        this.commandInput.disabled = false;
        this.commandInput.placeholder = 'Enter command...';
        this.commandInput.focus();
    }

    // Hide all screens
    hideAllScreens() {
        this.menuScreen.classList.add('hidden');
        this.gameSelectScreen.classList.add('hidden');
        this.saveSelectScreen.classList.add('hidden');
        this.playerSelectScreen.classList.add('hidden');
        this.playerManagementScreen.classList.add('hidden');
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
        const result = this.gameEngine.parseCommand(input);
        this.addOutput(result.response, 'game-output');
        
        // Check quest progress after command
        const questUpdate = this.gameEngine.checkQuestProgress();
        if (questUpdate) {
            this.addOutput(questUpdate, 'quest-update');
            
            // Check if main quest is complete
            const mainQuest = this.gameEngine.game.getMainQuest();
            if (mainQuest && this.gameEngine.state.isQuestCompleted(mainQuest.id)) {
                // Game is complete - disable input
                this.commandInput.disabled = true;
                this.commandInput.placeholder = 'Game Complete! Return to menu to start a new game.';
                return; // Don't advance turn or auto-save
            }
        }

        // Advance to next player's turn (if multiple players and command consumes turn)
        if (this.selectedPlayers.length > 1 && result.consumesTurn) {
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
        
        // Show whose turn it is and their current location
        this.addOutput(`**${nextPlayer.name}'s turn**`, 'turn-indicator');
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
    window.app = new TextAdventureApp();
});
