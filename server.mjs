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
    content TEXT
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS assets(
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    content BLOB
  )
`);

const insertItem = db.prepare("INSERT INTO items (value, checked) VALUES (?, ?)");
const queryItem = db.prepare("SELECT rowid, * FROM items ORDER BY rowid");
const removeItem = db.prepare("DELETE FROM items WHERE rowid = ?");
console.log("Server start; db items:", queryItem.all());

const insertNote = db.prepare("INSERT INTO notes (title, content) VALUES (?, ?)");
const queryNote = db.prepare("SELECT rowid, * FROM notes ORDER BY rowid");
const removeNote = db.prepare("DELETE FROM notes WHERE rowid = ?");
console.log("Server start; db notes:", queryNote.all());

const insertAsset = db.prepare("INSERT INTO assets (content) VALUES (?)");
const listAssets = db.prepare("SELECT rowid, created FROM assets");
const getAsset = db.prepare("SELECT rowid, * FROM assets WHERE rowid = ?");
const removeAsset = db.prepare("DELETE FROM assets WHERE rowid = ?");
console.log("Server start; db assets:", listAssets.all());

const handlers = [];
function handle(path, handler) {
  handlers.push({ path: new RegExp(`^${path}$`), handler });
}

const staticFiles = [
  ['index.html', '/'],
  ['note.html', '/note(/\\d+)?'],
  ['client.mjs'],
  ['client_api.mjs'],
  ['client_util.mjs'],
];

function contentType(name) {
  if (name.endsWith('.html')) {
    return 'text/html';
  } else if (name.endsWith('.mjs')) {
    return 'text/javascript';
  } else {
    throw Error('No content type for ' + name);
  }
}

for (const [file, ...aliases] of staticFiles) {
  let contents = readFileSync(file);
  watch(file, () => contents = readFileSync(file));
  aliases.push('/' + file);
  for (const alias of aliases) {
    handle(alias, (req, res) => {
      res.setHeader("Content-Type", contentType(file));
      res.writeHead(200);
      res.end(contents);
    });
  }
}

function error(req, res, code, text) {
  res.setHeader("Content-Type", "text/plain");
  res.writeHead(code);
  res.end(text);
}

function json(res, data) {
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify(data));
}

handle('/item/list', (req, res) => listItems(res));
function listItems(res) {
  json(res, { items: queryItem.all() });
}

handle('/note/list', (req, res) => listNotes(res));
function listNotes(res, lastInsertRowid) {
  json(res, { notes: queryNote.all(), lastInsertRowid });
}

async function getJsonBody(req) {
  let body = "";
  req.on("data", data => body += data);
  return new Promise((resolve, reject) => {
    req.on("end", () => resolve(JSON.parse(body)));
  });
}

handle('/item/add', async (req, res) => {
  const data = await getJsonBody(req);
  if (!data.item) return error(req, res, 500, 'No item found');

  console.log("sqlite insert:", insertItem.run(data.item, 0));
  listItems(res);
});

handle('/note/add', async (req, res) => {
  const data = await getJsonBody(req);
  if (!data.title || !data.content) {
    return error(req, res, 400, 'No title/content found');
  }

  const result = insertNote.run(data.title, data.content);
  console.log('insertNote result:', result);
  listNotes(res, result.lastInsertRowid);
});

handle('/asset/add', async (req, res) => {
  const data = await getJsonBody(req);
  if (!data.content) return error(req, res, 400, 'No content found');

  const { lastInsertRowid } = insertAsset.run(data.content);
  json(res, { lastInsertRowid });
});

handle('/item/check', async (req, res) => {
  const data = await getJsonBody(req);
  if (!"rowid" in data || !"checked" in data) {
    error(req, res, 500, `No rowid / checked: ${data}`);
    return;
  }

  const update = db.prepare("UPDATE items SET checked = ? WHERE rowid = ?");
  console.log("sqlite update:", update.run(data.checked ? 1 : 0, data.rowid));
  listItems(res);
});

handle('/note/update', async (req, res) => {
  const data = await getJsonBody(req);
  if (!data.rowid || !data.title || !data.content) {
    error(req, res, 500, `No rowid/title/content: ${data}`);
    return;
  }

  const update = db.prepare("UPDATE notes SET title = ?, content = ? WHERE rowid = ?");
  console.log("sqlite update note:", update.run(data.title, data.content, data.rowid));
  listNotes(res);
});

handle('/item/remove', async (req, res) => {
  const data = await getJsonBody(req);
  if ((!"rowid") in data) {
    error(req, res, 400, `No rowid to remove: ${data}`);
    return;
  }

  console.log("sqlite remove:", removeItem.run(data.rowid));
  listItems(res);
});

handle('/note/remove', async (req, res) => {
  const data = await getJsonBody(req);
  if (!data.rowid) {
    error(req, res, 400, `No rowid to remove: ${data}`);
    return;
  }

  console.log("sqlite remove note:", removeNote.run(data.rowid));
  listNotes(res);
});

handle('/asset/remove', async (req, res) => {
  const data = await getJsonBody(req);
  if (!data.rowid) {
    error(req, res, 400, `No rowid to remove: ${data}`);
    return;
  }

  const result = removeAsset.run(data.rowid);
  console.log("sqlite remove asset:", result);
  json(res, result);
});

handle('/asset/(?<rowid>\\d+)', async (req, res, match) => {
  const result = getAsset.get(match.groups.rowid);
  json(res, result);
});

const server = createServer((req, res) => {
  for (const { path, handler } of handlers) {
    const match = path.exec(req.url);
    if (match) {
      console.log('Path', path, 'worked for req', req.url);
      handler(req, res, match);
      return;
    }
  }

  error(req, res, '404', `Not found: ${req.url}`);
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
