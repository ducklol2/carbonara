import { readFileSync, watch } from "node:fs";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";

const port = 8000;
const db = new DatabaseSync("db.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS items(
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    value TEXT,
    checked INTEGER
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS notes(
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    title TEXT,
    note TEXT
  )
`);
const insertItem = db.prepare("INSERT INTO items (value, checked) VALUES (?, ?)");
const queryItem = db.prepare("SELECT rowid, * FROM items ORDER BY rowid");
const removeItem = db.prepare("DELETE FROM items WHERE rowid = ?");
console.log("Server start; db items:", queryItem.all());

const insertNote = db.prepare("INSERT INTO notes (title, note) VALUES (?, ?)");
const queryNote = db.prepare("SELECT rowid, * FROM notes ORDER BY rowid");
const removeNote = db.prepare("DELETE FROM notes WHERE rowid = ?");
console.log("Server start; db notes:", queryNote.all());

const handlers = {};

let indexHtml = readFileSync("index.html");
watch("index.html", () => (indexHtml = readFileSync("index.html")));
handlers['/'] = (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.writeHead(200);
  res.end(indexHtml);
};

function error(req, res, code, text) {
  res.setHeader("Content-Type", "text/plain");
  res.writeHead(code);
  res.end(text);
}

handlers['/note/list'] = (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ items: queryItem.all() }));
}

async function getJsonBody(req) {
  let body = "";
  req.on("data", data => body += data);
  return new Promise((resolve, reject) => {
    req.on("end", () => resolve(JSON.parse(body)));
  });
}

handlers['/note/add'] = async (req, res) => {
  const data = await getJsonBody(req);
  if (!data.item) return error(req, res, 500, 'No item found');

  console.log("sqlite insert:", insertItem.run(data.item, 0));
  handlers['/note/list'](req, res);
}

handlers['/note/check'] = async (req, res) => {
  const data = await getJsonBody(req);
  if (!"rowid" in data || !"checked" in data) {
    error(req, res, 500, `No rowid / checked: ${data}`);
    return;
  }

  const update = db.prepare("UPDATE items SET checked = ? WHERE rowid = ?");
  console.log("sqlite update:", update.run(data.checked ? 1 : 0, data.rowid));
  handlers['/note/list'](req, res);
}

handlers['/note/remove'] = async (req, res) => {
  const data = await getJsonBody(req);
  if ((!"rowid") in data) {
    error(req, res, 500, `No rowid to remove: ${data}`);
    return;
  }

  console.log("sqlite remove:", removeItem.run(data.rowid));
  handlers['/note/list'](req, res);
}

const server = createServer((req, res) => {
  const handler = handlers[req.url];
  if (handler) handler(req, res);
  else error(req, res, '404', `Not found: ${req.url}`);
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
