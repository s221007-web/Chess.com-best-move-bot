javascript:(function(){
    if(window.sfhelper){
        window.sfhelper.toggle();
        return;
    }

    // Initialize the main engine helper object
    function init(){
        window.sfhelper = {
            active: false,
            engine: null,
            lastfen: '',
            
            toggle: function(){
                this.active = !this.active;
                if(this.active){
                    this.start();
                } else {
                    this.stop();
                }
            },
            
            start: function(){
                console.log('%c♟️ engine active', 'color:lime;font-weight:bold');
                
                // Load a publicly hosted, CORS-compliant Stockfish Web Worker
                this.engine = new Worker('https://cloudflare.com'); 
                
                this.engine.onmessage = function(e){
                    if(e.data.includes('bestmove')){
                        let parts = e.data.split(' ');
                        let m = parts[1];
                        if(m) draw(m);
                    }
                };
                
                this.engine.postMessage('uci');
                this.engine.postMessage('isready');
                this.engine.postMessage('setoption name Skill Level value 20');
                
                this.loop = setInterval(() => getfen(), 1000);
            },
            
            stop: function(){
                clearInterval(this.loop);
                if(this.engine) this.engine.terminate();
                clearHighlights();
                console.log('%c♟️ engine stopped', 'color:orange');
            }
        };
        window.sfhelper.toggle();
    }

    function getfen(){
        let f = '';
        let b = document.querySelector('wc-chess-board') || document.querySelector('chess-board');
        
        if(b && b.getAttribute('fen')) f = b.getAttribute('fen');
        
        if(f && f !== window.sfhelper.lastfen){
            window.sfhelper.lastfen = f;
            clearHighlights();
            window.sfhelper.engine.postMessage('position fen ' + f);
            window.sfhelper.engine.postMessage('go movetime 1000');
        }
    }

    function draw(move){
        clearHighlights();
        let from = move.substr(0,2);
        let to = move.substr(2,2);
        highlight(from, 'rgba(0, 255, 0, 0.4)');
        highlight(to, 'rgba(0, 128, 255, 0.5)');
    }

    // Maps chess algebraic notation to visual CSS coordinate squares on Chess.com
    function highlight(sq, color){
        let b = document.querySelector('wc-chess-board') || document.querySelector('chess-board');
        if(!b) return;
        
        let files = ['a','b','c','d','e','f','g','h'];
        let ranks = ['1','2','3','4','5','6','7','8'];
        
        // Handle board orientation (flipped for black)
        let isFlipped = b.classList.contains('flipped');
        
        let fileIdx = files.indexOf(sq[0]);
        let rankIdx = ranks.indexOf(sq[1]);
        
        if(isFlipped){
            fileIdx = 7 - fileIdx;
        } else {
            rankIdx = 7 - rankIdx;
        }
        
        let x = (fileIdx + 1);
        let y = (rankIdx + 1);
        
        let hl = document.createElement('div');
        hl.className = 'sf-highlight square-' + x + y;
        hl.style.position = 'absolute';
        hl.style.backgroundColor = color;
        hl.style.zIndex = '1';
        hl.style.pointerEvents = 'none';
        
        // Dynamically match style rules of the active chess board type
        if(b.tagName.toLowerCase() === 'wc-chess-board') {
            hl.style.left = ((x - 1) * 12.5) + '%';
            hl.style.top = ((y - 1) * 12.5) + '%';
            hl.style.width = '12.5%';
            hl.style.height = '12.5%';
        }
        
        b.appendChild(hl);
    }

    function clearHighlights(){
        document.querySelectorAll('.sf-highlight').forEach(el => el.remove());
    }

    init();
})();

