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

class Segment {
  constructor({ name, pbSplit, pbSegment, bestSegment } = {}) {
    this.name = name;
    this.pbSplit = pbSplit;
    this.pbSegment = pbSegment;
    this.bestSegment = bestSegment;
  }
}

class SpeedrunTimer {
  static STATUSES = {
    INITIALISED: 1,
    RUNNING: 2,
    PAUSED: 3,
  };

  constructor() {
    this.lastRead = 0;
    this.current = 0;
    this.dispatcher = new TimerEventDispatcher();
    this.splits = [];
    this.setStatus("INITIALISED");
  }

  // #region STATUS

  setStatus(status) {
    this.status = SpeedrunTimer.STATUSES[status];
    this.dispatcher.statusChanged(this.status);
  }

  isInStatus(status) {
    return this.status === SpeedrunTimer.STATUSES[status];
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

  split() {
    if (!this.isInStatus("RUNNING")) return;
    this.current += this.timeElapsedSinceLastReading();
    this.splits.push(this.msToTime(Math.round(this.current)));
    this.#timeChanged();
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
  const timer = new SpeedrunTimer();
  const timerResult = document.getElementById("timer");
  const start = document.getElementById("timerStart");
  const pause = document.getElementById("timerPause");
  const clear = document.getElementById("timerClear");
  const split = document.getElementById("timerSplit");

  // #region USER INPUT
  start.addEventListener("click", () => {
    timer.start();
  });

  pause.addEventListener("click", () => {
    timer.pause();
  });

  clear.addEventListener("click", () => {
    timer.clear();
  });

  split.addEventListener("click", () => {
    timer.split();
  });

  document.addEventListener("keyup", (e) => {
    switch (e.code) {
      case "Enter":
        timer.start();
        break;
      case "Space":
        timer.split();
        break;
      case "KeyP":
        timer.pause();
        break;
      case "Escape":
        timer.clear();
        break;
    }
  });
  // #endregion USER INPUT

  // #region TIMER EVENTS
  document.addEventListener("timechanged", (e) => {
    timerResult.innerHTML = e.detail.time;
  });

  document.addEventListener("statuschanged", (e) => {
    const { INITIALISED, RUNNING, PAUSED } = SpeedrunTimer.STATUSES;
    switch (e.detail.status) {
      case INITIALISED:
        show(start);
        hide(pause);
        hide(split);
        hide(clear);
        break;
      case RUNNING:
        hide(start);
        show(pause);
        show(split);
        hide(clear);
        break;
      case PAUSED:
        show(start);
        hide(pause);
        hide(split);
        show(clear);
        break;
      default:
        break;
    }
  });
  // #endregion TIMER EVENTS
});
