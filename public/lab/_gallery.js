// Lazy gallery: mount a scene's <iframe> when its card nears the viewport, scale
// the 1600×1000 virtual viewport down to the card width, and — crucially — PAUSE
// (display:none) any scene that scrolls out of view so they don't all animate at
// once. Many heavy canvas scenes running together blocks the main thread and
// makes scrolling stutter; keeping only the on-screen ones live fixes that.
(function () {
  function fitOne(w) {
    var f = w.querySelector('iframe');
    if (!f) return;
    var s = w.clientWidth / 1600;
    f.style.transform = 'scale(' + s + ')';
    f.style.height = w.clientHeight / s + 'px';
  }
  function fitAll() {
    document.querySelectorAll('.frame-wrap').forEach(fitOne);
  }
  function mount(w) {
    if (w.dataset.loaded) return;
    w.dataset.loaded = '1';
    var f = document.createElement('iframe');
    f.loading = 'lazy';
    f.title = w.dataset.src;
    f.addEventListener('load', function () {
      w.classList.add('loaded');
      fitOne(w);
    });
    f.src = w.dataset.src;
    w.appendChild(f);
    fitOne(w);
  }
  // On-screen (incl. a small margin) → mount + run. Off-screen → display:none,
  // which stops the embedded scene's rendering loop until it scrolls back in.
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        var w = e.target;
        if (e.isIntersecting) {
          mount(w);
          var f = w.querySelector('iframe');
          if (f) {
            f.style.display = '';
            fitOne(w);
          }
        } else {
          var f2 = w.querySelector('iframe');
          if (f2) f2.style.display = 'none';
        }
      });
    },
    { rootMargin: '150px 0px' }
  );
  document.querySelectorAll('.frame-wrap[data-src]').forEach(function (w) {
    io.observe(w);
  });
  window.addEventListener('resize', fitAll);
})();
