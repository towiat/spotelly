function t(t, e, n) {
  return t.slice(0, e) + n + t.slice(e + n.length);
}
function e(t, e) {
  const n = new Date(t.getFullYear(), t.getMonth(), t.getDate() + e);
  return {
    s: [n.getFullYear(), ("0" + (n.getMonth() + 1)).slice(-2), ("0" + n.getDate()).slice(-2)].join("-"),
    t: n.getTime()
  };
}
function n(t) {
  const e = Math.floor((b - t) / -h.c.i);
  e <= 0 || (d.splice(0, e), h.w.forEach(function (t, n) {
    t.length && (p[n] = p[n].slice(e));
  }), d.length ? b += h.c.i * e : b = 0);
}
function o() {
  const t = Timer.getInfo(u);
  return void 0 === t ? 0 : Math.floor(Date.now()) + t.next - Shelly.getUptimeMs();
}
function r(t) {
  if (!t.length) return;
  const e = t.splice(0, 1)[0];
  h.c.s[e.id] && (e.on = !e.on), Shelly.call("Switch.Set", e, function () {
    Timer.set(0, !1, r, t);
  });
}
function s(t) {
  const n = e(new Date(), t),
    o = "https://api.energy-charts.info/price?bzn=" + h.c.b + "&start=" + n.s;
  Shelly.call("http.get", {
    url: o
  }, i, {
    strt: n.t,
    offs: t
  });
}
function i(t, e, r, i) {
  const f = Date.now();
  if (b && b + d.length * h.c.i > i.strt) return;
  if (f < i.strt) {
    d = [], p = [];
    for (const t of h.w) p.push("");
    b = 0;
  }
  let a = !1,
    g = [],
    y = "";
  if (0 !== e) y = "Shelly error: " + e + "/" + r;else if (200 !== t.code) y = "Server error " + t.code + "/" + t.message;else {
    delete t.headers;
    const e = t.body.indexOf('"price":') + 8,
      n = t.body.indexOf("]", e) + 1;
    if (t.body = t.body.substring(e, n), g = JSON.parse(t.body), delete t.body, 36e5 === h.c.i) {
      const t = [];
      for (let e = 0; e < g.length; e += 4) {
        let n = 0;
        for (let t = e; t < e + 4; t++) n += g[t];
        t.push(n / 4);
      }
      g = t;
    }
  }
  if (y) {
    const t = new Date();
    if (t.getHours() < 23 || t.getMinutes() < 30) return u = Timer.set(12e5, !1, s, i.offs), void console.log(y, "Trying again at", o());
    a = !0;
    let e = 24;
    const n = new Date(i.strt);
    0 === n.getDay() && n.getDate() > 24 && (2 === n.getMonth() && (e = 23), 9 === n.getMonth() && (e = 25));
    const r = 36e5 / h.c.i;
    let c = 0;
    for (const t of [75.6, 69.8, 67.3, 65.3, 66.3, 73.3, 89.7, 101.6, 97.4, 82.1, 68.7, 60, 53.5, 50.2, 52.8, 63.8, 78.5, 97.5, 111.6, 121, 115.8, 100.2, 90.1, 79.7, 79.7]) {
      for (let e = 0; e < r; e++) g.push(t);
      if (++c >= e) break;
    }
  }
  let m = [];
  for (let t = 0, e = i.strt; t < g.length; t++, e += h.c.i) {
    const n = S(new Date(e), g[t] / 10);
    g[t] = n;
    let o = 0,
      r = t;
    for (; o < r;) {
      const t = o + r >>> 1;
      g[m[t]] < n ? o = t + 1 : r = t;
    }
    m.splice(o, 0, t);
  }
  0 === b && (b = i.strt), h.w.forEach(function (t, e) {
    t.length && (p[e] += c(g, m, t));
  }), m = null;
  for (const t of g) d.push(a ? "NaN" : Math.round(100 * t));
  g = null;
  const w = Math.floor(Date.now());
  i.strt < w && new Date().getHours() >= 15 && (u = Timer.set(0, !1, s, 1));
  let M = w + h.c.i + 1e3;
  M -= M % h.c.i, n(M), Timer.set(M - Date.now(), !1, l, M), console.log("Calculation done, runtime:", Math.floor(Date.now() - f), "ms");
}
function c(e, n, o) {
  let r = g.slice(0, e.length);
  for (const s of o) {
    const o = s[0],
      i = Math.min(s[1], e.length);
    let c = Math.min(s[3], i - o);
    const l = Boolean(s[4]),
      f = s[5] ? Number(s[5]) : l ? -1 / 0 : 1 / 0;
    if (r = t(r, o, g.slice(o, i)), 0 === s[2]) {
      let n = 0;
      for (let t = o; t < o + c; t++) n += e[t];
      let s = n,
        a = o;
      for (let t = o + c; t < i; t++) n = n - e[t - c] + e[t], (l ? n > s : n < s) && (s = n, a = t - c + 1);
      for (let n = a; n < a + c; n++) (l ? e[n] >= f : e[n] <= f) && (r = t(r, n, "1"));
    } else if (l) for (let s = n.length - 1; s >= 0; s--) {
      const l = n[s];
      if (l >= o && l < i && (e[l] >= f && (r = t(r, l, "1")), 0 === --c)) break;
    } else for (const s of n) if (s >= o && s < i && (e[s] <= f && (r = t(r, s, "1")), 0 === --c)) break;
  }
  return r;
}
function l(t) {
  n(t);
  const e = [];
  if (t === b) {
    const t = {},
      n = d.splice(0, 1)[0],
      o = d[0];
    t.current_price = "NaN" !== n ? Number(n) / 100 : NaN, t.next_price = "NaN" !== o ? Number(o) / 100 : NaN, h.w.forEach(function (n, o) {
      if (!n.length) return;
      const r = "1" === p[o][0];
      p[o] = p[o].slice(1), e.push({
        id: o,
        on: r
      }), t["switch_" + o] = r;
    }), Shelly.emitEvent("spotelly_tick", t), r(e), b = d.length ? b + h.c.i : 0;
  }
  const o = t + h.c.i;
  Timer.set(o - Date.now(), !1, l, o);
  const i = new Date(t);
  15 === i.getHours() && 0 === i.getMinutes() && (u = Timer.set(y, !1, s, 1));
}
function f(t, e, n) {
  e.headers = [["Content-Type", "text/html"], ["Content-Encoding", "gzip"]], e.body = n, e.send();
}
function a() {
  if (null === Shelly.getComponentStatus("sys").unixtime) return console.log("Time not synchronized, waiting one second..."), void Timer.set(1e3, !1, a);
  Timer.set(0, !1, s, 0);
}
HTTPServer.registerEndpoint("spotelly", f, atob("H4sIAAAAAAACA40VZ5fjKPKvaNkE11jyxLdPFurNeSdtjtMYyi2uEehBOZ1H//1A8sSLHwiVqUjzlvYKjwMUHfa2bfJeaIlysY4L7KAHoWW4aZseUBbKOwSHguyNxk5o2BkFiwngxhk00i6ikhbELVI4mYR3BvaDD9g21riboguwER3iEOuqUtqVf48arNmF0gFWbuirtfcYMcjhw3vlnfKDSpuIlYrxJaHsjSsTpghgRcSjhdgBJAto0EL7/eARrD021Qw3a6+PhbIyRoFwwIUChxCSR9K4M54M68W9YsDFXZLUyLWF54T+sJBb9MWEnPfF2gcNAfQZjBjMkKD9xJkVdCB1YbTo0j1kuFDexkE6cbf9wfQwK9v4UHy/N6i6JoIFhVkkFpNHIrk9WHmsjbPGJZPWq5tVL8O1cQsLG6w/GA5tU82Cz820n0qEfGYj+VRY3fzc5dtD12AORLaxToLTE9KZg9A2G+8RwnOf19eLIZhk7FhszAF0chjR9yTLbtomquQvthawAOG21nIUD7b9GgJ1sC9+fPLt9yCD6h7JIPtI98Zpvy+TAxKNd2WciKy8BqTEaMLYs2fLlfIuYuEEijYryY5QZCX6b5Oche8xGHdNSdwRfsLk3W/eQQ3lP7hOnN/nkNUkdj4g4Zl8xvSgzbYnI+NeaK+2PTjMhj+zkK8fH7/SlKwJ4/I/kzeJrP4zORK22mydyr4VhrKT2dC3oNyxALgNrth5o6kvjXMQvvzhu2/F1Zws/bImznEfFvfaRs4tQt45vRm3jC8DDFYqSGbPVU44Ud5tzDVhIylQhmtAQZ6urXQ3pH04gCs+mejbMKlpKtlesZV65UGErDY+0DkDWBhXQOlZWr/jn++9R19hvUiP90NW075zwrGpZmBWuJN2CwJzMnNpGLHkIa04lcgqRQVKyU7+dcOZU4pEWcVnz2hMt9TecqAg2nNJAatuLZeMnStEie8kdonnQMuyjIzbM8K4GbGKZfLmM6k6SiPXTLSnWbIT5BYRQsyO/a7/XHXJu3AhIjcXF8/19+JqbkCivPWhLrpo6TsnEx/IB1SxS7LkxfJdXqQ3vUvqW7eXf6O3FjQuLKuoSju7IDORF/cSx8hW5GrlXw8hhtxJ75zkONXBO6d+TPF0VLIyWqOALvmtJRv/Pe3WLX7r/kviq4MNnE68sUT/eW5bepuNReJrG212Z74Umn4Rp6HTNsYNW3yVoDpQN4sZnf8EMSHW/pBMdZdkgkCTmpD08ippba+4vBBQmpGNYCMUr6X3vxX6Az/9MuQcdiuedz3XSZ+7TKt+jqI2d93nW2t/BRko4xP8nXfYPQcmNnYxc37ptyFS1opb9xhPK+PSRMwMUIaVfLUZU2rHYp6ioHnx0Q6CvIY6OUzNZahMvWSvxfM8UdehfQAHLH4ctMSJ3VHNxqtRlVLrz3bg8FsTERwESlQn3TUQDqkWX4xKKOdmnfuGcUNZHlP/XTxQ5G/KK+sjRKQEA2Gl0Yy/JM0Je9E8QSR5x2Vuig2g6uj/PWSmZDHuLk89YOd1TR49/P4HwvOfUn/9/cMHZZxGtNkc6SnWyLvacV/LkY31C5EvPvuBjKzEDlzucEi/v3eUnTGYXgUC50iUSqLqMtf/PTvfOcF4xcbV7NO/CaT1UhNOWY4jY011/sj+CaxMSSoDCQAA")), HTTPServer.registerEndpoint("config", f, atob("H4sIAAAAAAACA8VYh3bjttJ+FS6T34c8S1KStfafyCJTt9245EROryAxErEGAQYYStb10btfgE3Fdnpx04dpHEwD6OkTKjNcl+DkWPBkav86lCAJUx1iDgXElKibZFoAEieTAkFg7K4YxTymsGQZhPUiYIIhIzzUGeEQj1xHEKO8ZLAqpcJkigw5JLNSInC+dj6SYs4WlSLIpJgOGu6UM3Hj5ArmcY5Y6slgkFERvdEUOFuqSAAORFkMUilRoyLl+yfROHpnQJnGQab1lhEVTESG4ijgscY1B50DGDcoWzoZJ1rHLg3nHG4dwtlChAyh0GEGAkE5lh5mkleFcJPpXKqiVtzTLsOxk0pFQRmQEUWdAsOxEc9POhGEW+xMWomw3qVTpFZuBohMLPR0kJ/sGbZsR8mVMcVJCnzPGgjqGMfC0/qv9SyshVzH4DhNPmSUGqvON1LAdFCzdo1bpXEy1cAhw5ZWG2kpjMapo+DniimgyVSWNjvJB9cd+vB5j1526KNXPfqmQx8/D88/7xefjLbwuIPPn/do1qEXr3v0WYde9ujVFvW2X1+HHxGzTcXILgkEKggvpcL8Pnkmqz3yodjMpIqJPYMzljG+3hL2bZxf9+iLDl3027s879HVaAuPt3C8hc+28KSDn573qH/QZ1c96qM3ez7awuMtHG/hsx6+7tEn00GT/WQ6MJXS/P2rKpIlF5L+wUpk9yrRWRJeQTw+Hdqv5HQYFkxUCPvsdxvu6KTjPri/wV/W0G7yqWIZOGanbM5AHXb0KhwNh3ZDlVNPojgl2c1CyUrQyVvzof3u3bmvVP4Cj/4Og3vOEw4Km78hJWJhSDQUUoBrzZLkHMQCc4ezgqHjjYbHz3wHbjMACvTJYQCtin4koO2MfVNpZPN12BwgnRsmtmmFKEWnkaJwzG9YKlYQtXYdezLFjYx9ijQFU5JevHHZ0SUTAlTYJO9gGerCNb5ZtUY5mVWp2VVHGjTWD2rDVmK3QChKThCsA6u/qmKaGkGScmhFa2xIORBqPlRH3hqwzDbh9ZE7GR1nefJCyeJBxrW8Rz6xZBPSe4yhYXxcqegeY2wYdXXrB3XObYEccuxTpphKun50H7SlttFLJaIswqEdITYt8f//nspobhok+YBS55oV4HzJBJWrndQ2sd1NXboIrYNO7VZRIVC34/eTKMshu+lH3gE9bCbaa7G0nTRbMczyfswxUVZ4X6UmN96yZgM1PZW3D42mQVd4+yVow6caI0YN6cEMdXeHaDegu8uYQ5mKFfJkOxL/egO7+o3WwfgeJimX2c0+cZQIKcKG8e86x+UKNB56l7NFbsi7pvs8H5yGTcalQCV551uTbitiNR8eyfYaWjBKOTw6GGWFnAnoZrYl6cJRUMglhEquQkPZ74163sTuZ7VIc4gfIStAn+32R19pOlOsREer7Jdv4CSDMK0Yp/r9UfRsHJ0OjIo9by0nKphVMYYbc53ZxARFowOxBwH6cQLRzxWo9ayOqFQe+gHGECd3EFGmbc/S+MkwgKiOwjnTGBFKPdu8TQBcfxOIexqjPY0mOAdKKgaPyqwqQGDg2kng+gExRBW4b6UGyxYTg1mDbVrNirccZnDWYmMzao+2gDa0aP8YMsK6FZYGFy1e7ShWLU0bfh5n+7H5gHPP/bappe9d/9vh98H812RG3weLX5MZfx8s47u5cWHG/gsTdxi9C4Ub2Grn5hc/yJAt4ZwJmJi49uSXFSKojlyQWwv1ZDwMCkmNGZLBwKLBG7IkTfLdoFRM4AVRCyaslgJCrwRfT0yKdS5XLySnXzK6ANSWbUnW6mVVpKBqEpK09vI4qDR8KdUNKEPeBKktgZ/evrsgmEdzLqXyYGAvif5m8vadB/9n8eB06EcoZ2i8WHh+VBI6Q6LQOw6M3E9nHNApY1FxHpybqjubVyKrJ8DM8++qR6N4a6IYmdJ4TrLcM25AV3C+yWJUl8Cr64vz2HWD+f5ysbc863qj2a/Ho3ry+IMRjM+Mfc/6h/HQ1PvwDKfvnD4bms+nMQTi6VM/rxtDwMq5qseWl9pmEsaH+QOcp+AbrZHhLg65NXnT733lgX/XeIamlDIuTUIkBe/J0D9TgJUSDv5ihfWx8dD4EyfY7Ctu8wDfiu+NH7iprCfPlyDQdi0IUJ6bcZbduIHtbzb3IEJTO4D+7iIqCGY5aM+NDqagv3W8Fzb+a9DouWga8gyPjrDP1ga4BufQbLcTYnZydPSwnSgFs0fwVt63w2AUNL+ua7Z19oGxu/ED/tDecjuM3GDmB3ZiAmXGXOUGSz/SgF/YGHlun4fSXsG69wvHowTBDvHA0aXE+n7mO3duEI52rdEDa5taoC20dbwVLN3gLoqi5U5LjnZbbLjxt+1g9nTX1eqvtAWv3yLOHpciuwWi7BhP4vHwPQ895Qeq6Y9ruMXY3bnXOefNW8l46DsKjCbQJ64/8cQ9pYMLoeubXMB7wtP+BD29U+bXnqmqOaDxYlWLRlxmxLKiXME8UlBykoHJWv1fKzeoASVojwd8764AzCWduJ9eza7dwB4nk//Mri4jXRc5m689NKOoF3v5/Nrd+BHmIJqR8UZL4fktBU0cyhiD86Mjr4xWhw3UBl/FxUE71qdHfuL6OyH4qbmYOm/fic1PgemxsgRBP8oZp54y4bCjztZM25RllEVpwHdWLFhvK6iMysBIm4EYPOSYWXutc46cO+iDV0WZfZYCYfo82M36Iy2kTNc8osZqNXthBlr7pg3TbME2mWEQbAaw2hmr4G/WkRTbbvOsn+to0e2oq9HEvuK+Jx+4NrSvxf5EHtxCeo5xQT86vJonMltBUtmHMspw7fkmt3rvkkN/4dmBBrR1LCv0anv0MV+CXaPmZDyBsR/UWY3bHNcrdnjKGGoZ78bFJjj+NoqibSq+jwpS2ghbMvxi5/9G0WUv2l4IT+I4xvegcWrS+tguffNVO68bvx61ynYdgK5i/ODaK32brLbD72eMS0KbhF2bZuwvr/8D9KdhBSMXAAA=")), HTTPServer.registerEndpoint("data", function (e, n) {
  if ("POST" === e.method) {
    const n = JSON.parse(e.body),
      o = (n.h - b) / h.c.i;
    o >= 0 && o < d.length && (p[n.s] = t(p[n.s], o, n.o ? "1" : "0"));
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
}), HTTPServer.registerEndpoint("confdata", function (t, e) {
  "POST" === t.method && (h = JSON.parse(t.body), Script.storage.setItem("c", JSON.stringify(h.c)), Script.storage.setItem("w", JSON.stringify(h.w)), h.p || (h.p = "  return spotPrice;"), Script.storage.setItem("p", JSON.stringify(h.p)), S = new Function("datetime", "spotPrice", h.p), a()), e.headers = [["Content-Type", "application/json"]], e.body = JSON.stringify(h), e.send();
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
for (let t = 0; t < 10 && Shelly.getComponentStatus("switch", t); t++) h.w.push([]), h.c.s.push(!1);
let u,
  p = [],
  d = [],
  b = 0,
  S = null;
const y = Math.floor(5e3 + 6e5 * Math.random());
h.c = JSON.parse(Script.storage.getItem("c")), null !== h.c && (h.w = JSON.parse(Script.storage.getItem("w")), h.p = JSON.parse(Script.storage.getItem("p")), S = new Function("datetime", "spotPrice", h.p), a());