/* Book Maker — data model & storage */
'use strict';

var STORE_KEY = 'bookmaker.books.v1';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function uid() {
  return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------------------------------------------------------------- catalog */
/* The traditional anatomy of a book, in recommended order. */
var SECTION_CATALOG = [
  { type: 'title-page',       name: 'Title page',            group: 'front', auto: true,  hint: 'Your title and author name — set automatically.' },
  { type: 'copyright',        name: 'Copyright page',        group: 'front' },
  { type: 'dedication',       name: 'Dedication',            group: 'front', hint: 'A short line for someone special.' },
  { type: 'epigraph',         name: 'Epigraph',              group: 'front', hint: 'A quotation that sets the mood.' },
  { type: 'toc',              name: 'Table of contents',     group: 'front', auto: true,  hint: 'Builds itself from your chapters.' },
  { type: 'foreword',         name: 'Foreword',              group: 'front', hint: 'Usually written by someone else.' },
  { type: 'preface',          name: 'Preface',               group: 'front', hint: 'Why you wrote this book.' },
  { type: 'acknowledgements', name: 'Acknowledgements',      group: 'front', hint: 'Thank the people who helped.' },
  { type: 'introduction',     name: 'Introduction',          group: 'front' },
  { type: 'prologue',         name: 'Prologue',              group: 'front' },
  { type: 'chapter',          name: 'Chapter',               group: 'body',  repeat: true },
  { type: 'epilogue',         name: 'Epilogue',              group: 'back' },
  { type: 'afterword',        name: 'Afterword',             group: 'back' },
  { type: 'appendix',         name: 'Appendix',              group: 'back' },
  { type: 'glossary',         name: 'Glossary',              group: 'back' },
  { type: 'bibliography',     name: 'Bibliography',          group: 'back' },
  { type: 'index',            name: 'Index',                 group: 'back' },
  { type: 'about-author',     name: 'About the author',      group: 'back' },
  { type: 'credits',          name: 'Notes & photo credits', group: 'back' }
];

function catalogDef(type) {
  for (var i = 0; i < SECTION_CATALOG.length; i++) {
    if (SECTION_CATALOG[i].type === type) return SECTION_CATALOG[i];
  }
  return null;
}

function catalogIndex(type) {
  for (var i = 0; i < SECTION_CATALOG.length; i++) {
    if (SECTION_CATALOG[i].type === type) return i;
  }
  return SECTION_CATALOG.length;
}

/* ------------------------------------------------------------------ model */
function makeSection(type, name) {
  var def = catalogDef(type) || {};
  return {
    id: uid(),
    type: type,
    name: name || def.name || type,
    content: '',
    status: def.auto ? 'auto' : 'empty'   /* auto | empty | written | skipped */
  };
}

function defaultCopyright(book) {
  var year = new Date().getFullYear();
  return '<p>© ' + year + ' ' + esc(book.author || 'the author') + '. All rights reserved.</p>' +
         '<p>No part of this book may be reproduced without permission from the author.</p>' +
         '<p>Made with Book Maker.</p>';
}

function bodyLabel(book) {
  return book.kind === 'pictures' ? 'Page' : 'Chapter';
}

function newBook(title, author, kind) {
  var book = {
    id: uid(),
    title: title || 'Untitled book',
    author: author || '',
    kind: kind === 'pictures' ? 'pictures' : 'words',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cover: {
      bg: kind === 'pictures' ? '#2A3655' : '#27584A',
      accent: '#E8B54A',
      layout: kind === 'pictures' ? 'scene' : 'frame',
      font: 'fraunces'
    },
    sections: [],
    removed: []
  };
  book.sections.push(makeSection('title-page'));
  var cp = makeSection('copyright');
  cp.content = defaultCopyright(book);
  cp.status = 'written';
  book.sections.push(cp);
  book.sections.push(makeSection('dedication'));
  book.sections.push(makeSection('toc'));
  var count = book.kind === 'pictures' ? 3 : 1;
  for (var i = 1; i <= count; i++) {
    book.sections.push(makeSection('chapter', bodyLabel(book) + ' ' + i));
  }
  book.sections.push(makeSection('about-author'));
  return book;
}

/* Insert a section (by type, or a previously removed section object) at its
   recommended spot. Returns the inserted section. */
function insertSectionInOrder(book, typeOrSection) {
  var section = typeof typeOrSection === 'string' ? makeSection(typeOrSection) : typeOrSection;
  if (section.type === 'copyright' && !section.content) {
    section.content = defaultCopyright(book);
    section.status = 'written';
  }
  var idx = catalogIndex(section.type);
  var pos = book.sections.length;
  if (section.type === 'chapter') {
    /* after the last chapter, or where chapters belong if there are none */
    var last = -1;
    for (var i = 0; i < book.sections.length; i++) {
      if (book.sections[i].type === 'chapter') last = i;
    }
    if (last >= 0) { pos = last + 1; }
    else {
      for (var j = 0; j < book.sections.length; j++) {
        if (catalogIndex(book.sections[j].type) > idx) { pos = j; break; }
      }
    }
  } else {
    for (var k = 0; k < book.sections.length; k++) {
      var other = catalogIndex(book.sections[k].type);
      if (section.type !== 'chapter' && other > idx) { pos = k; break; }
      if (book.sections[k].type === 'chapter' && idx < catalogIndex('chapter')) { pos = k; break; }
    }
  }
  book.sections.splice(pos, 0, section);
  return section;
}

/* Human description of where a section will land if added back. */
function placementText(book, type) {
  var idx = catalogIndex(type);
  if (type === 'chapter') return 'Goes after the last ' + bodyLabel(book).toLowerCase();
  var before = null, after = null;
  for (var i = 0; i < book.sections.length; i++) {
    var s = book.sections[i];
    var oi = catalogIndex(s.type);
    if (oi <= idx && s.type !== 'chapter') before = s;
    if (oi > idx || (s.type === 'chapter' && idx < catalogIndex('chapter'))) { after = s; break; }
    if (s.type === 'chapter' && idx > catalogIndex('chapter')) { before = s; }
  }
  if (before && after) return 'Goes between ' + before.name + ' and ' + after.name;
  if (before) return 'Goes after ' + before.name;
  if (after) return 'Goes before ' + after.name;
  return 'Goes at its traditional spot';
}

/* ---------------------------------------------------------------- storage */
function loadBooks() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      var list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (e) { /* storage unavailable or corrupt — start fresh */ }
  return null;
}

function saveBooks(books) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(books));
    return true;
  } catch (e) {
    return false;
  }
}

function getBook(books, id) {
  for (var i = 0; i < books.length; i++) if (books[i].id === id) return books[i];
  return null;
}

function touch(book) { book.updatedAt = Date.now(); }

/* ------------------------------------------------------------- demo book */
function svgData(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

var DEMO_ART_1 = svgData(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">' +
  '<rect width="640" height="420" fill="#2A3655"/>' +
  '<circle cx="470" cy="110" r="64" fill="#E8B54A"/>' +
  '<circle cx="495" cy="90" r="8" fill="#D9A032"/><circle cx="450" cy="128" r="6" fill="#D9A032"/>' +
  '<circle cx="110" cy="70" r="3" fill="#8FA0C9"/><circle cx="220" cy="140" r="2.5" fill="#8FA0C9"/>' +
  '<circle cx="90" cy="200" r="2" fill="#8FA0C9"/><circle cx="330" cy="50" r="2.5" fill="#8FA0C9"/>' +
  '<ellipse cx="160" cy="470" rx="420" ry="170" fill="#22304C"/>' +
  '<ellipse cx="560" cy="500" rx="440" ry="180" fill="#1E2944"/>' +
  '<g transform="translate(340 240) scale(2)"><path d="M12 42c0-11 6-19 14-19s14 8 14 19Z" fill="#D97742"/>' +
  '<path d="M19 27l-4-11 9 6Z" fill="#D97742"/><path d="M33 27l4-11-9 6Z" fill="#D97742"/>' +
  '<path d="M12 42c-5-2-8-7-8-12 4 1 7 5 8 9Z" fill="#B85C2E"/></g></svg>'
);

var DEMO_ART_2 = svgData(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">' +
  '<rect width="640" height="420" fill="#22304C"/>' +
  '<circle cx="170" cy="80" r="3" fill="#8FA0C9"/><circle cx="430" cy="60" r="2.5" fill="#8FA0C9"/>' +
  '<circle cx="540" cy="150" r="2" fill="#8FA0C9"/><circle cx="80" cy="170" r="2.5" fill="#8FA0C9"/>' +
  '<ellipse cx="320" cy="480" rx="480" ry="190" fill="#1E2944"/>' +
  '<circle cx="390" cy="295" r="58" fill="#E8B54A"/>' +
  '<g transform="translate(180 245) scale(1.8)"><path d="M12 42c0-11 6-19 14-19s14 8 14 19Z" fill="#D97742"/>' +
  '<path d="M19 27l-4-11 9 6Z" fill="#D97742"/><path d="M33 27l4-11-9 6Z" fill="#D97742"/>' +
  '<path d="M12 42c-5-2-8-7-8-12 4 1 7 5 8 9Z" fill="#B85C2E"/></g></svg>'
);

function demoBook() {
  var book = newBook('The Fox Who Found the Moon', 'Book Maker', 'pictures');
  book.demo = true;
  var ded = null, pages = [];
  for (var i = 0; i < book.sections.length; i++) {
    var s = book.sections[i];
    if (s.type === 'dedication') ded = s;
    if (s.type === 'chapter') pages.push(s);
  }
  if (ded) {
    ded.content = '<p style="text-align:center"><em>For every small fox who asks big questions.</em></p>';
    ded.status = 'written';
  }
  if (pages[0]) {
    pages[0].name = 'Page 1';
    pages[0].content =
      '<p>Every night, a small fox climbed the tallest hill to count the stars.</p>' +
      '<p>One, two, three… all the way to a hundred and back.</p>';
    pages[0].status = 'written';
  }
  if (pages[1]) {
    pages[1].name = 'Page 2';
    pages[1].content =
      '<p><img src="' + DEMO_ART_1 + '" alt="A fox sits on a dark hill under a big golden moon"></p>' +
      '<p>But tonight something was different. The moon had come down low — so low it sat on the hill like a big golden coin.</p>' +
      '<p>“Hello,” said the fox. “Are you lost too?”</p>';
    pages[1].status = 'written';
  }
  if (pages[2]) {
    pages[2].name = 'Page 3';
    pages[2].content =
      '<p>The moon didn’t answer. Moons never do.</p>' +
      '<p>So the fox did the bravest thing a small fox can do: he scooted closer and shared his hill.</p>' +
      '<p><img src="' + DEMO_ART_2 + '" alt="The fox curls up beside the glowing moon on the hilltop"></p>';
    pages[2].status = 'written';
  }
  return book;
}
