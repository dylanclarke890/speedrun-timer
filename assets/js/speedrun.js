class Segment {
  constructor({ name, endedAt, bestDuration, isSkipped, histories } = {}) {
    this.name = name;
    this.endedAt = endedAt;
    this.bestDuration = bestDuration;
    this.isSkipped = isSkipped;
    this.histories = histories;
  }
}

class SpeedRun {
  constructor({ name, segments }) {
    this.name = name;
    this.segments = segments;
    this.currentSegment = 0;
    this.timer = this.#getTimer();
    this.#setupUserInputEvents();
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

  #assignTimerBtns() {
    if (!this.buttons)
      this.buttons = {
        start: document.getElementById("timerStart"),
        pause: document.getElementById("timerPause"),
        reset: document.getElementById("timerReset"),
        split: document.getElementById("timerSplit"),
        save: document.getElementById("timerSave"),
      };
  }

  #getTimer() {
    const settings = {
      callbacks: {
        timeChanged: (newTime) => {},
        statusChanged: (newStatus) => {},
      },
    };
    return new Timer(settings);
  }

  #setupUserInputEvents() {
    this.#assignTimerBtns();
    const { start, pause, reset, split, save } = this.buttons;

    UI.addEvent(start, "click", () => this.start());
    UI.addEvent(pause, "click", () => this.pause());
    UI.addEvent(reset, "click", () => this.reset());
    UI.addEvent(split, "click", () => this.split());
    UI.addEvent(save, "click", () => this.saveBest());

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

  constructor({ callbacks = { timeChanged: (_) => null, statusChanged: (_) => null } } = {}) {
    this.lastRead = 0;
    this.timeElapsed = 0;
    this.callbacks = callbacks;
    this.setStatus("INITIALISED");
  }

  setStatus = (status) => {
    this.status = Timer.STATUSES[status];
    this.callbacks.statusChanged(this.status);
  };

  isInStatus = (status) => this.status === Timer.STATUSES[status];

  syncTimer() {
    const now = performance.now();
    const elapsed = now - this.lastRead;
    this.timeElapsed += elapsed;
    this.callbacks.timeChanged(this.timeElapsed);
  }

  start() {
    if (!this.isInStatus("INITIALISED") && !this.isInStatus("PAUSED")) return;
    this.lastRead = performance.now();
    this.interval = setInterval(() => this.syncTimer(), 100);
    this.setStatus("RUNNING");
  }

  pause() {
    if (!this.isInStatus("RUNNING")) return;
    clearInterval(this.interval);
    this.syncTimer();
    this.setStatus("PAUSED");
  }

  reset() {
    if (!this.isInStatus("PAUSED") && !this.isInStatus("STOPPED")) return;
    this.lastRead = 0;
    this.timeElapsed = 0;
    this.setStatus("INITIALISED");
  }

  finish() {
    if (this.isInStatus("INITIALISED")) return;
    clearInterval(this.interval);
    this.syncTimer();
    this.setStatus("STOPPED");
  }
}

UI.onPageReady(() => {
  const segments = [
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
  const run = new SpeedRun({ segments });
});
