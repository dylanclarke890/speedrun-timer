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
  constructor({ best } = {}) {
    this.id = UI.uniqueId();
    this.current = 0;
    this.best = best ?? 0;
  }
}

class SpeedrunTimer {
  static STATUSES = {
    INITIALISED: 1,
    RUNNING: 2,
    PAUSED: 3,
  };

  constructor({ segments } = {}) {
    this.lastRead = 0;
    this.current = 0;
    this.dispatcher = new TimerEventDispatcher();
    this.segments = segments ?? [];
    this.activeSegment = -1;
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
    console.log(this.status);
    if (!this.isInStatus("INITIALISED") && !this.isInStatus("PAUSED")) return;
    if (this.isInStatus("INITIALISED")) {
      this.activeSegment = 0;
    }
    this.lastRead = performance.now();
    this.interval = setInterval(() => this.#updateLoop(), 100);
    this.setStatus("RUNNING");
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
    this.segments.push(this.msToTime(Math.round(this.current)));
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

UI.onPageReady(() => {
  const initialSegments = [new Segment({ best: 0 }), new Segment({ best: 10000 })];
  const timer = new SpeedrunTimer({ segments: initialSegments });
  const timerResult = document.getElementById("timer");
  const start = document.getElementById("timerStart");
  const pause = document.getElementById("timerPause");
  const clear = document.getElementById("timerClear");
  const split = document.getElementById("timerSplit");
  const segments = document.getElementById("segments");

  initialSegments.forEach(
    (v) =>
      (segments.innerHTML += `
    <div data-id="${v.id}">
      <p>Best: ${v.best}</p>
      <p>Current: ${v.current}</p>
    </div>
  `)
  );

  // #region USER INPUT
  UI.addEvent(start, "click", () => timer.start());
  UI.addEvent(pause, "click", () => timer.pause());
  UI.addEvent(clear, "click", () => timer.clear());
  UI.addEvent(split, "click", () => timer.split());

  UI.addEvent(document, "keyup", (e) => {
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
  UI.addEvent(document, "timechanged", (e) => (timerResult.innerHTML = e.detail.time));
  UI.addEvent(document, "statuschanged", (e) => {
    const { INITIALISED, RUNNING, PAUSED } = SpeedrunTimer.STATUSES;
    switch (e.detail.status) {
      case INITIALISED:
        UI.show(start);
        UI.hide(pause);
        UI.hide(split);
        UI.hide(clear);
        break;
      case RUNNING:
        UI.hide(start);
        UI.show(pause);
        UI.show(split);
        UI.hide(clear);
        break;
      case PAUSED:
        UI.show(start);
        UI.hide(pause);
        UI.hide(split);
        UI.show(clear);
        break;
      default:
        break;
    }
  });
  UI.addEvent(document, "segmentupdated", (e) => {
    const { id, current, best } = e.detail.segment;
    const element = document.querySelector(`[data-id="${id}"]`);
    element.innerHTML = `
      <p>Best: ${best}</p>
      <p>Current: ${current}</p>`;
  });
  // #endregion TIMER EVENTS
});
