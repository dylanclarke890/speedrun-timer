class Formatting {
  static prefixWithZeroes = (num) => (num < 10 ? `0${num}` : num);

  static msToShortTimeString(s, prefixSign = false) {
    if (!s) return "--:--:--";
    const isNegative = s < 0;
    s = Math.abs(s);
    const ms = s % 1000;
    s = (s - ms) / 1000;
    const secs = s % 60;
    s = (s - secs) / 60;
    const mins = s % 60;
    const hrs = (s - mins) / 60;

    const fmt = Formatting.prefixWithZeroes;
    const timeString = (hrs ? fmt(hrs) + ":" : "") + fmt(mins) + ":" + fmt(secs) + "." + ms;
    return `${prefixSign ? (isNegative ? "-" : "+") : ""}${timeString}`;
  }
}

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

  onTimeChanged = (time) => this.#dispatch("timechanged", { time });
  onStatusChanged = (status) => this.#dispatch("statuschanged", { status });
  onSplit = (segment) => this.#dispatch("split", { segment });
}

class Segment {
  constructor({ name, duringPb, best } = {}) {
    this.id = UI.uniqueId();
    this.name = name;
    this.duringPb = duringPb ?? 0;
    this.best = best ?? 0;
    this.segmentTotal = 0;
    this.totalSoFar = 0;
  }
}

class SpeedrunTimer {
  static STATUSES = {
    INITIALISED: 1,
    RUNNING: 2,
    PAUSED: 3,
    FINISHED: 4,
  };

  constructor({ segments } = {}) {
    this.lastRead = 0;
    this.totalTimeElapsed = 0;
    this.dispatcher = new TimerEventDispatcher();
    this.segments = segments ?? [];
    this.currentSegment = 0;
    this.activeSegment = -1;
    this.setStatus("INITIALISED");
  }

  // #region STATUS

  setStatus(status) {
    this.status = SpeedrunTimer.STATUSES[status];
    this.dispatcher.onStatusChanged(this.status);
  }

  isInStatus(status) {
    return this.status === SpeedrunTimer.STATUSES[status];
  }

  // #endregion STATUS

  // #region TIMER

  #syncTimer() {
    const timeElapsedSinceLastRead = this.timeElapsedSinceLastReading();
    this.totalTimeElapsed += timeElapsedSinceLastRead;
    this.currentSegment += timeElapsedSinceLastRead;
    this.#timeChanged();
  }

  start() {
    if (!this.isInStatus("INITIALISED") && !this.isInStatus("PAUSED")) return;
    if (this.isInStatus("INITIALISED")) this.activeSegment = 0;

    this.lastRead = performance.now();
    this.interval = setInterval(() => this.#syncTimer(), 100);
    this.setStatus("RUNNING");
  }

  pause() {
    if (!this.isInStatus("RUNNING")) return;
    clearInterval(this.interval);
    this.#syncTimer();
    this.setStatus("PAUSED");
  }

  clear() {
    if (!this.isInStatus("PAUSED") && !this.isInStatus("FINISHED")) return;
    this.lastRead = 0;
    this.totalTimeElapsed = 0;
    this.currentSegment = 0;
    this.#timeChanged();
    this.setStatus("INITIALISED");
    this.segments.forEach((s) => {
      s.current = 0;
      this.dispatcher.onSplit(s);
    });
  }

  split() {
    if (!this.isInStatus("RUNNING")) return;
    this.#syncTimer();
    const active = this.segments[this.activeSegment];
    active.segmentTotal = this.currentSegment;
    this.currentSegment = 0;
    active.totalSoFar = this.totalTimeElapsed;
    this.dispatcher.onSplit(active);
    if (++this.activeSegment >= this.segments.length) {
      this.activeSegment--;
      this.finish();
    }
  }

  finish() {
    if (this.isInStatus("INITIALISED")) return;
    clearInterval(this.interval);
    this.#syncTimer();
    this.setStatus("FINISHED");
  }

  // #endregion TIMER

  // #region HELPERS

  #timeChanged() {
    this.dispatcher.onTimeChanged(this.totalTimeElapsed);
  }

  timeElapsedSinceLastReading(updateLastRead = true) {
    const now = performance.now();
    const elapsed = now - this.lastRead;
    if (updateLastRead) this.lastRead = now;
    return elapsed;
  }

  // #endregion HELPERS
}

UI.onPageReady(() => {
  const resEvilSplits = [
    new Segment({
      name: "Free Mia Cutscene",
      duringPb: 100023,
      best: 120535,
    }),
    new Segment({
      name: "Welcome to the family son",
      duringPb: 100023,
      best: 120535,
    }),
    new Segment({
      name: "Watch this *blows face off*",
      duringPb: 0,
      best: 0,
    }),
  ];

  const fmt = (val, prefixSign = false) =>
    Formatting.msToShortTimeString(Math.round(val), prefixSign);
  const timer = new SpeedrunTimer({ segments: resEvilSplits });
  const timerResult = document.getElementById("timer");
  timerResult.innerHTML = fmt(0);
  const start = document.getElementById("timerStart");
  const pause = document.getElementById("timerPause");
  const clear = document.getElementById("timerClear");
  const split = document.getElementById("timerSplit");
  const segments = document.getElementById("segments");

  resEvilSplits.forEach(
    (v, i) =>
      (segments.innerHTML += `
    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; text-align: center;" data-id="${
      v.id
    }">
      <p class="segment-name">${v.name ?? i}</p> 
      <p class="segment-total"></p> 
      <p class="segment-current-or-best">${fmt(v.best)}</p>
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
  UI.addEvent(document, "timechanged", (e) => (timerResult.innerHTML = fmt(e.detail.time)));
  UI.addEvent(document, "statuschanged", (e) => {
    const { INITIALISED, RUNNING, PAUSED, FINISHED } = SpeedrunTimer.STATUSES;
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
      case FINISHED:
        UI.hide(start);
        UI.hide(pause);
        UI.hide(split);
        UI.show(clear);
        break;
      default:
        break;
    }
  });
  UI.addEvent(document, "split", (e) => {
    const { id, best, segmentTotal, totalSoFar } = e.detail.segment;
    const color = segmentTotal > best ? "red" : segmentTotal < best ? "green" : "black";
    const diff = best > 0 ? fmt(segmentTotal - best, true) : "";

    const segmentEl = document.querySelector(`[data-id="${id}"]`);
    const currentOrBestEl = segmentEl.querySelector(".segment-current-or-best");
    const totalEl = segmentEl.querySelector(".segment-total");
    totalEl.classList.add(color);
    totalEl.textContent = diff;
    currentOrBestEl.textContent = `${fmt(totalSoFar)}`;
  });
  // #endregion TIMER EVENTS
});
