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
    const weix = Math.min(win.e, prcs.length);
    const dur = Math.min(win.d, weix - win.s);

    const lim = win.l ? Number(win.l) : win.p ? -Infinity : Infinity;

    ons = upds(ons, win.s, zros.slice(win.s, weix));

    if (win.t === 0) {
      let csum = 0;
      for (let i = win.s; i < win.s + dur; i++) csum += prcs[i];
      let bsum = csum;
      let sidx = win.s;
      for (let i = win.s + dur; i < weix; i++) {
        csum = csum - prcs[i - dur] + prcs[i];

        if (win.p ? csum > bsum : csum < bsum) {
          bsum = csum;
          sidx = i - dur + 1;
        }
      }
      for (let i = sidx; i < sidx + dur; i++) {
        if (win.p ? prcs[i] >= lim : prcs[i] <= lim) ons = upds(ons, i, "1");
      }
    } else if (win.p) {
      let c = 0;
      for (let i = srtd.length - 1; i >= 0; i--) {
        if (c === dur) break;
        const idx = srtd[i];
        if (idx >= win.s && idx < weix) {
          if (prcs[idx] >= lim) ons = upds(ons, idx, "1");
          c++;
        }
      }
    } else {
      let c = 0;
      for (const i of srtd) {
        if (c === dur) break;
        if (i >= win.s && i < weix) {
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
