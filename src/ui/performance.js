(function initEducircuitPerformance(global) {
  function rafThrottle(callback) {
    let frame = null;
    let latestArgs = null;

    return function throttled(...args) {
      latestArgs = args;
      if (frame) return;

      frame = global.requestAnimationFrame(() => {
        frame = null;
        callback(...latestArgs);
      });
    };
  }

  function setTransformPosition(element, x, y) {
    element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  global.EducircuitPerformance = {
    rafThrottle,
    setTransformPosition
  };
})(window);
