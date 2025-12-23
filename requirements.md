# Requirements - Retro Style Text Adventure Player

## Project Overview
A retro-style text adventure game player/engine.

## Functional Requirements

### Game source
- [ ] The GitHub pages will start with built in .json file(s) for 'hard coded' games

### Game Load / Continue
- [ ] Game definition and user game state data in JSON format (specifics TBD)
- [ ] The player is presented with an option to start a new game or continue a saved game.
- [ ] If they select new game, a list of games to choose from is displayed. NOTE: This application will not be made public until at least one game is available.
- [ ] If they select continue, a list of saved game states is displayed. If no saved games are available, a response will be returned indicating that the user needs to start a game before they can continue.

### Core Gameplay
- [ ] Turn based game play: A turn consists of the following actions in this order. Turns are as follows:
1. User is presented with text to let them know what the current state of the game is
2. User enters a text prompt to initiate an action
3. The engine parses user input and responds

### User Interface
- [ ] A two section interface split horizontally
- [ ] The top section displays all input and output and takes up all the space that the bottom section does not.
- [ ] The top section will scroll by default to the bottom of the input. All data is stored for the input.
- [ ] The bottom section is sized only to allow one line of text as an input.
- [ ] Command based input. E.G. "go north", "take key", "hit troll with axe", "climb ladder", "read letter to stranger"
- [ ] If a user inputs a command that is not recognized, a response will indicate the expected type of input. E.G. {User: flip foe} {Computer: "flip" is not a recognized verb. I know what a "foe" is, though. However, there is no foe around at the moment.}
- [ ] Text does not support any special formatting
- [ ] Input is limited to 200 characters
- [ ] No command history
- [ ] Mobile device (phone) friendly design, but desktop and tablet targeted

### Game Logic
- [ ] All interaction is via text entry
- [ ] User is presented with information about their current state and location
- [ ] Objective of the game is stated at the beginning of the game

### Save/Load System
- [ ] Game progress is saved after every entry
- [ ] Game data is stored in IndexedDb
- [ ] User progress per game is stored in IndexedDb

## Non-Functional Requirements

### Compatibility
- [ ] Browser: Edge, Chrome, Firefox, Safari

## Technical Requirements

### Dependencies
- [ ] Web browser
- [ ] Vanilla Javascript, HTML, CSS

### Architecture
- [ ] Static web application in browser only
- [ ] GitHub pages hosting
- [ ] No communication with a web api

## Future Enhancements
- [ ] Add sections to UI for Inventory, Player state, etc...
- [ ] Game maker
- [ ] IndexedDb storage limit 
- [ ] Loading / Saving new games

## Out of Scope
- [ ] Multi player
- [ ] Remote data storage

## Notes
Add any additional notes or considerations here.
