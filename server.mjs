import { readFileSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const port = 8000;

const handlers = {
  '/': handleIndex,
  '/list': handleList,
  '/add': handleAdd,
  '/check': handleCheck,
}

let indexHtml = readFileSync('index.html');
watch('index.html', () => indexHtml = readFileSync('index.html'));
function handleIndex(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.writeHead(200);
  res.end(indexHtml);
}

function handleError(req, res) {
  res.setHeader("Content-Type", "text/plain");
  res.writeHead(500);
  res.end('Handler not found');
}

function handleList(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ items }));
};

const items = [];
function handleAdd(req, res) {
  let body = '';
  req.on('data', data => {
    body += data;
  });
  req.on('end', () => {
    const data = JSON.parse(body);
    console.log('handleAdd:', data);
    if (data.item) {
      items.push({
        text: data.item,
        checked: false,
      });
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify({ items }));
    } else {
      res.writeHead(500);
      res.end('No item found');
    }
  });
};

function handleCheck(req, res) {
  let body = '';
  req.on('data', data => {
    body += data;
  });
  req.on('end', () => {
    const data = JSON.parse(body);
    console.log('handleCheck:', data);
    if (!'itemIndex' in data || !'checked' in data) {
      res.writeHead(500);
      res.end(`No itemIndex / checked: ${data}`);
      return;
    }

    items[data.itemIndex].checked = true;
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ items }));
  });
};

const server = createServer((req, res) => {
  const handler = handlers[req.url];
  if (handler) handler(req, res);
  else handleError(req, res);
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});