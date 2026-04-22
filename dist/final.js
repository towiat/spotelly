function upds(str, idx, val) {
  return str.slice(0, idx) + val + str.slice(idx + val.length);
}

function next() {
  const info = Timer.getInfo(timh);
  if (info === undefined) return 0;
  return Math.floor(Date.now()) + info.next - Shelly.getUptimeMs();
}

function set(q) {
  if (!q.length) return;
  const cmd = q.splice(0, 1)[0];
  if (CONF.c.s[cmd.id]) cmd.on = !cmd.on;
  Shelly.call("Switch.Set", cmd, function () {
    Timer.set(0, false, set, q);
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
    delete res.headers;
    const pstr = res.body.indexOf('"price":') + 8;
    const pend = res.body.indexOf("]", pstr) + 1;
    res.body = res.body.substring(pstr, pend);
    prcs = JSON.parse(res.body);
    delete res.body;

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
      timh = Timer.set(1200000, false, getP);
      console.log(err, "Trying again at", next());
      return;
    }

    fbm = true;
    const mult = CONF.c.i / 900000;
    for (const p of [
      75.6, 69.8, 67.3, 65.3, 66.3, 73.3, 89.7, 101.6, 97.4, 82.1, 68.7, 60, 53.5, 50.2, 52.8, 63.8,
      78.5, 97.5, 111.6, 121, 115.8, 100.2, 90.1, 79.7,
    ])
      for (let i = 0; i < mult; i++) prcs.push(p);
  }

  let srtd = [];

  for (let i = 0, dt = strt; i < prcs.length; i++, dt += CONF.c.i) {
    const p = prcm(new Date(dt), prcs[i] / 10);
    prcs[i] = p;

    let lo = 0;
    let hi = i;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      prcs[srtd[mid]] < p ? (lo = mid + 1) : (hi = mid);
    }
    srtd.splice(lo, 0, i);
  }

  if (anch === 0) anch = strt;

  CONF.w.forEach(function (swch, idx) {
    if (swch.length) on[idx] += clcw(prcs, srtd, swch);
  });

  srtd = null;

  for (const p of prcs) prc.push(fbm ? "NaN" : Math.round(p * 100));

  console.log("Calculation done, runtime:", Math.floor(Date.now() - st), "ms");
}

function clcw(prcs, srtd, wins) {
  let ons = zros.slice(0, prcs.length);

  for (const win of wins) {
    const wsix = win[0];

    const weix = Math.min(win[1], prcs.length);

    const dur = Math.min(win[3], weix - wsix);

    const high = Boolean(win[4]);

    const lim = win[5] ? Number(win[5]) : high ? -Infinity : Infinity;

    ons = upds(ons, wsix, zros.slice(wsix, weix));

    if (win[2] === 0) {
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

function chck() {
  if (!actv) return;
  const now = Math.floor(Date.now());
  const time = new Date(now - (now % CONF.c.i));
  const q = [];
  if (time.getTime() === anch) {
    prc.splice(0, 1);
    CONF.w.forEach(function (swch, idx) {
      if (!swch.length) return;
      const o = on[idx][0] === "1";
      on[idx] = on[idx].slice(1);
      q.push({ id: idx, on: o });
    });
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
    b: "",
    i: 3_600_000,
    s: [],
  };

  CONF.w = [];

  CONF.p = "  return spotPrice;";

  for (let i = 0; i < 10; i++) {
    if (!Shelly.getComponentStatus("switch", i)) break;
    CONF.w.push([]);
    CONF.c.s.push(false);
  }

  updc();
}

function updc() {
  prc = [];
  on = [];
  for (const _ of CONF.w) on.push("");
  anch = 0;
  prcm = new Function("datetime", "spotPrice", CONF.p);
  Timer.clear(timh);

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

HTTPServer.registerEndpoint(
  "spotelly",
  htep,
  atob(
    "H4sIAAAAAAACA40VZ5fjKPKvaNkE11jyxLdPFurNeSdtjtMYyi2uEehBOZ1H//1A8sSLHwiVqUjzlvYKjwMUHfa2bfJeaIlysY4L7KAHoWW4aZseUBbKOwSHguyNxk5o2BkFiwngxhk00i6ikhbELVI4mYR3BvaDD9g21riboguwER3iEOuqUtqVf48arNmF0gFWbuirtfcYMcjhw3vlnfKDSpuIlYrxJaHsjSsTpghgRcSjhdgBJAto0EL7/eARrD021Qw3a6+PhbIyRoFwwIUChxCSR9K4M54M68W9YsDFXZLUyLWF54T+sJBb9MWEnPfF2gcNAfQZjBjMkKD9xJkVdCB1YbTo0j1kuFDexkE6cbf9wfQwK9v4UHy/N6i6JoIFhVkkFpNHIrk9WHmsjbPGJZPWq5tVL8O1cQsLG6w/GA5tU82Cz820n0qEfGYj+VRY3fzc5dtD12AORLaxToLTE9KZg9A2G+8RwnOf19eLIZhk7FhszAF0chjR9yTLbtomquQvthawAOG21nIUD7b9GgJ1sC9+fPLt9yCD6h7JIPtI98Zpvy+TAxKNd2WciKy8BqTEaMLYs2fLlfIuYuEEijYryY5QZCX6b5Oche8xGHdNSdwRfsLk3W/eQQ3lP7hOnN/nkNUkdj4g4Zl8xvSgzbYnI+NeaK+2PTjMhj+zkK8fH7/SlKwJ4/I/kzeJrP4zORK22mydyr4VhrKT2dC3oNyxALgNrth5o6kvjXMQvvzhu2/F1Zws/bImznEfFvfaRs4tQt45vRm3jC8DDFYqSGbPVU44Ud5tzDVhIylQhmtAQZ6urXQ3pH04gCs+mejbMKlpKtlesZV65UGErDY+0DkDWBhXQOlZWr/jn++9R19hvUiP90NW075zwrGpZmBWuJN2CwJzMnNpGLHkIa04lcgqRQVKyU7+dcOZU4pEWcVnz2hMt9TecqAg2nNJAatuLZeMnStEie8kdonnQMuyjIzbM8K4GbGKZfLmM6k6SiPXTLSnWbIT5BYRQsyO/a7/XHXJu3AhIjcXF8/19+JqbkCivPWhLrpo6TsnEx/IB1SxS7LkxfJdXqQ3vUvqW7eXf6O3FjQuLKuoSju7IDORF/cSx8hW5GrlXw8hhtxJ75zkONXBO6d+TPF0VLIyWqOALvmtJRv/Pe3WLX7r/kviq4MNnE68sUT/eW5bepuNReJrG212Z74Umn4Rp6HTNsYNW3yVoDpQN4sZnf8EMSHW/pBMdZdkgkCTmpD08ippba+4vBBQmpGNYCMUr6X3vxX6Az/9MuQcdiuedz3XSZ+7TKt+jqI2d93nW2t/BRko4xP8nXfYPQcmNnYxc37ptyFS1opb9xhPK+PSRMwMUIaVfLUZU2rHYp6ioHnx0Q6CvIY6OUzNZahMvWSvxfM8UdehfQAHLH4ctMSJ3VHNxqtRlVLrz3bg8FsTERwESlQn3TUQDqkWX4xKKOdmnfuGcUNZHlP/XTxQ5G/KK+sjRKQEA2Gl0Yy/JM0Je9E8QSR5x2Vuig2g6uj/PWSmZDHuLk89YOd1TR49/P4HwvOfUn/9/cMHZZxGtNkc6SnWyLvacV/LkY31C5EvPvuBjKzEDlzucEi/v3eUnTGYXgUC50iUSqLqMtf/PTvfOcF4xcbV7NO/CaT1UhNOWY4jY011/sj+CaxMSSoDCQAA",
  ),
);
HTTPServer.registerEndpoint(
  "config",
  htep,
  atob(
    "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",
  ),
);

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

let zros = "";
for (let i = 0; i < 100; i++) zros += "0";

let CONF = { c: null, w: null, p: null };
let on = [];
let prc = [];
let anch = 0;
let prcm = null;
let timh = undefined;
const roff = Math.ceil(Math.random() * 300000);

let actv = false;
CONF.c = JSON.parse(Script.storage.getItem("c"));
if (CONF.c !== null) {
  CONF.w = JSON.parse(Script.storage.getItem("w"));
  CONF.p = JSON.parse(Script.storage.getItem("p"));
  actv = true;
  updc();
  stup();
} else {
  init();
}
