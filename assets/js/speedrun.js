class Segment {
  constructor({ name, endedAt, bestDuration, isSkipped, histories } = {}) {
    this.name = name;
    this.endedAt = endedAt;
    this.bestDuration = bestDuration;
    this.isSkipped = isSkipped;
    this.histories = histories;
  }
}

class Run {
  constructor({ name, segments }) {
    this.name = name;
    this.segments = segments;
    this.currentSegment = 0;
    this.timer = new Timer();
  }

  hasNextSegment = () => this.currentSegment < this.segments.length;

  start() {
    this.timer.start();
  }

  pause() {
    this.timer.pause();
  }

  reset() {
    this.timer.reset();
  }

  split() {
    this.timer.split();
    if (!this.hasNextSegment()) this.finish();
  }

  finish() {
    this.timer.finish();
  }

  saveBest() {
    if (!this.timer.isInStatus("STOPPED")) return;
    this.reset();
  }

  #getTimerActions() {
    if (!this.buttons) this.buttons = {};
  }

  registerEvents() {
    this.#getTimerActions();
    const { start, pause, reset, split, save } = this.buttons;

    UI.addEvent(start, "click", () => timer.start());
    UI.addEvent(pause, "click", () => timer.pause());
    UI.addEvent(reset, "click", () => timer.reset());
    UI.addEvent(split, "click", () => timer.split());
    UI.addEvent(save, "click", () => timer.saveBest());

    UI.addEvent(document, "keyup", (e) => {
      switch (e.code) {
        case "Enter":
          UI.triggerEvent(start, "click");
          break;
        case "Space":
          UI.triggerEvent(split, "click");
          break;
        case "KeyP":
          UI.triggerEvent(pause, "click");
          break;
        case "Escape":
          UI.triggerEvent(reset, "click");
          break;
        case "S":
          UI.triggerEvent(save, "click");
          break;
        default:
          break;
      }
    });
  }
}

class Timer {
  static STATUSES = {
    INITIALISED: 1,
    RUNNING: 2,
    PAUSED: 3,
    STOPPED: 4,
  };

  constructor() {
    this.lastRead = 0;
    this.timeElapsed = 0;
    this.setStatus("INITIALISED");
  }

  setStatus = (status) => (this.status = SpeedrunTimer.STATUSES[status]);

  isInStatus = (status) => this.status === SpeedrunTimer.STATUSES[status];

  #syncTimer() {
    const now = performance.now();
    const elapsed = now - this.lastRead;
    this.timeElapsed += elapsed;
  }

  start() {
    if (!this.isInStatus("INITIALISED") && !this.isInStatus("PAUSED")) return;
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
    if (!this.isInStatus("PAUSED") && !this.isInStatus("STOPPED")) return;
    this.lastRead = 0;
    this.timeElapsed = 0;
    this.setStatus("INITIALISED");
  }

  split() {
    if (!this.isInStatus("RUNNING")) return;
    this.#syncTimer();
  }

  finish() {
    if (this.isInStatus("INITIALISED")) return;
    clearInterval(this.interval);
    this.#syncTimer();
    this.setStatus("STOPPED");
  }
}
