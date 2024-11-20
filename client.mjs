import * as api from "/client_api.mjs";
import { el, q } from "/client_util.mjs";

let notes = await api.list();
console.log("notes:", notes);

let note = notes.find((n) => n.rowid == rowid());
if (!note) {
  if (rowid()) {
    // Note doesn't exist any more; remove from URL
    history.pushState({}, "", "/note");
  }
  note = {
    title: `New Note [${new Date().toLocaleString()}]`,
    content: "",
  };
}

function renderTitle() {
  q("#title").textContent = note.title;
}
renderTitle();

q("#title").onkeydown = (event) => {
  if (event.key != "Enter") return;

  event.target.blur();
  event.stopPropagation();
  event.preventDefault();

  startSave();
};

function renderMenu() {
  q("#noteslist").replaceChildren();
  for (const note of notes) {
    const a = el("a", note.title);
    a.href = `/note/${note.rowid}`;

    const b = el("button", "x");
    b.onclick = async () => {
      api.remove(note.rowid);
      notes = await api.list();
      renderMenu();
    };

    let item = el("p", a, "\t", b);
    if (rowid() == note.rowid) {
      item.style.backgroundColor = "lightgray";
    }

    q("#noteslist").append(item);
  }
}
renderMenu();

function renderContent() {
  q("#content").replaceChildren(q("#editor"));
  renderMd(q("#content"), q("#editor"), note.content);
}
renderContent();

let timeoutId = null;
function startSave() {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(save, 1000);
  q("#status").textContent = "Waiting to save...";
}

const editor = q("#editor");
editor.onkeydown = (event) => {
  if (event.key == "Enter") saveEditor();
  else if (event.key == "Backspace") {
    if (editor.value.length == 0) {
      const i = getEditorIndex();
      if (i > 0) q('#content').children[i - 1].onclick();
    }
  }
};

function getEditorIndex() {
  return [...q('#content').children].indexOf(q('#editor'));  
}

function saveEditor() {
  const i = getEditorIndex();  
  if (i < 0) {
    note.content += editor.value + "\n";
  } else {
    const lines = note.content.split('\n');

    if (editor.value.length) {
      lines[i] = editor.value;
    } else {
      // empty; delete line
      lines.splice(i, 1);
    }

    note.content = lines.join('\n');
  }

  renderContent();
  console.log("new note:", note);
  editor.value = "";
  event.preventDefault();
  event.stopPropagation();
  editor.focus();
  startSave();
};

editor.onpaste = (event) => {
  const data = extractPaste(event);
  console.log("paste data:", data);
  event.preventDefault();
};

function extractPaste(event) {
  // console.log('paste', event.clipboardData.items.length, 'items:', event.clipboardData.types, event.clipboardData);
  const fileIndex = event.clipboardData.types.indexOf("Files");
  if (fileIndex >= 0) {
    // console.log('paste file:', event.clipboardData.items[fileIndex].getAsFile());
    return event.clipboardData.items[fileIndex].getAsFile();
  }

  return event.clipboardData.getData("text");
}

q("#content").onclick = () => editor.focus();

const main = q("#main");
const menu = q("#menu");
const menubutton = q("#menubutton");
menubutton.onclick = () => {
  menu.style.display = menu.style.display ? "" : "block";
  main.style["grid-template-columns"] = main.style["grid-template-columns"]
    ? ""
    : "5fr 1fr";
};
if (window.innerWidth > 800) menubutton.onclick();

async function save() {
  note.title = q("#title").textContent.trim();
  if (rowid()) {
    const data = await api.update(rowid(), note.title, note.content);
    notes = data.notes;
  } else {
    const data = await api.add(note.title, note.content);
    history.pushState({}, "", `/note/${data.lastInsertRowid}`);
    notes = data.notes;
  }
  renderMenu();

  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  q("#status").textContent = `Saved [${new Date().toLocaleString()}]`;
}

function renderMd(parent, before, text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().length) continue;

    const headerRe = /(#+) ?(.*)/;
    let header = headerRe.exec(lines[i]);
    let lineEl = header
      ? el(`h${header[1].length}`, header[2])
      : el("p", lines[i]);
    lineEl.onclick = editLine.bind(null, i);
    parent.insertBefore(lineEl, before);
  }
}

function rowid() {
  const match = /note\/(\d+)$/.exec(window.location.pathname);
  return match ? parseInt(match[1]) : null;
}

function editLine(i) {
  console.log("edit line:", i);
  saveEditor();
  q('#content').replaceChild(q('#editor'), q('#content').children[i]);
  q('#editor').value = note.content.split('\n')[i];
  q('#editor').focus();
}
