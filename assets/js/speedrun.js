class Segment {
  constructor({ id, name, endedAt, bestDuration, isSkipped = false, histories = [] } = {}) {
    this.id = id ?? UI.uniqueId();
    this.name = name;
    this.endedAt = endedAt;
    this.bestDuration = bestDuration;
    this.isSkipped = isSkipped;
    this.histories = histories;
    this.timeFormat = (v) => Formatting.prefixSingleDigitsWithZero(Math.round(v));
  }

  initialHtml = (order) => `
    <div class="segment" data-id="${this.id}" data-order="${order}">
      <p class="segment-name">${this.name ?? order}</p> 
      <p class="segment-total"></p> 
      <p class="segment-current" style="display:none;"></p>
      <p class="segment-best">${this.timeFormat(this.bestDuration)}</p>
    </div>`;
}

class SpeedRun {
  constructor({ name, segments }) {
    this.name = name;
    this.segments = segments;
    this.activeSegment = 0;
    this.currentSegmentTimeElapsed = 0;
    this.totalTimeElapsed = 0;
    this.timeFormat = (v) => Formatting.msToShortTimeString(Math.round(v));
    this.#setup();
    this.timer = this.#getTimer();
  }

  hasNextSegment = () => this.activeSegment < this.segments.length;

  start() {
    this.timer.start();
  }

  pause() {
    this.timer.pause();
  }

  reset() {
    this.totalTimeElapsed = 0;
    this.currentSegmentTimeElapsed = 0;
    this.activeSegment = 0;
    this.timer.reset();
  }

  split() {
    this.timer.syncTimer();
    const current = this.segments[this.activeSegment];
    current.endedAt = this.totalTimeElapsed;
    if (!current.bestDuration || current.bestDuration > this.currentSegmentTimeElapsed)
      current.bestDuration = this.currentSegmentTimeElapsed;
    this.activeSegment++;
    this.currentSegmentTimeElapsed = 0;
    if (!this.hasNextSegment()) this.finish();
  }

  finish() {
    this.timer.stop();
  }

  saveBest() {
    if (!this.timer.isInStatus("STOPPED")) return;
    this.reset();
  }

  #assignTimerElements() {
    this.elements = {
      buttons: {
        start: document.getElementById("timerStart"),
        pause: document.getElementById("timerPause"),
        reset: document.getElementById("timerReset"),
        split: document.getElementById("timerSplit"),
        save: document.getElementById("timerSave"),
      },
      currentSegment: document.getElementById("currentSplit"),
      total: document.getElementById("timer"),
    };
  }

  #handleStatusChanged = (status) => {
    const { INITIALISED, RUNNING, PAUSED, STOPPED } = Timer.STATUSES;
    const { start, pause, reset, split, save } = this.elements.buttons;

    UI.hide(start);
    UI.hide(pause);
    UI.hide(split);
    UI.hide(reset);
    UI.hide(save);

    switch (status) {
      case INITIALISED:
        UI.show(start);
        break;
      case RUNNING:
        UI.show(pause);
        UI.show(split);
        break;
      case PAUSED:
        UI.show(start);
        UI.show(reset);
        break;
      case STOPPED:
        UI.show(reset);
        UI.show(save);
        break;
      default:
        break;
    }
  };

  #handleTimeChanged = (elapsed) => {
    this.totalTimeElapsed += elapsed;
    this.currentSegmentTimeElapsed += elapsed;
    this.elements.total.textContent = this.timeFormat(this.totalTimeElapsed);
    this.elements.currentSegment.textContent = this.timeFormat(this.currentSegmentTimeElapsed);
  };

  #getTimer() {
    const settings = {
      callbacks: {
        timeChanged: this.#handleTimeChanged,
        statusChanged: this.#handleStatusChanged,
      },
    };
    return new Timer(settings);
  }

  #displaySegments() {
    const segmentsContainer = document.getElementById("segments");
    for (let i = 0; i < this.segments.length; i++)
      segmentsContainer.innerHTML += this.segments[i].initialHtml(i);
  }

  #setup() {
    this.#displaySegments();
    this.#assignTimerElements();

    const { buttons, currentSegment, total } = this.elements;
    const { start, pause, reset, split, save } = buttons;

    total.textContent = this.timeFormat(0);
    currentSegment.textContent = this.timeFormat(0);

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
    this.lastRead = performance.now();
    this.timeElapsed += elapsed;
    this.callbacks.timeChanged(elapsed);
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
    this.callbacks.timeChanged(0);
    this.setStatus("INITIALISED");
  }

  stop() {
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
      endedAt: 60000,
      bestDuration: 60000,
    }),
    new Segment({
      name: "Welcome to the family son",
      endedAt: 121000,
      bestDuration: 61000,
    }),
    new Segment({
      name: "Watch this *blows face off*",
      endedAt: 0,
      bestDuration: 0,
    }),
  ];

  window.run = new SpeedRun({ segments });
});
