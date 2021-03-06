var strategy = (function(){
    var turn = -1,
        tie = 0,
        oWin = 0,
        xWin = 0;
    var cells;


    function drawCells(){
        var b = document.board;

        //cells are 9 input 
        //7 8 9 
        //4 5 6 
        //1 2 3
        cells = new Array(b.c1,b.c2,b.c3,b.c4,b.c5,b.c6,b.c7,b.c8,b.c9)
    }

    //just test whether it's blank
    function isCellBlank(state, cellnum)
    {
        return ((state & (1<<(cellnum*2+1))) == 0)
    }

    function isCellSet(state, cellnum)
    {
        return ((state & (1<<(cellnum*2+1))) != 0)
    }

    // - - - - - - - - -
    // 8 7 6 5 4 3 2 1 0
    function getLegalMoves(state){
        var moves = 0;
        for (var i=0; i<9; i++){
            if(isCellBlank(state,i)){
                moves |= 1 << i;
            }
        }
        return moves;
    }

    function availableMoveNum(moves)
    {
        var num = 0;
        for (var i=0; i<9; i++){
            if ((moves & (1<<i)) != 0) num++;
        }

        return num;
    }

    function moveRandom(moves){
        var numMoves = availableMoveNum(moves);
        if (numMoves > 0){
            //moveNum is random num in [1, numMove]
            var moveNum = Math.floor(Math.random()*numMoves +1);
            numMoves = 0;
            for (var j=0; j<9; j++){
                if ((moves & (1<<j)) != 0) numMoves++;
                if (numMoves == moveNum){
                    move(cells[j]);
                    return;
                }
            }
        }
    }


    //  -  -  -  -  -  -  -  -  - - - - - - - - - -
    // 18 17 16 15 14 13 12 11 10 9 8 7 6 5 4 3 2 1
    function knownStrategy(state){
        var mask = state & 0x2AAAA;	

        //all blank
        if (mask == 0x00000) return 0x1FF;

        //4 center 
        //if one player fills the center, the best move will be 
        //corner, or you will lose
        
        if (mask == 0x00200) return 0x145;

        //0 2 6 8  
        //if corner is filled, then you must take the center
        //or you will fail quickly

        if (mask == 0x00002 ||
            mask == 0x00020 ||
            mask == 0x02000 ||
            mask == 0x20000) return 0x010;

        //1 3 5 7 edge
        // if one use choose edges, the other should choose cell that are in same row
        // or column
        if (mask == 0x00008) return 0x095;
        if (mask == 0x00080) return 0x071;
        if (mask == 0x00800) return 0x11C;
        if (mask == 0x08000) return 0x152;

        return 0;
    }

    function perfectMove(){
        var state = getState();
        var winner = detectWin(state);
        if (winner == 0){
            var moves = getLegalMoves(state);

            //Because the AI is unbeatable, so this is the minimum scenario
            var hope = -999;
            var goodMoves = knownStrategy(state);
            
            //not blank or just one scenario 
            if (goodMoves == 0){
                for (var i=0; i<9; i++){
                    //for these legal move
                    if ((moves & (1<<i)) != 0) {
                        var value = moveValue(state, i, turn, turn, 1);
                        if (value > hope){
                            hope = value;
                            goodMoves = 0;
                        }
                        //get all the possible best move
                        if (hope == value){
                            goodMoves |= (1<<i);
                        }
                    }
                }
            }
            moveRandom(goodMoves);
        }
    }

    //depth is to make sure that the AI will not lose himself too early
    //moveFor == nextTurn -> AI 
    function moveValue(istate, move, moveFor, nextTurn, depth){
        //simulate the state
        var state = stateMove(istate, move, nextTurn);
        var winner = detectWin(state)

        if ((winner & 0x300000) == 0x300000){
            return 0;
        } else if (winner != 0){
            if (moveFor == nextTurn) return 10 - depth;
            else return depth - 10;
        }
        
        //if the the current operation is not the same with the original, minimum scenario
        //if the the current operation is the same with the original, maximum scenario
        var hope = 999;
        if (moveFor != nextTurn) hope = -999;

        var moves = getLegalMoves(state);
        for (var i=0; i<9; i++){
            if ((moves & (1<<i)) != 0) {
                var value = moveValue(state, i, moveFor, -nextTurn,  depth+1);
                if (moveFor == nextTurn && value < hope  ||moveFor != nextTurn && value > hope ){
                    hope = value;
                }            

            }
        }

        return hope;
    }


    function detectWinMove(state, cellNum, nextTurn){
        var value = 0x3;
        if (nextTurn == -1) value = 0x2;
        var newState = state | (value << cellNum*2);
        return detectWin(newState);
    }


    function getState(){
        //because we have "" X O three state for one blank, 
        //so we need 2 bit for each blank.

        var state = 0;
        for (var i=0; i<9; i++){
            var cell = cells[i];
            var value = 0;
            if (cell.value.indexOf('X') != -1) value = 0x3;
            if (cell.value.indexOf('O') != -1) value = 0x2;
            state |= value << (i*2);
        }
        return state;
    }

    function detectWin(state){
        
        //8: x: 0x30000 o: 0x20000 
        //7: x: 0x0c000 o: 0x08000
        //6: x: 0x03000 o: 0x02000
        //5: x: 0x00c00 o: 0x00800 
        //4: x: 0x00300 o: 0x00200       
        //3: x: 0x000c0 o: 0x00080
        //2: x: 0x00030 o: 0x00020
        //1: x: 0x0000c o: 0x00008
        //0: x: 0x00003 o: 0x00002

        //789   3f000
        //456   00fc0
        //123   0003f
        //
        //147   030c3
        //258   0c30c
        //369   30c30
        //
        //357   03330
        //159   30303

        //&3000000 == 3000000 tie
        ///&3000000 == 2000000 owin
        ///&3000000 == 1000000 xwin

        if ((state & 0x3F000) == 0x3F000) return 0x13F000;
        if ((state & 0x3F000) == 0x2A000) return 0x22A000;

        if ((state & 0x00FC0) == 0x00FC0) return 0x100FC0;
        if ((state & 0x00FC0) == 0x00A80) return 0x200A80;

        if ((state & 0x0003F) == 0x0003F) return 0x10003F;
        if ((state & 0x0003F) == 0x0002A) return 0x20002A;

        if ((state & 0x030C3) == 0x030C3) return 0x1030C3;
        if ((state & 0x030C3) == 0x02082) return 0x202082;

        if ((state & 0x0C30C) == 0x0C30C) return 0x10C30C;
        if ((state & 0x0C30C) == 0x08208) return 0x208208;

        if ((state & 0x30C30) == 0x30C30) return 0x130C30;
        if ((state & 0x30C30) == 0x20820) return 0x220820;

        if ((state & 0x03330) == 0x03330) return 0x103330;
        if ((state & 0x03330) == 0x02220) return 0x202220;

        if ((state & 0x30303) == 0x30303) return 0x130303;
        if ((state & 0x30303) == 0x20202) return 0x220202;

        //this is tie situation, because 0x03 and 0x02 both have 1 bit of 1, so we check if 
        //all the 1 bit exist in 9 blank, we can be sure that it's a tie
        if ((state & 0x2AAAA) == 0x2AAAA) return 0x300000;
        return 0;
    }       


    function nextTurn(){
        //here the turn means nextTurn
        turn = -turn;
        if(turn == 1){
            if(document.board.real[1].checked) perfectMove();
        }else {
            if(document.board.real[0].checked) perfectMove();
        }
    }

    function stateMove(state, move, nextTurn){
        var value = 0x3;
        if (nextTurn == -1) value = 0x2;
        return (state | (value << (move*2)));
    }

    function move(cell){
        if (cell.value == ''){
            var state = getState();
            var winner = detectWin(state);

            if (winner == 0){
                for (var i=0; i<9; i++){
                    if (cells[i] == cell){
                        state = stateMove(state, i, turn);
                    }
                }
                drawState(state);
                nextTurn();
            }
        }
    }


    function drawState(state){
        var winner = detectWin(state);

        for (var i=0; i<9; i++){
            var value = '';
            if (isCellSet(state, i)){
                if ((state & (1<<(i*2))) != 0){
                    //11,  so it's X
                    value = 'X';
                } else {
                    //10, so it's O
                    value = 'O';
                }
            }

            //paint the winner red background
            if ((winner & (1<<(i*2+1))) != 0){
                cells[i].style.backgroundColor='red';
            } else {
                if (cells[i].style.backgroundColor == "red"){
                    cells[i].style.backgroundColor='#3498db';
                }
            }

            cells[i].value = value;
        }
    }

    function newGame(){
        turn = -1;
        drawState(0);
        nextTurn();
    }

    return {
        drawCells: drawCells,
        move: move,
        newGame: newGame
    }
})();
