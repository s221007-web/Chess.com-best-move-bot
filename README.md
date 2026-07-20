# Chess.com Stockfish Best Move Highlighter

Highlights Stockfish's best move on Chess.com with green/yellow squares. Works on desktop, iPad, and mobile browsers.

## Features
- 🟢 **Green square** = Best piece to move  
- 🟡 **Yellow square** = Best destination square  
- ♟️ **Floating toggle button** - Tap to activate/deactivate  
- ⌨️ **Keyboard shortcut** - Press `H` to toggle  
- 📱 **iPad & mobile support** - Touch-optimized  
- ⚡ **Auto-updates** - Analyzes new positions every 2 seconds

## Installation

### Desktop
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. [Click here to install](YOUR_GREASYFORK_URL)

### iPad/iPhone
1. Install [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) from App Store
2. Open Safari → chess.com → tap extensions → Userscripts → Add script
3. Paste the script and save

## Usage
1. Go to [chess.com](https://www.chess.com)
2. Start a game or open analysis
3. Tap the ♟️ button in the bottom-right corner
4. Stockfish will highlight the best move

## Configuration
Edit the `CONFIG` object at the top of the script:
```javascript
const CONFIG = {
    analysisDepth: 14,        // 10-20 (higher = stronger)
    analysisInterval: 2000,   // Milliseconds
};
