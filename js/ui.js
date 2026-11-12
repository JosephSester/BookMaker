/* Book Maker — shared UI helpers: colors, covers, color picker, pagination */
'use strict';

/* ------------------------------------------------------------------ color */
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

function hexToRgb(hex) {
  var h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16);
  if (isNaN(n) || h.length !== 6) return { r: 42, g: 54, b: 85 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  function p(x) { x = clamp(Math.round(x), 0, 255).toString(16); return x.length === 1 ? '0' + x : x; }
  return '#' + (p(r) + p(g) + p(b)).toUpperCase();
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  var h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h: h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb(h, s, v) {
  var c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  var r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function luminance(hex) {
  var c = hexToRgb(hex);
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
}

function shade(hex, f) { /* f < 1 darkens, f > 1 lightens toward white */
  var c = hexToRgb(hex);
  if (f <= 1) return rgbToHex(c.r * f, c.g * f, c.b * f);
  var t = f - 1;
  return rgbToHex(c.r + (255 - c.r) * t, c.g + (255 - c.g) * t, c.b + (255 - c.b) * t);
}

/* ------------------------------------------------------------------ icons */
var ICONS = {
  back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>',
  plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  pencil: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21s1-4 4-7L17 4a2.1 2.1 0 0 1 3 3L10 17c-3 3-7 4-7 4Z"/><path d="m14 7 3 3"/></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>',
  skip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A9.5 9.5 0 0 1 2.5 12 9.6 9.6 0 0 1 6 8.1m3.9-1.8A9.5 9.5 0 0 1 21.5 12a9.6 9.6 0 0 1-1.7 2.4"/><path d="m3 3 18 18"/></svg>',
  eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>',
  down: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg>',
  left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  image: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="m3 15 5-4 4 3 4-5 5 6"/></svg>',
  share: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/></svg>',
  book: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 5.5C10.2 3.9 7.6 3.2 4.5 3.2c-.8 0-1.5.1-2.2.2v14.4c.7-.1 1.4-.2 2.2-.2 3.1 0 5.7.7 7.5 2.3 1.8-1.6 4.4-2.3 7.5-2.3.8 0 1.5.1 2.2.2V3.4c-.7-.1-1.4-.2-2.2-.2-3.1 0-5.7.7-7.5 2.3Z"/><path d="M12 5.5v14.4"/></svg>',
  restore: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>'
};

/* ------------------------------------------------------------------ cover */
/* Returns HTML for a drawn book (cover + spine + page edge). */
function coverHTML(book, w, h, opts) {
  opts = opts || {};
  var c = book.cover || {};
  var bg = c.bg || '#27584A';
  var accent = c.accent || '#E8B54A';
  var layout = c.layout || 'frame';
  var light = luminance(bg) > 0.6;
  var text = light ? '#241D15' : '#FBF7EE';
  var sub = light ? 'rgba(36,29,21,.65)' : 'rgba(251,247,238,.75)';
  var fontCss = c.font === 'inter' ? 'font-family:Inter,sans-serif;'
    : c.font === 'italic' ? 'font-family:Fraunces,serif; font-style:italic;'
    : 'font-family:Fraunces,serif;';
  var ts = Math.round(w * 0.105);
  var pad = Math.round(w * 0.14);
  var inner = '';

  if (layout === 'scene') {
    inner +=
      '<div style="position:absolute; right:' + Math.round(w * 0.16) + 'px; top:' + Math.round(h * 0.2) + 'px; width:' + Math.round(w * 0.33) + 'px; height:' + Math.round(w * 0.33) + 'px; border-radius:50%; background:' + accent + '"></div>' +
      '<div style="position:absolute; left:-16%; right:-16%; bottom:-' + Math.round(h * 0.2) + 'px; height:' + Math.round(h * 0.46) + 'px; border-radius:50% 50% 0 0; background:' + shade(bg, 0.72) + '"></div>' +
      '<div style="position:absolute; left:' + pad + 'px; top:' + pad + 'px; right:' + pad + 'px; ' + fontCss + ' font-weight:600; font-size:' + ts + 'px; line-height:1.28; color:' + text + '">' + esc(book.title) + '</div>' +
      '<div style="position:absolute; left:' + pad + 'px; bottom:' + Math.round(h * 0.05) + 'px; font-family:Inter,sans-serif; font-size:' + Math.max(8, Math.round(w * 0.052)) + 'px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:' + sub + '">' + esc(book.author) + '</div>';
  } else if (layout === 'frame') {
    inner +=
      '<div style="position:absolute; inset:' + Math.round(w * 0.1) + 'px; border:1px solid ' + accent + '; border-radius:4px"></div>' +
      '<div style="position:absolute; inset:' + Math.round(w * 0.13) + 'px; border:1px solid ' + accent + '55; border-radius:3px"></div>' +
      '<div style="position:absolute; left:' + pad + 'px; right:' + pad + 'px; top:' + Math.round(h * 0.2) + 'px; text-align:center; ' + fontCss + ' font-weight:500; font-size:' + ts + 'px; line-height:1.3; color:' + text + '">' + esc(book.title) + '</div>' +
      '<div style="position:absolute; left:50%; bottom:' + Math.round(h * 0.26) + 'px; transform:translateX(-50%); width:' + Math.round(w * 0.2) + 'px; height:3px; background:' + accent + '"></div>' +
      '<div style="position:absolute; left:0; right:0; bottom:' + Math.round(h * 0.1) + 'px; text-align:center; font-family:Inter,sans-serif; font-size:' + Math.max(8, Math.round(w * 0.052)) + 'px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:' + sub + '">' + esc(book.author) + '</div>';
  } else if (layout === 'bigtitle') {
    inner +=
      '<div style="position:absolute; left:' + pad + 'px; right:' + Math.round(pad * 0.7) + 'px; top:' + Math.round(h * 0.13) + 'px; ' + fontCss + ' font-weight:600; font-size:' + Math.round(w * 0.14) + 'px; line-height:1.18; color:' + text + '">' + esc(book.title) + '</div>' +
      '<div style="position:absolute; left:' + pad + 'px; bottom:' + Math.round(h * 0.22) + 'px; width:' + Math.round(w * 0.42) + 'px; height:3px; background:' + accent + '"></div>' +
      '<div style="position:absolute; left:' + pad + 'px; bottom:' + Math.round(h * 0.09) + 'px; font-family:Inter,sans-serif; font-size:' + Math.max(8, Math.round(w * 0.052)) + 'px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:' + sub + '">' + esc(book.author) + '</div>';
  } else { /* circle */
    inner +=
      '<div style="position:absolute; left:0; right:0; top:' + Math.round(h * 0.11) + 'px; text-align:center; padding:0 ' + pad + 'px; ' + fontCss + ' font-weight:600; font-size:' + Math.round(w * 0.09) + 'px; line-height:1.25; color:' + text + '">' + esc(book.title) + '</div>' +
      '<div style="position:absolute; left:50%; top:52%; transform:translate(-50%,-50%); width:' + Math.round(w * 0.5) + 'px; height:' + Math.round(w * 0.5) + 'px; border-radius:50%; background:' + accent + '"></div>' +
      '<div style="position:absolute; left:0; right:0; bottom:' + Math.round(h * 0.07) + 'px; text-align:center; font-family:Inter,sans-serif; font-size:' + Math.max(8, Math.round(w * 0.052)) + 'px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:' + sub + '">' + esc(book.author) + '</div>';
  }

  var spineW = Math.max(6, Math.round(w * 0.068));
  var edgeW = Math.max(3, Math.round(w * 0.026));
  return '<div class="drawn-book" style="position:relative; width:' + w + 'px; height:' + h + 'px; border-radius:' + Math.round(w * 0.032) + 'px ' + Math.round(w * 0.063) + 'px ' + Math.round(w * 0.063) + 'px ' + Math.round(w * 0.032) + 'px; background:' + bg + '; ' + (light ? 'border:1px solid #E0D5BE; box-sizing:border-box; ' : '') + 'box-shadow:0 ' + Math.round(h * 0.075) + 'px ' + Math.round(h * 0.12) + 'px -' + Math.round(h * 0.068) + 'px rgba(36,29,21,.55); overflow:hidden">' +
    inner +
    '<div style="position:absolute; left:0; top:0; bottom:0; width:' + spineW + 'px; background:rgba(0,0,0,' + (light ? '.12' : '.26') + ')"></div>' +
    '<div style="position:absolute; right:0; top:0; bottom:0; width:' + edgeW + 'px; background:repeating-linear-gradient(to bottom,#F6F1E7 0 2px,#D8CDB6 2px 4px)"></div>' +
    '</div>';
}

/* ----------------------------------------------------------- color picker */
/* ibisPaint-style picker: hue wheel + shade diamond + RGB/HSB sliders + hex
   + palette presets. mount(el, startHex, onChange) */
function mountColorPicker(root, startHex, onChange) {
  var rgb = hexToRgb(startHex);
  var hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  var mode = 'rgb'; /* palette | rgb | hsb */
  var prevHex = rgbToHex(rgb.r, rgb.g, rgb.b);
  var PRESETS = ['#2A3655', '#27584A', '#B4552D', '#E8B54A', '#F0E8D5', '#241D15',
                 '#7A3E8F', '#1F6F8B', '#C2362B', '#3E7A3E', '#D97742', '#FFFDF8'];

  var SIZE = 210, RING = 26;
  var DIA = Math.round((SIZE - RING * 2 - 14) / Math.SQRT2) + 18; /* diamond square side */

  root.innerHTML =
    '<div class="cp">' +
    '  <div class="cp-head">' +
    '    <span class="cp-hex-label">Hex</span>' +
    '    <input class="cp-hex" type="text" value="" aria-label="Hex color value" spellcheck="false">' +
    '    <span class="cp-pair" aria-hidden="true"><span class="cp-prev"></span><span class="cp-cur"></span></span>' +
    '  </div>' +
    '  <div class="cp-wheel" style="width:' + SIZE + 'px; height:' + SIZE + 'px">' +
    '    <div class="cp-ring"></div>' +
    '    <div class="cp-hole"></div>' +
    '    <div class="cp-dia" style="width:' + DIA + 'px; height:' + DIA + 'px">' +
    '      <div class="cp-dia-hue"></div>' +
    '      <div class="cp-dia-black"></div>' +
    '    </div>' +
    '    <span class="cp-dot cp-dot-ring"></span>' +
    '    <span class="cp-dot cp-dot-dia"></span>' +
    '  </div>' +
    '  <div class="cp-sliders"></div>' +
    '  <div class="cp-tabs">' +
    '    <button type="button" class="cp-tab" data-mode="palette">Palette</button>' +
    '    <button type="button" class="cp-tab" data-mode="rgb">RGB</button>' +
    '    <button type="button" class="cp-tab" data-mode="hsb">HSB</button>' +
    '  </div>' +
    '</div>';

  var wheel = root.querySelector('.cp-wheel');
  var dia = root.querySelector('.cp-dia');
  var diaHue = root.querySelector('.cp-dia-hue');
  var dotRing = root.querySelector('.cp-dot-ring');
  var dotDia = root.querySelector('.cp-dot-dia');
  var hexInput = root.querySelector('.cp-hex');
  var slidersEl = root.querySelector('.cp-sliders');
  var curEl = root.querySelector('.cp-cur');
  var prevEl = root.querySelector('.cp-prev');
  prevEl.style.background = prevHex;

  function currentRgb() { return hsvToRgb(hsv.h, hsv.s, hsv.v); }
  function currentHex() { var c = currentRgb(); return rgbToHex(c.r, c.g, c.b); }

  function fire() {
    var hex = currentHex();
    curEl.style.background = hex;
    if (onChange) onChange(hex);
  }

  function positionDots() {
    var cx = SIZE / 2, cy = SIZE / 2;
    var rMid = (SIZE - RING) / 2;
    var a = (hsv.h - 90) * Math.PI / 180;
    dotRing.style.left = (cx + rMid * Math.cos(a) - 9) + 'px';
    dotRing.style.top = (cy + rMid * Math.sin(a) - 9) + 'px';
    /* diamond: s along one diagonal axis, v along the other */
    var half = DIA / 2;
    var ux = (hsv.s - 0.5) * DIA;
    var uy = (0.5 - hsv.v) * DIA;
    var rx = (ux - uy) / Math.SQRT2;
    var ry = (ux + uy) / Math.SQRT2;
    dotDia.style.left = (cx + rx - 7) + 'px';
    dotDia.style.top = (cy + ry - 7) + 'px';
  }

  function renderSliders() {
    var c = currentRgb();
    var rows;
    if (mode === 'palette') {
      var sw = '';
      for (var i = 0; i < PRESETS.length; i++) {
        sw += '<button type="button" class="cp-swatch" data-hex="' + PRESETS[i] + '" aria-label="Use color ' + PRESETS[i] + '" style="background:' + PRESETS[i] + '"></button>';
      }
      slidersEl.innerHTML = '<div class="cp-palette">' + sw + '</div>';
      var btns = slidersEl.querySelectorAll('.cp-swatch');
      for (var b = 0; b < btns.length; b++) {
        btns[b].addEventListener('click', function () {
          setHex(this.getAttribute('data-hex'));
        });
      }
      return;
    }
    if (mode === 'rgb') {
      rows = [
        { k: 'r', label: 'R', val: Math.round(c.r), max: 255, grad: 'linear-gradient(to right,#140000,#FF3B30)' },
        { k: 'g', label: 'G', val: Math.round(c.g), max: 255, grad: 'linear-gradient(to right,#001400,#34C759)' },
        { k: 'b', label: 'B', val: Math.round(c.b), max: 255, grad: 'linear-gradient(to right,#000014,#007AFF)' }
      ];
    } else {
      rows = [
        { k: 'h', label: 'H', val: Math.round(hsv.h), max: 360, grad: 'linear-gradient(to right,#F00,#FF0,#0F0,#0FF,#00F,#F0F,#F00)' },
        { k: 's', label: 'S', val: Math.round(hsv.s * 100), max: 100, grad: 'linear-gradient(to right,#FFFFFF,' + rgbToHex(hsvToRgb(hsv.h, 1, 1).r, hsvToRgb(hsv.h, 1, 1).g, hsvToRgb(hsv.h, 1, 1).b) + ')' },
        { k: 'v', label: 'B', val: Math.round(hsv.v * 100), max: 100, grad: 'linear-gradient(to right,#000000,' + rgbToHex(hsvToRgb(hsv.h, hsv.s, 1).r, hsvToRgb(hsv.h, hsv.s, 1).g, hsvToRgb(hsv.h, hsv.s, 1).b) + ')' }
      ];
    }
    var html = '';
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      html +=
        '<div class="cp-row">' +
        '  <span class="cp-val">' + r.val + '</span>' +
        '  <button type="button" class="cp-step" data-k="' + r.k + '" data-d="-1" aria-label="Decrease ' + r.label + '">−</button>' +
        '  <input type="range" class="cp-range" data-k="' + r.k + '" min="0" max="' + r.max + '" value="' + r.val + '" style="background:' + r.grad + '" aria-label="' + r.label + ' value">' +
        '  <button type="button" class="cp-step" data-k="' + r.k + '" data-d="1" aria-label="Increase ' + r.label + '">+</button>' +
        '</div>';
    }
    slidersEl.innerHTML = html;
    var ranges = slidersEl.querySelectorAll('.cp-range');
    for (var x = 0; x < ranges.length; x++) {
      ranges[x].addEventListener('input', function () { applyChannel(this.getAttribute('data-k'), Number(this.value)); });
    }
    var steps = slidersEl.querySelectorAll('.cp-step');
    for (var y = 0; y < steps.length; y++) {
      steps[y].addEventListener('click', function () {
        var k = this.getAttribute('data-k'), d = Number(this.getAttribute('data-d'));
        var input = slidersEl.querySelector('.cp-range[data-k="' + k + '"]');
        var nv = clamp(Number(input.value) + d, 0, Number(input.max));
        input.value = nv;
        applyChannel(k, nv);
      });
    }
  }

  function applyChannel(k, val) {
    if (k === 'r' || k === 'g' || k === 'b') {
      var c = currentRgb();
      c[k] = val;
      hsv = rgbToHsv(c.r, c.g, c.b);
    } else if (k === 'h') { hsv.h = clamp(val, 0, 360) % 360.0001; }
    else if (k === 's') { hsv.s = clamp(val / 100, 0, 1); }
    else if (k === 'v') { hsv.v = clamp(val / 100, 0, 1); }
    sync({ keepSliders: true, from: k });
  }

  function sync(opts) {
    opts = opts || {};
    var hex = currentHex();
    hexInput.value = hex;
    var hueHex = (function () { var c = hsvToRgb(hsv.h, 1, 1); return rgbToHex(c.r, c.g, c.b); })();
    diaHue.style.background = 'linear-gradient(to right,#FFFFFF,' + hueHex + ')';
    positionDots();
    if (!opts.keepSliders) renderSliders();
    else {
      /* refresh numbers without rebuilding (so the slider keeps focus) */
      var rowsEls = slidersEl.querySelectorAll('.cp-row');
      var c = currentRgb();
      var vals = mode === 'rgb'
        ? [Math.round(c.r), Math.round(c.g), Math.round(c.b)]
        : [Math.round(hsv.h), Math.round(hsv.s * 100), Math.round(hsv.v * 100)];
      var keys = mode === 'rgb' ? ['r', 'g', 'b'] : ['h', 's', 'v'];
      for (var i = 0; i < rowsEls.length; i++) {
        var valEl = rowsEls[i].querySelector('.cp-val');
        if (valEl) valEl.textContent = vals[i];
        var rangeEl = rowsEls[i].querySelector('.cp-range');
        if (rangeEl && keys[i] !== opts.from) rangeEl.value = vals[i];
      }
    }
    fire();
  }

  function setHex(hex) {
    var c = hexToRgb(hex);
    hsv = rgbToHsv(c.r, c.g, c.b);
    sync();
  }

  /* wheel interaction */
  function onWheelPoint(ev) {
    var rect = wheel.getBoundingClientRect();
    var x = ev.clientX - rect.left - SIZE / 2;
    var y = ev.clientY - rect.top - SIZE / 2;
    var dist = Math.sqrt(x * x + y * y);
    var rOuter = SIZE / 2, rInner = SIZE / 2 - RING;
    /* diamond coords */
    var ux = (x + y) / Math.SQRT2;
    var uy = (y - x) / Math.SQRT2;
    var half = DIA / 2;
    if (dragTarget === 'ring' || (dragTarget === null && dist >= rInner - 4 && dist <= rOuter + 6)) {
      dragTarget = 'ring';
      var ang = Math.atan2(y, x) * 180 / Math.PI + 90;
      if (ang < 0) ang += 360;
      hsv.h = ang;
      sync();
    } else if (dragTarget === 'dia' || (dragTarget === null && Math.abs(ux) <= half + 6 && Math.abs(uy) <= half + 6)) {
      dragTarget = 'dia';
      hsv.s = clamp((ux + half) / DIA, 0, 1);
      hsv.v = clamp(1 - (uy + half) / DIA, 0, 1);
      sync();
    }
  }
  var dragTarget = null;
  wheel.addEventListener('pointerdown', function (ev) {
    dragTarget = null;
    wheel.setPointerCapture(ev.pointerId);
    onWheelPoint(ev);
    function move(e) { onWheelPoint(e); }
    function upHandler() {
      wheel.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', upHandler);
      dragTarget = null;
    }
    wheel.addEventListener('pointermove', move);
    window.addEventListener('pointerup', upHandler);
  });

  hexInput.addEventListener('change', function () {
    var v = hexInput.value.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(v) && !/^#?[0-9a-fA-F]{3}$/.test(v)) { hexInput.value = currentHex(); return; }
    setHex(v.charAt(0) === '#' ? v : '#' + v);
  });

  var tabs = root.querySelectorAll('.cp-tab');
  function markTabs() {
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-mode') === mode);
    }
  }
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].addEventListener('click', function () {
      mode = this.getAttribute('data-mode');
      markTabs();
      renderSliders();
    });
  }
  markTabs();
  sync();
  return { setHex: setHex, getHex: currentHex };
}

/* ------------------------------------------------------------- pagination */
var PAGE_W = 430, PAGE_H = 574, PAGE_PAD = 46;

/* Waits for data-URL images inside an HTML string to be decoded. */
function preloadImages(html) {
  var div = document.createElement('div');
  div.innerHTML = html;
  var imgs = div.querySelectorAll('img');
  var jobs = [];
  for (var i = 0; i < imgs.length; i++) {
    (function (src) {
      jobs.push(new Promise(function (resolve) {
        var im = new Image();
        im.onload = im.onerror = function () { resolve(); };
        im.src = src;
      }));
    })(imgs[i].getAttribute('src'));
  }
  return Promise.all(jobs);
}

/* Breaks the book into page objects: {html, label, kind}. Async because
   images must be measured at real size. */
function paginateBook(book) {
  var all = '';
  for (var i = 0; i < book.sections.length; i++) all += book.sections[i].content || '';

  return preloadImages(all).then(function () {
    var pages = [];
    var measurer = document.createElement('div');
    measurer.className = 'page-measurer book-page-content';
    measurer.style.cssText = 'position:fixed; left:-9999px; top:0; width:' + (PAGE_W - PAGE_PAD * 2) + 'px; height:auto; padding:0; overflow:visible; visibility:hidden; pointer-events:none;';
    document.body.appendChild(measurer);
    var maxH = PAGE_H - PAGE_PAD * 2 - 26; /* room for the page number */

    function pushPage(html, label, kind) {
      pages.push({ html: html, label: label || '', kind: kind || 'text' });
    }

    function flowBlocks(heading, blocks, label) {
      var cur = [];
      var started = false;
      function commit() {
        if (!started && !cur.length) return;
        var head = (!started && heading) ? heading : '';
        pushPage('<div class="page-flow">' + head + cur.join('') + '</div>', label);
        started = true;
        cur = [];
      }
      measurer.innerHTML = '';
      var headEl = null;
      if (heading) { measurer.innerHTML = heading; }
      for (var b = 0; b < blocks.length; b++) {
        measurer.insertAdjacentHTML('beforeend', blocks[b]);
        if (measurer.scrollHeight > maxH && cur.length > 0) {
          commit();
          measurer.innerHTML = cur.join('') + blocks[b]; /* cur is empty now */
          measurer.innerHTML = blocks[b];
          cur = [blocks[b]];
        } else if (measurer.scrollHeight > maxH && cur.length === 0) {
          /* single block taller than a page: give it its own page */
          cur = [blocks[b]];
          commit();
          measurer.innerHTML = '';
        } else {
          cur.push(blocks[b]);
        }
      }
      commit();
    }

    function blocksOf(html) {
      var div = document.createElement('div');
      div.innerHTML = html || '';
      var out = [];
      for (var n = 0; n < div.childNodes.length; n++) {
        var node = div.childNodes[n];
        if (node.nodeType === 1) out.push(node.outerHTML);
        else if (node.nodeType === 3 && node.textContent.trim()) out.push('<p>' + esc(node.textContent) + '</p>');
      }
      return out;
    }

    var tocPageIndex = -1;
    var chapterStarts = [];

    for (var s = 0; s < book.sections.length; s++) {
      var sec = book.sections[s];
      if (sec.status === 'skipped') continue;
      var isEmpty = !(sec.content && sec.content.replace(/<[^>]*>/g, '').trim()) && !(sec.content && sec.content.indexOf('<img') >= 0);

      if (sec.type === 'title-page') {
        pushPage(
          '<div class="page-center">' +
          '<div class="tp-title">' + esc(book.title) + '</div>' +
          (book.author ? '<div class="tp-by">by</div><div class="tp-author">' + esc(book.author) + '</div>' : '') +
          '</div>', 'Title page', 'center');
      } else if (sec.type === 'toc') {
        tocPageIndex = pages.length;
        pushPage('', 'Contents', 'toc');
      } else if (sec.type === 'chapter') {
        if (isEmpty) continue;
        chapterStarts.push({ name: sec.name, page: pages.length });
        var heading = book.kind === 'pictures' ? '' : '<h2 class="ch-head">' + esc(sec.name) + '</h2>';
        flowBlocks(heading, blocksOf(sec.content), sec.name);
      } else {
        if (isEmpty) continue;
        if (sec.type === 'dedication' || sec.type === 'epigraph') {
          pushPage('<div class="page-center page-quiet">' + sec.content + '</div>', sec.name, 'center');
        } else {
          flowBlocks('<h2 class="ch-head">' + esc(sec.name) + '</h2>', blocksOf(sec.content), sec.name);
        }
      }
    }

    if (tocPageIndex >= 0) {
      var rows = '';
      for (var c = 0; c < chapterStarts.length; c++) {
        rows += '<div class="toc-row"><span class="toc-name">' + esc(chapterStarts[c].name) + '</span><span class="toc-dots"></span><span class="toc-num">' + (chapterStarts[c].page + 1) + '</span></div>';
      }
      pages[tocPageIndex].html =
        '<div class="page-flow"><h2 class="ch-head">Contents</h2>' +
        (rows || '<p class="toc-empty">Your chapters will appear here as you write them.</p>') +
        '</div>';
    }

    document.body.removeChild(measurer);
    if (!pages.length) {
      pushPage('<div class="page-center page-quiet"><p><em>This book has no pages yet — write something first.</em></p></div>', '', 'center');
    }
    return pages;
  });
}

function pageHTML(page, num) {
  if (!page) return '<div class="book-page empty-page"></div>';
  return '<div class="book-page"><div class="book-page-content">' + page.html + '</div>' +
    '<div class="page-num">' + num + '</div></div>';
}
