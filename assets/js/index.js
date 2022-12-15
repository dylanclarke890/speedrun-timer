document.addEventListener("DOMContentLoaded", () => {
  const timer = document.getElementById("timer");

  let currentTime = 0;
  let last = performance.now();

  function getTimeElapsed() {
    const current = performance.now();
    const elapsed = current - last;
    last = current;
    return elapsed;
  }

  setInterval(() => {
    currentTime += getTimeElapsed();
    timer.innerHTML = currentTime;
  }, 100);
});
