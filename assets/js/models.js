//#region TimeIt

class TimeItModel {
  static from(data = {}) {
    return Object.assign(new this(), data);
  }
}

class TimeItGame extends TimeItModel {}

class TimeItCategory extends TimeItModel {}

class TimeItHistory extends TimeItModel {}

class TimeItRunner extends TimeItModel {}

class TimeItSegment extends TimeItModel {
  constructor({ id, name, endedAt, bestDuration, isSkipped = false } = {}) {
    super();
    this.id = id ?? UI.uniqueId();
    this.name = name;
    this.endedAt = endedAt; // TODO: used for pb too?
    this.bestDuration = bestDuration; // fastest time for section
    this.timeDifference = 0;
    this.isSkipped = isSkipped;
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
    const element = document.querySelector(`[data-id="${this.id}"]`);
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

  static from(data = {}, timingMethod = DEFAULT_TIMING.REAL) {
    let model;
    if (data instanceof SplitsIOSegment) {
      model = new TimeItSegment({ id: data.id, name: data.name });
      if (timingMethod === DEFAULT_TIMING.REAL) {
        model.endedAt = data.realtime_end_ms;
        model.bestDuration = data.realtime_shortest_duration_ms;
        model.isSkipped = data.realtime_skipped;
      } else if (timingMethod === DEFAULT_TIMING.GAME) {
        model.endedAt = data.gametime_end_ms;
        model.bestDuration = data.gametime_shortest_duration_ms;
        model.isSkipped = data.gametime_skipped;
      }
    } else model = Object.assign(new this(), data);

    return model;
  }
}

class TimeItSpeedRun extends TimeItModel {
  constructor({ id, name, segments } = {}) {
    super();
    this.id = id;
    this.name = name;
    this.segments = segments ?? [];
    this.activeSegment = 0;
    this.currentSegmentTimeElapsed = 0;
    this.totalTimeElapsed = 0;
    this.totalTimeSaved = 0;
    this.timeFormat = (v) => Formatting.msToShortTimeString(Math.round(v));
    this.#setup();
    this.timer = this.#getTimer();
  }

  static from(/** @type {Object} */ data = {}) {
    return data instanceof SplitsIORun
      ? new TimeItSpeedRun({
          id: data.id,
          name: data.name,
          segments: data.segments.map((s) =>
            TimeItSegment.from(s, DEFAULT_TIMING[data.default_timing.toUpperCase()])
          ),
        })
      : Object.assign(new this(), data);
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

//#endregion TimeIt

//#region SplitsIO

const DEFAULT_TIMING = {
  GAME: "game",
  REAL: "real",
};

class SplitsIOModel {
  static from(data = {}) {
    return Object.assign(new this(), data);
  }
}

class SplitsIORunner extends SplitsIOModel {
  id;
  twitch_id;
  twitch_name;
  display_name;
  name;
  avatar;
  created_at;
  updated_at;
}

class SplitsIOCategory extends SplitsIOModel {
  id;
  name;
  created_at;
  updated_at;
}

class SplitsIOGame extends SplitsIOModel {
  id;
  name;
  shortname;
  created_at;
  updated_at;
  categories;
  srdc_id;
  cover_url;

  static from(/** @type {Object || SplitsIOGame} */ data = {}) {
    const model = new SplitsIOGame();
    const assignToThis = (key, value) => Object.defineProperty(model, key, { value });
    Object.keys(data).forEach((key) => {
      switch (key) {
        case "categories":
          assignToThis(
            key,
            data[key].map((categoryData) => SplitsIOCategory.from(categoryData))
          );
          break;
        default:
          assignToThis(key, data[key]);
          break;
      }
    });

    return model;
  }
}

class SplitsIOSegment extends SplitsIOModel {
  id;
  name;
  display_name;
  segment_number;
  realtime_start_ms;
  realtime_duration_ms;
  realtime_end_ms;
  realtime_shortest_duration_ms;
  realtime_gold;
  realtime_skipped;
  realtime_reduced;
  gametime_start_ms;
  gametime_duration_ms;
  gametime_end_ms;
  gametime_shortest_duration_ms;
  gametime_gold;
  gametime_skipped;
  gametime_reduced;
}

class SplitsIOHistory extends SplitsIOModel {
  attempt_number;
  realtime_duration_ms;
  gametime_duration_ms;
  started_at;
  ended_at;
}

class SplitsIORun extends SplitsIOModel {
  id;
  srdc_id;
  realtime_duration_ms;
  realtime_sum_of_best_ms;
  gametime_duration_ms;
  gametime_sum_of_best_ms;
  default_timing;
  program;
  attempts;
  uses_autosplitter;
  created_at;
  updated_at;
  parsed_at;
  image_url;
  video_url;
  game;
  category;
  runners;
  segments;
  histories;

  static from(/** @type {SplitsIORun || {}} */ data = {}) {
    const model = new SplitsIORun();
    const assignToThis = (key, value) => Object.defineProperty(model, key, { value });
    Object.keys(data).forEach((key) => {
      switch (key) {
        case "game":
          assignToThis(key, SplitsIOGame.from(data[key]));
          break;
        case "category":
          assignToThis(key, SplitsIOCategory.from(data[key]));
          break;
        case "runners":
          assignToThis(
            key,
            data[key].map((runnerData) => SplitsIORunner.from(runnerData))
          );
          break;
        case "segments":
          assignToThis(
            key,
            data[key].map((segmentData) => SplitsIOSegment.from(segmentData))
          );
          break;
        case "histories":
          assignToThis(
            key,
            data[key].map((historyData) => SplitsIOHistory.from(historyData))
          );
          break;
        default:
          assignToThis(key, data[key]);
          break;
      }
    });

    return model;
  }
}

//#endregion SplitsIO
