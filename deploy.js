import { readFileSync } from "node:fs";

const SOURCE_FILE = "./dist/final.js";
const CHUNK_SIZE = 2048;
const SCRIPT_NOT_FOUND = -105;

const [host, idArg, startArg] = process.argv.slice(2);
const id = Number(idArg);
const start = startArg === "start";

if (!host || !Number.isInteger(id) || (startArg !== undefined && !start)) {
  console.error("Usage: node deploy.js <host> <script id> [start]");
  process.exit(1);
}

// split into chunks of at most CHUNK_SIZE bytes without cutting multi-byte UTF-8 characters
function splitIntoChunks(code) {
  const chunks = [];
  let chunk = "";
  let chunkBytes = 0;
  for (const char of code) {
    const charBytes = Buffer.byteLength(char);
    if (chunkBytes + charBytes > CHUNK_SIZE) {
      chunks.push(chunk);
      chunk = "";
      chunkBytes = 0;
    }
    chunk += char;
    chunkBytes += charBytes;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

// carries the full response body of a failed RPC
class RpcError extends Error {
  constructor(method, body, code) {
    super(`${method} failed: ${body}`);
    this.code = code;
  }
}

// sends a JSON-RPC frame to the device, returns the result or throws an RpcError
async function rpc(method, params) {
  const response = await fetch(`http://${host}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 1, method, params }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new RpcError(method, `HTTP ${response.status} ${body}`);
  }
  const frame = JSON.parse(body);
  if (frame.error) {
    throw new RpcError(method, body, frame.error.code);
  }
  return frame.result;
}

// stops the script if it exists, creates it otherwise; returns the id to upload to
async function prepareSlot() {
  try {
    await rpc("Script.Stop", { id });
    console.log(`Script ${id} stopped`);
    return id;
  } catch (error) {
    if (error.code !== SCRIPT_NOT_FOUND) throw error;
    // Script.Create does not take an id, the device assigns the next free one
    const { id: createdId } = await rpc("Script.Create", { name: "spotelly" });
    console.log(`Script ${id} not found, created script ${createdId}`);
    return createdId;
  }
}

const chunks = splitIntoChunks(readFileSync(SOURCE_FILE, "utf8"));

let scriptId;
try {
  scriptId = await prepareSlot();
  for (const [index, chunk] of chunks.entries()) {
    // the first chunk replaces the existing code, all subsequent chunks are appended
    const result = await rpc("Script.PutCode", { id: scriptId, code: chunk, append: index > 0 });
    console.log(`Chunk ${index + 1}/${chunks.length} sent (${result.len} bytes total)`);
  }
  console.log(`Deployed ${SOURCE_FILE} to script ${scriptId} on ${host}`);
} catch (error) {
  console.error(`Deployment failed: ${error.message}`);
  process.exit(1);
}

if (start) {
  try {
    await rpc("Script.Start", { id: scriptId });
    console.log(`Script ${scriptId} started`);
  } catch (error) {
    console.error(`Upload succeeded, but starting script ${scriptId} failed: ${error.message}`);
    process.exit(1);
  }
}
