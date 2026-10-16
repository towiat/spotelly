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
HTTPServer.registerEndpoint("spotelly", j, atob("H4sIAAAAAAACA41Vd5frqA7/Kl62wRuH5NazxzGe7b33vkOMEnMHgw8o7WX83Z9sJ7e9tn+4qEs/JFG+YkKNxw6yBltXlcM7Mxr1bJVm2EALyuh4W5UtoM7q4BE8Kra3BhtlYGdrmI1Ebr1Fq90s1dqBuscyr8l4Z2HfhYhV6ay/zZoIa9UgdqmYz2vj5ZNkwNldlB5w7rt2vgoBE0bdvf1IPpBvzY1NOK9TeiaQrfWSOFkEpxIeHaQGgCKgRQfVd11AcO5Yzie6XAVzzGqnU1IIB5zV4BEiVaStP/NZt5o9yjqcPWTkRq8cXATtYaa3GLKROb1nqxANRDBnkpKyHVH7UXNw0IA2mTWqof840AScS5326mH1vW1hcrYOMftub7FuygQOahxMUjZWpKjszuljYT3hRiFdqG+XrY4b62cO1li81R2qcj4ZXsJU72uE4UtBxm+N89ufmuHvK1/iCATFWJHhmAJ9BxCqck3YQrzUvNrMumgp2DFb2wMYKhgxtGywXZPNpF2VqabCsXKAGSi/dS5H9eW2XUHkHvbZD99+/h3oWDdf66jbxPfWm7CXVIlGG7xMo1DIDSBn1jAh7u4WS2qxhJlXqKrByVARRyExfE52Dr4jsP2Gs7Rj+QmpzF+DhwLkP3OjkaSEXcFSEyKynMQXTgvGblvWizwoavhtCx6HwB84GH7fPX5iOFsxkev/Ll6TuP7v4sTEcr319VBbZrk42TV/BeRORMBt9NkuWMODtN5D/Pj7Lz5XN9OpmWfNcT6AbvaoKvU0K+y108u4DXwZgdqjBgp7bneWM4JubTdM9CxD6hRAxf5aOe1vWfVVBz57b5Rv4+imnOvqRizr5xJibEk9yacTwMz6DGQQ9PyGf7zxBn9O9YqSD93gpnrthH05PxPkcFK/u+OovtDYyFYf+CInrlxTHZ94Awf+bggOtBeCAJU77bagcDm0kVWL3NATFUh9boVE/x256Tio6txeIOb3FguRu2cxpJRJ5M2ZYf3EGL22Q2VJUm0f6LrhPORaqOo0ua8Vu8eUUlPev+k/ljXVaq5UyO3VlXiaxM00lwSyC7HImuT4ayebvtRfckeN68hFc80WebZ4Pc8ouddZce/+4h/83oyHWSPm3NFbXLFJmGePSKMXS3azbK/GVhim67VT7MeWeO2UeoLW8yhkcrYGwvDeQvT/WXbvXn7v8TPh88sOvCHdIDF8OIwyvy/6jPSq0tjdWY9waWdpXERVaX23xecFdQP17WxiD/eEGhmrcKBQ9TUbKTCsYIwyn5PX6iaPVwSnpWF7vt3buzv2vzr+yzDeO+yM+EZdxj/vyJu/pqe4sPhmGL8Pt879AjpykY/0F8FjcyFGNXE1aX4ctjFxUal7j0ROz8AbdiQpgIxL/fxU0qn22bRXweTZOzuIegMFlcvttZnbYiFeQPO8Y1ex+pIAz37oqIpR3fNO9Dd9LbUxH+zA4+c2IVAcTqhpvwGWA7Xh050JcpraaSJEbrkYIPzf5oZj/rJ97UKChJxhZEJaI/Jnoum4xKWvjSJ7P83DGpCm429vm/GwRO6vTy1gE0zBvv7qu+9ZPtwyxaffffWlTOOutusjP6UC86bweSh0L/riqclHH3zPesKzAT+MN8gnKXguzhykrEDhhISsNeU3aP3tJfraCfob0S+nmv4DkC5ow3IuBhyFKOfnG+1fplwNShUJAAA=")), HTTPServer.registerEndpoint("config", j, atob("H4sIAAAAAAACA8VYB3ejSBL+K5jd84MzIMnpdm2hyTm+lS96/N40dEn0GLrZppCs8/i/XzVJWLJ9+c5BLipR4avqnhnvcBXjKgcrwSydjM2nxRkyPyp8TCCDkDN9ORlngMyKlUSQGNpLwTEJOSxEDH714AkpULDUL2KWQjiyLcnIeCFgmSuNkzEKTGEyzRVCmq6sZ0rOxLzUDIWS40EtHadCXlqJhlmYIObFyWAQcxl8KzikYqEDCTiQeTaIlMICNcsfHwUHwU8DLgocxEWxFgSZkAFxLA1pWOAqhSIBoDC4WFhxyooitLk/S+HKYqmYS18gZIUfg0TQluH7sUrLTNqT8UzprDK8ZZ37B1akNAdNRMw0tzL0D0g9OWpVEK6wdWk0/CpLK4uM3hQQhZwX40FydMuxEVtaLclVyiJIb3kDyS0KzD+uPk1kfqVkW0SH0eSp4Jy8Wn9REsaDStR3bowOJuMCUoix4VVOGo7gYWRp+LUUGvhkrHLTncmTs5Z6+qKjXrXUs9cd9ZeWev7Cf//77uHdaE3ut+SLFx01bamXbzrql5Z61VGv11Tn+82Z/4xRmlqwPgskavA/Ko3JNnuqyj57S21KrSI0sz5LxCJd9Rl9H+/POuoPLfWhS+/j+476NFqT+2vyYE0ersmjlvz8vqO6F/3yqaO66k1fjNbk/po8WJOHHfmmo96NB3X3J+MBIaX+/E8hUkw+KP4vIlFsIdFasLSE8OB4aL4mx0OfxrxEuC3+uZaOjhrp3fkN/mMDbU8+axGDRZmKmQC9OdFLfzQcmoRKq9pEYcTiy7lWpeQnP8yG5rsLZ9sof0DG/2GHG8GzFDTWnz5nck4s7kslwTZu2XaNiFvcU7NmjX4rCxSzlV+fEe2bqHxRiahkaxGhtOjXz7XImF7Zljl8wkaH3qIIEznr1OuorCIXUlJj6v5sPPpFZlNsxqw2nkzLKBPYsga19432G7C1DwhZnjIEE8DyPwWKGgbIohQa1YomVgKM0x/dstcOjLDpaXWqnoz242TyUqvsTsGZ2mIfGTaVdEswJMHzUgdbggMSVAAu7rR5L6iUmxLzljFGiq/uzYM33KZ6kUJUmT80W8K0JfzdP4OM+jLBJk84t85EBtYfheRq2WttXdt+66K5bwK0qrCyEoHbrbxbNnEC8WW31Tb4fr203siFGZbpUmCcdJtMyLzEbZOaXUUr6gQqfqSu7to+gxZ4tyFoyqdrJ2SGfGNN2v092e7g9r5lcaFDjelkvfX+8w769rXVxoYeTqJUxZe3maMJzbJfC/6/waVqCQVuRpeIeULsvuuuzxsHXt1xJVGrtI2tbrdRsXKGCFqG53tf/ItHzhe+9yV49IX/9vuXgGjXqjZE+LHMovWobK9ocy3NBOcp3LtFVYmpkNDucMMqMktnt4enfp39C2RqAfVBvosig+K0P0AdFItYixytQscP38JZDH5UipQXj0fB4UFwPCATc+YaSZAJY0KOa3et2wlVrUALQgc8dMMJBL+WoFfTquRKO+h62MquIeCiMIPNwx30IKiyfy8KDFDN5yk4NORN7ra3g+6NJ0Ou4jIDiYEZfk+H4EjP/iGyXU81NCOa1bTpIz2JRiKIThta227QnGVeXPOC2+cOKfNGWRFdNPSyZ1g2vILk55mXeN78Ikxvp/wkTR37vMbQBenNwusZmU/FX+HEHgY/Q2Z7Bpop/eKTGMUC3gsJJzujNftVaQDXsjN2Zcji5GDoZYqTG2rIwFCDb2zB6kbYHi1aiR+YngtprDQw/kmmq5OdoVckavlSpfyPgs8BCyM2LOO1Rm3FQhZVUe57ZQF/VPoSNLFvvEUI4eTrj9cfGCbBLFXUVhiYS5t7c/LjtQO/MfTgeOhSG6dIUcwdN8gZnyLT6Ox7pPf1NAW0VqEs0/R0Vsq4mtSp416X91bviqoXUEdfsDhxwEBLV4h3XNfLgqpzr88+vA9tquftx/mtx9MWonWqjgiqDeEORnBwSv4dExqGQwLb8BTHPx0fDunvXgie3Ntzs4Bx7khYWp+q9eIsDKYlxZDcIdkDl6xGJJ1vSiv2TZd77oB7XUeGBKE4VdQLxcHZGbqnGrDU0sIHkdXVxkFP0nhhnVfYtADO5QXFgTelieTFAiSaUQNJJbDjVMSXtgc0lGLmQIAEG8AgYxgnUDh2YOZoHV+nQGEWUKBjI43LKe7uYteUG0gLsLZd1QEzCnh3924/QQSUCji5cz70Rl79a9sU/el78kvzfFcGidkTtjd1PbOegAvyVtrezA0KwD+YSjj2utrmQtRe6C2HMwSzMT2ryBV+NkLXurY9f9T3xje83VQKDZyicK2Y2951EASz3syN+jM0vHHXoF86bV1poQfz1rtbTQgavKJeXRvgvGxMCCk3sSmngYxpRgZFweZw08DE6D5NVeScv51++hgUVf/p7k7qFxQ/jfRkNNw/3N11yL2ZcCs1l0DLMVwrWiEUrgVXMQAHvmM2az0/Z3CFIdLT9p6u7/HVkqbfNarf95L7O5Odgpxjcnq/FutjXBJSkXYvjA+GNGK9AA3nkb1xk7RP7N6T9b7Ol0wtDeTOpEm4Qod70JvJJzTa1zMwlV5WhkGqYmZEQaJhFmjIU+o6ga/63y7bqwjO0BxBNAzXGWCi+In9+dP0zPbMiXWy0RIkPAeYgKw32reC2us2HKQcV1TwMogTkXINsinS9++rYLk57k2ddVhsLA9wtGcnR7bbK9LX+rpr/Xgtb77SC1ieg+TPzGscbUZMN8tjFcRB5Inek/Ci9QysgtyjGaHF7d0VEj07TViWmlnogrNOhvaR12vtfTtA09jfYyYqM3MBB17FVpCQgq+2RNCMSDiRvfVP7Y0CJdf7Yul6/P6F6FAW/8SRVPfgnLK/COHBZX0qTRGflQWqjEopuMCVsyfrOk/2sCYe2QTcD6VZL2ClDEFbSHFb5l+MtmkTMxhUGjsXtFSX5sPhvbvV0IsfmllqIMVi5kOV6FQpP6hPA9f3TjeCIzhwvQoqYQOc6klsHrHEzXtLrkZNeE67ct3fiyBjuSmmYcODpf8HVRedanPxRP/o0R7UMZ1AE5tbZ1DU4dzrTPTfCy36XO+Js3JNR5pFsY2oVDFeA+oJTXh3b/4bCY5O3qIXAAA=")), HTTPServer.registerEndpoint("data", function (b, c) {
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