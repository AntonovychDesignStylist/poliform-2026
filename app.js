/* Poliform 2026 — движок презентации. Без библиотек. */
(function () {
  'use strict';

  var S = window.SLIDES || [];
  var LOGO = 'media/img/poliform-logo.png';
  function brand(t) {
    return String(t).replace(/Poliform/g,
      '<img class="logo-inline" src="' + LOGO + '" alt="Poliform">');
  }
  var stage = document.getElementById('stage');
  var grid = document.getElementById('grid');
  var bar = document.getElementById('bar');
  var chrome = document.getElementById('chrome');
  var counter = document.getElementById('counter');
  var hint = document.getElementById('hint');
  var cur = 0, busy = false, hideTimer = null, hintTimer = null;

  /* ── сборка слайдов ─────────────────────────────────────────────── */
  S.forEach(function (s, i) {
    var el = document.createElement('section');
    el.className = 'slide' + (s.type === 'text' ? ' text-slide' : '');
    el.setAttribute('aria-hidden', 'true');

    if (s.type === 'cover') {
      var fc = document.createElement('div');
      fc.className = 'frame';
      var ic = document.createElement('img');
      ic.src = s.src; ic.alt = ''; ic.decoding = 'async';
      fc.appendChild(ic);
      el.appendChild(fc);
      el.classList.add('cover');
      var ui = document.createElement('div');
      ui.className = 'cover-ui';
      ui.innerHTML =
        (s.mid  ? '<div class="big">'   + s.mid  + '</div>' : '') +
        (s.foot ? '<div class="small">' + s.foot + '</div>' : '');
      el.appendChild(ui);

      var mark = document.createElement('img');
      mark.className = 'wordmark';
      mark.src = 'media/img/poliform-logo.png';
      mark.alt = 'Poliform';
      el.appendChild(mark);

    } else if (s.type === 'text') {
      var inner = document.createElement('div');
      inner.className = 'text-inner';
      var html = '';
      if (s.kicker) html += '<div class="kicker">' + s.kicker + '</div>';
      if (s.logo) {
        html += '<div class="wordmark-text">' +
                '<img class="logo-mark" src="' + LOGO + '" alt="Poliform">' +
                (s.year ? '<span class="year">' + s.year + '</span>' : '') + '</div>';
      }
      if (s.title)  html += '<h2 class="title">' + brand(s.title) + '</h2>';
      if (s.sub)    html += '<div class="sub">' + s.sub + '</div>';
      html += '<div class="rule"></div>';
      if (s.lines && s.lines.length) {
        html += '<div class="lines">' +
          s.lines.map(function (l) { return '<span>' + l + '</span>'; }).join('') +
          '</div>';
      }
      inner.innerHTML = html;
      el.appendChild(inner);

    } else if (s.type === 'photo' || s.type === 'pair') {
      var f = document.createElement('div');
      f.className = 'frame' + (s.type === 'pair' ? ' pair' : '');
      var list = s.type === 'pair' ? s.src : [s.src];
      list.forEach(function (src) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.decoding = 'async';
        if (i > 1) img.loading = 'lazy';
        f.appendChild(img);
      });
      el.appendChild(f);

    } else if (s.type === 'video') {
      var fv = document.createElement('div');
      fv.className = 'frame';
      var v = document.createElement('video');
      v.src = s.src;
      v.poster = s.poster || '';
      v.preload = 'none';
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      fv.appendChild(v);
      el.appendChild(fv);

      /* перевод титров: рядом с кадром, никогда поверх него */
      if (s.captions && s.captions.length) {
        el.classList.add('has-subs', s.portrait ? 'subs-side' : 'subs-below');
        var box = document.createElement('div');
        box.className = 'subs';
        box.innerHTML = '<div class="subs-who"></div><div class="subs-ru"></div>';
        el.appendChild(box);
        var who = box.querySelector('.subs-who');
        var ru  = box.querySelector('.subs-ru');
        var shown = -1;
        v.addEventListener('timeupdate', function () {
          var t = v.currentTime, idx = -1;
          for (var k = 0; k < s.captions.length; k++) {
            if (t >= s.captions[k].t && t < s.captions[k].to) { idx = k; break; }
          }
          if (idx === shown) return;
          shown = idx;
          if (idx < 0) { box.classList.remove('on'); return; }
          who.textContent = s.captions[idx].who || '';
          ru.textContent  = s.captions[idx].ru;
          box.classList.add('on');
        });
        v.addEventListener('pause', function () { box.classList.remove('on'); shown = -1; });
      }

      var btn = document.createElement('button');
      btn.className = 'sound';
      btn.type = 'button';
      btn.textContent = '♪';
      btn.title = 'Звук';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        v.muted = !v.muted;
        btn.style.borderColor = v.muted ? '' : '#FFFFFF';
        if (!v.muted) v.play().catch(function () {});
      });
      el.appendChild(btn);
    }

    stage.appendChild(el);
  });

  var slides = Array.prototype.slice.call(stage.querySelectorAll('.slide'));

  /* ── обзорная сетка ─────────────────────────────────────────────── */
  S.forEach(function (s, i) {
    var fig = document.createElement('figure');
    if (s.type === 'text') {
      fig.innerHTML = '<div class="g-text">' + brand(s.title || (s.logo ? 'Poliform ' + (s.year || '') : '')) + '</div>';
    } else {
      var src = s.type === 'pair' ? s.src[0] : (s.type === 'video' ? s.poster : s.src);
      fig.innerHTML = '<img src="' + src + '" alt="" loading="lazy">';
    }
    fig.innerHTML += '<figcaption>' + String(i + 1).padStart(2, '0') + '</figcaption>';
    fig.addEventListener('click', function () { closeGrid(); go(i); });
    grid.appendChild(fig);
  });

  /* ── переходы ───────────────────────────────────────────────────── */
  function media(i, action) {
    var v = slides[i] && slides[i].querySelector('video');
    if (!v) return;
    if (action === 'play') {
      if (v.preload === 'none') v.preload = 'auto';
      v.currentTime = 0;
      v.play().catch(function () {});
    } else {
      v.pause();
      v.muted = true;
      var b = slides[i].querySelector('.sound');
      if (b) b.style.borderColor = '';
    }
  }

  function preload(i) {
    var s = S[i]; if (!s) return;
    if (s.type === 'photo' || s.type === 'pair') {
      (s.type === 'pair' ? s.src : [s.src]).forEach(function (src) { new Image().src = src; });
    }
    var v = slides[i] && slides[i].querySelector('video');
    if (v && v.preload === 'none') v.preload = 'metadata';
  }

  function go(n) {
    if (busy || n === cur || n < 0 || n >= slides.length) return;
    busy = true;
    media(cur, 'pause');
    slides[cur].classList.remove('is-active');
    slides[cur].setAttribute('aria-hidden', 'true');
    cur = n;
    slides[cur].classList.add('is-active');
    slides[cur].setAttribute('aria-hidden', 'false');
    if (S[cur].type === 'video') setTimeout(function () { media(cur, 'play'); }, 260);
    update();
    preload(cur + 1); preload(cur - 1);
    setTimeout(function () { busy = false; }, 620);
  }

  var next = function () { go(cur + 1); };
  var prev = function () { go(cur - 1); };

  function update() {
    bar.style.width = ((cur + 1) / slides.length * 100) + '%';
    counter.textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    document.body.classList.toggle('show-counter', S[cur].type === 'text');
    showChrome();
  }

  function showChrome() {
    chrome.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { chrome.classList.remove('show'); }, 2600);
  }

  /* ── управление ─────────────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { grid.classList.contains('open') ? closeGrid() : openGrid(); return; }
    if (grid.classList.contains('open')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(slides.length - 1);
    else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') toggleFull();
    hideHint();
  });

  var wheelLock = false;
  window.addEventListener('wheel', function (e) {
    if (grid.classList.contains('open')) return;
    if (wheelLock || Math.abs(e.deltaY) < 18) return;
    wheelLock = true;
    e.deltaY > 0 ? next() : prev();
    hideHint();
    setTimeout(function () { wheelLock = false; }, 700);
  }, { passive: true });

  var tX = 0, tY = 0;
  window.addEventListener('touchstart', function (e) {
    tX = e.changedTouches[0].clientX; tY = e.changedTouches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (grid.classList.contains('open')) return;
    var dx = e.changedTouches[0].clientX - tX, dy = e.changedTouches[0].clientY - tY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); hideHint(); }
    else if (Math.abs(dy) > 55) { dy < 0 ? next() : prev(); hideHint(); }
  }, { passive: true });

  stage.addEventListener('click', function (e) {
    if (e.target.closest('.sound')) return;
    (e.clientX < window.innerWidth * 0.3) ? prev() : next();
    hideHint();
  });

  window.addEventListener('mousemove', showChrome);

  function openGrid()  { grid.classList.add('open'); }
  function closeGrid() { grid.classList.remove('open'); }

  function toggleFull() {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
    } else { document.exitFullscreen(); }
  }

  function hideHint() {
    if (!hint || hint.classList.contains('gone')) return;
    hint.classList.add('gone');
    clearTimeout(hintTimer);
  }

  /* ── старт ──────────────────────────────────────────────────────── */
  slides[0].classList.add('is-active');
  slides[0].setAttribute('aria-hidden', 'false');
  update();
  preload(1);
  hintTimer = setTimeout(hideHint, 6000);
})();
