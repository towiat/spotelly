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