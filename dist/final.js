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
HTTPServer.registerEndpoint("spotelly", j, atob("H4sIAAAAAAACA41Vd5frqA7/Kl62wRuH5NazxzGe7b33vkOMEnMHgw8o7WX83Z9sJ7e9tn+4qEs/JFG+YkKNxw6yBltXlcM7Mxr1bJVm2EALyuh4W5UtoM7q4BE8Kra3BhtlYGdrmI1Ebr1Fq90s1dqBuscyr8l4Z2HfhYhV6ay/zZoIa9UgdqmYz2vj5ZNkwNldlB5w7rt2vgoBE0bdvf1IPpBvzY1NOK9TeiaQrfWSOFkEpxIeHaQGgCKgRQfVd11AcO5Yzie6XAVzzGqnU1IIB5zV4BEiVaStP/NZt5o9yjqcPWTkRq8cXATtYaa3GLKROb1nqxANRDBnkpKyHVH7UXNw0IA2mTWqof840AScS5326mH1vW1hcrYOMftub7FuygQOahxMUjZWpKjszuljYT3hRiFdqG+XrY4b62cO1li81R2qcj4ZXsJU72uE4UtBxm+N89ufmuHvK1/iCATFWJHhmAJ9BxCqck3YQrzUvNrMumgp2DFb2wMYKhgxtGywXZPNpF2VqabCsXKAGSi/dS5H9eW2XUHkHvbZD99+/h3oWDdf66jbxPfWm7CXVIlGG7xMo1DIDSBn1jAh7u4WS2qxhJlXqKrByVARRyExfE52Dr4jsP2Gs7Rj+QmpzF+DhwLkP3OjkaSEXcFSEyKynMQXTgvGblvWizwoavhtCx6HwB84GH7fPX5iOFsxkev/Ll6TuP7v4sTEcr319VBbZrk42TV/BeRORMBt9NkuWMODtN5D/Pj7Lz5XN9OpmWfNcT6AbvaoKvU0K+y108u4DXwZgdqjBgp7bneWM4JubTdM9CxD6hRAxf5aOe1vWfVVBz57b5Rv4+imnOvqRizr5xJibEk9yacTwMz6DGQQ9PyGf7zxBn9O9YqSD93gpnrthH05PxPkcFK/u+OovtDYyFYf+CInrlxTHZ94Awf+bggOtBeCAJU77bagcDm0kVWL3NATFUh9boVE/x256Tio6txeIOb3FguRu2cxpJRJ5M2ZYf3EGL22Q2VJUm0f6LrhPORaqOo0ua8Vu8eUUlPev+k/ljXVaq5UyO3VlXiaxM00lwSyC7HImuT4ayebvtRfckeN68hFc80WebZ4Pc8ouddZce/+4h/83oyHWSPm3NFbXLFJmGePSKMXS3azbK/GVhim67VT7MeWeO2UeoLW8yhkcrYGwvDeQvT/WXbvXn7v8TPh88sOvCHdIDF8OIwyvy/6jPSq0tjdWY9waWdpXERVaX23xecFdQP17WxiD/eEGhmrcKBQ9TUbKTCsYIwyn5PX6iaPVwSnpWF7vt3buzv2vzr+yzDeO+yM+EZdxj/vyJu/pqe4sPhmGL8Pt879AjpykY/0F8FjcyFGNXE1aX4ctjFxUal7j0ROz8AbdiQpgIxL/fxU0qn22bRXweTZOzuIegMFlcvttZnbYiFeQPO8Y1ex+pIAz37oqIpR3fNO9Dd9LbUxH+zA4+c2IVAcTqhpvwGWA7Xh050JcpraaSJEbrkYIPzf5oZj/rJ97UKChJxhZEJaI/Jnoum4xKWvjSJ7P83DGpCm429vm/GwRO6vTy1gE0zBvv7qu+9ZPtwyxaffffWlTOOutusjP6UC86bweSh0L/riqclHH3zPesKzAT+MN8gnKXguzhykrEDhhISsNeU3aP3tJfraCfob0S+nmv4DkC5ow3IuBhyFKOfnG+1fplwNShUJAAA=")), HTTPServer.registerEndpoint("config", j, atob("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")), HTTPServer.registerEndpoint("data", function (b, c) {
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
  p: "  return spotPrice"
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