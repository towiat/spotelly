function e(e, t, n) {
  return e.slice(0, t) + n + e.slice(t + n.length);
}
function t(e, t) {
  const n = new Date(e.getFullYear(), e.getMonth(), e.getDate() + t);
  return {
    s: [n.getFullYear(), ("0" + (n.getMonth() + 1)).slice(-2), ("0" + n.getDate()).slice(-2)].join("-"),
    t: n.getTime()
  };
}
function n(e) {
  const t = Math.floor((b - e) / -h.c.i);
  t <= 0 || (d.splice(0, t), h.w.forEach(function (e, n) {
    e.length && (p[n] = p[n].slice(t));
  }), d.length ? b += h.c.i * t : b = 0);
}
function o() {
  const e = Timer.getInfo(u);
  return void 0 === e ? 0 : Math.floor(Date.now()) + e.next - Shelly.getUptimeMs();
}
function i(e) {
  if (!e.length) return;
  const t = e.splice(0, 1)[0];
  h.c.s[t.id] && (t.on = !t.on), Shelly.call("Switch.Set", t, function () {
    Timer.set(0, !1, i, e);
  });
}
function r(e) {
  const n = t(new Date(), e),
    o = "https://api.energy-charts.info/price?bzn=" + h.c.b + "&start=" + n.s;
  Shelly.call("http.get", {
    url: o
  }, s, {
    strt: n.t,
    offs: e
  });
}
function s(e, t, i, s) {
  const f = Date.now();
  if (s.strt < f) {
    d = [], p = [];
    for (const e of h.w) p.push("");
    b = 0;
  }
  if (b && b + d.length * h.c.i > s.strt) return;
  let a = !1,
    g = [],
    y = "";
  if (0 !== t) y = "Shelly error: " + t + "/" + i;else if (200 !== e.code) y = "Server error " + e.code + "/" + e.message;else {
    delete e.headers;
    const t = e.body.indexOf('"price":') + 8,
      n = e.body.indexOf("]", t) + 1;
    if (e.body = e.body.substring(t, n), g = JSON.parse(e.body), delete e.body, 36e5 === h.c.i) {
      for (let e = 0, t = 0; e < 24; e++, t += 4) g[e] = (g[t] + g[t + 1] + g[t + 2] + g[t + 3]) / 4;
      g.splice(24);
    }
  }
  if (y) {
    const e = new Date();
    if (e.getHours() < 23 || e.getMinutes() < 30) return u = Timer.set(12e5, !1, r, s.offs), void console.log(y, "Trying again at", o());
    a = !0;
    let t = 24;
    const n = new Date(s.strt);
    0 === n.getDay() && n.getDate() > 24 && (2 === n.getMonth() && (t = 23), 9 === n.getMonth() && (t = 25));
    const i = 36e5 / h.c.i;
    let c = 0;
    for (const e of [75.6, 69.8, 67.3, 65.3, 66.3, 73.3, 89.7, 101.6, 97.4, 82.1, 68.7, 60, 53.5, 50.2, 52.8, 63.8, 78.5, 97.5, 111.6, 121, 115.8, 100.2, 90.1, 79.7, 79.7]) {
      for (let t = 0; t < i; t++) g.push(e);
      if (++c >= t) break;
    }
  }
  let m = [];
  for (let e = 0, t = s.strt; e < g.length; e++, t += h.c.i) {
    const n = S(new Date(t), g[e] / 10);
    g[e] = n;
    let o = 0,
      i = e;
    for (; o < i;) {
      const e = o + i >>> 1;
      g[m[e]] < n ? o = e + 1 : i = e;
    }
    m.splice(o, 0, e);
  }
  0 === b && (b = s.strt), h.w.forEach(function (e, t) {
    e.length && (p[t] += c(g, m, e));
  }), m = null;
  for (const e of g) d.push(a ? "NaN" : Math.round(100 * e));
  g = null;
  const w = Math.floor(Date.now());
  s.strt < w && new Date().getHours() >= 15 && (u = Timer.set(0, !1, r, 1));
  let M = w + h.c.i + 1e3;
  M -= M % h.c.i, n(M), Timer.set(M - Date.now(), !1, l, M), console.log("Calculation done, runtime:", Math.floor(Date.now() - f), "ms");
}
function c(t, n, o) {
  let i = g.slice(0, t.length);
  for (const r of o) {
    const o = r[0],
      s = Math.min(r[1], t.length);
    let c = Math.min(r[3], s - o);
    const l = Boolean(r[4]),
      f = r[5] ? Number(r[5]) : l ? -1 / 0 : 1 / 0;
    if (i = e(i, o, g.slice(o, s)), 0 === r[2]) {
      let n = 0;
      for (let e = o; e < o + c; e++) n += t[e];
      let r = n,
        a = o;
      for (let e = o + c; e < s; e++) n = n - t[e - c] + t[e], (l ? n > r : n < r) && (r = n, a = e - c + 1);
      for (let n = a; n < a + c; n++) (l ? t[n] >= f : t[n] <= f) && (i = e(i, n, "1"));
    } else if (l) for (let r = n.length - 1; r >= 0; r--) {
      const l = n[r];
      if (l >= o && l < s && (t[l] >= f && (i = e(i, l, "1")), 0 === --c)) break;
    } else for (const r of n) if (r >= o && r < s && (t[r] <= f && (i = e(i, r, "1")), 0 === --c)) break;
  }
  return i;
}
function l(e) {
  n(e);
  const t = [];
  if (e === b) {
    const e = {},
      n = d.splice(0, 1)[0],
      o = d[0];
    e.current_price = "NaN" !== n ? Number(n) / 100 : NaN, e.next_price = "NaN" !== o ? Number(o) / 100 : NaN, h.w.forEach(function (n, o) {
      if (!n.length) return;
      const i = "1" === p[o][0];
      p[o] = p[o].slice(1), t.push({
        id: o,
        on: i
      }), e["switch_" + o] = i;
    }), Shelly.emitEvent("spotelly_tick", e), i(t), b = d.length ? b + h.c.i : 0;
  }
  const o = e + h.c.i;
  Timer.set(o - Date.now(), !1, l, o);
  const s = new Date(e);
  15 === s.getHours() && 0 === s.getMinutes() && (u = Timer.set(y, !1, r, 1));
}
function f(e, t, n) {
  t.headers = [["Content-Type", "text/html"], ["Content-Encoding", "gzip"]], t.body = n, t.send();
}
function a() {
  if (null === Shelly.getComponentStatus("sys").unixtime) return console.log("Time not synchronized, waiting one second..."), void Timer.set(1e3, !1, a);
  Timer.set(0, !1, r, 0);
}
HTTPServer.registerEndpoint("spotelly", f, atob("H4sIAAAAAAACA40VZ5fjKPKvaNkE11jyxLdPFurNeSdtjtMYyi2uEehBOZ1H//1A8sSLHwiVqUjzlvYKjwMUHfa2bfJeaIlysY4L7KAHoWW4aZseUBbKOwSHguyNxk5o2BkFiwngxhk00i6ikhbELVI4mYR3BvaDD9g21riboguwER3iEOuqUtqVf48arNmF0gFWbuirtfcYMcjhw3vlnfKDSpuIlYrxJaHsjSsTpghgRcSjhdgBJAto0EL7/eARrD021Qw3a6+PhbIyRoFwwIUChxCSR9K4M54M68W9YsDFXZLUyLWF54T+sJBb9MWEnPfF2gcNAfQZjBjMkKD9xJkVdCB1YbTo0j1kuFDexkE6cbf9wfQwK9v4UHy/N6i6JoIFhVkkFpNHIrk9WHmsjbPGJZPWq5tVL8O1cQsLG6w/GA5tU82Cz820n0qEfGYj+VRY3fzc5dtD12AORLaxToLTE9KZg9A2G+8RwnOf19eLIZhk7FhszAF0chjR9yTLbtomquQvthawAOG21nIUD7b9GgJ1sC9+fPLt9yCD6h7JIPtI98Zpvy+TAxKNd2WciKy8BqTEaMLYs2fLlfIuYuEEijYryY5QZCX6b5Oche8xGHdNSdwRfsLk3W/eQQ3lP7hOnN/nkNUkdj4g4Zl8xvSgzbYnI+NeaK+2PTjMhj+zkK8fH7/SlKwJ4/I/kzeJrP4zORK22mydyr4VhrKT2dC3oNyxALgNrth5o6kvjXMQvvzhu2/F1Zws/bImznEfFvfaRs4tQt45vRm3jC8DDFYqSGbPVU44Ud5tzDVhIylQhmtAQZ6urXQ3pH04gCs+mejbMKlpKtlesZV65UGErDY+0DkDWBhXQOlZWr/jn++9R19hvUiP90NW075zwrGpZmBWuJN2CwJzMnNpGLHkIa04lcgqRQVKyU7+dcOZU4pEWcVnz2hMt9TecqAg2nNJAatuLZeMnStEie8kdonnQMuyjIzbM8K4GbGKZfLmM6k6SiPXTLSnWbIT5BYRQsyO/a7/XHXJu3AhIjcXF8/19+JqbkCivPWhLrpo6TsnEx/IB1SxS7LkxfJdXqQ3vUvqW7eXf6O3FjQuLKuoSju7IDORF/cSx8hW5GrlXw8hhtxJ75zkONXBO6d+TPF0VLIyWqOALvmtJRv/Pe3WLX7r/kviq4MNnE68sUT/eW5bepuNReJrG212Z74Umn4Rp6HTNsYNW3yVoDpQN4sZnf8EMSHW/pBMdZdkgkCTmpD08ippba+4vBBQmpGNYCMUr6X3vxX6Az/9MuQcdiuedz3XSZ+7TKt+jqI2d93nW2t/BRko4xP8nXfYPQcmNnYxc37ptyFS1opb9xhPK+PSRMwMUIaVfLUZU2rHYp6ioHnx0Q6CvIY6OUzNZahMvWSvxfM8UdehfQAHLH4ctMSJ3VHNxqtRlVLrz3bg8FsTERwESlQn3TUQDqkWX4xKKOdmnfuGcUNZHlP/XTxQ5G/KK+sjRKQEA2Gl0Yy/JM0Je9E8QSR5x2Vuig2g6uj/PWSmZDHuLk89YOd1TR49/P4HwvOfUn/9/cMHZZxGtNkc6SnWyLvacV/LkY31C5EvPvuBjKzEDlzucEi/v3eUnTGYXgUC50iUSqLqMtf/PTvfOcF4xcbV7NO/CaT1UhNOWY4jY011/sj+CaxMSSoDCQAA")), HTTPServer.registerEndpoint("config", f, atob("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")), HTTPServer.registerEndpoint("data", function (t, n) {
  if ("POST" === t.method) {
    const n = JSON.parse(t.body),
      o = (n.h - b) / h.c.i;
    o >= 0 && o < d.length && (p[n.s] = e(p[n.s], o, n.o ? "1" : "0"));
  }
  n.headers = [["Content-Type", "application/json"]], n.body = JSON.stringify({
    i: h.c.i,
    a: b,
    n: o(),
    p: d,
    o: p,
    r: y,
    v: !0,
    z: Shelly.getComponentConfig("sys").location.tz
  }), n.send();
}), HTTPServer.registerEndpoint("confdata", function (e, t) {
  "POST" === e.method && (h = JSON.parse(e.body), Script.storage.setItem("c", JSON.stringify(h.c)), Script.storage.setItem("w", JSON.stringify(h.w)), h.p || (h.p = "  return spotPrice;"), Script.storage.setItem("p", JSON.stringify(h.p)), S = new Function("datetime", "spotPrice", h.p), a()), t.headers = [["Content-Type", "application/json"]], t.body = JSON.stringify(h), t.send();
});
const g = "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
let h = {
  c: {
    b: "",
    i: 36e5,
    s: []
  },
  w: [],
  p: "  return spotPrice"
};
for (let e = 0; e < 10 && Shelly.getComponentStatus("switch", e); e++) h.w.push([]), h.c.s.push(!1);
let u,
  p = [],
  d = [],
  b = 0,
  S = null;
const y = Math.floor(5e3 + 6e5 * Math.random());
h.c = JSON.parse(Script.storage.getItem("c")), null !== h.c && (h.w = JSON.parse(Script.storage.getItem("w")), h.p = JSON.parse(Script.storage.getItem("p")), S = new Function("datetime", "spotPrice", h.p), a());