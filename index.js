const http = require("node:http");
const fs = require('node:fs').promises;
const querystring = require('node:querystring');

const host = 'localhost';
const port = 8000;

const handlers = {
  '/': handleIndex,
  '/add': handleAdd,
}

function handleIndex(req, res) {
  fs.readFile(__dirname + "/index.html")
    .then(contents => {
      res.setHeader("Content-Type", "text/html");
      res.writeHead(200);
      res.end(contents);
    })
    .catch(err => {
      res.writeHead(500);
      res.end(err);
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

const server = http.createServer((req, res) => {
  const handler = handlers[req.url];
  if (handler) handler(req, res);
  else handleError(req, res);
});

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});