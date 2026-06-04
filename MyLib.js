function shuffle(xs) {
  xs = xs.slice(0);
  var ys = [];
  while (xs.length > 0) {
    var i = Math.round(Math.random() * (xs.length - 1));
    ys.push(xs[i]);
    xs.splice(i, 1);
  }
  return ys;
}

class Chess {
  team() {
    return this._team;
  }

  constructor() {
    this.cvID = "cv_" + Math.random().toString(36).substr(2, 9);
    this.ps = {
      queen: 900,
      rook: 500,
      knight: 300,
      bishop: 325,
      pawn: 100,
      king: 10000,
    };
    this.selectedMoves = [];
    this.mousex = -1;
    this.mousey = -1;
    this.lastMoveX = -1;
    this.lastMoveY = -1;
    this.selectedx = -1;
    this.selectedy = -1;
    this.lastMoveInitialX = -1;
    this.lastMoveInitialY = -1;
    this.board = [];
    this.board.color = "white";
    this.board.counter = 0;
    this.board.castling = {
      white: { long: true, short: true },
      black: { long: true, short: true },
    };
    this.init();
  }

  write() {
    document.write(
      "<fieldset style='display:inline-block;position:relative'><legend>" +
        this.name() +
        " (<input type='checkbox' id='" +
        this.cvID +
        "3'> Coop)</legend>",
    );
    document.write(
      "<canvas width=300 height=300 id='" +
        this.cvID +
        "' style='border:2px solid #333'></canvas>",
    );
    document.write(
      "<video id='" +
        this.cvID +
        "thinking' autoplay='true' loop style='z-Index:10;width:100px;height:100px;position:absolute;top:100px;left:100px;visibility:hidden'><source src='thinking.mp4' type='video/mp4'></source></video>",
    );
    document.write(
      "<br>Tiefe: <select id='" +
        this.cvID +
        "1'><option value=1>1</option><option selected value=2>2</option><option value=3>3</option><option value=4>4</option></select> ",
    );
    document.write("<button id='" + this.cvID + "2'>Vorschlag</button>");
    document.write(
      "<div id='" +
        this.cvID +
        "0' style='font-family:sans-serif;font-size:12px;margin-top:5px;'></div></fieldset>",
    );

    this.render();

    const canvas = document.getElementById(this.cvID);
    document.getElementById(this.cvID + "3").onclick = (e) =>
      (this._team = e.target.checked);
    document.getElementById(this.cvID + "2").onclick = (() => {
      document.getElementById(this.cvID + "thinking").style.visibility =
        "visible";
      window.setTimeout(
        (() => {
          this.propose(
            parseInt(document.getElementById(this.cvID + "1").value),
          );
          document.getElementById(this.cvID + "thinking").style.visibility =
            "hidden";
        }).bind(this),
        10,
      );
    }).bind(this);

    canvas.onmousemove = (evt) => {
      if (this.thinking) return;
      let xy = this.getOffset(canvas);
      this.mousex = Math.floor(((evt.pageX - xy.left) * 8) / canvas.width);
      this.mousey = Math.floor(((evt.pageY - xy.top) * 8) / canvas.height);
      this.render();
    };

    canvas.onclick = (evt) => {
      if (this.thinking) return;
      let xy = this.getOffset(canvas);
      let sx = Math.floor(((evt.pageX - xy.left) * 8) / canvas.width);
      let sy = Math.floor(((evt.pageY - xy.top) * 8) / canvas.height);

      if (this.selectedMoves.length > 0) {
        let move = this.selectedMoves[0][2].find(
          (m) => m[0] === sx && m[1] === sy,
        );
        if (move) {
          this.board = this.doMove(
            this.board,
            this.selectedx,
            this.selectedy,
            move,
          );
          this.lastMoveInitialX = this.selectedx;
          this.lastMoveInitialY = this.selectedy;
          this.lastMoveX = sx;
          this.lastMoveY = sy;
          this.selectedx = -1;
          this.selectedy = -1;
          this.selectedMoves = [];
          this.pp = null;
          this.pp2 = null;
          this.render();
          this.updateInfo();
          return;
        }
      }

      let p = this.board[sx + 8 * sy];
      if (p && (this.team() || p.color === this.board.color)) {
        this.selectedx = sx;
        this.selectedy = sy;
        this.selectedMoves = [
          [
            sx,
            sy,
            this.endFilter(
              this.board,
              sx,
              sy,
              this.moveFilter(
                this.board,
                sx,
                sy,
                this.getMoves(this.board, sx, sy),
              ),
            ),
          ],
        ];
      } else {
        this.selectedx = -1;
        this.selectedy = -1;
        this.selectedMoves = [];
      }
      this.render();
      this.updateInfo();
    };
  }

  updateInfo() {
    let out = document.getElementById(this.cvID + "0");
    if (out)
      out.innerHTML = `Am Zug: <b>${this.board.color}</b> | Punkte: ${Math.round(this.measureWhite(this.board))}`;
  }

  getOffset(el) {
    let rect = el.getBoundingClientRect();
    return { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
  }

  loadPiece(name, imgName, color) {
    let img = new Image();
    img.src = "img/" + imgName + ".png";
    img.shape = name;
    img.color = color;
    img.onload = () => this.render();
    return img;
  }

  render() {
    let cv = document.getElementById(this.cvID);
    if (!cv) return;
    let ctx = cv.getContext("2d");
    let w = cv.width / 8;

    for (let j = 0; j < 8; j++) {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? "#eee" : "#999";
        ctx.fillRect(i * w, j * w, w, w);

        if (
          (i === this.lastMoveX && j === this.lastMoveY) ||
          (i === this.lastMoveInitialX && j === this.lastMoveInitialY)
        ) {
          ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
          ctx.fillRect(i * w, j * w, w, w);
        }

        let p = this.board[i + 8 * j];
        if (p) ctx.drawImage(p, i * w, j * w, w, w);

        if (this.pp2 && this.pp2[i + "," + j]) {
          ctx.strokeStyle = "magenta";
          ctx.lineWidth = 3;
          ctx.strokeRect(i * w + 2, j * w + 2, w - 4, w - 4);
        }
      }
    }

    this.selectedMoves.forEach((sm) => {
      sm[2].forEach((m) => {
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 4;
        ctx.strokeRect(m[0] * w + 2, m[1] * w + 2, w - 4, w - 4);
        if (
          this.pp &&
          this.pp[1][sm[0] + "," + sm[1] + "," + m[0] + "," + m[1]]
        ) {
          ctx.strokeStyle = "cyan";
          ctx.strokeRect(m[0] * w + 5, m[1] * w + 5, w - 10, w - 10);
        }
      });
    });

    if (this.progress !== null) {
      ctx.fillStyle = "rgba(0,0,255,0.5)";
      ctx.fillRect(w, 3.5 * w, (this.progress / 100) * 6 * w, w / 2);
    }
  }

  getMoves(board, i, j) {
    let p = board[i + 8 * j];
    if (!p) return [];
    let ms = [];
    let d = p.color === "white" ? -1 : 1;

    if (p.shape === "pawn") {
      if (!board[i + 8 * (j + d)]) {
        ms.push([i, j + d]);
        if (
          ((p.color === "white" && j === 6) ||
            (p.color === "black" && j === 1)) &&
          !board[i + 8 * (j + 2 * d)]
        )
          ms.push([i, j + 2 * d]);
      }
      [
        [-1, d],
        [1, d],
      ].forEach((o) => {
        let nx = i + o[0],
          ny = j + o[1];
        if (
          nx >= 0 &&
          nx <= 7 &&
          ny >= 0 &&
          ny <= 7 &&
          board[nx + 8 * ny] &&
          board[nx + 8 * ny].color !== p.color
        )
          ms.push([nx, ny]);
      });
    } else if (p.shape === "rook")
      this.line(
        board,
        i,
        j,
        [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ],
        ms,
      );
    else if (p.shape === "bishop")
      this.line(
        board,
        i,
        j,
        [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ],
        ms,
      );
    else if (p.shape === "queen")
      this.line(
        board,
        i,
        j,
        [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ],
        ms,
      );
    else if (p.shape === "knight")
      [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ].forEach((o) => ms.push([i + o[0], j + o[1]]));
    else if (p.shape === "king") {
      [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ].forEach((o) => ms.push([i + o[0], j + o[1]]));
      let row = p.color === "white" ? 7 : 0;
      if (i === 4 && j === row) {
        if (
          board.castling[p.color].short &&
          !board[5 + 8 * row] &&
          !board[6 + 8 * row]
        )
          ms.push([6, row]);
        if (
          board.castling[p.color].long &&
          !board[3 + 8 * row] &&
          !board[2 + 8 * row] &&
          !board[1 + 8 * row]
        )
          ms.push([2, row]);
      }
    }
    return ms.filter((m) => m[0] >= 0 && m[0] <= 7 && m[1] >= 0 && m[1] <= 7);
  }

  line(board, i, j, dirs, ms) {
    dirs.forEach((d) => {
      for (let s = 1; s < 8; s++) {
        let nx = i + d[0] * s,
          ny = j + d[1] * s;
        if (nx < 0 || nx > 7 || ny < 0 || ny > 7) break;
        ms.push([nx, ny]);
        if (board[nx + 8 * ny]) break;
      }
    });
  }

  moveFilter(board, i, j, ms) {
    let p = board[i + 8 * j];
    return ms.filter(
      (m) =>
        !board[m[0] + 8 * m[1]] || board[m[0] + 8 * m[1]].color !== p.color,
    );
  }

  endFilter(board, i, j, ms) {
    let p = board[i + 8 * j];
    return ms.filter((m) => {
      if (p.shape === "king" && Math.abs(m[0] - i) === 2) {
        let row = p.color === "white" ? 7 : 0;
        let step = m[0] === 6 ? 1 : -1;
        if (this.isUnderThreat(board, 4, row, p.color)) return false;
        if (this.isUnderThreat(board, 4 + step, row, p.color)) return false;
      }
      let nb = this.doMove(board, i, j, m);
      let kPos = -1;
      for (let c = 0; c < 64; c++)
        if (nb[c] && nb[c].shape === "king" && nb[c].color === p.color) {
          kPos = c;
          break;
        }
      return (
        kPos !== -1 &&
        !this.isUnderThreat(nb, kPos % 8, Math.floor(kPos / 8), p.color)
      );
    });
  }

  isUnderThreat(board, tx, ty, myColor) {
    for (let c = 0; c < 64; c++) {
      let p = board[c];
      if (p && p.color !== myColor) {
        let raw = this.getMoves(board, c % 8, Math.floor(c / 8));
        if (raw.some((m) => m[0] === tx && m[1] === ty)) return true;
      }
    }
    return false;
  }

  doMove(board, i, j, m) {
    let b = [...board];
    let p = b[i + 8 * j];
    b.castling = {
      white: { ...board.castling.white },
      black: { ...board.castling.black },
    };
    if (p.shape === "king" && Math.abs(m[0] - i) === 2) {
      let row = p.color === "white" ? 7 : 0;
      let rf = m[0] === 6 ? 7 : 0;
      let rt = m[0] === 6 ? 5 : 3;
      b[rt + 8 * row] = b[rf + 8 * row];
      b[rf + 8 * row] = null;
    }

    if (p.shape === "king") {
      b.castling[p.color].short = false;
      b.castling[p.color].long = false;
    }
    if (p.shape === "rook") {
      if (i === 0) b.castling[p.color].long = false;
      if (i === 7) b.castling[p.color].short = false;
    }

    b[m[0] + 8 * m[1]] = b[i + 8 * j];
    b[i + 8 * j] = null;
    b.color = board.color === "white" ? "black" : "white";
    b.counter = board.counter + 1;
    return b;
  }

  propose(n) {
    this.thinking = true;
    this.pp = [0, {}];
    this.pp2 = {};
    let moves = [];
    for (let c = 0; c < 64; c++) {
      if (this.board[c] && this.board[c].color === this.board.color) {
        let ms = this.endFilter(
          this.board,
          c % 8,
          Math.floor(c / 8),
          this.moveFilter(
            this.board,
            c % 8,
            Math.floor(c / 8),
            this.getMoves(this.board, c % 8, Math.floor(c / 8)),
          ),
        );
        ms.forEach((m) => moves.push({ f: [c % 8, Math.floor(c / 8)], t: m }));
      }
    }
    let bestScore = this.board.color === "white" ? -Infinity : Infinity;
    let bestMoves = [];
    moves.forEach((move, idx) => {
      let score = new Propose(
        this,
        this.board,
        move.f[0],
        move.f[1],
        n,
        move.t,
      ).measure();
      if (
        (this.board.color === "white" && score > bestScore) ||
        (this.board.color === "black" && score < bestScore)
      ) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) bestMoves.push(move);
      this.progress = (idx / moves.length) * 100;
      this.render();
    });
    bestMoves.forEach((bm) => {
      this.pp2[bm.f[0] + "," + bm.f[1]] = 1;
      this.pp[1][bm.f[0] + "," + bm.f[1] + "," + bm.t[0] + "," + bm.t[1]] = 1;
    });
    this.thinking = false;
    this.progress = null;
    this.render();
  }
}

class Propose {
  constructor(chess, board, i, j, n, move) {
    this.chess = chess;
    this.board = board;
    this.i = i;
    this.j = j;
    this.n = n;
    this.move = move;
  }
  measure() {
    let b = this.chess.doMove(this.board, this.i, this.j, this.move);
    return this.alphabeta(
      b,
      this.n - 1,
      -Infinity,
      Infinity,
      b.color === "white",
    );
  }
  alphabeta(board, depth, alpha, beta, max) {
    if (depth === 0) return this.chess.measureWhite(board);

    let moves = [];
    // 1. Schnelle, ungefilterte Züge generieren (nur moveFilter, kein teures endFilter!)
    for (let c = 0; c < 64; c++) {
      if (board[c] && board[c].color === board.color) {
        let i = c % 8;
        let j = Math.floor(c / 8);
        let rawMoves = this.chess.getMoves(board, i, j);
        let filtered = this.chess.moveFilter(board, i, j, rawMoves);

        filtered.forEach((m) => {
          // Optionale einfache Sortierung: Schläge höher priorisieren
          let weight = board[m[0] + 8 * m[1]] ? 10 : 0;
          moves.push({ i, j, m, weight });
        });
      }
    }

    // Falls keine Züge vorhanden sind
    if (moves.length === 0) return this.chess.measureWhite(board);

    // 2. Züge sortieren (wichtig für Alpha-Beta-Pruning!)
    moves.sort((a, b) => b.weight - a.weight);

    if (max) {
      let v = -Infinity;
      for (let m of moves) {
        let nextBoard = this.chess.doMove(board, m.i, m.j, m.m);

        // KÖNIGS-CHECK: Steht unser König nach dem Zug im Schach?
        // Da doMove bereits die Farbe gewechselt hat, prüfen wir die vorherige Farbe (max -> weiß)
        let kPos = nextBoard.findIndex(
          (p) => p && p.shape === "king" && p.color === "white",
        );
        if (
          kPos !== -1 &&
          this.chess.isUnderThreat(
            nextBoard,
            kPos % 8,
            Math.floor(kPos / 8),
            "white",
          )
        ) {
          continue; // Illegaler Zug, überspringen!
        }

        v = Math.max(
          v,
          this.alphabeta(nextBoard, depth - 1, alpha, beta, false),
        );
        alpha = Math.max(alpha, v);
        if (beta <= alpha) break; // Beta-Cutoff
      }
      // Wenn alle Züge illegal waren (Schachmatt / Patt), Bewertung zurückgeben
      return v === -Infinity ? this.chess.measureWhite(board) : v;
    } else {
      let v = Infinity;
      for (let m of moves) {
        let nextBoard = this.chess.doMove(board, m.i, m.j, m.m);

        // KÖNIGS-CHECK für Schwarz
        let kPos = nextBoard.findIndex(
          (p) => p && p.shape === "king" && p.color === "black",
        );
        if (
          kPos !== -1 &&
          this.chess.isUnderThreat(
            nextBoard,
            kPos % 8,
            Math.floor(kPos / 8),
            "black",
          )
        ) {
          continue; // Illegaler Zug, überspringen!
        }

        v = Math.min(
          v,
          this.alphabeta(nextBoard, depth - 1, alpha, beta, true),
        );
        beta = Math.min(beta, v);
        if (beta <= alpha) break; // Alpha-Cutoff
      }
      return v === Infinity ? this.chess.measureWhite(board) : v;
    }
  }
}

class ClassicChess extends Chess {
  name() {
    return "Klassisches Schach Pro";
  }
  init() {
    const l = [
      "rook",
      "knight",
      "bishop",
      "queen",
      "king",
      "bishop",
      "knight",
      "rook",
    ];
    for (let i = 0; i < 8; i++) {
      let bC = l[i] === "knight" ? "n" : l[i][0];
      this.board[i] = this.loadPiece(l[i], bC + "dd129", "black");
      this.board[8 + i] = this.loadPiece("pawn", "pdd129", "black");
      this.board[48 + i] = this.loadPiece("pawn", "pld129", "white");
      this.board[56 + i] = this.loadPiece(l[i], bC + "ld129", "white");
    }
  }

  measureWhite(board) {
    let score = 0;
    let control = new Array(64).fill(0);

    for (let c = 0; c < 64; c++) {
      let p = board[c];
      let i = c % 8;
      let j = Math.floor(c / 8);
      if (p) {
        let moves = this.endFilter(
          board,
          i,
          j,
          this.moveFilter(board, i, j, this.getMoves(board, i, j)),
        );
        moves.forEach((m) => {
          if (p.color === "white") control[m[0] + 8 * m[1]] += 1;
          else control[m[0] + 8 * m[1]] -= 1;
        });
      }
    }

    control.forEach((c) => {
      if (c > 0) score += 1;
      else if (c < 0) score -= 1;
    });

    board.forEach((p) => {
      if (p) {
        if (p.color === "white") score += this.ps[p.shape] * 1000;
        else score -= this.ps[p.shape] * 1000;
      }
    });

    return score;
  }
  /*
    measureWhite(board) {
        let score = 0;
        let whiteControl = new Array(64).fill(0);
        let blackControl = new Array(64).fill(0);

        for (let c = 0; c < 64; c++) {
            let p = board[c];
            if (p) {
                let rawMoves = this.getMoves(board, c % 8, Math.floor(c / 8));
                rawMoves.forEach(m => {
                    if (p.color === "white") whiteControl[m[0] + 8 * m[1]]++;
                    else blackControl[m[0] + 8 * m[1]]++;
                });
            }
        }

        ["white", "black"].forEach(side => {
            let m = (side === "white" ? 1 : -1);
            if (board.castling[side].short || board.castling[side].long) score += 20 * m;
            let r = (side === "white" ? 7 : 0);
            let k = board[6+8*r] || board[2+8*r];
            if (k && k.shape === "king" && k.color === side && !board.castling[side].short) score += 50 * m;
        });

        const pawnPST = [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]];

        for (let c = 0; c < 64; c++) {
            let p = board[c];
            score += (whiteControl[c] - blackControl[c]) * 2;
            if (p) {
                let val = this.ps[p.shape];
                if (p.shape === "pawn") val += p.color === "white" ? pawnPST[Math.floor(c/8)][c%8] : pawnPST[7-Math.floor(c/8)][c%8];
                let att = p.color === "white" ? blackControl[c] : whiteControl[c];
                let def = p.color === "white" ? whiteControl[c] : blackControl[c];
                if (att > def) val -= (this.ps[p.shape] / 3);
                score += (p.color === "white" ? val : -val);
            }
        }
        return score + (Math.random() * 2);
    }
    */
}
