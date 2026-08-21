function upds(str, idx, val) {
  return str.slice(0, idx) + val + str.slice(idx + val.length);
}
function bdat(d, offs) {
  const strt = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offs);
  const year = strt.getFullYear().toString();
  const month = (strt.getMonth() + 1).toString();
  const day = strt.getDate().toString();
  return {
    s: [year, "-", month.length === 1 ? "0" + month : month, "-", day.length === 1 ? "0" + day : day].join(""),
    t: strt.getTime()
  };
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
function getP(offs) {
  const d = bdat(new Date(), offs);
  const url = "https://api.energy-charts.info/price?bzn=" + CONF.c.b + "&start=" + d.s;
  Shelly.call("http.get", {
    url: url
  }, prcP, d.t);
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
    const mult = 3600000 / CONF.c.i;
    for (const p of [75.6, 69.8, 67.3, 65.3, 66.3, 73.3, 89.7, 101.6, 97.4, 82.1, 68.7, 60, 53.5, 50.2, 52.8, 63.8, 78.5, 97.5, 111.6, 121, 115.8, 100.2, 90.1, 79.7]) for (let i = 0; i < mult; i++) prcs.push(p);
  }
  let srtd = [];
  for (let i = 0, dt = strt; i < prcs.length; i++, dt += CONF.c.i) {
    const p = prcm(new Date(dt), prcs[i] / 10);
    prcs[i] = p;
    let lo = 0;
    let hi = i;
    while (lo < hi) {
      const mid = lo + hi >>> 1;
      prcs[srtd[mid]] < p ? lo = mid + 1 : hi = mid;
    }
    srtd.splice(lo, 0, i);
  }
  if (anch === 0) anch = strt;
  CONF.w.forEach(function (swch, idx) {
    if (swch.length) on[idx] += clcw(prcs, srtd, swch);
  });
  srtd = null;
  for (const p of prcs) prc.push(fbm ? "NaN" : Math.round(p * 100));
  prcs = null;
  if (anch < Date.now()) {
    while (anch < Date.now()) {
      prc.splice(0, 1);
      CONF.w.forEach(function (swch, idx) {
        if (swch.length) on[idx] = on[idx].slice(1);
      });
      anch += CONF.c.i;
    }
    if (new Date().getHours() >= 15) timh = Timer.set(0, false, getP, 1);
  }
  if (!prc.length) anch = 0;
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
  const time = new Date(now - now % CONF.c.i);
  const q = [];
  if (time.getTime() === anch) {
    const evnt = {};
    evnt.current_price = Number(prc.splice(0, 1)) / 100;
    evnt.next_price = prc[0] ? Number(prc[0]) / 100 : NaN;
    CONF.w.forEach(function (swch, idx) {
      if (!swch.length) return;
      const o = on[idx][0] === "1";
      on[idx] = on[idx].slice(1);
      q.push({
        id: idx,
        on: o
      });
      evnt["switch_" + idx] = o;
    });
    Shelly.emitEvent("spotelly_tick", evnt);
    set(q);
    anch = prc.length ? anch + CONF.c.i : 0;
  }
  if (time.getHours() === 15 && time.getMinutes() === 0) timh = Timer.set(roff, false, getP, 1);
}
function htep(req, res, html) {
  res.headers = [["Content-Type", "text/html"], ["Content-Encoding", "gzip"]];
  res.body = html;
  res.send();
}
function init() {
  CONF.c = {
    b: "",
    i: 3_600_000,
    s: []
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
    const call = {
      method: "Script.Eval",
      params: {
        id: Script.id,
        code: "chck()"
      }
    };
    const schd = {
      enable: true,
      timespec: CONF.c.i === 3600000 ? "0 0 * * * *" : "0 */15 * * * *",
      calls: [call]
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
  Timer.set(0, false, getP, 0);
}
HTTPServer.registerEndpoint("spotelly", htep, atob("H4sIAAAAAAACA40VZ5fjKPKvaNkE11jyxLdPFurNeSdtjtMYyi2uEehBOZ1H//1A8sSLHwiVqUjzlvYKjwMUHfa2bfJeaIlysY4L7KAHoWW4aZseUBbKOwSHguyNxk5o2BkFiwngxhk00i6ikhbELVI4mYR3BvaDD9g21riboguwER3iEOuqUtqVf48arNmF0gFWbuirtfcYMcjhw3vlnfKDSpuIlYrxJaHsjSsTpghgRcSjhdgBJAto0EL7/eARrD021Qw3a6+PhbIyRoFwwIUChxCSR9K4M54M68W9YsDFXZLUyLWF54T+sJBb9MWEnPfF2gcNAfQZjBjMkKD9xJkVdCB1YbTo0j1kuFDexkE6cbf9wfQwK9v4UHy/N6i6JoIFhVkkFpNHIrk9WHmsjbPGJZPWq5tVL8O1cQsLG6w/GA5tU82Cz820n0qEfGYj+VRY3fzc5dtD12AORLaxToLTE9KZg9A2G+8RwnOf19eLIZhk7FhszAF0chjR9yTLbtomquQvthawAOG21nIUD7b9GgJ1sC9+fPLt9yCD6h7JIPtI98Zpvy+TAxKNd2WciKy8BqTEaMLYs2fLlfIuYuEEijYryY5QZCX6b5Oche8xGHdNSdwRfsLk3W/eQQ3lP7hOnN/nkNUkdj4g4Zl8xvSgzbYnI+NeaK+2PTjMhj+zkK8fH7/SlKwJ4/I/kzeJrP4zORK22mydyr4VhrKT2dC3oNyxALgNrth5o6kvjXMQvvzhu2/F1Zws/bImznEfFvfaRs4tQt45vRm3jC8DDFYqSGbPVU44Ud5tzDVhIylQhmtAQZ6urXQ3pH04gCs+mejbMKlpKtlesZV65UGErDY+0DkDWBhXQOlZWr/jn++9R19hvUiP90NW075zwrGpZmBWuJN2CwJzMnNpGLHkIa04lcgqRQVKyU7+dcOZU4pEWcVnz2hMt9TecqAg2nNJAatuLZeMnStEie8kdonnQMuyjIzbM8K4GbGKZfLmM6k6SiPXTLSnWbIT5BYRQsyO/a7/XHXJu3AhIjcXF8/19+JqbkCivPWhLrpo6TsnEx/IB1SxS7LkxfJdXqQ3vUvqW7eXf6O3FjQuLKuoSju7IDORF/cSx8hW5GrlXw8hhtxJ75zkONXBO6d+TPF0VLIyWqOALvmtJRv/Pe3WLX7r/kviq4MNnE68sUT/eW5bepuNReJrG212Z74Umn4Rp6HTNsYNW3yVoDpQN4sZnf8EMSHW/pBMdZdkgkCTmpD08ippba+4vBBQmpGNYCMUr6X3vxX6Az/9MuQcdiuedz3XSZ+7TKt+jqI2d93nW2t/BRko4xP8nXfYPQcmNnYxc37ptyFS1opb9xhPK+PSRMwMUIaVfLUZU2rHYp6ioHnx0Q6CvIY6OUzNZahMvWSvxfM8UdehfQAHLH4ctMSJ3VHNxqtRlVLrz3bg8FsTERwESlQn3TUQDqkWX4xKKOdmnfuGcUNZHlP/XTxQ5G/KK+sjRKQEA2Gl0Yy/JM0Je9E8QSR5x2Vuig2g6uj/PWSmZDHuLk89YOd1TR49/P4HwvOfUn/9/cMHZZxGtNkc6SnWyLvacV/LkY31C5EvPvuBjKzEDlzucEi/v3eUnTGYXgUC50iUSqLqMtf/PTvfOcF4xcbV7NO/CaT1UhNOWY4jY011/sj+CaxMSSoDCQAA"));
HTTPServer.registerEndpoint("config", htep, atob("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"));
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
    z: Shelly.getComponentConfig("sys").location.tz
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
const zros = "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
let CONF = {
  c: null,
  w: null,
  p: null
};
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