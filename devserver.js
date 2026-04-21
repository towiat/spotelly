/*
This server simulates the behavior of the script endpoints on the Shelly - useful for
developing and testing the webUI.

Start with 'npm run dev'.
*/

import { readFile, watch } from "fs/promises";
import http from "http";
import { WebSocketServer } from "ws";

const hostname = "0.0.0.0";
const port = 3000;
const wsPort = 3001;
const timetableFilename = "timetable.html";
let timetableHTML = "";
const configFilename = "config.html";
let configHTML = "";

const upds = (str, idx, val) => {
  return str.slice(0, idx) + val + str.slice(idx + 1);
};

const data = {
  i: 3600000,
  a: 1754690400000,
  n: 0,
  p: [
    1019, 1003, 998, 965, 961, 963, 960, 888, 651, 153, -0, -10, -124, -172, -146, -34, -0, 256,
    839, 1080, 1246, 1174, 1070, 942,
  ],
  o: [
    "010101010101010101010101",
    "110011001100110011001100",
    "000111000111000111000111",
    "111100001111000011110000",
  ],
  r: 53730,
  v: true,
  z: "Europe/Berlin",
};

let config = {
  c: {
    b: "", // bidding zone
    i: 3_600_000, // 3600000 = 60-minute mode, 900000 = 15-minute mode
    s: [false, false, false, false], // invert switch array (one boolean for each switch)
  },
  w: [[], [], [], []],
  p: "  return spotPrice;",
};

const loadHTML = async htmlFilename => {
  try {
    const html = await readFile("./src/" + htmlFilename, "utf8");
    return html.replace(
      "</body>",
      `
      <script>
         const ws = new WebSocket("ws://" + window.location.hostname + ":${wsPort}");
         ws.onmessage = (event) => {
           if (event.data === "reload") location.reload();
        };
      </script></body>
      `,
    );
  } catch (error) {
    console.error(`Error reading ${htmlFilename}`, error);
    return "<h1>Error loading content</h1>";
  }
};

const loadTimetableHTML = async () => {
  timetableHTML = await loadHTML(timetableFilename);
};

const loadConfigHTML = async () => {
  configHTML = await loadHTML(configFilename);
};

await loadTimetableHTML();
await loadConfigHTML();

const clients = new Set();

(async () => {
  const watcher = watch("./src");
  for await (const event of watcher) {
    if (event.eventType !== "change") return;
    if (event.filename === timetableFilename) {
      await loadTimetableHTML();
    } else if (event.filename === configFilename) {
      await loadConfigHTML();
    } else {
      return;
    }
    for (const client of clients) {
      if (client.readyState === 1) {
        client.send("reload");
      }
    }
  }
})();

const spotellyEndpoint = (req, res) => {
  switch (req.method) {
    case "GET":
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(timetableHTML);
      break;
    default:
      console.log(`Invalid method ${req.method} for ${req.url}`);
  }
};

const configEndpoint = (req, res) => {
  switch (req.method) {
    case "GET":
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(configHTML);
      break;
    default:
      console.log(`Invalid method ${req.method} for ${req.url}`);
  }
};

const dataEndpoint = (req, res) => {
  switch (req.method) {
    case "POST":
      {
        let body = "";
        req.on("data", chunk => {
          body += chunk;
        });
        req.on("end", () => {
          console.log(body);
          const upd = JSON.parse(body);
          const idx = (upd.h - data.a) / 3600000;
          data.o[upd.s] = upds(data.o[upd.s], idx, upd.o ? "1" : "0");
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        });
      }
      break;
    case "GET":
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
      break;
    default:
      console.log(`Invalid method ${req.method} for ${req.url}`);
  }
};

const confdataEndpoint = (req, res) => {
  switch (req.method) {
    case "POST":
      {
        let body = "";
        req.on("data", chunk => {
          body += chunk;
        });
        req.on("end", () => {
          console.log(body);
          config = JSON.parse(body);
          if (!config.p) config.p = "  return spotPrice;";
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(config));
        });
      }
      break;
    case "GET":
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(config));
      break;
    default:
      console.log(`Invalid method ${req.method} for ${req.url}`);
  }
};

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  const url = new URL(req.url, `http://${req.headers.host}`);
  let endpoint = null;
  switch (url.pathname) {
    case "/spotelly":
      endpoint = spotellyEndpoint;
      break;
    case "/config":
      endpoint = configEndpoint;
      break;
    case "/data":
      endpoint = dataEndpoint;
      break;
    case "/confdata":
      endpoint = confdataEndpoint;
      break;
  }
  if (endpoint) {
    endpoint(req, res, url.searchParams);
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain");
    res.end("404 Not Found\n");
  }
});

server.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}/spotelly`);
  console.log(`http://${hostname}:${port}/config`);
});

const wss = new WebSocketServer({ port: wsPort });
wss.on("connection", ws => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});
