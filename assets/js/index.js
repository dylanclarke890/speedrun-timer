class TimerEvent {
  static create = (type, detail) =>
    new CustomEvent(type, {
      detail,
      bubbles: true,
      cancelable: true,
      composed: true,
    });
}

class Timer {
  static STATUSES = {
    INIT: 0,
    RUNNING: 1,
    PAUSED: 2,
  };

  constructor() {
    this.lastRead = 0;
    this.current = 0;
    this.html = "";
    this.status = Timer.STATUSES.INIT;
  }

  isInStatus = (status) => this.status === Timer.STATUSES[status];

  start() {
    if (this.isInStatus("INIT") || this.isInStatus("PAUSED")) {
      this.lastRead = performance.now();
      this.interval = setInterval(() => this.#updateLoop(), 100);
    }
  }

  pause() {
    clearInterval(this.interval);
    this.#updateLoop();
  }

  clear() {}

  msToTime(s) {
    const ms = s % 1000;
    s = (s - ms) / 1000;
    const secs = s % 60;
    s = (s - secs) / 60;
    const mins = s % 60;
    const hrs = (s - mins) / 60;

    return hrs + ":" + mins + ":" + secs + "." + ms;
  }

  timeElapsedSinceLastReading(updateLastRead = true) {
    const now = performance.now();
    const elapsed = now - this.lastRead;
    if (updateLastRead) this.lastRead = now;
    return elapsed;
  }

  #updateLoop() {
    this.current += this.timeElapsedSinceLastReading();
    this.html = this.msToTime(Math.round(this.current));
    document.dispatchEvent(
      TimerEvent.create("timechanged", { html: this.html, status: this.status })
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const timer = new Timer();
  const timerResult = document.getElementById("timer");
  document.addEventListener("timechanged", (e) => {
    timerResult.innerHTML = e.detail.html;
  });
  const start = document.getElementById("timerStart");
  const pause = document.getElementById("timerPause");
  start.addEventListener("click", () => {
    timer.start();
  });
  pause.addEventListener("click", () => {
    timer.pause();
  });
});
