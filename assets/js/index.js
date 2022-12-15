document.addEventListener("DOMContentLoaded", () => {
  const timer = document.getElementById("timer");

  let currentTime = 0;
  let last = performance.now();

  function msToTime(s) {
    const ms = s % 1000;
    s = (s - ms) / 1000;
    const secs = s % 60;
    s = (s - secs) / 60;
    const mins = s % 60;
    const hrs = (s - mins) / 60;

    return hrs + ":" + mins + ":" + secs + "." + ms;
  }

  function getTimeElapsed() {
    const current = performance.now();
    const elapsed = current - last;
    last = current;
    return elapsed;
  }

  setInterval(() => {
    const elapsed = getTimeElapsed();
    currentTime += elapsed;
    console.log(elapsed);
    timer.innerHTML = msToTime(Math.round(currentTime));
  }, 100);
});
