// ==UserScript==
// @name         Chess.com Strong Stockfish Helper
// @namespace    https://github.com/
// @version      1.2
// @description  Highlights the best move using real Stockfish on chess.com (Analysis + Live Games)
// @author       Grok
// @match        https://www.chess.com/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.min.js
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    let engine = null;
    let isActive = false;
    let lastFen = '';
    let thinkingTimeout = null;

    const style = document.createElement('style');
    style.innerHTML = `
        .stockfish-best-from { box-shadow: 0 0 0 6px rgba(0, 255, 0, 0.85) !important; }
        .stockfish-best-to   { box-shadow: 0 0 0 6px rgba(0, 255, 120, 0.9) !important; }
        .sf-status { position: fixed; bottom: 10px; right: 10px; background: #000000cc; color: #0f0; padding: 8px 12px; border-radius: 4px; font-family: monospace; z-index: 999999; font-size: 13px; }
    `;
    document.head.appendChild(style);

    function createStatus() {
        let status = document.getElementById('sf-status');
        if (!status) {
            status = document.createElement('div');
            status.id = 'sf-status';
            status.className = 'sf-status';
            document.body.appendChild(status);
        }
        return status;
    }

    function getCurrentFEN() {
        try {
            // Modern chess.com web component
            const board = document.querySelector('wc-chess-board');
            if (board) {
                const fenAttr = board.getAttribute('fen');
                if (fenAttr) return fenAttr;
            }

            // Alternative methods
            if (window.Chessboard?.instance?.position) {
                return window.Chessboard.instance.position().fen || '';
            }

            // Fallback using chess.js from visible pieces (less reliable)
            const game = new Chess();
            // You can extend this by parsing squares if needed
            return game.fen();
        } catch (e) {
            return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        }
    }

    function highlightMove(moveStr) {
        // Remove old highlights
        document.querySelectorAll('.stockfish-best-from, .stockfish-best-to').forEach(el => {
            el.classList.remove('stockfish-best-from', 'stockfish-best-to');
        });

        if (!moveStr || moveStr.length < 4) return;

        const from = moveStr.slice(0, 2);
        const to = moveStr.slice(2, 4);

        // Try multiple possible selectors
        const selectors = [
            `[data-square="${from}"]`, `[data-square="${to}"]`,
            `.square-${from}`, `.square-${to}`,
            `div[data-square-id="${from}"]`, `div[data-square-id="${to}"]`
        ];

        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(square => {
                if (square.getAttribute('data-square') === from || 
                    square.classList.toString().includes(from)) {
                    square.classList.add('stockfish-best-from');
                } else {
                    square.classList.add('stockfish-best-to');
                }
            });
        });

        console.log(`%c♟️ Stockfish Best Move: ${from} → ${to}`, 'color:lime;font-weight:bold');
    }

    function startEngine() {
        if (engine) engine.terminate();

        engine = new Worker('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.wasm.js');

        engine.onmessage = function (e) {
            const data = e.data;
            if (data.includes('bestmove')) {
                const move = data.split(' ')[1];
                if (move && move !== '(none)') {
                    highlightMove(move);
                }
                createStatus().textContent = 'Stockfish Ready';
            }
        };

        engine.postMessage('uci');
        engine.postMessage('isready');
        engine.postMessage('setoption name Skill Level value 20'); // Max strength
    }

    function analyzeCurrentPosition() {
        if (!engine || !isActive) return;

        const fen = getCurrentFEN();
        if (fen === lastFen) return; // No change

        lastFen = fen;
        createStatus().textContent = 'Thinking...';

        engine.postMessage(`position fen ${fen}`);
        engine.postMessage('go depth 14');   // Good balance (higher = stronger but slower)
    }

    function toggleHelper() {
        isActive = !isActive;

        const status = createStatus();

        if (isActive) {
            if (!engine) startEngine();
            status.textContent = 'Stockfish ON - Analyzing';
            status.style.color = '#0f0';
            console.log('%c🚀 Chess.com Stockfish Helper Activated', 'color:lime;font-size:16px');

            // Analyze every 2.5 seconds
            if (thinkingTimeout) clearInterval(thinkingTimeout);
            thinkingTimeout = setInterval(analyzeCurrentPosition, 2500);
            analyzeCurrentPosition();
        } else {
            if (thinkingTimeout) clearInterval(thinkingTimeout);
            status.textContent = 'Stockfish OFF';
            status.style.color = '#ff0';
            document.querySelectorAll('.stockfish-best-from, .stockfish-best-to').forEach(el => {
                el.classList.remove('stockfish-best-from', 'stockfish-best-to');
            });
            console.log('%cStockfish Helper Deactivated', 'color:orange');
        }
    }

    // Keyboard shortcut: Press "H" to toggle
    document.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
            toggleHelper();
        }
    });

    // Add a floating button
    const btn = document.createElement('button');
    btn.innerHTML = '♟️ SF';
    btn.style.cssText = 'position:fixed;bottom:70px;right:10px;z-index:999999;padding:10px 14px;background:#1a1a1a;color:white;border:none;border-radius:50%;font-size:18px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.5);';
    btn.onclick = toggleHelper;
    document.body.appendChild(btn);

    console.log('%cChess.com Stockfish Userscript loaded! Press "H" or click the ♟️ button.', 'color:cyan;font-size:14px');
})();
