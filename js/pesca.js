/* Pesca TI — minijuego de pesca en pixel art.
   Michi, el gato de soporte TI, pesca componentes en el río.
   Lienzo lógico de 240 × 135 px escalado sin suavizado. */
(function () {
  "use strict";

  var W = 240, H = 135;
  var dialog = document.getElementById("game");
  if (!dialog) return;
  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  var btn = document.getElementById("game-action");
  var msg = document.getElementById("game-msg");
  var elScore = document.getElementById("game-score");
  var elCount = document.getElementById("game-count");
  var elBest = document.getElementById("game-best");
  var elInv = document.getElementById("game-inv");
  var soundBox = document.getElementById("game-sound");

  /* ---------- Paleta y sprite de Michi (22 × 22) ---------- */
  var PAL = {
    k: "#1b1b2a", g: "#9097a3", G: "#ece9e2", d: "#5d6470", p: "#f4a3b5",
    w: "#ffffff", y: "#ffd23f", b: "#1f5bd1", B: "#163f94", r: "#e63946"
  };
  var CAT = [
    "...kk............kk...",
    "..kgpk..........kpgk..",
    "..kgppkkkkkkkkkkppgk..",
    "..kggggggdgdgdgggggk..",
    "..kgggggggdgdggggggk..",
    "..kggkkkkggggkkkkggk..",
    "..kggkwkkggggkwkkggk..",
    "..kggkyykggggkyykggk..",
    "..kgggkkGGppGGkkgggk..",
    "..kdgGGGGGkkGGGGGgdk..",
    "..kgggGGGkGGkGGGgggk..",
    "...kgggGGGGGGGGgggk...",
    "....kbwwbbbbbbwwbk....",
    "...kbbbwbbbbbbbbbbbk..",
    "...kbbwwwbbbbbbbBbggk.",
    "...kbbrwrbbbbbbBbbGGk.",
    "...kbbwwwbbbbbbBbbk...",
    "...kbbbbbbbbbbbbbbk...",
    "...kBBBBBBBBBBBBBBk...",
    "....kggggk.kggggk.....",
    "....kGGGGk.kGGGGk.....",
    "....kkkkkk.kkkkkk....."
  ];
  var CAT_BLINK = CAT.slice();
  CAT_BLINK[5] = "..kggggggggggggggggk..";
  CAT_BLINK[6] = "..kggkkkkggggkkkkggk..";
  CAT_BLINK[7] = "..kggggggggggggggggk..";

  function spriteCanvas(rows, extra) {
    var c = document.createElement("canvas");
    c.width = 24; c.height = 22;
    var x = c.getContext("2d");
    rows.forEach(function (row, j) {
      for (var i = 0; i < row.length; i++) {
        var col = PAL[row[i]];
        if (col) { x.fillStyle = col; x.fillRect(i + 2, j, 1, 1); }
      }
    });
    if (extra) extra(x);
    return c;
  }
  function catExtras(x) {
    // cola
    x.fillStyle = PAL.k; [[3, 18], [2, 17], [1, 16], [1, 15], [1, 14], [2, 13]].forEach(function (p) { x.fillRect(p[0], p[1], 1, 1); });
    x.fillStyle = PAL.d; [[3, 17], [2, 16], [2, 15], [2, 14]].forEach(function (p) { x.fillRect(p[0], p[1], 1, 1); });
    // diadema con micrófono
    x.fillStyle = "#2a2a35";
    x.fillRect(3, 5, 2, 4);
    x.fillRect(4, 3, 1, 2);
    x.fillStyle = PAL.r; x.fillRect(3, 6, 1, 2);
    x.fillStyle = "#2a2a35";
    x.fillRect(5, 9, 1, 1); x.fillRect(6, 10, 2, 1);
    x.fillStyle = PAL.r; x.fillRect(8, 10, 1, 1);
  }
  var catImg = spriteCanvas(CAT, catExtras);
  var catBlinkImg = spriteCanvas(CAT_BLINK, catExtras);

  /* ---------- Botín ---------- */
  var LOOT = [
    { id: "gpu",   name: "Tarjeta gráfica",            rare: "Legendario", pts: 500, w: 3,  note: "Nadie sabe cómo llegó al río." },
    { id: "cpu",   name: "Procesador de 8 núcleos",    rare: "Épico",      pts: 300, w: 7,  note: "Recién salido del agua y sin pasta térmica." },
    { id: "ssd",   name: "Disco SSD de 1 TB",          rare: "Raro",       pts: 150, w: 10, note: "Ese PC lento de recepción va a volar." },
    { id: "ram",   name: "Memoria RAM DDR4 de 16 GB",  rare: "Común",      pts: 60,  w: 22, note: "Justo lo que pedía contabilidad." },
    { id: "psu",   name: "Fuente de poder de 600 W",   rare: "Común",      pts: 50,  w: 20, note: "Adiós a los reinicios misteriosos." },
    { id: "cable", name: "Cable enredado",             rare: "Basura",     pts: 0,   w: 10, note: "Igual a los que hay debajo de cada escritorio." },
    { id: "lata",  name: "Lata oxidada",               rare: "Basura",     pts: 0,   w: 12, note: "Directo al reciclaje." },
    { id: "bota",  name: "Bota vieja",                 rare: "Basura",     pts: 0,   w: 10, note: "Talla 42. Nadie en la oficina la reclama." },
    { id: "disk",  name: "Disquete rayado",            rare: "Basura",     pts: 0,   w: 6,  note: "Contiene tarea_final_v2_DEFINITIVA.doc" }
  ];
  var RARE_COLOR = { "Legendario": "#ff8c00", "Épico": "#a335ee", "Raro": "#1f5bd1", "Común": "#2e7d32", "Basura": "#6b6b6b" };

  function pick(perfect) {
    var table = LOOT.map(function (l) {
      var w = l.w;
      if (perfect) w *= l.pts >= 150 ? 2.2 : l.pts === 0 ? 0.45 : 1;
      return { l: l, w: w };
    });
    var sum = table.reduce(function (a, b) { return a + b.w; }, 0);
    var r = Math.random() * sum;
    for (var i = 0; i < table.length; i++) { r -= table[i].w; if (r <= 0) return table[i].l; }
    return table[0].l;
  }

  /* Dibujo de cada objeto en una caja de 16 × 12 */
  function drawItem(c, id, ox, oy, s) {
    function R(x, y, w, h, col) { c.fillStyle = col; c.fillRect(ox + x * s, oy + y * s, w * s, h * s); }
    switch (id) {
      case "ram":
        R(0, 2, 16, 7, "#1f7a3a"); R(0, 2, 16, 1, "#2f9a4e");
        for (var i = 0; i < 4; i++) R(1 + i * 4, 3, 3, 4, "#151515");
        for (var j = 0; j < 8; j++) if (j !== 4) R(j * 2, 9, 1, 2, "#e0b33a");
        R(1, 8, 14, 1, "#155c2b");
        break;
      case "cpu":
        R(2, 0, 12, 12, "#2a7d3c");
        R(3, 1, 10, 10, "#c8ccd4"); R(4, 2, 8, 8, "#aeb4bd"); R(5, 3, 6, 1, "#dfe3ea");
        for (var k = 0; k < 6; k++) { R(3 + k * 2, 11, 1, 1, "#e0b33a"); R(2, 1 + k * 2, 1, 1, "#e0b33a"); R(13, 1 + k * 2, 1, 1, "#e0b33a"); }
        R(4, 9, 1, 1, "#e0b33a");
        break;
      case "psu":
        R(1, 1, 13, 11, "#4b515c"); R(2, 2, 11, 9, "#6c7482");
        R(4, 3, 7, 7, "#24272d"); R(7, 4, 1, 5, "#9aa3b2"); R(5, 6, 5, 1, "#9aa3b2"); R(7, 6, 1, 1, "#d0d5de");
        R(14, 7, 2, 1, "#e63946"); R(14, 8, 2, 1, "#ffd23f"); R(14, 9, 2, 1, "#151515");
        break;
      case "ssd":
        R(1, 2, 14, 9, "#2b2f36"); R(1, 2, 14, 1, "#444a54");
        R(2, 5, 12, 3, "#e63946"); R(3, 6, 6, 1, "#ffffff"); R(10, 6, 2, 1, "#ffd23f");
        break;
      case "gpu":
        R(0, 1, 1, 10, "#c0c0c0"); R(1, 2, 15, 8, "#2b2f36"); R(1, 2, 15, 1, "#454b55");
        R(2, 3, 5, 5, "#151515"); R(9, 3, 5, 5, "#151515");
        R(4, 5, 1, 1, "#9aa3b2"); R(11, 5, 1, 1, "#9aa3b2"); R(3, 4, 1, 1, "#3a3f47"); R(10, 4, 1, 1, "#3a3f47");
        R(1, 9, 15, 1, "#e63946"); R(4, 10, 9, 1, "#e0b33a");
        break;
      case "lata":
        R(5, 1, 6, 1, "#c0c0c0"); R(5, 2, 6, 10, "#c0392b"); R(5, 6, 6, 2, "#f1c40f");
        R(8, 4, 2, 2, "#8e2a20"); R(5, 11, 6, 1, "#7f2219"); R(10, 3, 1, 8, "#e05a4a");
        break;
      case "bota":
        R(4, 1, 5, 8, "#6b4423"); R(4, 1, 5, 1, "#8a5a30"); R(4, 8, 10, 3, "#6b4423");
        R(4, 11, 10, 1, "#2b1a0e"); R(10, 9, 1, 1, "#2b1a0e"); R(6, 3, 1, 4, "#4e3018");
        break;
      case "cable":
        [[2, 6], [3, 5], [4, 4], [5, 4], [6, 5], [6, 6], [5, 7], [4, 7], [3, 6], [7, 7], [8, 8], [9, 8], [10, 7], [10, 6], [9, 5], [8, 5], [7, 6],
         [11, 8], [12, 9], [13, 9], [1, 7], [0, 8]].forEach(function (p) { R(p[0], p[1], 1, 1, "#151515"); });
        R(13, 8, 3, 3, "#c0c0c0"); R(14, 9, 1, 1, "#e0b33a");
        break;
      case "disk":
        R(2, 0, 12, 12, "#1f3a8a"); R(5, 0, 6, 4, "#c0c0c0"); R(8, 1, 1, 2, "#6b6b6b");
        R(4, 6, 8, 6, "#ffffff"); R(5, 7, 6, 1, "#e63946"); R(5, 9, 5, 1, "#9aa3b2"); R(3, 3, 1, 1, "#e63946");
        break;
    }
  }

  /* ---------- Fondo estático ---------- */
  var bg = document.createElement("canvas");
  bg.width = W; bg.height = H;
  (function paintBg() {
    var b = bg.getContext("2d");
    function R(x, y, w, h, c) { b.fillStyle = c; b.fillRect(x, y, w, h); }
    var sky = ["#3f8fd2", "#58a3dc", "#74b7e6", "#93caef", "#b4dcf5"];
    sky.forEach(function (c, i) { R(0, i * 12, W, 12, c); });
    // tramado entre bandas
    for (var i = 1; i < sky.length; i++) for (var x = 0; x < W; x += 2) R(x + (i % 2), i * 12 - 1, 1, 1, sky[i]);
    // sol
    R(196, 12, 12, 10, "#ffe066"); R(198, 10, 8, 14, "#ffe066"); R(199, 13, 6, 6, "#fff3b0");
    // cerros lejanos (piedemonte llanero)
    for (var cx = 0; cx < W; cx++) {
      var h1 = Math.round(44 + 5 * Math.sin(cx / 19) + 3 * Math.sin(cx / 7));
      R(cx, h1, 1, 62 - h1, "#5b8fb0");
      var h2 = Math.round(54 + 3 * Math.sin(cx / 11 + 2) + 2 * Math.sin(cx / 5));
      R(cx, h2, 1, 64 - h2, "#3f7a4c");
    }
    // palmas de moriche
    [[150, 38], [178, 42], [222, 36], [110, 44]].forEach(function (p) {
      var x0 = p[0], top = p[1];
      R(x0, top, 1, 64 - top, "#5a4022");
      R(x0 - 5, top, 5, 1, "#2f6b35"); R(x0 + 1, top, 5, 1, "#2f6b35");
      R(x0 - 4, top - 2, 3, 1, "#2f6b35"); R(x0 + 2, top - 2, 3, 1, "#2f6b35");
      R(x0 - 6, top + 1, 2, 2, "#2f6b35"); R(x0 + 5, top + 1, 2, 2, "#2f6b35");
      R(x0 - 1, top - 3, 3, 3, "#3d8a44");
    });
    // orilla lejana
    R(0, 62, W, 3, "#2f6b35"); R(0, 65, W, 1, "#244f2b");
    // río
    R(0, 66, W, H - 66, "#2f6fb0");
    R(0, 92, W, 20, "#2a64a1"); R(0, 112, W, H - 112, "#235690");
    for (var x2 = 0; x2 < W; x2 += 2) { R(x2, 91, 1, 1, "#2a64a1"); R(x2 + 1, 111, 1, 1, "#235690"); }
    // reflejo del sol
    for (var r = 0; r < 6; r++) R(194 + (r % 2) * 3, 68 + r * 3, 10 - (r % 3) * 2, 1, "#8cc8f0");
    // orilla cercana con pasto y tierra
    for (var y = 74; y < H; y++) {
      var edge = Math.round(72 + (y - 74) * 0.45);
      R(0, y, edge, 1, y < 78 ? "#5fae3e" : "#8a5a2b");
      R(edge, y, 1, 1, y < 78 ? "#4c9032" : "#6e4520");
    }
    R(0, 73, 72, 1, "#7cc95a");
    for (var s = 0; s < 40; s++) {
      var sx = (s * 53) % 80, sy = 80 + (s * 29) % 52;
      if (sx < 70 + (sy - 74) * 0.45 - 2) R(sx, sy, 2, 1, s % 3 ? "#7a4e25" : "#a06a35");
    }
    // piedra donde se sienta Michi
    R(12, 69, 50, 7, "#8b8f98"); R(15, 67, 44, 2, "#a3a8b1"); R(12, 75, 50, 1, "#5d616a"); R(20, 68, 12, 1, "#c3c7cf"); R(44, 72, 6, 1, "#73777f");
    // juncos
    [[64, 66], [67, 64], [70, 67], [60, 68]].forEach(function (p) { R(p[0], p[1], 1, 74 - p[1], "#3f7a2c"); R(p[0], p[1] - 2, 1, 2, "#6b4a2a"); });
  })();

  /* ---------- Estado ---------- */
  // Michi se dibuja al doble (48 × 44) sentado sobre la piedra
  var CAT_X = 12, CAT_Y = 27, CAT_S = 2;
  var ROD_BASE = { x: CAT_X + 43, y: CAT_Y + 29 };
  var ROD_TIP = { x: CAT_X + 84, y: CAT_Y - 14 };

  var st = {
    mode: "idle", t0: 0, target: { x: 160, y: 96 }, biteAt: 0, biteStart: 0,
    nibbles: [], catchItem: null, failText: "", ripples: []
  };
  var stats = { score: 0, count: 0, best: 0, inv: {} };
  try { stats.best = +localStorage.getItem("pescati-best") || 0; } catch (e) {}

  var BITE_WINDOW = 800;

  /* ---------- Sonido ---------- */
  var actx = null;
  function beep(freq, dur, type, when) {
    if (!soundBox || !soundBox.checked) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime + (when || 0);
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "square"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur);
    } catch (e) {}
  }

  /* ---------- Lógica ---------- */
  function say(text) { msg.textContent = text; }

  function cast() {
    var now = performance.now();
    st.mode = "cast"; st.t0 = now; st.catchItem = null;
    st.target = { x: 120 + Math.random() * 95, y: 84 + Math.random() * 34 };
    btn.textContent = "¡Tirar!";
    say("Anzuelo lanzado. Espera a que el corcho se hunda y tira justo a tiempo.");
    beep(520, 0.08); beep(380, 0.1, "square", 0.08);
  }

  function startWait(now) {
    st.mode = "wait";
    st.biteAt = now + 1600 + Math.random() * 3800;
    st.nibbles = [];
    var n = Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) st.nibbles.push(now + 700 + Math.random() * (st.biteAt - now - 1200));
    st.nibbles.sort();
  }

  function fail(kind) {
    st.mode = "fail"; st.t0 = performance.now();
    btn.textContent = "Lanzar otra vez";
    say(kind === "early" ? "¡Muy pronto! Espantaste al pez. Espera a que el corcho se hunda del todo." : "Se escapó… El corcho estuvo bajo el agua y no tiraste a tiempo.");
    beep(200, 0.18, "sawtooth");
  }

  function success(now) {
    var reaction = now - st.biteStart;
    var perfect = reaction < 280;
    var item = pick(perfect);
    st.catchItem = item; st.mode = "reel"; st.t0 = now;
    stats.count++; stats.score += item.pts;
    stats.inv[item.id] = (stats.inv[item.id] || 0) + 1;
    if (stats.score > stats.best) { stats.best = stats.score; try { localStorage.setItem("pescati-best", String(stats.best)); } catch (e) {} }
    var lead = perfect ? "¡Tirón perfecto (" + Math.round(reaction) + " ms)! " : "Tiraste en " + Math.round(reaction) + " ms. ";
    say(lead + "Michi sacó: " + item.name + " · " + item.rare + (item.pts ? " · +" + item.pts + " puntos. " : ". ") + item.note);
    btn.textContent = "Lanzar otra vez";
    if (item.pts >= 150) { beep(660, 0.1); beep(880, 0.1, "square", 0.1); beep(1320, 0.18, "square", 0.2); }
    else if (item.pts > 0) { beep(660, 0.1); beep(880, 0.14, "square", 0.1); }
    else beep(260, 0.2, "triangle");
    renderStats();
  }

  function action() {
    var now = performance.now();
    if (st.mode === "idle" || st.mode === "show" || st.mode === "fail") cast();
    else if (st.mode === "wait") fail("early");
    else if (st.mode === "bite") success(now);
  }

  function update(now) {
    if (st.mode === "cast" && now - st.t0 >= 650) startWait(now);
    if (st.mode === "wait") {
      if (st.nibbles.length && now >= st.nibbles[0]) {
        st.ripples.push({ x: st.target.x, y: st.target.y + 3, t: now, big: false });
        st.nibbles.shift(); beep(900, 0.03, "triangle");
      }
      if (now >= st.biteAt) {
        st.mode = "bite"; st.biteStart = now;
        st.ripples.push({ x: st.target.x, y: st.target.y + 3, t: now, big: true });
        say("¡Picó! ¡Tira ya!");
        beep(1040, 0.06); beep(1040, 0.06, "square", 0.09);
      }
    }
    if (st.mode === "bite" && now - st.biteStart > BITE_WINDOW) fail("late");
    if (st.mode === "reel" && now - st.t0 >= 600) st.mode = "show";
    st.ripples = st.ripples.filter(function (r) { return now - r.t < 900; });
  }

  /* ---------- Dibujo ---------- */
  function px(x, y, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  function line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (var guard = 0; guard < 600; guard++) {
      px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function ring(cx, cy, rx, ry, c) {
    for (var a = 0; a < Math.PI * 2; a += 0.12) px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, c);
  }

  function bobberPos(now) {
    var tip = rodTip(now);
    if (st.mode === "idle") return { x: tip.x + 1, y: tip.y + 10, hang: true };
    if (st.mode === "cast") {
      var p = Math.min(1, (now - st.t0) / 650);
      return { x: tip.x + (st.target.x - tip.x) * p, y: tip.y + (st.target.y - tip.y) * p - Math.sin(p * Math.PI) * 30 };
    }
    if (st.mode === "reel") {
      var q = Math.min(1, (now - st.t0) / 600);
      return { x: st.target.x + (CAT_X + 30 - st.target.x) * q, y: st.target.y + (CAT_Y - 6 - st.target.y) * q - Math.sin(q * Math.PI) * 26 };
    }
    var y = st.target.y + Math.round(Math.sin(now / 260));
    if (st.mode === "wait" && st.ripples.some(function (r) { return !r.big && now - r.t < 160; })) y += 2;
    return { x: st.target.x, y: y };
  }
  function rodTip(now) {
    if (st.mode === "bite") return { x: ROD_TIP.x - 3, y: ROD_TIP.y + 6 + Math.round(Math.sin(now / 40)) };
    return ROD_TIP;
  }

  function draw(now) {
    ctx.drawImage(bg, 0, 0);
    // nubes
    var drift = (now / 120) % (W + 60);
    [[0, 10], [90, 20], [170, 8]].forEach(function (c, i) {
      var x = ((c[0] + drift * (0.6 + i * 0.2)) % (W + 60)) - 40;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(x, c[1], 22, 4); ctx.fillRect(x + 4, c[1] - 3, 12, 3); ctx.fillStyle = "#e4f1fb"; ctx.fillRect(x, c[1] + 4, 22, 1);
    });
    // destellos del agua
    for (var i = 0; i < 26; i++) {
      var wx = ((i * 41 + now / (60 + (i % 5) * 18)) % (W + 20)) - 10;
      var wy = 70 + (i * 23) % 62;
      if (wx > 70 + (wy - 74) * 0.45 + 3) { ctx.fillStyle = i % 3 ? "#5c9bd6" : "#8cc8f0"; ctx.fillRect(Math.round(wx), wy, 4 + (i % 3), 1); }
    }
    // ondas
    st.ripples.forEach(function (r) {
      var age = (now - r.t) / 900;
      var rad = (r.big ? 4 : 2) + age * (r.big ? 12 : 6);
      ring(r.x, r.y, rad, rad * 0.35, age < 0.5 ? "#cfe8fb" : "#8cc8f0");
    });

    // caña
    var tip = rodTip(now);
    line(ROD_BASE.x, ROD_BASE.y, tip.x, tip.y, "#6b4423");
    line(ROD_BASE.x + 1, ROD_BASE.y, tip.x + 1, tip.y, "#8a5a30");
    px(ROD_BASE.x + 3, ROD_BASE.y - 3, "#c0c0c0"); px(ROD_BASE.x + 4, ROD_BASE.y - 3, "#c0c0c0");

    // sedal y corcho
    var b = bobberPos(now);
    if (st.mode !== "show" && st.mode !== "fail") line(tip.x, tip.y, b.x, b.y, "#e9eef4");
    if (st.mode === "reel" && st.catchItem) {
      drawItem(ctx, st.catchItem.id, Math.round(b.x - 8), Math.round(b.y), 1);
    } else if (st.mode === "bite") {
      ctx.fillStyle = "#e63946"; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) + 3, 3, 1);
    } else if (st.mode !== "show" && st.mode !== "fail") {
      var bx = Math.round(b.x) - 1, by = Math.round(b.y);
      ctx.fillStyle = "#e63946"; ctx.fillRect(bx, by, 3, 2);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(bx, by + 2, 3, 2);
      ctx.fillStyle = "#1b1b2a"; ctx.fillRect(bx + 1, by - 1, 1, 1);
    }

    // Michi (parpadea cada pocos segundos)
    var blink = (now % 3800) < 130;
    var bounce = st.mode === "show" && st.catchItem && st.catchItem.pts > 0 ? Math.round(Math.abs(Math.sin(now / 120)) * -2) : 0;
    ctx.drawImage(blink ? catBlinkImg : catImg, CAT_X, CAT_Y + bounce, 24 * CAT_S, 22 * CAT_S);

    // globo de alerta
    if (st.mode === "bite") {
      var bx2 = CAT_X + 22, by2 = CAT_Y - 15;
      ctx.fillStyle = "#1b1b2a"; ctx.fillRect(bx2 - 1, by2 - 1, 9, 12);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(bx2, by2, 7, 10); ctx.fillRect(bx2 + 2, by2 + 10, 2, 2);
      ctx.fillStyle = "#e63946"; ctx.fillRect(bx2 + 3, by2 + 2, 1, 4); ctx.fillRect(bx2 + 3, by2 + 7, 1, 1);
    }

    // tarjeta del objeto capturado
    if (st.mode === "show" && st.catchItem) {
      var px0 = 104, py0 = 18, pw = 92, ph = 72;
      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(px0, py0, pw, ph);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(px0, py0, pw - 1, ph - 1);
      ctx.fillStyle = "#808080"; ctx.fillRect(px0 + 1, py0 + 1, pw - 2, ph - 2);
      ctx.fillStyle = "#c0c0c0"; ctx.fillRect(px0 + 1, py0 + 1, pw - 3, ph - 3);
      ctx.fillStyle = "#000080"; ctx.fillRect(px0 + 3, py0 + 3, pw - 7, 7);
      ctx.fillStyle = RARE_COLOR[st.catchItem.rare]; ctx.fillRect(px0 + 5, py0 + 5, 3, 3);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(px0 + 10, py0 + 6, 30, 1);
      ctx.fillStyle = "#e9eef4"; ctx.fillRect(px0 + 6, py0 + 14, pw - 13, ph - 22);
      drawItem(ctx, st.catchItem.id, px0 + 14, py0 + 21, 4);
      ctx.fillStyle = RARE_COLOR[st.catchItem.rare]; ctx.fillRect(px0 + 6, py0 + ph - 7, pw - 13, 2);
    }
    if (st.mode === "fail") {
      ctx.fillStyle = "#e9eef4"; ctx.fillRect(st.target.x - 3, st.target.y + 4, 1, 1); ctx.fillRect(st.target.x + 3, st.target.y + 3, 1, 1);
    }
  }

  /* ---------- Bucle ---------- */
  var raf = 0;
  function loop(now) {
    update(now);
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  /* ---------- Panel ---------- */
  function renderStats() {
    elScore.textContent = stats.score;
    elCount.textContent = stats.count;
    elBest.textContent = stats.best;
    elInv.innerHTML = "";
    var ids = LOOT.filter(function (l) { return stats.inv[l.id]; });
    if (!ids.length) {
      var empty = document.createElement("li");
      empty.className = "inv-empty";
      empty.textContent = "Todavía no has pescado nada.";
      elInv.appendChild(empty);
      return;
    }
    ids.forEach(function (l) {
      var li = document.createElement("li");
      var c = document.createElement("canvas");
      c.width = 32; c.height = 24;
      var cx = c.getContext("2d"); cx.imageSmoothingEnabled = false;
      drawItem(cx, l.id, 0, 0, 2);
      c.setAttribute("aria-hidden", "true");
      var name = document.createElement("span");
      name.textContent = l.name;
      var n = document.createElement("b");
      n.textContent = "× " + stats.inv[l.id];
      n.style.color = RARE_COLOR[l.rare];
      li.appendChild(c); li.appendChild(name); li.appendChild(n);
      elInv.appendChild(li);
    });
  }

  /* ---------- Controles ---------- */
  btn.addEventListener("click", action);
  canvas.addEventListener("pointerdown", function (e) { e.preventDefault(); action(); });
  dialog.addEventListener("keydown", function (e) {
    if ((e.key === " " || e.key === "Enter") && e.target !== btn && e.target.tagName !== "INPUT" && !e.target.closest(".win-ctrl")) {
      e.preventDefault(); action();
    }
  });

  function open() {
    if (dialog.open) return;
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
    st.mode = "idle"; btn.textContent = "Lanzar";
    say("Pulsa Lanzar o la barra espaciadora. Cuando el corcho se hunda y aparezca el ¡!, tira lo más rápido que puedas.");
    renderStats();
    btn.focus();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function close() {
    cancelAnimationFrame(raf);
    if (dialog.open) dialog.close();
  }
  dialog.addEventListener("close", function () { cancelAnimationFrame(raf); });
  document.getElementById("game-close").addEventListener("click", close);
  document.querySelectorAll("[data-game]").forEach(function (el) { el.addEventListener("click", open); });

  // primer cuadro para que el lienzo no quede vacío
  draw(performance.now());
  renderStats();

  window.PescaTI = { open: open };
  if (location.hash === "#jugar") open();
})();
