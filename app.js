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

      /* прямая речь из ролика, который идёт следом — отдельным блоком внизу экрана.
         Poliform здесь набирается словом, а не логотипом: это сплошной текст. */
      if (s.quotes && s.quotes.length) {
        var who0 = s.quotes[0].who || '';
        var oneVoice = s.quotes.every(function (q) { return (q.who || '') === who0; });
        var wrap = document.createElement('div');
        wrap.className = 'quotes-wrap';
        wrap.innerHTML =
          (oneVoice && who0 ? '<div class="q-who q-who-top">' + who0 + '</div>' : '') +
          '<div class="quotes' + (s.quotes.length > 2 ? ' two-col' : '') +
          (oneVoice ? ' one-voice' : '') + '">' +
          s.quotes.map(function (q) {
            return '<div class="quote">' +
              (!oneVoice && q.who ? '<div class="q-who">' + q.who + '</div>' : '') +
              '<p class="q-text">' + (q.ru || q.text || '') + '</p>' +
              '</div>';
          }).join('') +
          '</div>';
        el.classList.add('has-quotes');
        el.appendChild(wrap);
      }

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

  /* ── звук ───────────────────────────────────────────────────────────
     Фоновая музыка играет сплошняком под слайдами. На ролике со своей
     дорожкой музыка уходит, слышно сам ролик; дальше музыка возвращается.
     Телефонная съёмка помечена silent — на ней музыка продолжает звучать.
     Браузер разрешает звук после первого действия, поэтому музыка
     стартует с первого клика или клавиши. */
  var MUSIC_VOL = 0.32;
  var music = document.createElement('audio');
  music.src = 'media/audio/background.mp3';
  music.loop = true;
  music.preload = 'auto';
  music.volume = 0;
  document.body.appendChild(music);

  var soundOn = true, audioReady = false, fadeTimer = null;

  function fadeTo(target, ms, done) {
    clearInterval(fadeTimer);
    var from = music.volume, steps = Math.max(1, Math.round(ms / 40)), k = 0;
    fadeTimer = setInterval(function () {
      k++;
      music.volume = Math.max(0, Math.min(1, from + (target - from) * k / steps));
      if (k >= steps) { clearInterval(fadeTimer); if (done) done(); }
    }, 40);
  }

  function musicPlay() {
    if (!audioReady || !soundOn) return;
    music.play().catch(function () {});
    fadeTo(MUSIC_VOL, 700);
  }
  function musicStop() {
    fadeTo(0, 350, function () { music.pause(); });
  }

  function startAudio() {
    if (audioReady) return;
    audioReady = true;
    if (S[cur].type === 'video' && !S[cur].silent) return;   // на ролике музыка молчит
    musicPlay();
  }
  ['click', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, startAudio, { once: true, passive: true });
  });
  music.play().then(function () { audioReady = true; fadeTo(MUSIC_VOL, 900); })
              .catch(function () {});

  /* общая кнопка звука */
  var sndBtn = document.createElement('button');
  sndBtn.id = 'sound-toggle';
  sndBtn.type = 'button';
  sndBtn.textContent = '♪';
  sndBtn.title = 'Звук';
  sndBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    soundOn = !soundOn;
    sndBtn.classList.toggle('off', !soundOn);
    audioReady = true;
    var v = slides[cur] && slides[cur].querySelector('video');
    if (!soundOn) {
      clearInterval(fadeTimer); music.pause(); music.volume = 0;
      if (v) v.muted = true;
    } else if (S[cur].type === 'video' && !S[cur].silent) {
      if (v) { v.muted = false; v.play().catch(function () {}); }
    } else {
      musicPlay();
    }
  });
  document.body.appendChild(sndBtn);

  /* ── переходы ───────────────────────────────────────────────────── */
  function media(i, action) {
    var s = S[i], v = slides[i] && slides[i].querySelector('video');
    if (action === 'play') {
      if (!v) { musicPlay(); return; }
      if (v.preload === 'none') v.preload = 'auto';
      v.currentTime = 0;
      if (s.silent) {               // своей дорожки нет — музыка продолжает
        v.muted = true;
        musicPlay();
      } else {
        musicStop();
        v.muted = !soundOn;
      }
      v.play().catch(function (err) {
        // звук мог быть ещё запрещён браузером — тогда играем ролик без него
        if (err && err.name === 'NotAllowedError') {
          v.muted = true;
          v.play().catch(function () {});
        }
      });
    } else {
      if (v) { v.pause(); v.muted = true; }
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
    else musicPlay();                       // вернулись к слайдам — музыка снова звучит
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

  /* блок реплик стоит внизу экрана — отводим под него место,
     чтобы заголовок слайда не наезжал на него */
  function fitQuotes() {
    Array.prototype.forEach.call(
      stage.querySelectorAll('.text-slide.has-quotes'), function (el) {
        var w = el.querySelector('.quotes-wrap');
        if (w) el.style.paddingBottom = (w.offsetHeight + 56) + 'px';
      });
  }
  window.addEventListener('resize', fitQuotes);
  fitQuotes();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitQuotes);
  setTimeout(fitQuotes, 1200);

  /* ── старт ──────────────────────────────────────────────────────── */
  slides[0].classList.add('is-active');
  slides[0].setAttribute('aria-hidden', 'false');
  update();
  preload(1);
  hintTimer = setTimeout(hideHint, 6000);
})();
