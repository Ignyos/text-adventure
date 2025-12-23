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
        this.gameScreen = document.getElementById('game-screen');

        // Buttons
        this.newGameBtn = document.getElementById('new-game-btn');
        this.continueBtn = document.getElementById('continue-btn');
        this.backToMenuBtn = document.getElementById('back-to-menu-btn');
        this.backToMenuBtn2 = document.getElementById('back-to-menu-btn-2');

        // Lists
        this.gameList = document.getElementById('game-list');
        this.saveList = document.getElementById('save-list');

        // Game elements
        this.outputSection = document.getElementById('output-section');
        this.commandInput = document.getElementById('command-input');
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
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
            item.addEventListener('click', () => this.startNewGame(game));
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

    // Start a new game
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
            this.gameEngine.initState();

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

            this.showGameScreen();
            this.clearOutput();
            this.addOutput('=== Game Loaded ===\n', 'system-message');
            this.addOutput(this.gameEngine.getLocationDescription(), 'game-output');
        } catch (error) {
            console.error('Error loading game:', error);
            this.showToast('Failed to load saved game.', 'error');
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
        this.gameScreen.classList.add('hidden');
    }

    // Handle user command
    async handleCommand() {
        const input = this.commandInput.value.trim();
        
        if (!input) {
            return;
        }

        // Display user input
        this.addOutput(`> ${input}`, 'user-input');
        
        // Clear input field
        this.commandInput.value = '';

        // Process command
        const response = this.gameEngine.parseCommand(input);
        this.addOutput(response, 'game-output');

        // Auto-save after each command
        await this.saveGame();

        // Scroll to bottom
        this.scrollToBottom();
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
