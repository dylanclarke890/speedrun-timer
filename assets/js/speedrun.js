class Segment {
  constructor({ id, name, endedAt, bestDuration, isSkipped = false, histories = [] } = {}) {
    this.id = id ?? UI.uniqueId();
    this.name = name;
    this.endedAt = endedAt; // TODO: used for pb too?
    this.bestDuration = bestDuration; // fastest time for section
    this.timeDifference = 0;
    // TODO: add logic for skipping
    this.isSkipped = isSkipped;
    this.histories = histories;
    this.timeFormat = (v, opts) => Formatting.msToShortTimeString(Math.round(v), opts);
  }

  initialHtml = (order) => {
    return `
    <div class="segment" data-id="${this.id}">
      <p class="segment-name">${this.name ?? `Segment ${order + 1}`}</p> 
      <p class="segment-time-saved"></p>
      <p class="segment-ended-at">${this.timeFormat(this.endedAt)}</p>
    </div>`;
  };

  updateHtml = () => {
    const element = document.querySelector(`[data-id=${this.id}]`);
    if (!element) throw new Error(`${this.id} is not a valid DOM selector.`);
    element.querySelector(".segment-ended-at").innerHTML = this.timeFormat(this.endedAt, {
      fillEmptyWithZeroes: false,
    });

    if (!this.timeDifference) return;
    const timeSavedEl = element.querySelector(".segment-time-saved");
    timeSavedEl.innerHTML = this.timeFormat(this.timeDifference, {
      prefixSign: true,
    });
    timeSavedEl.classList.remove("green", "red");
    timeSavedEl.classList.add(this.timeDifference < 0 ? "green" : "red");
  };
}

const RUN_SOURCE = {
  SPLITS_IO: "splitsio",
  SRDC: "srdc",
  INTERNAL: "internal",
};

class SpeedRun {
  constructor({ name, segments }) {
    this.name = name;
    this.segments = segments;
    this.activeSegment = 0;
    this.currentSegmentTimeElapsed = 0;
    this.totalTimeElapsed = 0;
    this.totalTimeSaved = 0;
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
    this.totalTimeSaved = 0;
    this.currentSegmentTimeElapsed = 0;
    this.activeSegment = 0;
    this.#updateActiveSegment();
    for (let segment of this.segments) {
      segment.timeDifference = 0;
      segment.updateHtml();
    }
    this.timer.reset();
  }

  split() {
    if (!this.timer.isInStatus("RUNNING")) return;
    this.timer.syncTimer();

    const current = this.segments[this.activeSegment];
    current.endedAt = this.totalTimeElapsed;

    this.totalTimeSaved += current.bestDuration
      ? this.currentSegmentTimeElapsed - current.bestDuration
      : 0;
    current.timeDifference = this.totalTimeSaved;

    if (!current.bestDuration || current.bestDuration > this.currentSegmentTimeElapsed)
      current.bestDuration = this.currentSegmentTimeElapsed;

    current.updateHtml();

    this.#updateSumOfBest();
    this.activeSegment++;
    this.currentSegmentTimeElapsed = 0;

    if (!this.hasNextSegment()) this.finish();
    else this.#updateActiveSegment();
  }

  finish() {
    this.timer.stop();
  }

  saveBest() {
    if (!this.timer.isInStatus("STOPPED")) return;
    // TODO: save best.
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
      active: {
        container: document.querySelector(".active-segment"),
        name: document.querySelector(".active-segment-name"),
        current: document.querySelector(".active-segment-current"),
        pb: document.querySelector(".active-segment-pb"),
        best: document.querySelector(".active-segment-best"),
      },
      sumOfBest: document.querySelector(".sum-of-best"),
      total: document.getElementById("timer"),
      segmentsContainer: document.getElementById("segments"),
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
    this.elements.active.current.textContent = this.timeFormat(this.currentSegmentTimeElapsed);
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

  #createSegments() {
    this.elements.segmentsContainer.innerHTML = "";
    for (let i = 0; i < this.segments.length; i++)
      this.elements.segmentsContainer.innerHTML += this.segments[i].initialHtml(i);
  }

  #updateActiveSegment() {
    const { name, current, best, pb } = this.elements.active;
    const activeSegment = this.segments[this.activeSegment];

    name.textContent = activeSegment.name;
    best.textContent = this.timeFormat(activeSegment.bestDuration);
    pb.textContent = this.timeFormat(0); // TODO
    current.textContent = this.timeFormat(0);
  }

  #updateSumOfBest() {
    const hasSegmentsWithoutBestTime = this.segments.some((v) => !v.bestDuration);
    this.elements.sumOfBest.textContent = hasSegmentsWithoutBestTime
      ? "-"
      : this.timeFormat(this.segments.map((v) => v.bestDuration).reduce((a, b) => a + b));
  }

  #setup() {
    this.#assignTimerElements();

    const { buttons, total } = this.elements;
    const { start, pause, reset, split, save } = buttons;

    this.#createSegments();
    this.#updateActiveSegment();
    this.#updateSumOfBest();
    total.textContent = this.timeFormat(0);

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
  // const url =
  //   "https://socherry-webservices-com.stackstaging.com/speedrun-timer/splits-io-request.php";

  const client = new SplitsIOApiClient();

  const testGetBtn = document.getElementById("testGet");
  UI.addEvent(testGetBtn, "click", async () => {
    const runData = await client.run.get("9okq");
    const fetchedRun = SplitsIORun.from(runData.run);
    console.log(fetchedRun);
    const gameData = await client.game.get("re7");
    const fetchedGame = SplitsIOGame.from(gameData.game);
    console.log(fetchedGame);
  });

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
    new Segment({
      endedAt: 0,
      bestDuration: 0,
    }),
  ];

  window.run = new SpeedRun({ segments });
});
