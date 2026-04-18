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
