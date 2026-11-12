/* Book Maker — app: router, shelf, book workspace, reader, share */
'use strict';

var App = {
  books: [],
  writeSel: {},   /* bookId -> selected section id on the Write tab */
  _keyHandler: null,
  _saveTimer: null
};

/* ------------------------------------------------------------------ utils */
function textOf(html) {
  var d = document.createElement('div');
  d.innerHTML = html || '';
  return d.textContent || '';
}
function wordCount(html) {
  var t = textOf(html).trim();
  return t ? t.split(/\s+/).length : 0;
}
function sectionHasContent(sec) {
  return !!(sec.content && (textOf(sec.content).trim() || sec.content.indexOf('<img') >= 0));
}
function recomputeStatus(sec) {
  if (sec.status === 'skipped' || sec.status === 'auto') return;
  sec.status = sectionHasContent(sec) ? 'written' : 'empty';
}
function kindLabel(book) { return book.kind === 'pictures' ? 'Picture book' : 'Words only'; }
function chapters(book) {
  var out = [];
  for (var i = 0; i < book.sections.length; i++) if (book.sections[i].type === 'chapter') out.push(book.sections[i]);
  return out;
}
function bookStatusChip(book) {
  var ch = chapters(book), written = 0;
  for (var i = 0; i < ch.length; i++) if (ch[i].status === 'written') written++;
  if (!ch.length || !written) return '<span class="chip chip-gray">Just started</span>';
  if (written < ch.length) return '<span class="chip chip-green">In progress</span>';
  return '<span class="chip chip-green">Ready to share</span>';
}
function save() { saveBooks(App.books); }
function debouncedSave() {
  clearTimeout(App._saveTimer);
  App._saveTimer = setTimeout(save, 400);
}
function slug(s) {
  return String(s || 'book').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'book';
}
function download(filename, mime, content) {
  var blob = new Blob([content], { type: mime });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
}

/* ------------------------------------------------------------------ modal */
function modalRoot() { return document.getElementById('modal-root'); }
function closeModal() { modalRoot().innerHTML = ''; }

/* ------------------------------------------------------------------ init */
function init() {
  var loaded = loadBooks();
  if (loaded === null) {
    App.books = [demoBook()];
    save();
  } else {
    App.books = loaded;
  }
  window.addEventListener('hashchange', route);
  route();
}

function route() {
  closeModal();
  if (App._keyHandler) { document.removeEventListener('keydown', App._keyHandler); App._keyHandler = null; }
  var h = location.hash.replace(/^#\/?/, '');
  var parts = h.split('/');
  var el = document.getElementById('app');
  if (parts[0] === 'book' && parts[1]) {
    var book = getBook(App.books, parts[1]);
    if (!book) { location.hash = '#/'; return; }
    renderBookView(el, book, parts[2] || 'contents');
  } else {
    renderShelf(el);
  }
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------------ shelf */
function renderShelf(el) {
  var sorted = App.books.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });
  var cards = '';
  for (var i = 0; i < sorted.length; i++) {
    var b = sorted[i];
    var ch = chapters(b);
    cards +=
      '<div class="book-card">' +
      '  <a class="cover-link" href="#/book/' + b.id + '/contents" aria-label="Open ' + esc(b.title) + '">' + coverHTML(b, 190, 264) + '</a>' +
      '  <button class="icon-btn del" data-del="' + b.id + '" aria-label="Delete ' + esc(b.title) + '">' + ICONS.trash + '</button>' +
      '  <div class="meta">' +
      '    <span class="t">' + esc(b.title) + '</span>' +
      '    <span class="a">' + (b.author ? 'by ' + esc(b.author) : '&nbsp;') + '</span>' +
      '    <span class="a">' + kindLabel(b) + ' · ' + ch.length + ' ' + bodyLabel(b).toLowerCase() + (ch.length === 1 ? '' : 's') + '</span>' +
      '    <span>' + bookStatusChip(b) + '</span>' +
      '  </div>' +
      '</div>';
  }
  el.innerHTML =
    '<nav class="topnav">' +
    '  <a class="brand" href="#/">' + ICONS.book + '<span class="name">Book Maker</span></a>' +
    '  <div class="right"><span class="savenote">' + App.books.length + ' book' + (App.books.length === 1 ? '' : 's') + ' · saved in this browser</span></div>' +
    '</nav>' +
    '<main class="shelf-main">' +
    '  <header class="shelf-head">' +
    '    <div><h1>Your bookshelf</h1>' +
    '    <p>Open a book to keep writing, or start something brand new.</p></div>' +
    '    <button class="btn btn-primary" id="new-book-top">' + ICONS.plus + ' New book</button>' +
    '  </header>' +
    '  <div class="shelf-grid">' +
    '    <div class="book-card"><button class="newbook-card" id="new-book-card" aria-label="Add a new book">' +
    '      <span class="ring"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19"/><path d="M11.5 9.5h5"/><path d="M14 7v5"/></svg></span>' +
    '      <span>Add a new book</span></button>' +
    '      <div class="meta"><span class="a">Start a novel, memoir, poetry book or picture book.</span></div>' +
    '    </div>' +
    cards +
    '  </div>' +
    '  <p class="demo-note">Books are saved privately in this browser. Use Share → Backup inside a book to move them to another computer.</p>' +
    '</main>';

  function openNew() { openNewBookModal(); }
  document.getElementById('new-book-card').addEventListener('click', openNew);
  document.getElementById('new-book-top').addEventListener('click', openNew);
  var dels = el.querySelectorAll('[data-del]');
  for (var d = 0; d < dels.length; d++) {
    dels[d].addEventListener('click', function () {
      var id = this.getAttribute('data-del');
      var bk = getBook(App.books, id);
      if (!bk) return;
      if (confirm('Delete “' + bk.title + '”? This removes the whole book from this browser and cannot be undone.')) {
        App.books = App.books.filter(function (x) { return x.id !== id; });
        save();
        renderShelf(el);
      }
    });
  }
}

/* --------------------------------------------------------- new book modal */
function openNewBookModal() {
  var temp = { title: '', author: '', kind: 'words', cover: { bg: '#27584A', accent: '#E8B54A', layout: 'frame', font: 'fraunces' } };
  modalRoot().innerHTML =
    '<div class="modal-scrim" id="nb-scrim">' +
    '<div class="modal" role="dialog" aria-label="Create a new book">' +
    '  <div class="form-side">' +
    '    <div><p class="eyebrow">New book</p><h1>Let’s start a book</h1></div>' +
    '    <div class="field"><label for="nb-title">Book title</label>' +
    '      <input class="title-input" id="nb-title" type="text" placeholder="The title of your book"></div>' +
    '    <div class="field"><label for="nb-author">By (author name)</label>' +
    '      <input id="nb-author" type="text" placeholder="Your name"></div>' +
    '    <div class="field"><label>What kind of book?</label>' +
    '      <div class="kind-cards">' +
    '        <button type="button" class="kind-card selected" data-kind="words">' +
    '          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 6h14M5 10h14M5 14h10M5 18h7"/></svg>' +
    '          <span class="k-name">Just words</span>' +
    '          <span class="k-desc">Novels, memoirs, poetry — clean pages of text.</span>' +
    '          <span class="check">✓</span></button>' +
    '        <button type="button" class="kind-card" data-kind="pictures">' +
    '          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><circle cx="8.5" cy="9" r="1.6"/><path d="m3 15 5-4 4 3 4-5 5 6"/><path d="M7 21h10"/></svg>' +
    '          <span class="k-name">Words &amp; pictures</span>' +
    '          <span class="k-desc">Children’s books, photo books — drawings on every page.</span>' +
    '          <span class="check">✓</span></button>' +
    '      </div></div>' +
    '    <div class="actions">' +
    '      <button class="btn btn-primary" id="nb-create">Create my book</button>' +
    '      <button class="btn btn-ghost" id="nb-cancel">Cancel</button>' +
    '    </div>' +
    '  </div>' +
    '  <div class="preview-side">' +
    '    <div id="nb-preview">' + coverHTML(temp, 200, 278) + '</div>' +
    '    <p class="note">Your book takes shape as you type — you’ll design the full cover next.</p>' +
    '  </div>' +
    '</div></div>';

  var titleEl = document.getElementById('nb-title');
  var authorEl = document.getElementById('nb-author');
  var prev = document.getElementById('nb-preview');

  function refresh() {
    temp.title = titleEl.value || 'Untitled book';
    temp.author = authorEl.value;
    temp.cover.bg = temp.kind === 'pictures' ? '#2A3655' : '#27584A';
    temp.cover.layout = temp.kind === 'pictures' ? 'scene' : 'frame';
    prev.innerHTML = coverHTML(temp, 200, 278);
  }
  titleEl.addEventListener('input', refresh);
  authorEl.addEventListener('input', refresh);
  var kinds = modalRoot().querySelectorAll('.kind-card');
  for (var k = 0; k < kinds.length; k++) {
    kinds[k].addEventListener('click', function () {
      temp.kind = this.getAttribute('data-kind');
      for (var j = 0; j < kinds.length; j++) kinds[j].classList.toggle('selected', kinds[j] === this);
      refresh();
    });
  }
  document.getElementById('nb-cancel').addEventListener('click', closeModal);
  document.getElementById('nb-scrim').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  document.getElementById('nb-create').addEventListener('click', function () {
    var book = newBook(titleEl.value.trim() || 'Untitled book', authorEl.value.trim(), temp.kind);
    App.books.push(book);
    save();
    closeModal();
    location.hash = '#/book/' + book.id + '/cover';
  });
  titleEl.focus();
}

/* ---------------------------------------------------------- book workspace */
var TABS = [
  { id: 'cover', name: 'Cover' },
  { id: 'contents', name: 'Contents' },
  { id: 'write', name: 'Write' },
  { id: 'read', name: 'Read' },
  { id: 'share', name: 'Share' }
];

function renderBookView(el, book, tab) {
  var tabsHtml = '';
  for (var i = 0; i < TABS.length; i++) {
    tabsHtml += '<button class="tab' + (TABS[i].id === tab ? ' active' : '') + '" data-tab="' + TABS[i].id + '">' + TABS[i].name + '</button>';
  }
  el.innerHTML =
    '<nav class="topnav">' +
    '  <div class="crumbs">' +
    '    <a class="backlink" href="#/">' + ICONS.back + ' Bookshelf</a>' +
    '    <span class="sep" aria-hidden="true">/</span>' +
    '    <span class="crumb-title">' + esc(book.title) + '</span>' +
    '    <button class="icon-btn" id="rename-book" aria-label="Rename book or author">' + ICONS.pencil + '</button>' +
    '    <span class="chip ' + (book.kind === 'pictures' ? 'chip-green' : 'chip-amber') + '">' + kindLabel(book) + '</span>' +
    '  </div>' +
    '  <div class="right">' +
    '    <span class="savenote">All changes saved in this browser</span>' +
    (tab !== 'share' ? '    <button class="btn btn-primary btn-sm" id="go-share">' + ICONS.share + ' Share</button>' : '') +
    '  </div>' +
    '</nav>' +
    '<div class="tabsbar">' + tabsHtml + '</div>' +
    '<div class="workspace" id="ws"></div>';

  var tabBtns = el.querySelectorAll('.tabsbar .tab');
  for (var t = 0; t < tabBtns.length; t++) {
    tabBtns[t].addEventListener('click', function () {
      location.hash = '#/book/' + book.id + '/' + this.getAttribute('data-tab');
    });
  }
  var shareBtn = document.getElementById('go-share');
  if (shareBtn) shareBtn.addEventListener('click', function () { location.hash = '#/book/' + book.id + '/share'; });
  document.getElementById('rename-book').addEventListener('click', function () {
    var nt = prompt('Book title', book.title);
    if (nt === null) return;
    var na = prompt('Author name', book.author);
    if (na === null) na = book.author;
    book.title = nt.trim() || book.title;
    book.author = na.trim();
    touch(book); save();
    renderBookView(el, book, tab);
  });

  var ws = document.getElementById('ws');
  if (tab === 'cover') renderCoverTab(ws, book);
  else if (tab === 'write') renderWriteTab(ws, book);
  else if (tab === 'read') renderReadTab(ws, book);
  else if (tab === 'share') renderShareTab(ws, book);
  else renderContentsTab(ws, book);
}

/* -------------------------------------------------------------- cover tab */
function layoutThumb(layout, cover, selected) {
  var bg = cover.bg, ac = cover.accent;
  var inner = '';
  if (layout === 'scene') {
    inner = '<span style="position:absolute; right:14px; top:12px; width:22px; height:22px; border-radius:50%; background:' + ac + '"></span>' +
            '<span style="position:absolute; left:-12px; right:-12px; bottom:-20px; height:42px; border-radius:50% 50% 0 0; background:' + shade(bg, 0.72) + '"></span>';
  } else if (layout === 'frame') {
    inner = '<span style="position:absolute; inset:8px; border:1px solid ' + ac + '; border-radius:3px"></span>';
  } else if (layout === 'bigtitle') {
    inner = '<span style="position:absolute; left:12px; top:13px; width:52px; height:7px; background:' + (luminance(bg) > 0.6 ? '#241D15' : '#FBF7EE') + '; border-radius:2px"></span>' +
            '<span style="position:absolute; left:12px; top:26px; width:34px; height:7px; background:' + (luminance(bg) > 0.6 ? '#241D15' : '#FBF7EE') + '; border-radius:2px"></span>' +
            '<span style="position:absolute; left:12px; bottom:14px; width:28px; height:3px; background:' + ac + '"></span>';
  } else {
    inner = '<span style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:36px; height:36px; border-radius:50%; background:' + ac + '"></span>';
  }
  return '<button type="button" class="layout-thumb' + (selected ? ' selected' : '') + '" data-layout="' + layout + '" aria-label="Layout: ' + layout + (selected ? ', selected' : '') + '" style="background:' + bg + '">' + inner + '</button>';
}

function renderCoverTab(ws, book) {
  var target = 'bg';
  ws.innerHTML =
    '<div class="cover-layout">' +
    '  <div class="cover-panel">' +
    '    <section><h2 class="panel-h">Cover layouts</h2><div class="layout-grid" id="layout-grid"></div></section>' +
    '    <section><h2 class="panel-h">Title lettering</h2><div id="font-opts"></div></section>' +
    '  </div>' +
    '  <div class="cover-stage">' +
    '    <div id="cover-big"></div>' +
    '    <p class="cover-caption">This is your real cover — it appears on the shelf, in the reader, on the PDF and in the digital book.</p>' +
    '  </div>' +
    '  <div class="cover-panel">' +
    '    <section><h2 class="panel-h">Color</h2>' +
    '      <div class="target-toggle" id="target-toggle" style="margin-bottom:14px">' +
    '        <button type="button" class="active" data-target="bg">Cover</button>' +
    '        <button type="button" data-target="accent">Accent</button>' +
    '      </div>' +
    '      <div id="picker-root"></div>' +
    '    </section>' +
    '  </div>' +
    '</div>';

  var FONTS = [
    { id: 'fraunces', label: 'Fraunces — storybook classic', css: 'font-family:Fraunces,serif' },
    { id: 'inter', label: 'Inter — clean &amp; modern', css: 'font-family:Inter,sans-serif' },
    { id: 'italic', label: 'Fraunces italic — gentle', css: 'font-family:Fraunces,serif; font-style:italic' }
  ];

  function refreshPanels() {
    var lg = document.getElementById('layout-grid');
    lg.innerHTML =
      layoutThumb('scene', book.cover, book.cover.layout === 'scene') +
      layoutThumb('frame', book.cover, book.cover.layout === 'frame') +
      layoutThumb('bigtitle', book.cover, book.cover.layout === 'bigtitle') +
      layoutThumb('circle', book.cover, book.cover.layout === 'circle');
    var lts = lg.querySelectorAll('.layout-thumb');
    for (var i = 0; i < lts.length; i++) {
      lts[i].addEventListener('click', function () {
        book.cover.layout = this.getAttribute('data-layout');
        touch(book); debouncedSave();
        refreshPanels(); refreshStage();
      });
    }
    var fo = document.getElementById('font-opts');
    var fh = '';
    for (var f = 0; f < FONTS.length; f++) {
      fh += '<button type="button" class="font-opt' + (book.cover.font === FONTS[f].id ? ' selected' : '') + '" data-font="' + FONTS[f].id + '" style="' + FONTS[f].css + '">' + FONTS[f].label + '</button>';
    }
    fo.innerHTML = fh;
    var fbs = fo.querySelectorAll('.font-opt');
    for (var b = 0; b < fbs.length; b++) {
      fbs[b].addEventListener('click', function () {
        book.cover.font = this.getAttribute('data-font');
        touch(book); debouncedSave();
        refreshPanels(); refreshStage();
      });
    }
  }
  function refreshStage() {
    document.getElementById('cover-big').innerHTML = coverHTML(book, 380, 530);
  }
  refreshPanels();
  refreshStage();

  var picker = mountColorPicker(document.getElementById('picker-root'), book.cover[target], function (hex) {
    book.cover[target] = hex;
    touch(book); debouncedSave();
    refreshStage();
    /* keep layout thumbs in sync without rebuilding on every drag tick */
  });
  var tt = document.getElementById('target-toggle');
  var tbs = tt.querySelectorAll('button');
  for (var x = 0; x < tbs.length; x++) {
    tbs[x].addEventListener('click', function () {
      target = this.getAttribute('data-target');
      for (var j = 0; j < tbs.length; j++) tbs[j].classList.toggle('active', tbs[j] === this);
      picker.setHex(book.cover[target]);
      refreshPanels();
    });
  }
}

/* ----------------------------------------------------------- contents tab */
function statusChip(sec) {
  if (sec.status === 'auto') return '<span class="chip chip-blue">Builds itself</span>';
  if (sec.status === 'skipped') return '<span class="chip chip-gray">Skipped</span>';
  if (sec.status === 'written') return '<span class="chip chip-green">Written</span>';
  return '<span class="chip chip-gray">Empty</span>';
}

function secSub(book, sec) {
  if (sec.status === 'auto') {
    var def = catalogDef(sec.type);
    return def && def.hint ? def.hint : '';
  }
  if (sec.type === 'chapter' && sec.status === 'written') {
    var wc = wordCount(sec.content);
    var imgs = (sec.content.match(/<img/g) || []).length;
    var bits = [];
    if (wc) bits.push(wc + ' word' + (wc === 1 ? '' : 's'));
    if (imgs) bits.push(imgs + ' picture' + (imgs === 1 ? '' : 's'));
    return bits.join(' · ');
  }
  if ((sec.type === 'dedication' || sec.type === 'epigraph') && sec.status === 'written') {
    var t = textOf(sec.content).trim();
    return t.length > 46 ? '“' + t.slice(0, 46) + '…”' : '“' + t + '”';
  }
  return '';
}

function renderContentsTab(ws, book) {
  function rowsFor(group) {
    var html = '';
    var chaps = chapters(book);
    for (var i = 0; i < book.sections.length; i++) {
      var s = book.sections[i];
      var g = s.type === 'chapter' ? 'body' : (catalogDef(s.type) || { group: 'back' }).group;
      if (g !== group) continue;
      var sub = secSub(book, s);
      var acts = '';
      if (s.status === 'skipped') {
        acts = '<button class="btn btn-sm" data-act="unskip" data-id="' + s.id + '">Un-skip</button>';
      } else {
        if (s.status !== 'auto') {
          acts += '<button class="btn btn-soft btn-sm" data-act="write" data-id="' + s.id + '">' + (s.status === 'written' ? 'Edit' : 'Write it') + '</button>';
        }
        if (s.type === 'chapter') {
          var ci = chaps.indexOf(s);
          acts += '<button class="icon-btn" data-act="rename" data-id="' + s.id + '" aria-label="Rename ' + esc(s.name) + '">' + ICONS.pencil + '</button>';
          if (ci > 0) acts += '<button class="icon-btn" data-act="up" data-id="' + s.id + '" aria-label="Move ' + esc(s.name) + ' up">' + ICONS.up + '</button>';
          if (ci < chaps.length - 1) acts += '<button class="icon-btn" data-act="down" data-id="' + s.id + '" aria-label="Move ' + esc(s.name) + ' down">' + ICONS.down + '</button>';
        } else if (s.status !== 'auto') {
          acts += '<button class="icon-btn" data-act="skip" data-id="' + s.id + '" aria-label="Skip ' + esc(s.name) + '">' + ICONS.skip + '</button>';
        }
        acts += '<button class="icon-btn" data-act="del" data-id="' + s.id + '" aria-label="Remove ' + esc(s.name) + '">' + ICONS.trash + '</button>';
      }
      html +=
        '<div class="sec-row' + (s.status === 'skipped' ? ' skipped' : '') + '">' +
        '  <span class="nm">' + esc(s.name) + (sub ? '<span class="sub">' + sub + '</span>' : '') + '</span>' +
        statusChip(s) + acts +
        '</div>';
    }
    return html;
  }

  var removedHtml = '';
  for (var r = 0; r < book.removed.length; r++) {
    var rs = book.removed[r];
    removedHtml +=
      '<div class="removed-item">' +
      '  <div class="r1"><span class="n">' + esc(rs.name) + '</span>' +
      '  <button class="btn btn-sm" data-act="restore" data-id="' + rs.id + '">' + ICONS.restore + ' Add back</button></div>' +
      '  <p class="place">' + placementText(book, rs.type) + '</p>' +
      '</div>';
  }

  var present = {};
  for (var p = 0; p < book.sections.length; p++) present[book.sections[p].type] = true;
  for (var p2 = 0; p2 < book.removed.length; p2++) present[book.removed[p2].type] = true;
  var chipsHtml = '';
  for (var c = 0; c < SECTION_CATALOG.length; c++) {
    var def = SECTION_CATALOG[c];
    if (def.type === 'chapter' || present[def.type]) continue;
    chipsHtml += '<button data-act="add" data-type="' + def.type + '">+ ' + esc(def.name) + '</button>';
  }

  ws.innerHTML =
    '<header style="margin-bottom:30px; max-width:720px">' +
    '  <h1 style="margin:0 0 8px; font-family:Fraunces,serif; font-weight:600; font-size:34px; letter-spacing:-0.015em">What’s inside your book</h1>' +
    '  <p class="muted" style="margin:0; line-height:1.6">Book Maker lays out the classic order of a real book. Write any section, skip it, or remove it — removed sections wait in the tray and slide back into exactly the right spot.</p>' +
    '</header>' +
    '<div class="contents-layout">' +
    '  <div class="contents-main">' +
    '    <section><h2 class="group-h">Front matter</h2><div class="sec-list">' + rowsFor('front') + '</div></section>' +
    '    <section><h2 class="group-h">' + bodyLabel(book) + 's</h2><div class="sec-list">' + rowsFor('body') +
    '      <button class="add-chapter" data-act="addch">' + ICONS.plus + ' Add a ' + bodyLabel(book).toLowerCase() + '</button>' +
    '    </div></section>' +
    '    <section><h2 class="group-h">Back matter</h2><div class="sec-list">' + (rowsFor('back') || '<div class="sec-row"><span class="nm muted" style="font-weight:400">Nothing here yet — add sections from the tray.</span></div>') + '</div></section>' +
    '  </div>' +
    '  <aside class="contents-side">' +
    '    <div class="side-card"><h3>Removed sections</h3>' +
    '      <p class="d">Nothing is ever lost. Add a section back and it returns to its recommended place.</p>' +
    (removedHtml || '<p class="d" style="margin:0">Nothing has been removed.</p>') +
    '    </div>' +
    '    <div class="side-card"><h3>Add a section</h3><p class="d">Everything a real book can contain:</p><div class="addsec-chips">' + (chipsHtml || '<span class="muted" style="font-size:12.5px">Every section is already in your book.</span>') + '</div></div>' +
    '    <div class="tip-card"><h3>How ordering works</h3><p>Real books follow a traditional order: front matter, then ' + bodyLabel(book).toLowerCase() + 's, then back matter. Book Maker always suggests the right spot for every section you add.</p></div>' +
    '  </aside>' +
    '</div>';

  ws.onclick = function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    var id = btn.getAttribute('data-id');
    var sec = null, idx = -1;
    for (var i = 0; i < book.sections.length; i++) if (book.sections[i].id === id) { sec = book.sections[i]; idx = i; }

    if (act === 'write' && sec) {
      App.writeSel[book.id] = sec.id;
      location.hash = '#/book/' + book.id + '/write';
      return;
    }
    if (act === 'skip' && sec) { sec.status = 'skipped'; }
    if (act === 'unskip' && sec) { sec.status = 'empty'; recomputeStatus(sec); if (catalogDef(sec.type) && catalogDef(sec.type).auto) sec.status = 'auto'; }
    if (act === 'del' && sec) {
      book.sections.splice(idx, 1);
      book.removed.push(sec);
    }
    if (act === 'rename' && sec) {
      var nn = prompt(bodyLabel(book) + ' name', sec.name);
      if (nn !== null && nn.trim()) sec.name = nn.trim();
    }
    if ((act === 'up' || act === 'down') && sec) {
      var dir = act === 'up' ? -1 : 1;
      var j = idx + dir;
      if (j >= 0 && j < book.sections.length && book.sections[j].type === 'chapter') {
        var tmp = book.sections[j];
        book.sections[j] = sec;
        book.sections[idx] = tmp;
      }
    }
    if (act === 'restore') {
      var ri = -1;
      for (var r2 = 0; r2 < book.removed.length; r2++) if (book.removed[r2].id === id) ri = r2;
      if (ri >= 0) {
        var restored = book.removed.splice(ri, 1)[0];
        insertSectionInOrder(book, restored);
      }
    }
    if (act === 'add') {
      insertSectionInOrder(book, btn.getAttribute('data-type'));
    }
    if (act === 'addch') {
      var ns = insertSectionInOrder(book, 'chapter');
      ns.name = bodyLabel(book) + ' ' + chapters(book).length;
    }
    touch(book); save();
    renderContentsTab(ws, book);
  };
}

/* -------------------------------------------------------------- write tab */
function renderWriteTab(ws, book) {
  var selId = App.writeSel[book.id];
  var sel = null;
  for (var i = 0; i < book.sections.length; i++) if (book.sections[i].id === selId) sel = book.sections[i];
  if (!sel) {
    /* first editable, non-skipped section with content, else first chapter */
    var chaps = chapters(book);
    sel = chaps[0] || book.sections[0];
    for (var j = 0; j < book.sections.length; j++) {
      if (book.sections[j].status === 'written' && book.sections[j].type === 'chapter') { sel = book.sections[j]; break; }
    }
    if (sel) App.writeSel[book.id] = sel.id;
  }

  var listHtml = '<div class="ws-h">Sections</div>';
  for (var s = 0; s < book.sections.length; s++) {
    var sec = book.sections[s];
    listHtml +=
      '<button class="ws-item' + (sel && sec.id === sel.id ? ' active' : '') + '" data-sel="' + sec.id + '">' +
      '<span class="dot dot-' + sec.status + '"></span>' +
      '<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">' + esc(sec.name) + '</span>' +
      '</button>';
  }
  listHtml += '<button class="ws-item ws-add" id="ws-add">' + ICONS.plus + ' Add a ' + bodyLabel(book).toLowerCase() + '</button>';

  ws.innerHTML =
    '<div class="write-layout">' +
    '  <aside class="write-side">' + listHtml + '</aside>' +
    '  <div class="write-main" id="write-main"></div>' +
    '</div>';

  var items = ws.querySelectorAll('[data-sel]');
  for (var it = 0; it < items.length; it++) {
    items[it].addEventListener('click', function () {
      App.writeSel[book.id] = this.getAttribute('data-sel');
      renderWriteTab(ws, book);
    });
  }
  document.getElementById('ws-add').addEventListener('click', function () {
    var ns = insertSectionInOrder(book, 'chapter');
    ns.name = bodyLabel(book) + ' ' + chapters(book).length;
    touch(book); save();
    App.writeSel[book.id] = ns.id;
    renderWriteTab(ws, book);
  });
  renderEditor(document.getElementById('write-main'), ws, book, sel);
}

function renderEditor(main, ws, book, sec) {
  if (!sec) { main.innerHTML = '<p class="muted">Pick a section on the left.</p>'; return; }

  if (sec.status === 'auto') {
    if (sec.type === 'toc') {
      var rows = '';
      var ch = chapters(book);
      for (var c = 0; c < ch.length; c++) {
        if (ch[c].status === 'skipped') continue;
        rows += '<div class="toc-row">' +
          '<button class="toc-edit" data-rn="' + ch[c].id + '" aria-label="Rename ' + esc(ch[c].name) + ' in the table of contents">' + esc(ch[c].name) + ' ' + ICONS.pencil + '</button>' +
          '<span class="toc-dots"></span><span class="toc-num">·</span></div>';
      }
      main.innerHTML =
        '<div class="sec-head-row"><h2>' + esc(sec.name) + '</h2>' + statusChip(sec) + '</div>' +
        '<div class="auto-note">Each line below is one of your ' + bodyLabel(book).toLowerCase() + 's — <strong>click a name to change how it reads</strong> (“Page 1” can become “The Old Porch”). Page numbers fill themselves in, in the reader and the PDF.</div>' +
        '<div class="editor-page"><h2 class="ch-head">Contents</h2>' +
        (rows || '<p class="toc-empty">Your ' + bodyLabel(book).toLowerCase() + 's will appear here as you add them.</p>') +
        '<button class="add-chapter" id="toc-add" style="margin:20px 0 0; width:auto; padding:10px 22px; font-family:Inter,sans-serif; font-size:13.5px">' + ICONS.plus + ' Add a ' + bodyLabel(book).toLowerCase() + '</button>' +
        '</div>';
      var rns = main.querySelectorAll('[data-rn]');
      for (var r = 0; r < rns.length; r++) {
        rns[r].addEventListener('click', function () {
          var id = this.getAttribute('data-rn');
          var target = null;
          for (var i2 = 0; i2 < book.sections.length; i2++) if (book.sections[i2].id === id) target = book.sections[i2];
          if (!target) return;
          var nn = prompt('How should this read in the table of contents?', target.name);
          if (nn !== null && nn.trim()) {
            target.name = nn.trim();
            touch(book); save();
            renderWriteTab(ws, book);
          }
        });
      }
      document.getElementById('toc-add').addEventListener('click', function () {
        var ns = insertSectionInOrder(book, 'chapter');
        ns.name = bodyLabel(book) + ' ' + chapters(book).length;
        touch(book); save();
        renderWriteTab(ws, book);
      });
      return;
    }
    main.innerHTML =
      '<div class="sec-head-row"><h2>' + esc(sec.name) + '</h2>' + statusChip(sec) + '</div>' +
      '<div class="auto-note">This page builds itself from your book — nothing to write here. Change the title or author with the pencil up top.</div>' +
      '<div class="editor-page" style="pointer-events:none"><div class="page-center">' +
      '<div class="tp-title">' + esc(book.title) + '</div>' +
      (book.author ? '<div class="tp-by">by</div><div class="tp-author">' + esc(book.author) + '</div>' : '') +
      '</div></div>';
    return;
  }

  if (sec.status === 'skipped') {
    main.innerHTML =
      '<div class="sec-head-row"><h2>' + esc(sec.name) + '</h2>' + statusChip(sec) + '</div>' +
      '<div class="auto-note">This section is skipped, so it won’t appear in the finished book.</div>' +
      '<div><button class="btn btn-soft" id="unskip-btn">Un-skip and write it</button></div>';
    document.getElementById('unskip-btn').addEventListener('click', function () {
      sec.status = 'empty'; recomputeStatus(sec);
      touch(book); save();
      renderWriteTab(ws, book);
    });
    return;
  }

  var placeholder = sec.type === 'chapter'
    ? (book.kind === 'pictures' ? 'Write this page… then add a picture or a drawing.' : 'Once upon a time…')
    : 'Write your ' + sec.name.toLowerCase() + ' here…';

  main.innerHTML =
    '<div class="sec-head-row"><div style="display:flex; align-items:center; gap:8px; min-width:0"><h2 id="ed-name">' + esc(sec.name) + '</h2>' +
    (sec.type === 'chapter' ? '<button class="icon-btn" id="ed-rename" aria-label="Rename ' + esc(sec.name) + '">' + ICONS.pencil + '</button>' : '') +
    '</div><span id="ed-chip">' + statusChip(sec) + '</span></div>' +
    '<div class="editor-toolbar" role="toolbar" aria-label="Formatting">' +
    '  <button class="tb-btn" data-cmd="bold" aria-label="Bold" style="font-weight:700">B</button>' +
    '  <button class="tb-btn" data-cmd="italic" aria-label="Italic" style="font-style:italic; font-family:Fraunces,serif">I</button>' +
    '  <button class="tb-btn" data-cmd="h2">Heading</button>' +
    '  <button class="tb-btn" data-cmd="p">Plain</button>' +
    '  <span class="tb-sep" aria-hidden="true"></span>' +
    '  <button class="tb-btn" id="ins-pic">' + ICONS.image + ' Insert picture</button>' +
    '  <button class="tb-btn" id="ins-draw">' + ICONS.pencil + ' Draw</button>' +
    '  <input type="file" id="pic-file" accept="image/*" style="display:none">' +
    '</div>' +
    '<div class="editor-page" id="ed" contenteditable="true" data-placeholder="' + esc(placeholder) + '">' + (sec.content || '') + '</div>' +
    '<p class="muted" style="margin:0; font-size:12.5px">Everything saves automatically as you type.</p>';

  var renameBtn = document.getElementById('ed-rename');
  if (renameBtn) {
    renameBtn.addEventListener('click', function () {
      var nn = prompt('Name this ' + bodyLabel(book).toLowerCase() + ' (this is how it reads in the table of contents)', sec.name);
      if (nn !== null && nn.trim()) {
        sec.name = nn.trim();
        touch(book); save();
        renderWriteTab(ws, book);
      }
    });
  }

  var ed = document.getElementById('ed');
  if (!sec.content) ed.innerHTML = '<p><br></p>';

  function persist() {
    sec.content = ed.innerHTML;
    recomputeStatus(sec);
    document.getElementById('ed-chip').innerHTML = statusChip(sec);
    touch(book);
    debouncedSave();
  }
  ed.addEventListener('input', persist);

  var cmds = main.querySelectorAll('[data-cmd]');
  for (var i = 0; i < cmds.length; i++) {
    cmds[i].addEventListener('click', function () {
      var c = this.getAttribute('data-cmd');
      ed.focus();
      if (c === 'h2') document.execCommand('formatBlock', false, 'h3');
      else if (c === 'p') document.execCommand('formatBlock', false, 'p');
      else document.execCommand(c, false, null);
      persist();
    });
  }

  function insertImg(src, alt) {
    ed.focus();
    var html = '<img src="' + src + '" alt="' + esc(alt || '') + '">';
    if (!document.execCommand('insertHTML', false, html)) {
      ed.insertAdjacentHTML('beforeend', '<p>' + html + '</p>');
    }
    persist();
  }

  var fileInput = document.getElementById('pic-file');
  document.getElementById('ins-pic').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () { insertImg(reader.result, f.name); fileInput.value = ''; };
    reader.readAsDataURL(f);
  });
  document.getElementById('ins-draw').addEventListener('click', function () {
    openDrawModal(function (dataUrl) { insertImg(dataUrl, 'Drawing'); });
  });
}

/* ------------------------------------------------------------ draw modal */
function openDrawModal(onDone) {
  var COLORS = ['#241D15', '#B4552D', '#D97742', '#E8B54A', '#27584A', '#2A3655', '#7A3E8F', '#C2362B', '#FFFDF8'];
  var sw = '';
  for (var i = 0; i < COLORS.length; i++) {
    sw += '<button type="button" class="cp-swatch' + (i === 0 ? ' sel' : '') + '" data-c="' + COLORS[i] + '" aria-label="Brush color ' + COLORS[i] + '" style="background:' + COLORS[i] + (i === 0 ? '; outline:2px solid var(--green); outline-offset:1px' : '') + '"></button>';
  }
  modalRoot().innerHTML =
    '<div class="modal-scrim" id="draw-scrim">' +
    '<div class="modal" role="dialog" aria-label="Draw a picture" style="max-width:860px; flex-direction:column; flex-wrap:nowrap; padding:26px 28px; gap:16px">' +
    '  <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap">' +
    '    <h1 style="font-size:22px">Draw a picture</h1>' +
    '    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap">' + sw +
    '      <span class="tb-sep" aria-hidden="true"></span>' +
    '      <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:600; color:var(--muted)">Size' +
    '        <input type="range" id="draw-size" min="2" max="36" value="7" style="width:90px"></label>' +
    '      <button class="btn btn-sm" id="draw-eraser">Eraser</button>' +
    '      <button class="btn btn-sm" id="draw-undo">Undo</button>' +
    '      <button class="btn btn-sm" id="draw-clear">Clear</button>' +
    '    </div>' +
    '  </div>' +
    '  <canvas id="draw-canvas" width="780" height="520" style="width:100%; max-width:780px; background:#FFFDF6; border:1px solid var(--line2); border-radius:12px; touch-action:none; cursor:crosshair; align-self:center"></canvas>' +
    '  <div style="display:flex; gap:14px; justify-content:flex-end">' +
    '    <button class="btn btn-ghost" id="draw-cancel">Cancel</button>' +
    '    <button class="btn btn-primary" id="draw-done">Add to page</button>' +
    '  </div>' +
    '</div></div>';

  var canvas = document.getElementById('draw-canvas');
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFDF6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  var color = COLORS[0], size = 7, eraser = false, drawing = false, undoStack = [];

  function snapshot() {
    if (undoStack.length > 24) undoStack.shift();
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  }
  canvas.addEventListener('pointerdown', function (e) {
    drawing = true;
    snapshot();
    canvas.setPointerCapture(e.pointerId);
    var p = pos(e);
    ctx.strokeStyle = eraser ? '#FFFDF6' : color;
    ctx.lineWidth = eraser ? size * 2.5 : size;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  canvas.addEventListener('pointerup', function () { drawing = false; });

  var swatches = modalRoot().querySelectorAll('[data-c]');
  for (var s2 = 0; s2 < swatches.length; s2++) {
    swatches[s2].addEventListener('click', function () {
      color = this.getAttribute('data-c');
      eraser = false;
      document.getElementById('draw-eraser').classList.remove('btn-soft');
      for (var j = 0; j < swatches.length; j++) {
        swatches[j].style.outline = swatches[j] === this ? '2px solid #27584A' : 'none';
      }
    });
  }
  document.getElementById('draw-size').addEventListener('input', function () { size = Number(this.value); });
  document.getElementById('draw-eraser').addEventListener('click', function () {
    eraser = !eraser;
    this.classList.toggle('btn-soft', eraser);
  });
  document.getElementById('draw-undo').addEventListener('click', function () {
    var last = undoStack.pop();
    if (last) ctx.putImageData(last, 0, 0);
  });
  document.getElementById('draw-clear').addEventListener('click', function () {
    snapshot();
    ctx.fillStyle = '#FFFDF6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });
  document.getElementById('draw-cancel').addEventListener('click', closeModal);
  document.getElementById('draw-scrim').addEventListener('click', function (e) { if (e.target === this) closeModal(); });
  document.getElementById('draw-done').addEventListener('click', function () {
    var url = canvas.toDataURL('image/png');
    closeModal();
    onDone(url);
  });
}

/* --------------------------------------------------------------- read tab */
function renderReadTab(ws, book) {
  ws.innerHTML = '<div class="reader"><div class="loading">Preparing your pages…</div></div>';
  paginateBook(book).then(function (pages) {
    var state = { pages: pages, spread: -1, busy: false };
    var totalSpreads = Math.ceil(pages.length / 2);

    function label() {
      if (state.spread < 0) return 'Cover';
      var a = state.spread * 2 + 1;
      var b = Math.min(a + 1, pages.length);
      return a === b ? 'Page ' + a + ' of ' + pages.length : 'Pages ' + a + '–' + b + ' of ' + pages.length;
    }

    function spreadHTML(s) {
      return pageHTML(pages[s * 2], s * 2 + 1) + pageHTML(pages[s * 2 + 1], s * 2 + 2) +
        '<div class="gutter"></div>';
    }

    function render() {
      var inner;
      if (state.spread < 0) {
        inner = '<div class="reader-cover-wrap">' + coverHTML(book, 340, 474) + '</div>';
      } else {
        inner =
          '<div class="book3d">' +
          '  <div class="book-stack1"></div><div class="book-stack2"></div>' +
          '  <div class="spread" id="spread">' + spreadHTML(state.spread) + '</div>' +
          '</div>';
      }
      ws.innerHTML =
        '<div class="reader">' +
        '  <div class="reader-row">' +
        '    <button class="flip-btn" id="rd-prev" aria-label="Previous pages"' + (state.spread <= -1 ? ' disabled' : '') + '>' + ICONS.left + '</button>' +
        inner +
        '    <button class="flip-btn" id="rd-next" aria-label="Next pages"' + (state.spread >= totalSpreads - 1 ? ' disabled' : '') + '>' + ICONS.right + '</button>' +
        '  </div>' +
        '  <div class="reader-foot">' +
        '    <span class="lbl">' + label() + '</span>' +
        '    <span class="hint">Use the arrows or your keyboard’s ← → keys to flip</span>' +
        '  </div>' +
        '</div>';
      document.getElementById('rd-prev').addEventListener('click', prev);
      document.getElementById('rd-next').addEventListener('click', next);
    }

    function flip(dir) {
      if (state.busy) return;
      var spreadEl = document.getElementById('spread');
      if (!spreadEl) { state.spread += dir; render(); return; }
      var target = state.spread + dir;
      if (target < 0) { state.spread = -1; render(); return; }
      state.busy = true;
      var sheet = document.createElement('div');
      var frontIdx, backIdx;
      if (dir > 0) {
        sheet.className = 'flip-sheet from-right';
        frontIdx = state.spread * 2 + 1;
        backIdx = target * 2;
      } else {
        sheet.className = 'flip-sheet from-left';
        frontIdx = state.spread * 2;
        backIdx = target * 2 + 1;
      }
      sheet.innerHTML =
        '<div class="face front">' + pageHTML(pages[frontIdx], frontIdx + 1) + '</div>' +
        '<div class="face back">' + pageHTML(pages[backIdx], backIdx + 1) + '</div>';
      spreadEl.appendChild(sheet);
      /* reveal the incoming page under the sheet */
      var under = dir > 0 ? pageHTML(pages[target * 2 + 1], target * 2 + 2) : pageHTML(pages[target * 2], target * 2 + 1);
      var pagesEls = spreadEl.querySelectorAll(':scope > .book-page');
      if (dir > 0 && pagesEls[1]) pagesEls[1].outerHTML = under;
      if (dir < 0 && pagesEls[0]) pagesEls[0].outerHTML = under;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { sheet.classList.add('go'); });
      });
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        state.spread = target;
        state.busy = false;
        render();
      }
      sheet.addEventListener('transitionend', finish);
      setTimeout(finish, 850);
    }

    function next() { if (state.spread < totalSpreads - 1) { if (state.spread < 0) { state.spread = 0; render(); } else flip(1); } }
    function prev() { if (state.spread > -1) { if (state.spread === 0) { state.spread = -1; render(); } else flip(-1); } }

    App._keyHandler = function (e) {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', App._keyHandler);
    render();
  });
}

/* -------------------------------------------------------------- share tab */
function renderShareTab(ws, book) {
  ws.innerHTML =
    '<div class="share-head">' +
    '  <h1>Share “' + esc(book.title) + '”</h1>' +
    '  <p>Keep it as a digital flipbook anyone can open in a browser, or save a print-ready PDF.</p>' +
    '</div>' +
    '<div class="share-layout">' +
    '  <div style="flex:0 0 auto">' + coverHTML(book, 230, 320) + '</div>' +
    '  <div class="share-cards">' +
    '    <div class="share-card">' +
    '      <span class="ic" style="background:var(--green-soft)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1F4A3C" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg></span>' +
    '      <div style="flex:1; min-width:0"><h3>Digital book</h3>' +
    '      <p>One file that opens in any browser — cover, pages, the lot. Email it, message it, or put it anywhere.</p>' +
    '      <button class="btn btn-primary" id="dl-html">Download digital book (.html)</button></div>' +
    '    </div>' +
    '    <div class="share-card">' +
    '      <span class="ic" style="background:var(--amber-soft)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71521A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg></span>' +
    '      <div style="flex:1; min-width:0"><h3>Print-ready PDF</h3>' +
    '      <p>Every page exactly as designed — pick “Save as PDF” in the print window that opens.</p>' +
    '      <button class="btn" id="dl-pdf" style="border:1.5px solid var(--green); color:var(--ink)">Print / Save as PDF</button></div>' +
    '    </div>' +
    '    <div class="share-card">' +
    '      <span class="ic" style="background:#E7E9F4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A4470" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg></span>' +
    '      <div style="flex:1; min-width:0"><h3>Backup &amp; move</h3>' +
    '      <p>Books live in this browser. Export them as a file to keep safe or open on another computer.</p>' +
    '      <div style="display:flex; gap:10px; flex-wrap:wrap">' +
    '        <button class="btn btn-sm" id="exp-json">Export my books</button>' +
    '        <button class="btn btn-sm" id="imp-json">Import books</button>' +
    '        <input type="file" id="imp-file" accept=".json,application/json" style="display:none">' +
    '      </div></div>' +
    '    </div>' +
    '    <div class="share-card">' +
    '      <span class="ic" style="background:var(--cream2)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#575044" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg></span>' +
    '      <div style="flex:1; min-width:0"><h3>Share Book Maker</h3>' +
    '      <p>Send friends the app itself so they can write their own books.</p>' +
    '      <div class="linkrow"><span class="url" id="app-url"></span>' +
    '      <button class="btn btn-sm btn-soft" id="copy-link">Copy link</button></div></div>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  var appUrl = location.origin + location.pathname;
  document.getElementById('app-url').textContent = appUrl;

  document.getElementById('copy-link').addEventListener('click', function () {
    var btn = this;
    function ok() { btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = 'Copy link'; }, 1600); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(appUrl).then(ok);
    else { window.prompt('Copy this link:', appUrl); }
  });

  document.getElementById('dl-pdf').addEventListener('click', function () {
    var btn = this; btn.disabled = true;
    paginateBook(book).then(function (pages) {
      var root = document.getElementById('print-root');
      var html = '<div class="print-page">' +
        '<div class="book-page" style="display:flex; align-items:center; justify-content:center; background:#FFF">' + coverHTML(book, 350, 488) + '</div></div>';
      for (var i = 0; i < pages.length; i++) {
        html += '<div class="print-page">' + pageHTML(pages[i], i + 1) + '</div>';
      }
      root.innerHTML = html;
      btn.disabled = false;
      window.print();
      setTimeout(function () { root.innerHTML = ''; }, 2000);
    });
  });

  document.getElementById('dl-html').addEventListener('click', function () {
    var btn = this; btn.disabled = true; btn.textContent = 'Building your book…';
    paginateBook(book).then(function (pages) {
      var file = standaloneHTML(book, pages);
      download(slug(book.title) + '.html', 'text/html;charset=utf-8', file);
      btn.disabled = false; btn.textContent = 'Download digital book (.html)';
    });
  });

  document.getElementById('exp-json').addEventListener('click', function () {
    download('bookmaker-books.json', 'application/json', JSON.stringify(App.books, null, 2));
  });
  var impFile = document.getElementById('imp-file');
  document.getElementById('imp-json').addEventListener('click', function () { impFile.click(); });
  impFile.addEventListener('change', function () {
    var f = impFile.files && impFile.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var list = JSON.parse(reader.result);
        if (!Array.isArray(list)) throw new Error('bad');
        var added = 0;
        for (var i = 0; i < list.length; i++) {
          var nb = list[i];
          if (!nb || !nb.id || !nb.sections) continue;
          var existing = getBook(App.books, nb.id);
          if (existing) App.books[App.books.indexOf(existing)] = nb;
          else App.books.push(nb);
          added++;
        }
        save();
        alert(added + ' book' + (added === 1 ? '' : 's') + ' imported.');
        location.hash = '#/';
      } catch (e) {
        alert('That file doesn’t look like a Book Maker export.');
      }
      impFile.value = '';
    };
    reader.readAsText(f);
  });
}

/* ------------------------------------------------- standalone digital book */
function standaloneHTML(book, pages) {
  var pagesJson = JSON.stringify(pages.map(function (p) { return p.html; }));
  var cover = coverHTML(book, 320, 446);
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(book.title) + (book.author ? ' — ' + esc(book.author) : '') + '</title>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=Inter:wght@400;500;600;700&display=swap">\n' +
    '<style>\n' +
    'body{margin:0;background:#E9E2D2;font-family:Inter,system-ui,sans-serif;color:#241D15;display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:34px 16px;box-sizing:border-box}\n' +
    'h1{font-family:Fraunces,serif;font-weight:600;font-size:24px;margin:0 0 4px;text-align:center}\n' +
    '.by{font-size:13px;color:#575044;margin:0 0 26px;text-align:center}\n' +
    '.stage{display:flex;align-items:center;gap:18px;justify-content:center;width:100%}\n' +
    '.page-box{width:min(430px,86vw);height:calc(min(430px,86vw)*1.335);background:#FFFDF6;border-radius:12px;box-shadow:0 30px 55px -28px rgba(36,29,21,.55);position:relative;overflow:hidden}\n' +
    '.page-box.coverview{background:none;box-shadow:none;display:flex;align-items:center;justify-content:center}\n' +
    '.bpc{padding:44px;height:100%;overflow:hidden;font-family:Fraunces,serif;font-size:16.5px;line-height:1.62;box-sizing:border-box}\n' +
    '.bpc p{margin:0 0 .9em}.bpc img{max-width:100%;border-radius:6px;display:block;margin:0 auto .7em}\n' +
    '.ch-head{margin:0 0 .9em;font-family:Fraunces,serif;font-weight:600;font-size:24px}\n' +
    '.page-center{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px}\n' +
    '.page-quiet{font-style:italic;color:#575044}\n' +
    '.tp-title{font-family:Fraunces,serif;font-weight:600;font-size:30px;line-height:1.3}\n' +
    '.tp-by{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#575044;margin-top:14px;font-family:Inter,sans-serif}\n' +
    '.tp-author{font-family:Fraunces,serif;font-size:19px}\n' +
    '.toc-row{display:flex;align-items:baseline;gap:8px;margin-bottom:12px;font-size:16px}\n' +
    '.toc-name{font-weight:500}.toc-dots{flex:1;border-bottom:1.5px dotted #C9BCA2;transform:translateY(-3px)}\n' +
    '.toc-num{font-family:Inter,sans-serif;font-size:13px;color:#575044}.toc-empty{color:#575044;font-style:italic}\n' +
    '.pnum{position:absolute;bottom:14px;left:0;right:0;text-align:center;font-family:Inter,sans-serif;font-size:11px;color:#8A7E6A}\n' +
    '.nav-btn{width:48px;height:48px;border-radius:50%;background:#FFFDF8;border:1px solid #E0D5BE;color:#241D15;cursor:pointer;font-size:19px;box-shadow:0 8px 18px -8px rgba(36,29,21,.4);flex-shrink:0}\n' +
    '.nav-btn:disabled{opacity:.3;cursor:default}\n' +
    '.foot{margin-top:18px;font-size:13px;font-weight:600;color:#575044}\n' +
    '.made{margin-top:10px;font-size:11.5px;color:#575044}\n' +
    '</style>\n</head>\n<body>\n' +
    '<h1>' + esc(book.title) + '</h1>\n' +
    '<p class="by">' + (book.author ? 'by ' + esc(book.author) : '') + '</p>\n' +
    '<div class="stage">\n' +
    '  <button class="nav-btn" id="pv" aria-label="Previous page">‹</button>\n' +
    '  <div class="page-box coverview" id="box">' + cover + '</div>\n' +
    '  <button class="nav-btn" id="nx" aria-label="Next page">›</button>\n' +
    '</div>\n' +
    '<div class="foot" id="lbl">Cover</div>\n' +
    '<div class="made">Made with Book Maker</div>\n' +
    '<script>\n' +
    'var PAGES=' + pagesJson.replace(/<\/script/gi, '<\\/script') + ';\n' +
    'var COVER=document.getElementById("box").innerHTML;\n' +
    'var i=-1;var box=document.getElementById("box"),lbl=document.getElementById("lbl");\n' +
    'var pv=document.getElementById("pv"),nx=document.getElementById("nx");\n' +
    'function draw(){\n' +
    ' if(i<0){box.className="page-box coverview";box.innerHTML=COVER;lbl.textContent="Cover";}\n' +
    ' else{box.className="page-box";box.innerHTML="<div class=\\"bpc\\">"+PAGES[i]+"</div><div class=\\"pnum\\">"+(i+1)+"</div>";lbl.textContent="Page "+(i+1)+" of "+PAGES.length;}\n' +
    ' pv.disabled=i<0;nx.disabled=i>=PAGES.length-1;\n' +
    '}\n' +
    'pv.onclick=function(){if(i>-1){i--;draw();}};\n' +
    'nx.onclick=function(){if(i<PAGES.length-1){i++;draw();}};\n' +
    'document.addEventListener("keydown",function(e){if(e.key==="ArrowRight")nx.onclick();if(e.key==="ArrowLeft")pv.onclick();});\n' +
    'draw();\n' +
    '</' + 'script>\n</body>\n</html>\n';
}

init();
