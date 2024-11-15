import { appendFile } from "node:fs/promises";
import { spawn } from "node:child_process";

let logs = [];

function log(text) {
  text = `[${new Date().toISOString()}] ${text.toString().trim()}`;
  console.log(text);
  logs.push(text);

  if (logs.length > 10) flush();
}

async function flush() {
  if (logs.length == 0) return;

  await appendFile("log.txt", logs.join("\n")).catch((err) => {
    console.error("Failed to write logs:", err);
  }, { flush: true });
  logs = [];
}

const server = spawn("node", ["--experimental-sqlite", "server.mjs"]);

server.stdout.on("data", log);
server.stderr.on("data", log);
server.on("close", async (code) => {
  log(`Server exit; code=${code}`);
  await flush();
});

process.on('SIGINT', () => server.kill());
process.on('SIGTERM', () => server.kill());
