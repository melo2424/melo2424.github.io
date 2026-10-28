(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canDrag = window.matchMedia("(min-width: 1181px) and (pointer: fine)");

  /* ---------- Gestor de ventanas ---------- */
  var wins = Array.prototype.slice.call(document.querySelectorAll(".windows .win"));
  var taskList = document.getElementById("task-list");
  var z = 10;

  function byId(id) { return document.querySelector('.win[data-win="' + id + '"]'); }
  function titleOf(w) { return w.querySelector(".win-title").textContent; }

  function focusWin(w) {
    wins.forEach(function (x) { x.classList.toggle("active", x === w); });
    w.style.zIndex = ++z;
    renderTasks();
  }

  function openWin(id, opts) {
    var w = byId(id);
    if (!w) return;
    w.hidden = false;
    w.dataset.state = "open";
    focusWin(w);
    if (!opts || opts.scroll !== false) {
      if (!w.classList.contains("max")) {
        w.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }
      w.focus({ preventScroll: true });
    }
  }

  function minimize(w) {
    w.hidden = true;
    w.dataset.state = "min";
    w.classList.remove("active");
    renderTasks();
  }

  function closeWin(w) {
    w.hidden = true;
    w.dataset.state = "closed";
    w.classList.remove("active", "max");
    w.style.transform = "";
    w.dataset.tx = w.dataset.ty = "0";
    renderTasks();
    w.dispatchEvent(new CustomEvent("win-close"));
  }

  function toggleMax(w) {
    w.classList.toggle("max");
    focusWin(w);
  }

  function renderTasks() {
    taskList.innerHTML = "";
    wins.forEach(function (w) {
      if (w.dataset.state === "closed") return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "task";
      b.setAttribute("aria-pressed", String(w.classList.contains("active") && !w.hidden));
      b.setAttribute("aria-label", titleOf(w));
      b.innerHTML = '<svg aria-hidden="true"><use href="#' + w.dataset.icon + '"/></svg>';
      var s = document.createElement("span");
      s.textContent = titleOf(w);
      b.appendChild(s);
      b.addEventListener("click", function () {
        if (!w.hidden && w.classList.contains("active") && canDrag.matches) minimize(w);
        else openWin(w.dataset.win);
      });
      taskList.appendChild(b);
    });
  }

  wins.forEach(function (w) {
    w.dataset.state = w.hidden ? "closed" : "open";
    w.addEventListener("pointerdown", function () { if (!w.classList.contains("active")) focusWin(w); });
    w.querySelectorAll(".win-ctrl button").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var act = b.dataset.act;
        if (act === "min") minimize(w);
        else if (act === "max") toggleMax(w);
        else if (act === "close") closeWin(w);
      });
    });

    // Arrastrar la ventana desde la barra de título (solo escritorio con ratón)
    var bar = w.querySelector(".win-bar");
    bar.addEventListener("pointerdown", function (e) {
      if (!canDrag.matches || e.button !== 0 || e.target.closest("button") || w.classList.contains("max")) return;
      var sx = e.clientX, sy = e.clientY;
      var tx = +(w.dataset.tx || 0), ty = +(w.dataset.ty || 0);
      bar.setPointerCapture(e.pointerId);
      w.classList.add("is-dragging");
      function move(ev) {
        var nx = tx + ev.clientX - sx, ny = ty + ev.clientY - sy;
        w.style.transform = "translate(" + nx + "px," + ny + "px)";
        w.dataset.nx = nx; w.dataset.ny = ny;
      }
      function up() {
        w.classList.remove("is-dragging");
        if (w.dataset.nx !== undefined) { w.dataset.tx = w.dataset.nx; w.dataset.ty = w.dataset.ny; }
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", up);
        bar.removeEventListener("pointercancel", up);
      }
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up);
      bar.addEventListener("pointercancel", up);
    });
    bar.addEventListener("dblclick", function (e) {
      if (canDrag.matches && !e.target.closest("button")) toggleMax(w);
    });
  });

  // Al pasar a pantalla pequeña, las ventanas vuelven a su sitio
  canDrag.addEventListener && canDrag.addEventListener("change", function () {
    wins.forEach(function (w) { w.style.transform = ""; w.dataset.tx = w.dataset.ty = "0"; w.classList.remove("max"); });
  });

  document.querySelectorAll("[data-open]").forEach(function (el) {
    el.addEventListener("click", function () {
      closeStart();
      openWin(el.dataset.open);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var max = document.querySelector(".win.max");
    // En DOOM, Esc abre el menú del juego: no debe restaurar la ventana
    if (max && max.dataset.win !== "doom" && document.getElementById("start-menu").hidden) max.classList.remove("max");
  });

  renderTasks();
  if (location.hash === "#doom") openWin("doom");

  /* ---------- Pestañas ---------- */
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!n) return;
        var next = tabs[(i + n + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
  });

  /* ---------- Terminal ---------- */
  var out = document.getElementById("term-out");
  var form = document.getElementById("term-form");
  var input = document.getElementById("term-input");
  var history = [], hIndex = 0;

  var COMMANDS = {
    ayuda: function () {
      return [
        "Comandos disponibles:",
        "  jugar         Abre el minijuego Pesca TI",
        "  doom          Abre DOOM (shareware, 1993) en MS-DOS",
        "  perfil        Quién soy",
        "  stack         Tecnologías con las que trabajo",
        "  experiencia   Dónde trabajo",
        "  proyectos     Lo que construyo",
        "  certificados  Credenciales destacadas",
        "  formacion     Estudios",
        "  contacto      Cómo escribirme",
        "  linkedin      Abre mi perfil de LinkedIn",
        "  fecha         Fecha y hora en Villavicencio",
        "  cls           Limpia la pantalla"
      ].join("\n");
    },
    perfil: function () {
      return "Andrés Camilo Rodríguez Melo\nTecnólogo en Análisis y Desarrollo de Software (SENA).\nSoporte TI y programación web con JavaScript y Node.js.\nVillavicencio, Meta, Colombia.";
    },
    stack: function () {
      return "  Lenguajes   JavaScript, HTML, CSS, SQL\n  Backend     Node.js, Express, MongoDB\n  Frontend    React, Bootstrap\n  DevOps      Git, Docker, Kubernetes\n  Soporte     Windows, Linux, redes LAN y WiFi, mesa de ayuda";
    },
    experiencia: function () {
      openWin("exp", { scroll: false });
      return "DROI S.A.S.  Soporte TI y desarrollo de software  (actualidad)\nAbrí Experiencia.doc con el detalle.";
    },
    proyectos: function () {
      return "  - Aplicaciones web full stack con Node.js, Express y MongoDB.\n  - APIs REST y microservicios desplegados en contenedores.\n  - Interfaces con React y Bootstrap.\n  - Scripts para automatizar tareas de soporte.\nEste sitio también lo hice yo: HTML, CSS y JavaScript sin librerías.";
    },
    certificados: function () {
      openWin("certs", { scroll: false });
      return "99 insignias verificadas en Credly. Abrí la carpeta Certificados.";
    },
    formacion: function () {
      return "  2024-2026  Tecnólogo en Análisis y Desarrollo de Software, SENA\n  2024-hoy   Comunicación Visual, Uniminuto\n  2018       Bachiller Académico, Instituto Mayor del Meta";
    },
    contacto: function () {
      return "  Correo    andresrodrimelo@gmail.com\n  LinkedIn  linkedin.com/in/andresmelodev\n  Credly    credly.com/users/andres.melo.dev";
    },
    linkedin: function () {
      window.open("https://www.linkedin.com/in/andresmelodev/", "_blank", "noopener");
      return "Abriendo LinkedIn…";
    },
    fecha: function () {
      return new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date());
    },
    jugar: function () {
      if (window.PescaTI) window.PescaTI.open();
      return "Iniciando PESCA TI.EXE… Michi ya tiene la caña lista.";
    },
    doom: function () {
      openWin("doom");
      return "Abriendo DOOM.EXE… Pulsa Iniciar DOOM para arrancar el emulador.";
    },
    hola: function () { return "¡Hola! Escribe ayuda para empezar."; },
    ver: function () { return "Andrés OS [Versión 26.10]"; }
  };
  COMMANDS.help = COMMANDS.ayuda;
  COMMANDS.pescar = COMMANDS.jugar;
  COMMANDS["formación"] = COMMANDS.formacion;

  function print(text) {
    out.appendChild(document.createTextNode(text + "\n"));
    out.scrollTop = out.scrollHeight;
  }

  function run(raw) {
    var cmd = raw.trim().toLowerCase();
    print("\nC:\\ANDRES> " + raw);
    if (!cmd) return;
    history.push(raw);
    hIndex = history.length;
    if (cmd === "cls" || cmd === "clear") { out.textContent = ""; return; }
    var fn = COMMANDS[cmd];
    print(fn ? fn() : "'" + raw.trim() + "' no se reconoce como un comando interno o externo.\nEscribe ayuda para ver la lista.");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    run(input.value);
    input.value = "";
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp" && hIndex > 0) { hIndex--; input.value = history[hIndex]; e.preventDefault(); }
    if (e.key === "ArrowDown") { hIndex = Math.min(history.length, hIndex + 1); input.value = history[hIndex] || ""; e.preventDefault(); }
  });
  document.getElementById("term").addEventListener("click", function () {
    if (!window.getSelection().toString()) input.focus({ preventScroll: true });
  });
  document.querySelectorAll("[data-cmd]").forEach(function (b) {
    b.addEventListener("click", function () { run(b.dataset.cmd); });
  });

  /* ---------- Certificados ---------- */
  var AREAS = {
    todas: "Todos",
    desarrollo: "Desarrollo",
    soporte: "Soporte y redes",
    seguridad: "Ciberseguridad",
    otras: "Datos y gestión"
  };
  var CERTS = [
    ["desarrollo", "IBM JavaScript Backend Developer", "IBM · Coursera", "2026-08"],
    ["desarrollo", "IBM Back-End Development", "IBM · Coursera", "2025-04"],
    ["desarrollo", "Cloud DevOps", "Intel", "2025-03"],
    ["desarrollo", "IBM Full Stack Software Developer (V5)", "IBM · Coursera", "2025-01"],
    ["desarrollo", "Node and Express Essentials", "IBM · Coursera", "2025-01"],
    ["desarrollo", "Meta Full-Stack Engineer", "Meta · Coursera", "2024-11"],
    ["desarrollo", "Container & Kubernetes Essentials", "IBM · Coursera", "2024-11"],
    ["desarrollo", "Application Development using Microservices and Serverless", "IBM · Coursera", "2024-11"],
    ["desarrollo", "Generative AI Essentials for Software Developers", "IBM · Coursera", "2024-11"],
    ["soporte", "IT Customer Support Basics", "Cisco", "2025-11"],
    ["soporte", "Network Support and Security", "Cisco", "2025-11"],
    ["soporte", "Computer Hardware Basics", "Cisco", "2025-11"],
    ["soporte", "Google IT Support", "Google", "2024-10"],
    ["soporte", "Dispositivos de red y configuración inicial", "Cisco", "2024-10"],
    ["soporte", "Networking Basics", "Cisco", "2024-09"],
    ["soporte", "Operating Systems Basics", "Cisco", "2024-09"],
    ["seguridad", "Fortinet Certified Associate Cybersecurity", "Fortinet", "2026-03"],
    ["seguridad", "FortiGate 7.6 Operator", "Fortinet", "2026-03"],
    ["seguridad", "NSE 3 Certified in Cybersecurity", "Fortinet", "2026-03"],
    ["seguridad", "IBM Cybersecurity Analyst (V2)", "IBM · Coursera", "2025-04"],
    ["seguridad", "Cloud Security", "Intel", "2025-04"],
    ["seguridad", "Ethical Hacker", "Cisco", "2025-03"],
    ["seguridad", "Palo Alto Networks Cybersecurity", "Palo Alto Networks", "2024-11"],
    ["seguridad", "Endpoint Security", "Cisco", "2024-10"],
    ["seguridad", "Ciberseguridad de Google", "Google", "2024-09"],
    ["otras", "Project Management Fundamentals", "IBM SkillsBuild", "2026-04"],
    ["otras", "Introduction to Modern AI", "Cisco", "2025-11"],
    ["otras", "Google Data Analytics", "Google · Coursera", "2024-11"],
    ["otras", "Adobe Content Creator", "Adobe · Coursera", "2025-03"]
  ];
  var monthFmt = new Intl.DateTimeFormat("es-CO", { month: "short", year: "numeric", timeZone: "UTC" });
  function fmt(ym) {
    var p = ym.split("-");
    return monthFmt.format(new Date(Date.UTC(+p[0], +p[1] - 1, 1))).replace(".", "").replace(" de ", " ");
  }

  var tree = document.getElementById("cert-tree");
  var rowsEl = document.getElementById("cert-rows");
  var pathEl = document.getElementById("cert-path");
  var countEl = document.getElementById("cert-count");
  var area = "todas";

  Object.keys(AREAS).forEach(function (key) {
    var n = key === "todas" ? CERTS.length : CERTS.filter(function (c) { return c[0] === key; }).length;
    var b = document.createElement("button");
    b.type = "button";
    b.dataset.area = key;
    b.innerHTML = '<svg aria-hidden="true"><use href="#i-folder"/></svg>';
    var l = document.createElement("span"); l.className = "lbl"; l.textContent = AREAS[key];
    var c = document.createElement("span"); c.className = "n"; c.textContent = n;
    b.appendChild(l); b.appendChild(c);
    b.addEventListener("click", function () { area = key; renderCerts(); });
    tree.appendChild(b);
  });

  function renderCerts() {
    var rows = CERTS
      .filter(function (c) { return area === "todas" || c[0] === area; })
      .sort(function (a, b) { return a[3] < b[3] ? 1 : a[3] > b[3] ? -1 : 0; });
    rowsEl.innerHTML = "";
    rows.forEach(function (c) {
      var tr = document.createElement("tr");
      var name = document.createElement("td");
      name.innerHTML = '<svg aria-hidden="true"><use href="#i-cert"/></svg>';
      var t = document.createElement("span"); t.textContent = c[1]; name.appendChild(t);
      var issuer = document.createElement("td"); issuer.textContent = c[2];
      var date = document.createElement("td"); date.textContent = fmt(c[3]);
      tr.appendChild(name); tr.appendChild(issuer); tr.appendChild(date);
      rowsEl.appendChild(tr);
    });
    pathEl.textContent = "C:\\Certificados" + (area === "todas" ? "" : "\\" + AREAS[area]);
    countEl.textContent = rows.length + " objetos destacados de 99";
    Array.prototype.forEach.call(tree.children, function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.area === area));
    });
  }
  renderCerts();

  /* ---------- Correo ---------- */
  var EMAIL = "andresrodrimelo@gmail.com";
  document.getElementById("mail-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var subject = document.getElementById("m-subject").value;
    var body = document.getElementById("m-body").value;
    window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  });
  var copyBtn = document.getElementById("copy-mail");
  copyBtn.addEventListener("click", function () {
    var field = document.getElementById("m-to");
    function done() {
      copyBtn.textContent = "Copiado";
      setTimeout(function () { copyBtn.textContent = "Copiar"; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(EMAIL).then(done, function () { field.select(); });
    } else {
      field.select();
    }
  });

  /* ---------- Visor de imágenes ---------- */
  var viewer = document.getElementById("viewer");
  var vImg = document.getElementById("viewer-img");
  document.querySelectorAll(".thumb").forEach(function (t) {
    t.addEventListener("click", function () {
      var img = t.querySelector("img");
      vImg.src = t.dataset.full;
      vImg.alt = img.alt;
      document.getElementById("t-viewer").textContent = t.querySelector("span").textContent + " - Visor de imágenes";
      document.getElementById("viewer-caption").textContent = t.dataset.caption;
      document.getElementById("viewer-credit").textContent = t.dataset.credit;
      if (viewer.showModal) viewer.showModal(); else window.open(t.dataset.full, "_blank");
    });
  });
  document.getElementById("viewer-close").addEventListener("click", function () { viewer.close(); });
  viewer.addEventListener("click", function (e) { if (e.target === viewer) viewer.close(); });

  /* ---------- Menú Inicio ---------- */
  var startBtn = document.getElementById("start-btn");
  var startMenu = document.getElementById("start-menu");
  function openStart() {
    startMenu.hidden = false;
    startBtn.setAttribute("aria-expanded", "true");
    var first = startMenu.querySelector("button");
    if (first) first.focus();
  }
  function closeStart() {
    if (startMenu.hidden) return;
    startMenu.hidden = true;
    startBtn.setAttribute("aria-expanded", "false");
  }
  startBtn.addEventListener("click", function () { startMenu.hidden ? openStart() : closeStart(); });
  startMenu.querySelectorAll("[data-game]").forEach(function (b) { b.addEventListener("click", closeStart); });
  document.addEventListener("pointerdown", function (e) {
    if (!startMenu.hidden && !startMenu.contains(e.target) && !startBtn.contains(e.target)) closeStart();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !startMenu.hidden) { closeStart(); startBtn.focus(); }
  });
  startMenu.addEventListener("keydown", function (e) {
    var items = Array.prototype.slice.call(startMenu.querySelectorAll("button"));
    var i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { items[(i + 1) % items.length].focus(); e.preventDefault(); }
    if (e.key === "ArrowUp") { items[(i - 1 + items.length) % items.length].focus(); e.preventDefault(); }
  });

  /* ---------- Apagar ---------- */
  var shutdown = document.getElementById("shutdown");
  document.getElementById("shutdown-btn").addEventListener("click", function () {
    closeStart();
    shutdown.hidden = false;
    document.getElementById("boot-btn").focus();
  });
  document.getElementById("boot-btn").addEventListener("click", function () {
    shutdown.hidden = true;
    startBtn.focus();
  });

  /* ---------- Reloj ---------- */
  var clock = document.getElementById("clock");
  var clockFmt = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
  function tick() {
    var now = new Date();
    clock.textContent = clockFmt.format(now);
    clock.setAttribute("datetime", now.toISOString());
  }
  tick();
  setInterval(tick, 15000);
})();
