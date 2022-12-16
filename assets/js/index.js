class TimerEventDispatcher {
  constructor(receiver) {
    this.receiver = receiver ?? document;
  }

  #dispatch = (type, detail) =>
    this.receiver.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    );

  timeChanged = (time) => this.#dispatch("timechanged", { time });
  statusChanged = (status) => this.#dispatch("statuschanged", { status });
}

class Timer {
  static STATUSES = {
    INITIALISED: 1,
    RUNNING: 2,
    PAUSED: 3,
  };

  constructor() {
    this.lastRead = 0;
    this.current = 0;
    this.dispatcher = new TimerEventDispatcher();

    this.setStatus("INITIALISED");
  }

  // #region STATUS

  setStatus(status) {
    this.status = Timer.STATUSES[status];
    this.dispatcher.statusChanged(this.status);
  }

  isInStatus(status) {
    return this.status === Timer.STATUSES[status];
  }

  // #endregion STATUS

  // #region TIMER

  #updateLoop() {
    this.current += this.timeElapsedSinceLastReading();
    this.#timeChanged();
  }

  #timeChanged() {
    this.dispatcher.timeChanged(this.msToTime(Math.round(this.current)));
  }

  start() {
    if (this.isInStatus("INITIALISED") || this.isInStatus("PAUSED")) {
      this.lastRead = performance.now();
      this.interval = setInterval(() => this.#updateLoop(), 100);
      this.setStatus("RUNNING");
    }
  }

  pause() {
    if (!this.isInStatus("RUNNING")) return;
    clearInterval(this.interval);
    this.setStatus("PAUSED");
    this.#updateLoop();
  }

  clear() {
    if (!this.isInStatus("PAUSED")) return;
    this.lastRead = 0;
    this.current = 0;
    this.#timeChanged();
    this.setStatus("INITIALISED");
  }

  // #endregion TIMER

  // #region HELPERS

  timeElapsedSinceLastReading(updateLastRead = true) {
    const now = performance.now();
    const elapsed = now - this.lastRead;
    if (updateLastRead) this.lastRead = now;
    return elapsed;
  }

  prefixWithZeroes = (num) => (num < 10 ? `0${num}` : num);

  msToTime(s) {
    const ms = s % 1000;
    s = (s - ms) / 1000;
    const secs = s % 60;
    s = (s - secs) / 60;
    const mins = s % 60;
    const hrs = (s - mins) / 60;

    const fmt = this.prefixWithZeroes;
    return (hrs ? fmt(hrs) + ":" : "") + fmt(mins) + ":" + fmt(secs) + "." + ms;
  }

  // #endregion HELPERS
}

function hide(element) {
  element.style.display = "none";
}

function show(element) {
  element.style.removeProperty("display");
}

document.addEventListener("DOMContentLoaded", () => {
  const timer = new Timer();
  const timerResult = document.getElementById("timer");
  const start = document.getElementById("timerStart");
  const pause = document.getElementById("timerPause");
  const clear = document.getElementById("timerClear");

  start.addEventListener("click", () => {
    timer.start();
  });
  pause.addEventListener("click", () => {
    timer.pause();
  });
  clear.addEventListener("click", () => {
    timer.clear();
  });

  document.addEventListener("timechanged", (e) => {
    timerResult.innerHTML = e.detail.time;
  });
  document.addEventListener("statuschanged", (e) => {
    const { INITIALISED, RUNNING, PAUSED } = Timer.STATUSES;
    switch (e.detail.status) {
      case INITIALISED:
        show(start);
        hide(pause);
        hide(clear);
        break;
      case RUNNING:
        hide(start);
        show(pause);
        hide(clear);
        break;
      case PAUSED:
        hide(pause);
        show(start);
        show(clear);
        break;
      default:
        break;
    }
  });
});
