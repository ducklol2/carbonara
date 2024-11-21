import * as api from '/client_api.mjs';
import { el, q } from '/client_util.mjs';
import { renderText, splitTextBlocks } from './jd.mjs';

let notes = await api.list();
console.log('notes:', notes);

let note = notes.find((n) => n.rowid == rowid());
if (!note) {
  if (rowid()) {
    // Note doesn't exist any more; remove from URL
    history.pushState({}, '', '/note');
  }
  note = {
    title: `New Note [${new Date().toLocaleString()}]`,
    content: '',
  };
}

window.note = note;

function renderTitle() {
  q('#title').textContent = note.title;
}
renderTitle();

q('#title').onkeydown = (event) => {
  if (event.key != 'Enter') return;

  event.target.blur();
  event.stopPropagation();
  event.preventDefault();

  startSave();
};

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
  q('content').replaceChildren(q('editor'));

  const blocks = renderText(note.content);
  console.log('rendered blocks:', blocks);
  for (const block of blocks) {
    block.onclick = editBlock;
    q('content').insertBefore(block, q('editor'));
  }
}
renderContent();

let timeoutId = null;
function startSave() {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(save, 1000);
  q('#status').textContent = 'Waiting to save...';
}

const editor = q('#editor');
function resizeEditor() {
  editor.style.height = 0;
  editor.style.height = editor.scrollHeight + 30 + 'px';
}

editor.onkeydown = (event) => {
  switch (event.key) {
    case 'Enter':
      // debugger;
      if (q('editor').value.endsWith('\n')) saveEditor();
      break;
    
    case 'Backspace':
      if (editor.value.length == 0) {
        const i = getEditorIndex();
        if (i > 0) {
          const target = q('#content').children[i - 1];
          target.onclick({target});
        }
      }
      break;
  }

  setTimeout(resizeEditor);
};

function getEditorIndex() {
  return [...q('#content').children].indexOf(q('#editor'));
}

function saveEditor() {
  const i = getEditorIndex();
  const blocks = splitTextBlocks(note.content);
  console.log('saveEditor(): i=', i, ', blocks=', blocks);

  if (!blocks.length) {
    // First block!
    note.content = editor.value + '\n';
  } else {
    if (editor.value.length) {
      blocks[i] = editor.value;
    } else {
      // empty; delete line
      blocks.splice(i, 1);
    }
    note.content = blocks.join('\n\n');
  }

  renderContent();
  console.log('new note:', note);
  editor.value = '';
  event.preventDefault();
  event.stopPropagation();
  editor.focus();
  startSave();
}

editor.onpaste = (event) => {
  const data = extractPaste(event);
  console.log('paste data:', data);
  event.preventDefault();
};

function extractPaste(event) {
  // console.log('paste', event.clipboardData.items.length, 'items:', event.clipboardData.types, event.clipboardData);
  const fileIndex = event.clipboardData.types.indexOf('Files');
  if (fileIndex >= 0) {
    // console.log('paste file:', event.clipboardData.items[fileIndex].getAsFile());
    return event.clipboardData.items[fileIndex].getAsFile();
  }

  return event.clipboardData.getData('text');
}

q('#content').onclick = () => editor.focus();

const main = q('#main');
const menu = q('#menu');
const menubutton = q('#menubutton');
menubutton.onclick = () => {
  menu.style.display = menu.style.display ? '' : 'block';
  main.style['grid-template-columns'] = main.style['grid-template-columns']
    ? ''
    : '5fr 1fr';
};
if (window.innerWidth > 800) menubutton.onclick();

async function save() {
  note.title = q('#title').textContent.trim();
  if (rowid()) {
    const data = await api.update(rowid(), note.title, note.content);
    notes = data.notes;
  } else {
    const data = await api.add(note.title, note.content);
    history.pushState({}, '', `/note/${data.lastInsertRowid}`);
    notes = data.notes;
  }
  renderMenu();

  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  q('#status').textContent = `Saved [${new Date().toLocaleString()}]`;
}

// function renderMd(parent, before, text) {
//   const lines = text.split('\n');
//   for (let i = 0; i < lines.length; i++) {
//     if (!lines[i].trim().length) continue;

//     const headerRe = /(#+) ?(.*)/;
//     let header = headerRe.exec(lines[i]);
//     let lineEl = header
//       ? el(`h${header[1].length}`, header[2])
//       : el('p', lines[i]);
//     lineEl.onclick = editLine.bind(null, i);
//     parent.insertBefore(lineEl, before);
//   }
// }

function rowid() {
  const match = /note\/(\d+)$/.exec(window.location.pathname);
  return match ? parseInt(match[1]) : null;
}

function editBlock(event) {
  const i = [...q('#content').children].indexOf(event.target);
  console.log('edit block', i);
  saveEditor();
  q('#content').replaceChild(q('#editor'), q('#content').children[i]);
  q('#editor').value = splitTextBlocks(note.content)[i];
  q('#editor').focus();
  resizeEditor();
}
