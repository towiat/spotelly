// Spotelly Version 4.2
// This script uses EPEX spot energy prices to control the power output of a Shelly device.
// See https://github.com/towiat/spotelly for the full documentation.
// This script uses price data from http://energy-charts.info

function upds(str, idx, val) {
  return str.slice(0, idx) + val + str.slice(idx + val.length);
}

function next() {
  const info = Timer.getInfo(timh);
  if (info === undefined) return 0;
  return Math.floor(Date.now()) + info.next - Shelly.getUptimeMs();
}

function set(q) {
  if (!q.length) return; // queue is empty, nothing to do
  const cmd = q.splice(0, 1)[0];
  if (CONF.c.s[cmd.id]) cmd.on = !cmd.on; // invert switch if needed
  Shelly.call("Switch.Set", cmd, function () {
    Timer.set(0, false, set, q); // process the next queue item
  });
}

function getP() {
  const now = new Date();
  const strt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const year = strt.getFullYear().toString();
  const month = (strt.getMonth() + 1).toString();
  const day = strt.getDate().toString();
  const parm = [
    year,
    "-",
    month.length === 1 ? "0" + month : month,
    "-",
    day.length === 1 ? "0" + day : day,
  ].join("");

  const url = "https://api.energy-charts.info/price?bzn=" + CONF.c.b + "&start=" + parm;

  Shelly.call("http.get", { url: url }, prcP, strt.getTime());
}

function prcP(res, errc, errm, strt) {
  const st = Date.now();
  let fbm = false;
  let prcs = [];

  let err = "";
  if (errc !== 0) {
    err = "Shelly error: " + errc + "/" + errm;
  } else if (res.code !== 200) {
    err = "Server error " + res.code + "/" + res.message;
  } else {
    delete res.headers; // free up RAM to reduce peak memory usage
    const pstr = res.body.indexOf('"price":') + 8;
    const pend = res.body.indexOf("]", pstr) + 1;
    res.body = res.body.substring(pstr, pend);
    prcs = JSON.parse(res.body);
    delete res.body;

    // in hour mode, convert 15-minute prices to 60-minute prices
    if (CONF.c.i === 3600000) {
      const ptmp = [];
      for (let i = 0; i < prcs.length; i += 4) {
        let psum = 0;
        for (let j = i; j < i + 4; j++) psum += prcs[j];
        ptmp.push(psum / 4);
      }
      prcs = ptmp;
    }
  }

  if (err) {
    if (strt > Date.now() + 1800000) {
      // retry only if day starts at least 30 minutes in the future
      timh = Timer.set(1200000, false, getP);
      console.log(err, "Trying again at", next());
      return;
    }

    // no prices retrieved - do the fallback
    fbm = true;
    const mult = 3600000 / CONF.c.i;
    for (const p of [
      75.6, 69.8, 67.3, 65.3, 66.3, 73.3, 89.7, 101.6, 97.4, 82.1, 68.7, 60, 53.5, 50.2, 52.8, 63.8,
      78.5, 97.5, 111.6, 121, 115.8, 100.2, 90.1, 79.7,
    ])
      for (let i = 0; i < mult; i++) prcs.push(p);
  }

  let srtd = []; // indices of prices in ascending order

  // call the price modifier function for each price
  for (let i = 0, dt = strt; i < prcs.length; i++, dt += CONF.c.i) {
    const p = prcm(new Date(dt), prcs[i] / 10);
    prcs[i] = p;

    // insert the index of the price into the correct position of the sorted array
    let lo = 0;
    let hi = i;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      prcs[srtd[mid]] < p ? (lo = mid + 1) : (hi = mid);
    }
    srtd.splice(lo, 0, i);
  }

  if (anch === 0) anch = strt;

  // process time window array for each switch that has one
  CONF.w.forEach(function (swch, idx) {
    if (swch.length) on[idx] += clcw(prcs, srtd, swch);
  });

  srtd = null;

  // push todays prices to the main price array
  for (const p of prcs) prc.push(fbm ? "NaN" : Math.round(p * 100));

  console.log("Calculation done, runtime:", Math.floor(Date.now() - st), "ms");
}

// calculate the time windows for one switch
function clcw(prcs, srtd, wins) {
  let ons = zros.slice(0, prcs.length);

  for (const win of wins) {
    // window start index
    const wsix = win[0];
    // window end index - may be too high if clock is changed for daylight saving time
    const weix = Math.min(win[1], prcs.length);
    // duration - make sure that it is not longer than the time window
    const dur = Math.min(win[3], weix - wsix);
    // type - are we looking for high prices instead of low ones?
    const high = Boolean(win[4]);
    // convert price limit string to number; if empty, use negative/positive infinity instead
    const lim = win[5] ? Number(win[5]) : high ? -Infinity : Infinity;

    // set all switch commands for the current window to zero
    ons = upds(ons, wsix, zros.slice(wsix, weix));

    if (win[2] === 0) {
      // block mode
      let csum = 0;
      for (let i = wsix; i < wsix + dur; i++) csum += prcs[i];
      let bsum = csum;
      let sidx = wsix;
      for (let i = wsix + dur; i < weix; i++) {
        csum = csum - prcs[i - dur] + prcs[i];

        if (high ? csum > bsum : csum < bsum) {
          bsum = csum;
          sidx = i - dur + 1;
        }
      }
      for (let i = sidx; i < sidx + dur; i++) {
        if (high ? prcs[i] >= lim : prcs[i] <= lim) ons = upds(ons, i, "1");
      }
    } else if (high) {
      // non-block mode, highest prices
      let c = 0;
      for (let i = srtd.length - 1; i >= 0; i--) {
        if (c === dur) break;
        const idx = srtd[i];
        if (idx >= wsix && idx < weix) {
          if (prcs[idx] >= lim) ons = upds(ons, idx, "1");
          c++;
        }
      }
    } else {
      // non-block mode, lowest prices
      let c = 0;
      for (const i of srtd) {
        if (c === dur) break;
        if (i >= wsix && i < weix) {
          if (prcs[i] <= lim) ons = upds(ons, i, "1");
          c++;
        }
      }
    }
  }
  return ons;
}

// eslint-disable-next-line no-unused-vars
function chck() {
  if (!actv) return;
  const now = Math.floor(Date.now());
  const time = new Date(now - (now % CONF.c.i));
  const q = []; // queue for switch commands
  if (time.getTime() === anch) {
    const evnt = {};
    evnt.current_price = Number(prc.splice(0, 1)) / 100;
    evnt.next_price = prc[0] ? Number(prc[0]) / 100 : NaN;
    CONF.w.forEach(function (swch, idx) {
      if (!swch.length) return; // no time windows for this switch - skip
      const o = on[idx][0] === "1";
      on[idx] = on[idx].slice(1);
      q.push({ id: idx, on: o });
      evnt["switch_" + idx] = o;
    });
    Shelly.emitEvent("spotelly_tick", evnt);
    set(q);
    anch = prc.length ? anch + CONF.c.i : 0;
  }

  if (time.getHours() === 15 && time.getMinutes() === 0) timh = Timer.set(roff, false, getP);
}

function htep(req, res, html) {
  res.headers = [
    ["Content-Type", "text/html"],
    ["Content-Encoding", "gzip"],
  ];
  res.body = html;
  res.send();
}

function init() {
  CONF.c = {
    b: "", // bidding zone
    i: 3_600_000, // 3600000 = 60-minute mode, 900000 = 15-minute mode
    s: [], // invert switch array (one boolean for each switch)
  };

  // array of arrays for time windows
  // there is one array for each switch
  // each of these arrays holds the time window objects for one switch
  // time windows are modeled as arrays with the following values:
  // index 0: time window start index (0..23 in 60-minute mode, 0..95 in 15-minute mode)
  // index 1: time window end index (1..24 in 60-minute mode, 1..96 in 15-minute mode)
  // index 2: type (0 = block mode, 1 = non-block mode)
  // index 3: duration (1..24 in 60-minute mode, 1..96 in 15-minute mode)
  // index 4: price selector (0 = lowest, 1 = highest)
  // index 5: price limit (string; empty = no limit, numeric value = limit)
  CONF.w = [];

  CONF.p = "  return spotPrice;"; // price modifier code

  for (let i = 0; i < 10; i++) {
    if (!Shelly.getComponentStatus("switch", i)) break;
    CONF.w.push([]); // add one empty array for each switch
    CONF.c.s.push(false); // add one false for each switch
  }

  updc();
}

function updc() {
  prc = [];
  on = [];
  for (const _ of CONF.w) on.push(""); // create one string for each switch on the device
  anch = 0;
  prcm = new Function("datetime", "spotPrice", CONF.p);
  Timer.clear(timh); // make sure that no timer is active (important in config update scenario)

  // make sure that schedule is correctly set for 60-minute/15-minute mode
  Shelly.call("Schedule.List", {}, function (res) {
    const call = { method: "Script.Eval", params: { id: Script.id, code: "chck()" } };
    const schd = {
      enable: true,
      timespec: CONF.c.i === 3600000 ? "0 0 * * * *" : "0 */15 * * * *",
      calls: [call],
    };

    for (const job of res.jobs) {
      const cll = job.calls[0];
      if (cll.method.toLowerCase() !== "script.eval" || cll.params.id !== Script.id) continue;
      if (job.timespec === schd.timespec && cll.params.code === call.params.code) return;
      schd.id = job.id;
      break;
    }

    Shelly.call("id" in schd ? "Schedule.Update" : "Schedule.Create", schd);
  });
}

function stup() {
  if (Shelly.getComponentStatus("sys").unixtime === null) {
    console.log("Time not synchronized, waiting one second...");
    Timer.set(1000, false, stup);
    return;
  }

  if (new Date().getHours() >= 15) timh = Timer.set(0, false, getP);
}

// Script startup procedure starts here

HTTPServer.registerEndpoint("spotelly", htep, atob("{{ timetable.html }}"));
HTTPServer.registerEndpoint("config", htep, atob("{{ config.html }}"));

HTTPServer.registerEndpoint("data", function (req, res) {
  if (req.method === "POST") {
    const data = JSON.parse(req.body);
    const idx = (data.h - anch) / CONF.c.i;
    if (idx >= 0 && idx < prc.length) on[data.s] = upds(on[data.s], idx, data.o ? "1" : "0");
  }
  res.headers = [["Content-Type", "application/json"]];
  res.body = JSON.stringify({
    i: CONF.c.i,
    a: anch,
    n: next(),
    p: prc,
    o: on,
    r: roff,
    v: actv,
    z: Shelly.getComponentConfig("sys").location.tz,
  });
  res.send();
});

HTTPServer.registerEndpoint("confdata", function (req, res) {
  if (req.method === "POST") {
    CONF = JSON.parse(req.body);
    Script.storage.setItem("c", JSON.stringify(CONF.c));
    Script.storage.setItem("w", JSON.stringify(CONF.w));
    if (!CONF.p) CONF.p = "  return spotPrice;";
    Script.storage.setItem("p", JSON.stringify(CONF.p));
    actv = true;
    updc();
    stup();
  }
  res.headers = [["Content-Type", "application/json"]];
  res.body = JSON.stringify(CONF);
  res.send();
});

// this string of 100 zeroes will save us performance down the line
const zros =
  "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

let CONF = { c: null, w: null, p: null };
let on = [];
let prc = [];
let anch = 0;
let prcm = null;
let timh = undefined; // timer handle
const roff = Math.ceil(Math.random() * 300000); // random offset in ms for timer start after 15:00

let actv = false; // true if we have a valid configuration
CONF.c = JSON.parse(Script.storage.getItem("c")); // get config from storage
if (CONF.c !== null) {
  CONF.w = JSON.parse(Script.storage.getItem("w"));
  CONF.p = JSON.parse(Script.storage.getItem("p"));
  actv = true; // we have a configuration from WebStorage
  updc(); // Update state variables and schedule
  stup(); // start up the script
} else {
  init(); // no config stored - leave actv at false and set default CONF
}
