// Lazy gallery: only mount a scene's <iframe> when its card nears the viewport,
// and scale the 1600×1000 virtual viewport down to the card width. Keeps heavy
// canvas scenes from all running at once (fixes the jank of loading them eagerly).
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
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) mount(e.target);
      });
    },
    { rootMargin: '400px 0px' }
  );
  document.querySelectorAll('.frame-wrap[data-src]').forEach(function (w) {
    io.observe(w);
  });
  window.addEventListener('resize', fitAll);
})();
