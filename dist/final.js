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
  const t = Math.floor((m - e) / -h.c.i);
  t <= 0 || (b.splice(0, t), h.w.forEach(function (e, n) {
    e.length && (u[n] = u[n].slice(t));
  }), b.length ? m += h.c.i * t : m = 0);
}
function o() {
  const e = Timer.getInfo(p);
  return void 0 === e ? 0 : Math.floor(Date.now()) + e.next - Shelly.getUptimeMs();
}
function r(e) {
  if (!e.length) return;
  const t = e.splice(0, 1)[0];
  h.c.s[t.id] && (t.on = !t.on), Shelly.call("Switch.Set", t, function () {
    Timer.set(0, !1, r, e);
  });
}
function i(e) {
  const n = t(new Date(), e),
    o = "https://api.energy-charts.info/price?bzn=" + h.c.b + "&start=" + n.s;
  Shelly.call("http.get", {
    url: o
  }, c, {
    strt: n.t,
    offs: e
  });
}
function c(e, t, r, c) {
  const a = Date.now();
  if (c.strt < a) {
    b.splice(0);
    for (let e = 0; e < h.w.length; e++) u[e] = "";
    m = 0;
  }
  if (m && m + b.length * h.c.i > c.strt) return;
  let f = !1,
    g = [],
    w = "";
  if (0 !== t) w = "Shelly error: " + t + "/" + r;else if (200 !== e.code) w = "Server error " + e.code + "/" + e.message;else {
    delete e.headers;
    const t = e.body.indexOf('"price":') + 8,
      n = e.body.indexOf("]", t) + 1;
    if (e.body = e.body.substring(t, n), g = JSON.parse(e.body), delete e.body, 36e5 === h.c.i) {
      for (let e = 0, t = 0; e < g.length / 4; e++, t += 4) g[e] = (g[t] + g[t + 1] + g[t + 2] + g[t + 3]) / 4;
      g.splice(g.length / 4);
    }
  }
  if (w) {
    const e = new Date();
    if (e.getHours() < 23 || e.getMinutes() < 30) return p = Timer.set(12e5, !1, i, c.offs), void console.log(w, "Trying again at", o());
    f = !0;
    let t = 24;
    const n = new Date(c.strt);
    0 === n.getDay() && n.getDate() > 24 && (2 === n.getMonth() && (t = 23), 9 === n.getMonth() && (t = 25));
    const r = 36e5 / h.c.i;
    let s = 0;
    for (const e of [75.6, 69.8, 67.3, 65.3, 66.3, 73.3, 89.7, 101.6, 97.4, 82.1, 68.7, 60, 53.5, 50.2, 52.8, 63.8, 78.5, 97.5, 111.6, 121, 115.8, 100.2, 90.1, 79.7, 79.7]) {
      for (let t = 0; t < r; t++) g.push(e);
      if (++s >= t) break;
    }
  }
  let v = [];
  for (let e = 0, t = c.strt; e < g.length; e++, t += h.c.i) {
    const n = y(new Date(t), g[e] / 10);
    g[e] = n;
    let o = 0,
      r = e;
    for (; o < r;) {
      const e = o + r >>> 1;
      g[v[e]] < n ? o = e + 1 : r = e;
    }
    v.splice(o, 0, e);
  }
  0 === m && (m = c.strt), h.w.forEach(function (e, t) {
    e.length && (u[t] += s(g, v, e));
  }), v = null;
  for (const e of g) b.push(f ? "NaN" : Math.round(100 * e));
  g = null;
  const S = Math.floor(Date.now());
  if (c.strt < S) {
    new Date().getHours() >= 15 && (p = Timer.set(0, !1, i, 1));
    let e = S + h.c.i + 1e3;
    e -= e % h.c.i, n(e), void 0 === Timer.getInfo(d) && (d = Timer.set(e - Date.now(), !1, l, e));
  }
  console.log("Calculation done, runtime:", Math.floor(Date.now() - a), "ms");
}
function s(t, n, o) {
  let r = g.slice(0, t.length);
  for (const i of o) {
    const o = i[0],
      c = Math.min(i[1], t.length);
    let s = Math.min(i[3], c - o);
    const l = Boolean(i[4]),
      a = i[5] ? Number(i[5]) : l ? -1 / 0 : 1 / 0;
    if (r = e(r, o, g.slice(o, c)), 0 === i[2]) {
      let n = 0;
      for (let e = o; e < o + s; e++) n += t[e];
      let i = n,
        f = o;
      for (let e = o + s; e < c; e++) n = n - t[e - s] + t[e], (l ? n > i : n < i) && (i = n, f = e - s + 1);
      for (let n = f; n < f + s; n++) (l ? t[n] >= a : t[n] <= a) && (r = e(r, n, "1"));
    } else if (l) for (let i = n.length - 1; i >= 0; i--) {
      const l = n[i];
      if (l >= o && l < c && (t[l] >= a && (r = e(r, l, "1")), 0 === --s)) break;
    } else for (const i of n) if (i >= o && i < c && (t[i] <= a && (r = e(r, i, "1")), 0 === --s)) break;
  }
  return r;
}
function l(e) {
  n(e);
  const t = [];
  if (e === m) {
    const e = {},
      n = b.splice(0, 1)[0],
      o = b[0];
    e.current_price = "NaN" !== n ? Number(n) / 100 : NaN, e.next_price = "NaN" !== o ? Number(o) / 100 : NaN, h.w.forEach(function (n, o) {
      if (!n.length) return;
      const r = "1" === u[o][0];
      u[o] = u[o].slice(1), t.push({
        id: o,
        on: r
      }), e["switch_" + o] = r;
    }), Shelly.emitEvent("spotelly_tick", e), r(t), m = b.length ? m + h.c.i : 0;
  }
  const o = e + h.c.i;
  d = Timer.set(o - Date.now(), !1, l, o);
  const c = new Date(e);
  15 === c.getHours() && 0 === c.getMinutes() && (p = Timer.set(w, !1, i, 1));
}
function a(e, t, n) {
  t.headers = [["Content-Type", "text/html"], ["Content-Encoding", "gzip"]], t.body = n, t.send();
}
function f() {
  if (null === Shelly.getComponentStatus("sys").unixtime) return console.log("Time not synchronized, waiting one second..."), void Timer.set(1e3, !1, f);
  Timer.set(0, !1, i, 0);
}
HTTPServer.registerEndpoint("spotelly", a, atob("H4sIAAAAAAACA41Vd5frqA7/Kl62wRuH5NazxzGe7b33vkOMEnMHgw8o7WX83Z9sJ7e9tn+4qEs/JFG+YkKNxw6yBltXlcM7Mxr1bJVm2EALyuh4W5UtoM7q4BE8Kra3BhtlYGdrmI1Ebr1Fq90s1dqBuscyr8l4Z2HfhYhV6ay/zZoIa9UgdqmYz2vj5ZNkwNldlB5w7rt2vgoBE0bdvf1IPpBvzY1NOK9TeiaQrfWSOFkEpxIeHaQGgCKgRQfVd11AcO5Yzie6XAVzzGqnU1IIB5zV4BEiVaStP/NZt5o9yjqcPWTkRq8cXATtYaa3GLKROb1nqxANRDBnkpKyHVH7UXNw0IA2mTWqof840AScS5326mH1vW1hcrYOMftub7FuygQOahxMUjZWpKjszuljYT3hRiFdqG+XrY4b62cO1li81R2qcj4ZXsJU72uE4UtBxm+N89ufmuHvK1/iCATFWJHhmAJ9BxCqck3YQrzUvNrMumgp2DFb2wMYKhgxtGywXZPNpF2VqabCsXKAGSi/dS5H9eW2XUHkHvbZD99+/h3oWDdf66jbxPfWm7CXVIlGG7xMo1DIDSBn1jAh7u4WS2qxhJlXqKrByVARRyExfE52Dr4jsP2Gs7Rj+QmpzF+DhwLkP3OjkaSEXcFSEyKynMQXTgvGblvWizwoavhtCx6HwB84GH7fPX5iOFsxkev/Ll6TuP7v4sTEcr319VBbZrk42TV/BeRORMBt9NkuWMODtN5D/Pj7Lz5XN9OpmWfNcT6AbvaoKvU0K+y108u4DXwZgdqjBgp7bneWM4JubTdM9CxD6hRAxf5aOe1vWfVVBz57b5Rv4+imnOvqRizr5xJibEk9yacTwMz6DGQQ9PyGf7zxBn9O9YqSD93gpnrthH05PxPkcFK/u+OovtDYyFYf+CInrlxTHZ94Awf+bggOtBeCAJU77bagcDm0kVWL3NATFUh9boVE/x256Tio6txeIOb3FguRu2cxpJRJ5M2ZYf3EGL22Q2VJUm0f6LrhPORaqOo0ua8Vu8eUUlPev+k/ljXVaq5UyO3VlXiaxM00lwSyC7HImuT4ayebvtRfckeN68hFc80WebZ4Pc8ouddZce/+4h/83oyHWSPm3NFbXLFJmGePSKMXS3azbK/GVhim67VT7MeWeO2UeoLW8yhkcrYGwvDeQvT/WXbvXn7v8TPh88sOvCHdIDF8OIwyvy/6jPSq0tjdWY9waWdpXERVaX23xecFdQP17WxiD/eEGhmrcKBQ9TUbKTCsYIwyn5PX6iaPVwSnpWF7vt3buzv2vzr+yzDeO+yM+EZdxj/vyJu/pqe4sPhmGL8Pt879AjpykY/0F8FjcyFGNXE1aX4ctjFxUal7j0ROz8AbdiQpgIxL/fxU0qn22bRXweTZOzuIegMFlcvttZnbYiFeQPO8Y1ex+pIAz37oqIpR3fNO9Dd9LbUxH+zA4+c2IVAcTqhpvwGWA7Xh050JcpraaSJEbrkYIPzf5oZj/rJ97UKChJxhZEJaI/Jnoum4xKWvjSJ7P83DGpCm429vm/GwRO6vTy1gE0zBvv7qu+9ZPtwyxaffffWlTOOutusjP6UC86bweSh0L/riqclHH3zPesKzAT+MN8gnKXguzhykrEDhhISsNeU3aP3tJfraCfob0S+nmv4DkC5ow3IuBhyFKOfnG+1fplwNShUJAAA=")), HTTPServer.registerEndpoint("config", a, atob("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")), HTTPServer.registerEndpoint("data", function (t, n) {
  if ("POST" === t.method) {
    const n = JSON.parse(t.body),
      o = (n.h - m) / h.c.i,
      r = n.s;
    u[r] && o >= 0 && o < b.length && (u[r] = e(u[r], o, n.o ? "1" : "0"));
  }
  n.headers = [["Content-Type", "application/json"]], n.body = JSON.stringify({
    i: h.c.i,
    a: m,
    n: o(),
    p: b,
    o: u,
    r: w,
    v: "" !== h.c.b,
    z: Shelly.getComponentConfig("sys").location.tz
  }), n.send();
}), HTTPServer.registerEndpoint("confdata", function (e, t) {
  "POST" === e.method && (Timer.clear(p), p = void 0, Timer.clear(d), d = void 0, h = JSON.parse(e.body), Script.storage.setItem("c", JSON.stringify(h.c)), Script.storage.setItem("w", JSON.stringify(h.w)), h.p || (h.p = "  return spotPrice;"), Script.storage.setItem("p", JSON.stringify(h.p)), y = new Function("datetime", "spotPrice", h.p), f()), t.headers = [["Content-Type", "application/json"]], t.body = JSON.stringify(h), t.send();
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
const u = [],
  b = [];
let p,
  d,
  m = 0,
  y = null;
const w = Math.floor(5e3 + 6e5 * Math.random());
{
  const e = JSON.parse(Script.storage.getItem("c"));
  null !== e && (h.c = e, h.w = JSON.parse(Script.storage.getItem("w")), h.p = JSON.parse(Script.storage.getItem("p")), y = new Function("datetime", "spotPrice", h.p), f());
}