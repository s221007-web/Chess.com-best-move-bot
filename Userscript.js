// ==UserScript==
// @name         Chess.com Stockfish Best Move Highlighter
// @namespace    https://github.com/YOUR_USERNAME/chess-stockfish-helper
// @version      1.0.0
// @description  Highlights Stockfish's best move on Chess.com with green/yellow squares. Works on desktop and iPad.
// @author       Your Name
// @match        https://www.chess.com/*
// @icon         https://www.chess.com/favicon.ico
// @license      MIT
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js
// @run-at       document-end
// @supportURL   https://github.com/YOUR_USERNAME/chess-stockfish-helper/issues
// @homepageURL  https://github.com/YOUR_USERNAME/chess-stockfish-helper
// ==/UserScript==

(function () {
    'use strict';

    // ─── Configuration ───────────────────────────────────
    const CONFIG = {
        analysisDepth: 14,        // Higher = stronger but slower
        analysisInterval: 2000,   // Milliseconds between analyses
        highlightFromColor: 'rgba(0, 255, 0, 0.8)',
        highlightToColor: 'rgba(255, 255, 0, 0.8)',
        buttonPosition: { bottom: '80px', right: '15px' },
    };

    // ─── State ───────────────────────────────────────────
    let engine = null;
    let isActive = false;
    let isThinking = false;
    let lastFen = '';
    let analysisTimer = null;

    // ─── Styles ──────────────────────────────────────────
    const styles = `
        /* Highlight overlays */
        .sf-highlight-wrapper {
            position: relative !important;
        }
        .sf-highlight-green::after,
        .sf-highlight-yellow::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
            border-radius: 2px;
        }
        .sf-highlight-green::after {
            background: ${CONFIG.highlightFromColor};
            box-shadow: inset 0 0 0 3px rgba(0, 255, 0, 0.9);
        }
        .sf-highlight-yellow::after {
            background: ${CONFIG.highlightToColor};
            box-shadow: inset 0 0 0 3px rgba(255, 255, 0, 0.9);
        }

        /* Floating button */
        #sf-toggle-btn {
            position: fixed;
            bottom: ${CONFIG.buttonPosition.bottom};
            right: ${CONFIG.buttonPosition.right};
            z-index: 999999;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #2a2a2a;
            color: #fff;
            border: 2px solid #555;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            transition: all 0.2s ease;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
        }
        #sf-toggle-btn:active {
            transform: scale(0.95);
        }
        #sf-toggle-btn.active {
            background: #1a3a1a;
            border-color: #4caf50;
            box-shadow: 0 0 16px rgba(76, 175, 80, 0.4);
        }
        #sf-toggle-btn.thinking {
            animation: sf-pulse 1s infinite;
        }
        @keyframes sf-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;

    function injectStyles() {
        const style = document.createElement('style');
        style.id = 'sf-styles';
        style.textContent = styles;
        document.head.appendChild(style);
    }

    // ─── FEN Extraction ──────────────────────────────────
    function getCurrentFEN() {
        try {
            // Method 1: Chess.com web component (most reliable)
            const board = document.querySelector('chess-board, wc-chess-board');
            if (board) {
                const fen = board.getAttribute('fen');
                if (fen && /^([rnbqkp1-8]+\/){7}[rnbqkp1-8]+/.test(fen)) {
                    return fen;
                }
            }

            // Method 2: Game state element
            const gameState = document.querySelector('[data-fen], #game-state');
            if (gameState) {
                const fen = gameState.getAttribute('data-fen') || gameState.getAttribute('fen');
                if (fen && fen.includes('/')) return fen;
            }

            // Method 3: Global game object
            if (window.game && typeof window.game.getFen === 'function') {
                const fen = window.game.getFen();
                if (fen) return fen;
            }

            return null;
        } catch (error) {
            console.error('Stockfish Helper: FEN extraction failed', error);
            return null;
        }
    }

    // ─── Square Highlighting ─────────────────────────────
    function clearHighlights() {
        document.querySelectorAll('.sf-highlight-green, .sf-highlight-yellow').forEach(el => {
            el.classList.remove('sf-highlight-green', 'sf-highlight-yellow', 'sf-highlight-wrapper');
        });
    }

    function highlightMove(moveStr) {
        clearHighlights();

        if (!moveStr || moveStr.length < 4 || moveStr === '(none)') return;

        const from = moveStr.substring(0, 2);
        const to = moveStr.substring(2, 4);

        // Highlight origin square (green)
        const fromSquare = document.querySelector(`[data-square="${from}"]`);
        if (fromSquare) {
            fromSquare.classList.add('sf-highlight-green', 'sf-highlight-wrapper');
        }

        // Highlight destination square (yellow)
        const toSquare = document.querySelector(`[data-square="${to}"]`);
        if (toSquare) {
            toSquare.classList.add('sf-highlight-yellow', 'sf-highlight-wrapper');
        }

        if (fromSquare || toSquare) {
            console.log(`%c♟️ Best move: ${from} → ${to}`, 'color: #4caf50; font-weight: bold;');
        }
    }

    // ─── Stockfish Engine ────────────────────────────────
    function initEngine() {
        if (engine) {
            try { engine.terminate(); } catch (e) { /* ignore */ }
        }

        try {
            engine = Stockfish();
        } catch (e) {
            console.error('Stockfish Helper: Failed to initialize engine', e);
            return false;
        }

        engine.onmessage = function (response) {
            const msg = typeof response === 'string' ? response : response.data;
            if (!msg || typeof msg !== 'string') return;

            if (msg.includes('bestmove')) {
                const parts = msg.split(' ');
                const move = parts[1];
                
                if (move && move !== '(none)') {
                    highlightMove(move);
                }
                
                isThinking = false;
                updateButtonState();
            }
        };

        engine.postMessage('uci');
        engine.postMessage('isready');
        setTimeout(() => {
            engine.postMessage('setoption name Skill Level value 20');
            engine.postMessage('setoption name MultiPV value 1');
        }, 300);

        return true;
    }

    function analyzePosition() {
        if (!engine || !isActive || isThinking) return;

        const fen = getCurrentFEN();
        if (!fen || fen === lastFen) return;

        lastFen = fen;
        isThinking = true;
        updateButtonState();

        engine.postMessage('stop');
        engine.postMessage(`position fen ${fen}`);
        engine.postMessage(`go depth ${CONFIG.analysisDepth}`);
    }

    // ─── Button Management ───────────────────────────────
    function updateButtonState() {
        const btn = document.getElementById('sf-toggle-btn');
        if (!btn) return;

        if (!isActive) {
            btn.textContent = '♟️';
            btn.classList.remove('active', 'thinking');
        } else if (isThinking) {
            btn.textContent = '⏳';
            btn.classList.add('active', 'thinking');
        } else {
            btn.textContent = '♟️';
            btn.classList.add('active');
            btn.classList.remove('thinking');
        }
    }

    function createToggleButton() {
        // Remove existing button if any
        const existing = document.getElementById('sf-toggle-btn');
        if (existing) existing.remove();

        const btn = document.createElement('button');
        btn.id = 'sf-toggle-btn';
        btn.title = 'Toggle Stockfish Analysis (H key)';
        btn.textContent = '♟️';
        btn.setAttribute('aria-label', 'Toggle Stockfish chess analysis');

        // Click handler
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAnalysis();
        });

        // Touch handler for iPad
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            toggleAnalysis();
        });

        document.body.appendChild(btn);
    }

    // ─── Toggle Logic ────────────────────────────────────
    function startAnalysis() {
        if (!engine && !initEngine()) {
            console.error('Stockfish Helper: Could not start engine');
            isActive = false;
            updateButtonState();
            return;
        }

        console.log('%c✅ Stockfish analysis activated', 'color: #4caf50; font-size: 14px;');
        lastFen = '';
        analyzePosition();
        analysisTimer = setInterval(analyzePosition, CONFIG.analysisInterval);
    }

    function stopAnalysis() {
        console.log('%c⏹️ Stockfish analysis deactivated', 'color: #ff9800;');
        
        if (analysisTimer) {
            clearInterval(analysisTimer);
            analysisTimer = null;
        }
        
        clearHighlights();
        lastFen = '';
        isThinking = false;
    }

    function toggleAnalysis() {
        isActive = !isActive;

        if (isActive) {
            startAnalysis();
        } else {
            stopAnalysis();
        }

        updateButtonState();
    }

    // ─── Keyboard Shortcut ───────────────────────────────
    function setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Press 'H' key (without modifiers) to toggle
            if (e.key === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Don't trigger if user is typing in an input
                const tag = e.target.tagName.toLowerCase();
                if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
                    return;
                }
                e.preventDefault();
                toggleAnalysis();
            }
        });
    }

    // ─── Initialization ──────────────────────────────────
    function init() {
        injectStyles();
        createToggleButton();
        setupKeyboardShortcut();
        console.log('%c🎯 Chess.com Stockfish Helper ready!', 'color: #2196f3; font-weight: bold;');
        console.log('%c   Tap the ♟️ button or press "H" to activate', 'color: #90caf9;');
    }

    // Wait for DOM and chess.com to fully load
    function waitForReady() {
        if (document.body && document.querySelector('chess-board, wc-chess-board, #board-vs-personalities')) {
            // Give chess.com a moment to fully render
            setTimeout(init, 1000);
        } else {
            setTimeout(waitForReady, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForReady);
    } else {
        waitForReady();
    }

})();
