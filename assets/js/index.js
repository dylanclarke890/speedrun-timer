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
  onSegmentCleared = (segment) => this.#dispatch("segmentcleared", { segment });
}

class Segment {
  constructor({ name, duringPb, best } = {}) {
    this.id = UI.uniqueId();
    this.name = name;
    this.duringPb = duringPb ?? 0;
    this.best = best ?? 0;
    this.timeElapsed = 0;
    this.accumulativeTimeElapsed = 0;
  }
}

class Run {
  constructor({ segments, dispatcher } = {}) {
    this.segments = segments;
    this.activeSegmentIndex = -1;
    this.currentSegmentTime = 0;
    this.dispatcher = dispatcher ?? new TimerEventDispatcher();
  }

  start() {
    this.activeSegmentIndex = 0;
  }

  syncActiveSegment(timeElapsed) {
    this.currentSegmentTime += timeElapsed;
  }

  hasNextSegment = () => this.activeSegmentIndex < this.segments.length;

  split(totalTimeElapsed) {
    const active = this.segments[this.activeSegmentIndex];
    active.timeElapsed = this.currentSegmentTime;
    active.accumulativeTimeElapsed = totalTimeElapsed;
    this.currentSegmentTime = 0;
    this.activeSegmentIndex++;
    this.dispatcher.onSplit(active);
  }

  reset() {
    this.segments.forEach((s) => {
      s.timeElapsed = 0;
      s.accumulativeTimeElapsed = 0;
      this.dispatcher.onSegmentCleared(s);
    });
  }

  saveBest() {}
}

class SpeedrunTimer {
  static STATUSES = {
    INITIALISED: 1,
    RUNNING: 2,
    PAUSED: 3,
    FINISHED: 4,
  };

  constructor({ run, dispatcher } = {}) {
    this.run = run;
    this.dispatcher = dispatcher ?? new TimerEventDispatcher();
    this.lastRead = 0;
    this.totalTimeElapsed = 0;
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
    this.run.syncActiveSegment(timeElapsedSinceLastRead);
    this.#timeChanged();
  }

  start() {
    if (!this.isInStatus("INITIALISED") && !this.isInStatus("PAUSED")) return;
    if (this.isInStatus("INITIALISED")) this.run.start();
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

  reset() {
    if (!this.isInStatus("PAUSED") && !this.isInStatus("FINISHED")) return;
    this.lastRead = 0;
    this.totalTimeElapsed = 0;
    this.#timeChanged();
    this.run.reset();
    this.setStatus("INITIALISED");
  }

  split() {
    if (!this.isInStatus("RUNNING")) return;
    this.#syncTimer();
    this.run.split(this.totalTimeElapsed);
    if (!this.run.hasNextSegment()) this.finish();
  }

  finish() {
    if (this.isInStatus("INITIALISED")) return;
    clearInterval(this.interval);
    this.#syncTimer();
    this.setStatus("FINISHED");
  }

  saveBest() {
    if (!this.isInStatus("FINISHED")) return;
    this.run.saveBest();
    this.reset();
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

// #region OnPageLoad
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
  const resEvilRun = new Run({ segments: resEvilSplits });
  const timer = new SpeedrunTimer({ run: resEvilRun });

  const fmt = (val, prefixSign = false) =>
    Formatting.msToShortTimeString(Math.round(val), prefixSign);
  const timerResult = document.getElementById("timer");
  timerResult.innerHTML = fmt(0);
  const start = document.getElementById("timerStart");
  const pause = document.getElementById("timerPause");
  const reset = document.getElementById("timerClear");
  const split = document.getElementById("timerSplit");
  const save = document.getElementById("timerSave");
  const segments = document.getElementById("segments");

  // TODO: move styles into css file
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
  UI.addEvent(reset, "click", () => timer.reset());
  UI.addEvent(split, "click", () => timer.split());
  UI.addEvent(save, "click", () => timer.saveBest());

  UI.addEvent(document, "keyup", (e) => {
    // TODO: Have the keyboard call the timer events themselves or should they share a "UI"
    // function along with the click events that calls the timer methods?
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
        timer.reset();
        break;
      case "S":
        timer.saveBest();
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
        UI.hide(reset);
        UI.hide(save);
        break;
      case RUNNING:
        UI.hide(start);
        UI.show(pause);
        UI.show(split);
        UI.hide(reset);
        UI.hide(save);
        break;
      case PAUSED:
        UI.show(start);
        UI.hide(pause);
        UI.hide(split);
        UI.show(reset);
        UI.hide(save);
        break;
      case FINISHED:
        UI.hide(start);
        UI.hide(pause);
        UI.hide(split);
        UI.show(reset);
        UI.show(save);
        break;
      default:
        break;
    }
  });

  function updateSegment(segment, type) {
    const { id, best, timeElapsed, accumulativeTimeElapsed } = segment;
    const segmentEl = document.querySelector(`[data-id="${id}"]`);
    const currentOrBestEl = segmentEl.querySelector(".segment-current-or-best");
    const totalEl = segmentEl.querySelector(".segment-total");

    switch (type) {
      case "reset":
        totalEl.textContent = "";
        currentOrBestEl.textContent = `${fmt(best)}`;
        break;
      case "split":
        const color = timeElapsed > best ? "red" : timeElapsed < best ? "green" : "black";
        const diff = best > 0 ? fmt(timeElapsed - best, true) : "";
        totalEl.classList.add(color);
        totalEl.textContent = diff;
        currentOrBestEl.textContent = `${fmt(accumulativeTimeElapsed)}`;
        break;
      default:
        break;
    }
  }

  UI.addEvent(document, "segmentcleared", (e) => {
    updateSegment(e.detail.segment, "reset");
  });

  UI.addEvent(document, "split", (e) => {
    updateSegment(e.detail.segment, "split");
  });
  // #endregion TIMER EVENTS
});
// #endregion OnPageLoad
