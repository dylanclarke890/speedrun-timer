class UI {
  static #chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  static uniqueId = () =>
    Array.from({ length: 10 }, () => this.#chars[Math.floor(Math.random() * 52)]).join("");

  static getHTML = (/** @type {HTMLElement} */ element) => {
    if (!element || !(element instanceof HTMLElement)) return "";
    const container = document.createElement("div");
    container.append(element);
    return container.innerHTML;
  };

  static hide = (/** @type {HTMLElement} */ element) => {
    if (element) element.style.display = "none";
  };

  static show = (/** @type {HTMLElement} */ element) => {
    if (element) element.style.removeProperty("display");
  };

  static toggle = (/** @type {HTMLElement} */ element) => {
    if (!element) return;
    if (element.style.display === "none") element.style.removeProperty("display");
    else element.style.display = "none";
  };

  static map = (/** @type {HTMLCollection} */ elements, cb) => {
    const mapped = [];
    for (let i = 0; i < elements.length; i++) {
      const result = cb(elements[i], i, elements);
      mapped.push(result);
    }
    return mapped;
  };

  static filter = (/** @type {HTMLCollection} */ elements, cb) => {
    const filtered = [];
    for (let i = 0; i < elements.length; i++) {
      const result = cb(elements[i], i, elements);
      if (result) filtered.push(elements[i]);
    }
    return filtered;
  };

  static reduce = (/** @type {HTMLCollection} */ elements, reducer, initialValue) => {
    let accumulator = initialValue === undefined ? 0 : initialValue;
    for (let i = 0; i < elements.length; i++)
      accumulator = reducer(accumulator, elements[i], i, elements);
    return accumulator;
  };

  static forEach = (/** @type {HTMLCollection} */ elements, cb) => {
    for (let i = 0; i < elements.length; i++) cb(elements[i], i);
  };

  static nthChild = (/** @type {HTMLCollection} */ elements, i) => elements.item(i);

  static siblings = (/** @type {HTMLElement} */ element) => {
    const siblings = [];
    UI.forEach(element.parentElement.children, (e) => {
      if (e !== element) siblings.push(e);
    });
    return siblings;
  };

  static addEvent = (/** @type {HTMLElement} */ element, event, cb) => {
    if (element.addEventListener) element.addEventListener(event, cb, false);
    else if (element.attachEvent) {
      element["e" + event + cb] = cb;
      element[event + cb] = () => element["e" + event + cb](window.event);
      element.attachEvent("on" + event, element[event + cb]);
    } else element["on" + event] = element["e" + event + cb];
  };

  static triggerEvent = (/** @type {HTMLElement} */ element, event) =>
    element.dispatchEvent(new Event(event));

  static animate = (
    /** @type {HTMLElement} */ element,
    keyframes,
    speed,
    effect = "ease-in",
    times = 1,
    fill = "forwards"
  ) => element.animate(keyframes, { duration: speed, iterations: times, easing: effect, fill });

  static fade = (/** @type {HTMLElement} */ element, type, durationInMs) => {
    const isIn = type === "in",
      interval = 50,
      gap = interval / durationInMs;
    let opacity = isIn ? 0 : 1;

    if (isIn) {
      element.style.display = "inline";
      element.style.opacity = opacity;
    }

    const fading = setInterval(() => {
      opacity = isIn ? opacity + gap : opacity - gap;
      element.style.opacity = opacity;

      if (opacity <= 0) UI.hide(element);
      if (opacity <= 0 || opacity >= 1) clearInterval(fading);
    }, interval);
  };

  static fadeOut = (/** @type {HTMLElement} */ element, durationInMs = 500) =>
    UI.fade(element, "out", durationInMs);

  static fadeIn = (/** @type {HTMLElement} */ element, durationInMs = 500) =>
    UI.fade(element, "in", durationInMs);

  static addStyles = (/** @type {HTMLElement} */ element, styles) =>
    Object.keys(styles).forEach((s) => (element.style[s] = styles[s]));

  static removeStyles = (/** @type {HTMLElement} */ element, styles) =>
    styles.forEach((s) => element.style.removeProperty(s));

  static getFromDOMQuery = (/** @type {string} */ DOMQuery, type = "class") => {
    switch (type) {
      case "id":
        return !DOMQuery || DOMQuery[0] !== "#" ? "" : DOMQuery.substring(1);
      case "class":
        return !DOMQuery || DOMQuery[0] !== "." ? "" : DOMQuery.substring(1);
      default:
        return "";
    }
  };

  static newCanvasContext = (width, height, context) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext(context);
  };

  static removeFromDOM = (/** @type {HTMLElement} */ element) => {
    if (!element) return;
    element.parentElement.removeChild(element);
  };

  static fullscreen = (/** @type {HTMLElement} */ element, open = true) => {
    if (open) {
      if (element.requestFullscreen) element.requestFullscreen();
      else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
      else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
      else if (element.msRequestFullscreen) element.msRequestFullscreen();
      else return false;
    } else {
      if (element.exitFullscreen) element.exitFullscreen();
      else if (element.mozExitFullScreen) element.moxExitFullScreen();
      else if (element.webkitExitFullscreen) element.webkitExitFullscreen();
      else if (element.msExitFullscreen) element.msExitFullscreen();
      else return false;
    }
    return true;
  };

  static scrollPercent = () =>
    (document.body.scrollTop + document.documentElement.scrollTop) /
    (document.documentElement.scrollHeight - document.documentElement.clientHeight);

  static scrollTo = (y, behavior = "smooth") => window.scroll({ top: y, behavior });

  static onPageReady = (cb) => UI.addEvent(document, "DOMContentLoaded", cb);

  static repaintDOM = () => document.body.getBoundingClientRect();

  static makeFormAJAX = (/** @type {HTMLFormElement} */ form, cb, parse = true) => {
    UI.addEvent(form, "submit", function (e) {
      e.preventDefault();
      const d = this;
      fetch(d.getAttribute("action"), {
        method: d.getAttribute("method"),
        body: new FormData(d),
      })
        .then((res) => res.text())
        .then((data) => {
          if (parse) {
            try {
              data = JSON.parse(data);
            } catch {
              cb(data);
            }
          }
          cb(data);
        });
    });
  };
}

class Formatting {
  static prefixSingleDigitsWithZero = (num) => (num < 10 ? `0${num}` : num);

  static msToShortTimeString(s, { prefixSign = false, fillEmptyWithZeroes = true } = {}) {
    if (!s) return fillEmptyWithZeroes ? "00:00:00" : "--:--:--";
    const isNegative = s < 0;
    s = Math.abs(s);
    const ms = s % 1000;
    s = (s - ms) / 1000;
    const secs = s % 60;
    s = (s - secs) / 60;
    const mins = s % 60;
    const hrs = (s - mins) / 60;

    const fmt = Formatting.prefixSingleDigitsWithZero;
    const timeString = (hrs ? fmt(hrs) + ":" : "") + fmt(mins) + ":" + fmt(secs) + "." + ms;
    return `${prefixSign ? (isNegative ? "-" : "+") : ""}${timeString}`;
  }
}
