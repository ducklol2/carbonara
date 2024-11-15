import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const host = 'localhost';
const port = 8000;

const handlers = {
  '/': handleIndex,
  '/add': handleAdd,
}

function handleIndex(req, res) {
  readFile("index.html")
    .then(contents => {
      res.setHeader("Content-Type", "text/html");
      res.writeHead(200);
      res.end(contents);
    })
    .catch(err => {
      res.writeHead(500);
      res.end(err.toString());
      return;
    });
}

function handleError(req, res) {
  res.setHeader("Content-Type", "text/plain");
  res.writeHead(500);
  res.end('Handler not found');
}

const items = [];
function handleAdd(req, res) {
  let body = '';
  req.on('data', data => {
    body += data;
  });
  req.on('end', () => {
    const data = JSON.parse(body);
    console.log('data:', data);
    if (data.item) {
      items.push(data.item);
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify({ items }));
    } else {
      res.writeHead(500);
      res.end('No item found');
    }
  });
};

const server = createServer((req, res) => {
  const handler = handlers[req.url];
  if (handler) handler(req, res);
  else handleError(req, res);
});

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});