/* DOOM shareware v1.9 en js-dos (DOSBox compilado a WebAssembly).
   El emulador vive en doom.html dentro de un iframe: sus estilos globales no tocan el escritorio
   y quitar el iframe lo apaga del todo. Nada se descarga hasta pulsar "Iniciar DOOM". */
(function () {
  "use strict";

  var win = document.getElementById("win-doom");
  if (!win) return;
  var screen = document.getElementById("doom-screen");
  var splash = document.getElementById("doom-splash");
  var startBtn = document.getElementById("doom-start");
  var fullBtn = document.getElementById("doom-full");
  var stopBtn = document.getElementById("doom-stop");
  var status = document.getElementById("doom-status");

  var frame = null;

  function say(t) { status.textContent = t; }

  function start() {
    if (frame) return;
    // Abierto con doble clic (file://), el navegador bloquea la descarga del juego
    if (location.protocol === "file:") {
      say("DOOM necesita la página publicada o un servidor local (por ejemplo Live Server en VS Code). Abierta con doble clic, el navegador bloquea la descarga del juego.");
      return;
    }
    splash.hidden = true;
    frame = document.createElement("iframe");
    frame.className = "doom-frame";
    frame.src = "doom.html";
    frame.title = "DOOM corriendo en MS-DOS";
    frame.allow = "fullscreen; autoplay";
    frame.addEventListener("load", function () {
      say("Haz clic dentro de la pantalla para que DOOM reciba el teclado.");
      frame.focus();
    });
    screen.appendChild(frame);
    fullBtn.disabled = false;
    stopBtn.disabled = false;
    say("Cargando el emulador y DOOM…");
  }

  function stop() {
    if (!frame) return;
    if (document.fullscreenElement === frame) document.exitFullscreen().catch(function () {});
    frame.remove();
    frame = null;
    splash.hidden = false;
    fullBtn.disabled = true;
    stopBtn.disabled = true;
    say("DOOM apagado. Pulsa Iniciar DOOM para volver a jugar.");
  }

  function fullscreen() {
    if (!frame || !frame.requestFullscreen) return say("Tu navegador no permite pantalla completa aquí.");
    frame.requestFullscreen().then(function () { frame.focus(); }).catch(function () {
      say("No se pudo activar la pantalla completa.");
    });
  }

  startBtn.addEventListener("click", start);
  stopBtn.addEventListener("click", stop);
  fullBtn.addEventListener("click", fullscreen);
  // Cerrar la ventana apaga el emulador para liberar CPU y memoria
  win.addEventListener("win-close", stop);
})();
