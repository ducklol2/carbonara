import { readFileSync, watch } from "node:fs";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";

const port = 8000;
const db = new DatabaseSync("db.sqlite");
db.exec(`
  CREATE TABLE IF NOT EXISTS items(
    value TEXT,
    checked INTEGER
  ) STRICT
`);
const insert = db.prepare("INSERT INTO items (value, checked) VALUES (?, ?)");
const query = db.prepare("SELECT rowid, * FROM items ORDER BY rowid");
const remove = db.prepare("DELETE FROM items WHERE rowid = ?");
console.log("Server start; db:", query.all());

const handlers = {
  "/": handleIndex,
  "/list": handleList,
  "/add": handleAdd,
  "/check": handleCheck,
  "/remove": handleRemove,
};

let indexHtml = readFileSync("index.html");
watch("index.html", () => (indexHtml = readFileSync("index.html")));
function handleIndex(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.writeHead(200);
  res.end(indexHtml);
}

function handleError(req, res) {
  res.setHeader("Content-Type", "text/plain");
  res.writeHead(500);
  res.end("Handler not found");
}

function handleList(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ items: query.all() }));
}

const items = [];
function handleAdd(req, res) {
  let body = "";
  req.on("data", (data) => {
    body += data;
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    console.log("/add", data);
    if (data.item) {
      console.log("sqlite insert:", insert.run(data.item, 0));
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify({ items: query.all() }));
    } else {
      res.writeHead(500);
      res.end("No item found");
    }
  });
}

function handleCheck(req, res) {
  let body = "";
  req.on("data", (data) => {
    body += data;
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    console.log("/check", data);
    if ((!"rowid") in data || (!"checked") in data) {
      res.writeHead(500);
      res.end(`No rowid / checked: ${data}`);
      return;
    }

    const update = db.prepare("UPDATE items SET checked = ? WHERE rowid = ?");
    console.log("sqlite update:", update.run(data.checked ? 1 : 0, data.rowid));
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ items: query.all() }));
  });
}

function handleRemove(req, res) {
  let body = "";
  req.on("data", (data) => {
    body += data;
  });
  req.on("end", () => {
    const data = JSON.parse(body);
    console.log("/remove", data);
    if ((!"rowid") in data) {
      res.writeHead(500);
      res.end(`No rowid in /remove: ${data}`);
      return;
    }

    console.log("sqlite remove:", remove.run(data.rowid));
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ items: query.all() }));
  });
}

const server = createServer((req, res) => {
  const handler = handlers[req.url];
  if (handler) handler(req, res);
  else handleError(req, res);
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
