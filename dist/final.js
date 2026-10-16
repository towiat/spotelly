function a(a, b, c) {
  return a.slice(0, b) + c + a.slice(b + c.length);
}
function b(a, b) {
  const c = new Date(a.getFullYear(), a.getMonth(), a.getDate() + b);
  return {
    s: [c.getFullYear(), ("0" + (c.getMonth() + 1)).slice(-2), ("0" + c.getDate()).slice(-2)].join("-"),
    t: c.getTime()
  };
}
function c(a) {
  const b = Math.floor((r - a) / -m.c.i);
  b <= 0 || (o.splice(0, b), m.w.forEach(function (a, c) {
    a.length && (n[c] = n[c].slice(b));
  }), o.length ? r += m.c.i * b : r = 0);
}
function d() {
  const a = Timer.getInfo(p);
  return void 0 === a ? 0 : Math.floor(Date.now()) + a.next - Shelly.getUptimeMs();
}
function e(a) {
  if (!a.length) return;
  const b = a.splice(0, 1)[0];
  m.c.s[b.id] && (b.on = !b.on), Shelly.call("Switch.Set", b, function () {
    Timer.set(0, !1, e, a);
  });
}
function f(a) {
  const c = b(new Date(), a),
    d = "https://api.energy-charts.info/price?bzn=" + m.c.b + "&start=" + c.s;
  Shelly.call("http.get", {
    url: d
  }, g, {
    strt: c.t,
    offs: a
  });
}
function g(a, b, e, g) {
  const j = Date.now();
  if (g.strt < j) {
    o.splice(0);
    for (let a = 0; a < m.w.length; a++) n[a] = "";
    r = 0;
  }
  if (r && r + o.length * m.c.i > g.strt) return;
  let k = !1,
    l = [],
    t = "";
  if (0 !== b) t = "Shelly error: " + b + "/" + e;else if (200 !== a.code) t = "Server error " + a.code + "/" + a.message;else {
    delete a.headers;
    const b = a.body.indexOf('"price":') + 8,
      c = a.body.indexOf("]", b) + 1;
    if (a.body = a.body.substring(b, c), l = JSON.parse(a.body), delete a.body, 36e5 === m.c.i) {
      for (let a = 0, b = 0; a < l.length / 4; a++, b += 4) l[a] = (l[b] + l[b + 1] + l[b + 2] + l[b + 3]) / 4;
      l.splice(l.length / 4);
    }
  }
  if (t) {
    const a = new Date();
    if (a.getHours() < 23 || a.getMinutes() < 30) return p = Timer.set(12e5, !1, f, g.offs), void console.log(t, "Trying again at", d());
    k = !0;
    let b = 24;
    const c = new Date(g.strt);
    0 === c.getDay() && c.getDate() > 24 && (2 === c.getMonth() && (b = 23), 9 === c.getMonth() && (b = 25));
    const e = 36e5 / m.c.i;
    let h = 0;
    for (const a of [75.6, 69.8, 67.3, 65.3, 66.3, 73.3, 89.7, 101.6, 97.4, 82.1, 68.7, 60, 53.5, 50.2, 52.8, 63.8, 78.5, 97.5, 111.6, 121, 115.8, 100.2, 90.1, 79.7, 79.7]) {
      for (let b = 0; b < e; b++) l.push(a);
      if (++h >= b) break;
    }
  }
  let u = [];
  for (let a = 0, b = g.strt; a < l.length; a++, b += m.c.i) {
    const c = s(new Date(b), l[a] / 10);
    l[a] = c;
    let d = 0,
      e = a;
    for (; d < e;) {
      const a = d + e >>> 1;
      l[u[a]] < c ? d = a + 1 : e = a;
    }
    u.splice(d, 0, a);
  }
  0 === r && (r = g.strt), m.w.forEach(function (a, b) {
    a.length && (n[b] += h(l, u, a));
  }), u = null;
  for (const a of l) o.push(k ? "NaN" : Math.round(100 * a));
  l = null;
  const v = Math.floor(Date.now());
  if (g.strt < v) {
    new Date().getHours() >= 15 && (p = Timer.set(0, !1, f, 1));
    let a = v + m.c.i + 1e3;
    a -= a % m.c.i, c(a), void 0 === Timer.getInfo(q) && (q = Timer.set(a - Date.now(), !1, i, a));
  }
  console.log("Calculation done, runtime:", Math.floor(Date.now() - j), "ms");
}
function h(b, c, d) {
  let e = l.slice(0, b.length);
  for (const f of d) {
    const d = f[0],
      g = Math.min(f[1], b.length);
    let h = Math.min(f[3], g - d);
    const i = Boolean(f[4]),
      j = f[5] ? Number(f[5]) : i ? -1 / 0 : 1 / 0;
    if (e = a(e, d, l.slice(d, g)), 0 === f[2]) {
      let c = 0;
      for (let a = d; a < d + h; a++) c += b[a];
      let f = c,
        k = d;
      for (let a = d + h; a < g; a++) c = c - b[a - h] + b[a], (i ? c > f : c < f) && (f = c, k = a - h + 1);
      for (let c = k; c < k + h; c++) (i ? b[c] >= j : b[c] <= j) && (e = a(e, c, "1"));
    } else if (i) for (let f = c.length - 1; f >= 0; f--) {
      const i = c[f];
      if (i >= d && i < g && (b[i] >= j && (e = a(e, i, "1")), 0 === --h)) break;
    } else for (const f of c) if (f >= d && f < g && (b[f] <= j && (e = a(e, f, "1")), 0 === --h)) break;
  }
  return e;
}
function i(a) {
  c(a);
  const b = [];
  if (a === r) {
    const a = {},
      c = o.splice(0, 1)[0],
      d = o[0];
    a.current_price = "NaN" !== c ? Number(c) / 100 : NaN, a.next_price = "NaN" !== d ? Number(d) / 100 : NaN, m.w.forEach(function (c, d) {
      if (!c.length) return;
      const e = "1" === n[d][0];
      n[d] = n[d].slice(1), b.push({
        id: d,
        on: e
      }), a["switch_" + d] = e;
    }), Shelly.emitEvent("spotelly_tick", a), e(b), r = o.length ? r + m.c.i : 0;
  }
  const d = a + m.c.i;
  q = Timer.set(d - Date.now(), !1, i, d);
  const g = new Date(a);
  15 === g.getHours() && 0 === g.getMinutes() && (p = Timer.set(t, !1, f, 1));
}
function j(a, b, c) {
  b.headers = [["Content-Type", "text/html"], ["Content-Encoding", "gzip"]], b.body = c, b.send();
}
function k() {
  if (null === Shelly.getComponentStatus("sys").unixtime) return console.log("Time not synchronized, waiting one second..."), void Timer.set(1e3, !1, k);
  Timer.set(0, !1, f, 0);
}
HTTPServer.registerEndpoint("spotelly", j, atob("H4sIAAAAAAACA40V57rqKvZVcvlOgZFEPdM15Nzee+/3ICwNswnkg2Ubt+8+kOgu038ksHpf1K9pr/DYQ9FiZ5s6/wstUZarWGILHQgtw01Td4CyUN4hOBRkbzS2QsPOKCgHgBtn0EhbRiUtiDkpnEzCOwP73gdsamvcTdEGWIsWsY+L6VRpV/0tarBmFyoHOHV9N115jxGD7F//Y/X76i9TbSJOVYz3hKozrkqYIoAVEY8WYguQLKBBC81XvUew9lhPR7heeX0slJUxCoQDlgocQkgRSeMueNKvyj8WPZZ/IEmNXFm4ErpDKbfoiwE5/suVDxoC6AsYMZg+QfuBMytoQerCaNGme8hwobyNvXTiD83XpoNR2dqH4qu9QdXWESwovNrUpXHWuGTIenVTdLF8QbK62NTTkfOqt3lbIuQza82nwunNd22+feZqzJFnwVUSHGymM0fd1GvvEcLV4GpT9sF0MhyLtTmAThEi+m4wuk4yI3dTR5UixcYCFsBRTBzsi2++/PgrkEG1n8sgu0itVxKNd1UcsKzaAFJiNGG3t7Ol8i5i4QSKJgtn9ymyCv3HPrfNVxiM21ASd4SfMMX0o3ewgOrvXCfOr3KtFyS2PiDhmXzBdKDNtiNnxqXQXm07cJjtvmMhX988fqApWRHG/X8mrxNZ/WdyJGy53jqVQysiZSezpq9BtWMBcBtcsfNGU1kZ5yC8//UnH4tXY4n0fekv2e7LPza1HCeBPDnd5SsjqgC9lQqSvUsXE06Ud2uzIexMCpRhAyjIbysr3Q1pPuvBFW8N9G0Y1NRT2bxiS/XAE0KWax/omHosjCug8ix9P+Evz57RB6yT5LXvs5rmyQnPSc/IdXtLUXwisa06eaAznrDV2jj9gdNwoG96b0E6xhhX1U7aLQhc5h6JYsZN+oKASl5Kr9O9T2p6CqKB6Xw2Y9ze666qSjPeXhDGjYhB2yYHoqsUyjtStZRK7ploTqNaJcicCCFGf3/yvyxVCs1MhORxMmF3xl8N+0Iob31YtNHSJycTP5WfUpva0yYF7Usy47OnPDn2lCzmL2a/o/OSyrJlU2rTn03IQON/TPQze7XcTIZS51F5cgrnoeRPTvqcMuhoYFW0RgGdJSF2/ve0+ZzP/3RPfLiqwOnEKyv07+a5pC/YuUh8Ta3N7sKX8tGVcVgjTW1cv8WHBNWCuilHdN7yYkCs/CGZUi/JAIEmC0KS59OktXnFw0RAZdIwPWznze0t+W8d/akfXg1yyXQnruPN+6TNvUzf4oqiXR6vd7fW/gAyUMYH+BPvsL0CAxubjJzv+22IlDVi/kfG05dxaeFlBqjC0j+cuieneC7GJQmaF2/sIMgNLFK4NL4007iYsUfZvCzMVWg+hQMW3/Ra4sDuaM/Or86qklq/swOHH5uIkOxQolrpNkA4pPZDkXwYx3LsfZ48zbn773KGIr8XVNZHiEgJBsIqo/k9ZSwQu3awEUnQjZ2/BlQt/d/7Y6gL4+7Zs1MH2Hq9IJ9/9tXXhOfnYfHhV599WsVh75r1kZ7iAnm7SCbOKYwKW3DDpKaH2jvKLhhM5kHgGGulJKo2c/3f++/JCdJ2OS//NUfWS004ZTlFjNXTy5PzD1mFz+WnCAAA")), HTTPServer.registerEndpoint("config", j, atob("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")), HTTPServer.registerEndpoint("data", function (b, c) {
  if ("POST" === b.method) {
    const c = JSON.parse(b.body),
      d = (c.h - r) / m.c.i,
      e = c.s;
    n[e] && d >= 0 && d < o.length && (n[e] = a(n[e], d, c.o ? "1" : "0"));
  }
  c.headers = [["Content-Type", "application/json"]], c.body = JSON.stringify({
    i: m.c.i,
    a: r,
    n: d(),
    p: o,
    o: n,
    r: t,
    v: "" !== m.c.b,
    z: Shelly.getComponentConfig("sys").location.tz
  }), c.send();
}), HTTPServer.registerEndpoint("confdata", function (a, b) {
  "POST" === a.method && (Timer.clear(p), p = void 0, Timer.clear(q), q = void 0, m = JSON.parse(a.body), Script.storage.setItem("c", JSON.stringify(m.c)), Script.storage.setItem("w", JSON.stringify(m.w)), m.p || (m.p = "  return spotPrice;"), Script.storage.setItem("p", JSON.stringify(m.p)), s = new Function("datetime", "spotPrice", m.p), k()), b.headers = [["Content-Type", "application/json"]], b.body = JSON.stringify(m), b.send();
});
const l = "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
let m = {
  c: {
    b: "",
    i: 36e5,
    s: []
  },
  w: [],
  p: "  return spotPrice;"
};
for (let a = 0; a < 10 && Shelly.getComponentStatus("switch", a); a++) m.w.push([]), m.c.s.push(!1);
const n = [],
  o = [];
let p,
  q,
  r = 0,
  s = null;
const t = Math.floor(5e3 + 6e5 * Math.random());
{
  const a = JSON.parse(Script.storage.getItem("c"));
  null !== a && (m.c = a, m.w = JSON.parse(Script.storage.getItem("w")), m.p = JSON.parse(Script.storage.getItem("p")), s = new Function("datetime", "spotPrice", m.p), k());
}