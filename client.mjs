import * as api from '/client_api.mjs';
import { el, q } from '/client_util.mjs';

let notes = await api.list();
console.log('notes:', notes);

let note = notes.find(n => n.rowid == rowid());
if (!note) {
  if (rowid()) {
    // Note doesn't exist any more; remove from URL
    history.pushState({}, '', '/note');
  }
  note = {
    title: `New Note [${new Date().toLocaleString()}]`,
    content: ''
  };
}

function renderTitle() {
  q('#title').textContent = note.title;
}
renderTitle();

function renderMenu() {
  q('#noteslist').replaceChildren();
  for (const note of notes) {
    const a = el('a', note.title);
    a.href = `/note/${note.rowid}`;

    const b = el('button', 'x');
    b.onclick = async () => {
      api.remove(note.rowid);
      notes = await api.list();
      renderMenu();
    };

    let item = el('p', a, '\t', b);
    if (rowid() == note.rowid) {
      item.style.backgroundColor = 'lightgray';
    }

    q('#noteslist').append(item);
  }
}
renderMenu();

function renderContent() {
  q('#content').replaceChildren(q('#editor'));
  renderMd(q('#content'), q('#editor'), note.content);
}
renderContent();

const editor = q('#editor');
let timeoutId = null;
editor.onkeydown = event => {
  if (event.key == 'Enter') {
    note.content += editor.value + '\n';
    renderContent();
    console.log('new note:', note);
    editor.value = '';
    event.preventDefault();
    event.stopPropagation();
    editor.focus();

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(save, 2000);
    q('#status').textContent = "Waiting to save...";
  }
};

q('#content').onclick = () => editor.focus();

const main = q('#main');
const menu = q('#menu');
const menubutton = q('#menubutton');
menubutton.onclick = () => {
  menu.style.display = menu.style.display ? '' : 'block';
  main.style['grid-template-columns'] =
    main.style['grid-template-columns'] ? '' : '5fr 1fr';
};
if (window.innerWidth > 800) menubutton.onclick();

async function save() {
  note.title = q('#title').textContent;
  if (rowid()) {
    const data = await api.update(rowid(), note.title, note.content);
    notes = data.notes;
  } else {
    const data = await api.add(note.title, note.content);
    history.pushState({}, '', `/note/${data.lastInsertRowId}`);
    notes = data.notes;
  }
  renderMenu();

  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  q('#status').textContent = `Saved [${new Date().toLocaleString()}]`;
}

function renderMd(parent, before, text) {
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim().length) continue;

    const headerRe = /(#+) ?(.*)/;
    let header = headerRe.exec(line);
    if (header) {
      parent.insertBefore(el(`h${header[1].length}`, header[2]), before)
    } else {
      parent.insertBefore(el('p', line), before);
    }
  }
}

function rowid() {
  const match = /note\/(\d+)$/.exec(window.location.pathname);
  return match ? parseInt(match[1]) : null;
}