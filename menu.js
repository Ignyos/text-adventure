class Menu {
  constructor() {
    this.options = [
      { id: 'home', label: 'Home', action: () => this.goHome() },
      { id: 'players', label: 'Players', action: () => this.showPlayers() },
      { id: 'help', label: 'Help', action: () => this.showHelp() }
    ];
    
    this.isOpen = false;
    this.createElements();
    this.attachEventListeners();
  }

  createElements() {
    // Create menu button (hamburger icon)
    this.menuButton = document.createElement('button');
    this.menuButton.className = 'menu-button';
    this.menuButton.innerHTML = `
      <div class="menu-icon">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    this.menuButton.setAttribute('aria-label', 'Open menu');
    
    // Create menu dropdown
    this.menuDropdown = document.createElement('div');
    this.menuDropdown.className = 'menu-dropdown hidden';
    
    // Store menu item elements
    this.menuItems = {};
    
    // Create menu items
    this.options.forEach(option => {
      const menuItem = document.createElement('button');
      menuItem.className = 'menu-item';
      menuItem.textContent = option.label;
      menuItem.dataset.action = option.id;
      menuItem.addEventListener('click', () => {
        if (menuItem.disabled) return;
        option.action();
        this.closeMenu();
      });
      this.menuDropdown.appendChild(menuItem);
      this.menuItems[option.id] = menuItem;
    });
    
    // Append to body
    document.body.appendChild(this.menuButton);
    document.body.appendChild(this.menuDropdown);
  }

  attachEventListeners() {
    this.menuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.menuDropdown.contains(e.target)) {
        this.closeMenu();
      }
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.isOpen = true;
    this.updateMenuStates();
    this.menuDropdown.classList.remove('hidden');
    this.menuButton.classList.add('active');
  }

  closeMenu() {
    this.isOpen = false;
    this.menuDropdown.classList.add('hidden');
    this.menuButton.classList.remove('active');
  }

  updateMenuStates() {
    if (!window.app) return;
    
    // Disable Players option if game is active
    const isGameActive = window.app.gameEngine !== null;
    
    if (this.menuItems.players) {
      this.menuItems.players.disabled = isGameActive;
      if (isGameActive) {
        this.menuItems.players.classList.add('disabled');
      } else {
        this.menuItems.players.classList.remove('disabled');
      }
    }
  }

  // Menu action handlers
  goHome() {
    if (!window.app) {
      console.error('App not initialized');
      return;
    }
    
    // Confirm before leaving active game
    if (window.app.gameEngine) {
      if (confirm('Are you sure you want to return to the main menu? Your game will be auto-saved.')) {
        window.app.showMenu();
      }
    } else {
      window.app.showMenu();
    }
  }

  showPlayers() {
    if (!window.app) {
      console.error('App not initialized');
      return;
    }
    window.app.showPlayerManagement();
  }

  showHelp() {
    if (!window.app) {
      console.error('App not initialized');
      return;
    }
    
    const helpContent = `
      <div class="help-section">
        <h3>COMMANDS:</h3>
        <div class="help-command"><span class="help-cmd">LOOK</span> - Look around or examine something</div>
        <div class="help-command"><span class="help-cmd">GO [direction]</span> - Move in a direction (or use N, S, E, W shortcuts)</div>
        <div class="help-command"><span class="help-cmd">TAKE [item]</span> - Pick up an item</div>
        <div class="help-command"><span class="help-cmd">DROP [item]</span> - Drop an item from inventory</div>
        <div class="help-command"><span class="help-cmd">INVENTORY</span> (or I) - Check your inventory</div>
        <div class="help-command"><span class="help-cmd">EXAMINE [item]</span> - Look closely at an item</div>
        <div class="help-command"><span class="help-cmd">OPEN [container]</span> - Open a container</div>
        <div class="help-command"><span class="help-cmd">CLOSE [container]</span> - Close a container</div>
        <div class="help-command"><span class="help-cmd">UNLOCK [container] WITH [key]</span> - Unlock something</div>
        <div class="help-command"><span class="help-cmd">USE [item]</span> - Use an item</div>
        <div class="help-command"><span class="help-cmd">WAIT</span> - Wait or pass your turn</div>
      </div>
      <div class="help-section">
        <h3>TIPS:</h3>
        <div class="help-tip">• Commands that just look at things don't consume a turn</div>
        <div class="help-tip">• Movement and actions advance to the next player's turn</div>
        <div class="help-tip">• Your game is auto-saved after each command</div>
      </div>
    `;
    
    window.app.showModal('Help', helpContent);
  }
}