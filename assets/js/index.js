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
  constructor() {
    this.lastRead = 0;
    this.current = 0;
    this.html = "";
  }

  start() {
    this.interval = setInterval(() => this.#updateLoop(), 100);
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
    document.dispatchEvent(TimerEvent.create("updated", { html: this.html }));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const timer = new Timer();
  const timerResult = document.getElementById("timer");
  document.addEventListener("updated", (e) => {
    timerResult.innerHTML = e.detail.html;
  });
  timer.start();
});
