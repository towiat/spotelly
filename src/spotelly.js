// Spotelly Version 3.0
// This script uses EPEX spot hourly energy prices to control the power output of a Shelly device.
// See https://github.com/towiat/spotelly for the full documentation.
// This script uses price data from http://energy-charts.info

// <<<<< START OF CONFIGURATION - change values below to your preference >>>>>

let epexBZN = "AT"; // EPEX Bidding Zone - see documentation for valid codes

// Define multiple time windows as objects in an array
let timeWindows = [
  { startHour: 0, endHour: 6, duration: 2 },   // Window 1
  { startHour: 11, endHour: 18, duration: 2 },  // Window 2
];

let blockMode = true; // set calculation mode
let priceLimit = Infinity; // in cent/kWh
let useFallback = true; // if true, use fallback when price retrieval fails

// change this function to display prices according to the conditions of your contract
function priceModifier(spotPrice) {
  return spotPrice; // spotPrice is in cent/kWh
}

let switchID = 0; // set the switch ID for multi-switch devices

let telegramActive = false; // set to true to activate the Telegram feature

// the following settings have no effect when telegramActive is false
let telegramToken = ""; // must be set when telegramActive is true
let telegramChatID = ""; // must be set when telegramActive is true
let deviceName = "Shelly"; // will be included in telegrams to identify the sender
let sendSchedule = true; // send telegram with schedule and price details after each run
let sendPowerOn = true; // send telegram when power has been switched on by this script
let sendPowerOff = true; // send telegram when power has been switched off by this script

// <<<<< END OF CONFIGURATION - no changes needed below this line >>>>>

let hrs = [];
let anch = 0;
let rOff = Math.ceil(Math.random() * 300000);
let timH = undefined;
let html = atob("H4sIAAAAAAACA4UUh5bjJvBXCGlSjGT7+tlCm95zvXcM4xVZBHowbs9P/x6QtenJucD0PlQfKCfx0AFpsDV1lU6iBIpiFQpsoAWuhL+oqxZQECsivtWw65xHIp1FsMjpTitsuIKtllAMCNNWoxamCFIY4HNaV0bbC9J4WPMGsQuL6VQqW/4aFBi99aUFnNquna6cw4BedJ9fL6+WV6dKB5zKEP5glK22ZaQQD4YHPBgIDQDWFWo0UD/sHIIxh2p6wquVUwcijQiBU1WsDexJOgrpzKa1BGGPhQSL4GlMU2h7KTxInXu3K+akxeIqaVfF9SiDYmXgUuiEDGexcl6BBzWiMVrdRWxXiA060u6HOxloQCiiFW8inMJL8KqOESe9eKco6mrtHIK/dLQ6LzqvW+EPZK33oKI3RNfSpLuuqyCjM6wNINnwnbbK7UrjpEDtbJnKXnrojJCQ0TBWiDKaOk1zJnmGDHJeKyc3LVgszwG/MZDALw8/qAzzUlsL/vtHv/zMgWmOvLawI18LhMRE97NLnX6IXtvz6GJL2VFF5sPUnwUNjfNIGer2ktKC0puW9jlrOfD6KDPaUPauQp/qQ6QzoROWX6vvuR14cneD3QbJo2jgVPG18+ThTqNsyEdHKEM/atYppHR/7zY+3RKnF0+bBN217/JlKpDhM+biX3BKl3qdQYmlAXuOTX5MfORQiuVWeGJZYA1P/FZ0WUp6YwznHF/OXp/dEXcWCciZ4r8IbKLMPivLssmZHwnangjLGG72Mlp77dYkmsuPoyH7ySeZ5dFSzkIE3YRbZiaTfPDe8nfDfHMay+H8gjTBZB8ddYjymcrP6IyR2ceMzGezj+lifmX2WTYvMlv4fJqpeOYTemIycj1K9PmSvluKCR+rrGLl2r6OBlMLg9ESshmbz/L+33nzOZvf+IM5DuawP2BVlLUlum/TbGZXBrG6Uno7isUCtEUYGlZX2sZm/pkhG5AXxYmcXiM+EFZuHz2FMzpgoOiC0p44+1UM54JTjLXAnhFsdChHkZzG9Yle63cMJ/zqDbje92ACEMHpmPUfszVG0BXX6zuODLuwjHO4okzkLALrOJAPwYBEUIsYielJmqrAyBdb8OIcEjEzZ25qFrP8z8mTcepWvr4T60Med9F6FH830RmUNs/7pQgHK8l6Y2VaUWKy/LiGWJ1sEy01YNO0YXwfnc3yPyhthlH5NKTjzl6qsWML2Di1oPfuPnxEWXpYFj8+vHunDMNW6vUhO2JYIHN2AX3ev9dPKUWyHNFTVf63gnSCKa3x6XHWOKG4qabjw/QbcaHw7mkGAAA="); // placeholder for compressed html - used by build script

function next() {
  let delay = Timer.getInfo(timH).next - Shelly.getUptimeMs();
  return timH !== undefined ? Math.floor(Date.now()) + delay : 0;
}

function getIndex(ts) {
  let idx = (ts - anch) / 3600000;
  if (idx < 0 || idx > hrs.length - 1) throw new Error("No index for " + ts + "; anch: " + anch);
  return idx;
}

function updS(ts, on) {
  hrs[getIndex(ts)][1] = on;
}

function log(msg, sendTelegram) {
  print(msg);
  if (telegramActive && sendTelegram) {
    Shelly.call("http.post", {
      url: "https://api.telegram.org/bot" + telegramToken + "/sendMessage",
      content_type: "application/json",
      body: { chat_id: telegramChatID, text: deviceName + ": " + msg },
    });
  }
}

function set(val) {
  if (Shelly.getComponentStatus("switch", switchID).output === val) return;
  let msg = val ? "ON." : "OFF.";
  let flag = val ? sendPowerOn : sendPowerOff;
  Shelly.call("Switch.Set", { id: switchID, on: val }, function (res, errc) {
    if (errc === 0) {
      log("Switch " + switchID + " has been turned " + msg, flag);
    } else {
      log("ERROR: Switch " + switchID + " could not be turned " + msg, flag);
    }
  });
}

function getH(ts, hour) {
  let d = new Date(ts);
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + Number(hour <= d.getHours()),
    hour,
  ).getTime();
}

function setT(time, strt) {
  timH = Timer.set(time === 0 ? 0 : time - Date.now(), false, getP, {
    strt: strt,
    end: getH(strt, 0),
  });
}

function getP(day) {
  let qry = "&start=" + day.strt / 1000 + "&end=" + (day.end / 1000 - 3600);

  Shelly.call(
    "http.get",
    { url: "https://api.energy-charts.info/price?bzn=" + epexBZN + qry },
    prcP,
    day,
  );
}

function prcP(res, errc, errm, day) {
  let fbm = false;

  let err = "";
  if (errc !== 0) {
    err = "Shelly error: " + errc + "/" + errm;
  } else if (res.code !== 200) {
    err = "Server error " + res.code + "/" + res.message;
  } else {
    let body = JSON.parse(res.body);
    res.body = null; // free up RAM
    for (let price of body.price) hrs.push([priceModifier(price / 10), false]);
  }

  if (err) {
    if (day.strt > Date.now() + 1800000) {
      // retry only if day starts at least 30 minutes in the future
      timH = Timer.set(1200000, false, getP, day);
      print(err, "Trying again at", next().toString());
      return;
    }
    if (!useFallback) {
      // no fallback; set timer for the next day
      setT(getH(Date.now(), 15) + rOff, getH(day.strt, 0));
      return;
    }
    // no prices retrieved and useFallback is true - do the fallback
    fbm = true;
    let fbp = [
      7.56, 6.98, 6.73, 6.53, 6.63, 7.33, 8.97, 10.16, 9.74, 8.21, 6.87, 6.0, 5.35, 5.02, 5.28,
      6.38, 7.85, 9.75, 11.16, 12.1, 11.58, 10.02, 9.01, 7.97,
    ];
    for (let h = day.strt, i = 0; h < day.end; h += 3600000, i++) {
      hrs.push([fbp[i % 24], false]);
    }
  }

  
  if (anch === 0) anch = day.strt;

  // Loop through each time window
  for (let win of timeWindows) {
    let winS = win.startHour === 0 ? day.strt : getH(day.strt, win.startHour);
    let winE = getH(winS, win.endHour);
    let winH = (winE - winS) / 3600000;
    let dur = Math.min(win.duration, winH);

    let data = [];
    let idx = getIndex(winS);
    hrs.slice(idx, idx + winH).forEach(function (ele) {
      data.push([winS, ele[0], ele[1]]);
      winS += 3600000;
    });

    let sidx = 0;
    if (blockMode) {
      let lSum = Infinity;
      for (let i = 0, j = dur; j <= data.length; i++, j++) {
        let sSum = 0;
        data.slice(i, j).forEach(function (ele) {
          sSum += ele[1];
        });
        if (sSum < lSum) {
          sidx = i;
          lSum = sSum;
        }
      }
    } else {
      for (let i = 0; i < dur; i++) {
        for (let j = 1; j < data.length; j++) {
          if (data[j][1] > data[j - 1][1]) {
            let temp = data[j];
            data[j] = data[j - 1];
            data[j - 1] = temp;
          }
        }
      }
      sidx = -dur;
    }

    for (let ele of data.splice(sidx, dur)) {
      if (fbm) {
        updS(ele[0], true);
      } else {
        if (ele[1] <= priceLimit) updS(ele[0], true);
      }
    }
  }

  if (fbm) {
    // in fallback mode, set all prices for the day to NaN
    for (let i = getIndex(day.strt), j = day.strt; j < day.end; i++, j += 3600000) {
      hrs[i] = [NaN, hrs[i][1]];
    }
  }

  setT(getH(Date.now(), 15) + rOff, getH(day.strt, 0));

  log("Timetable has been updated.", sendSchedule);
}

// eslint-disable-next-line no-unused-vars
function hrly() {
  let now = Date.now();
  let hour = now - (now % 3600000);
  if (hour === anch) {
    let ele = hrs.splice(0, 1)[0];
    set(ele[1]);
    anch = hrs.length === 0 ? 0 : anch + 3600000;
  }
}

function spEP(req, res) {
  res.headers = [
    ["Content-Type", "text/html"],
    ["Content-Encoding", "gzip"],
  ];
  res.body = html;
  res.send();
}

function dtEP(req, res) {
  if (req.method === "POST") {
    let data = JSON.parse(req.body);
    try {
      updS(data.ts, data.on);
    } catch (error) {
      print(error.message);
    }
  }
  res.headers = [["Content-Type", "application/json"]];
  res.body = JSON.stringify({
    a: anch,
    n: next(),
    s: switchID,
    t: hrs,
  });
  res.code = 200;
  res.send();
}

function init() {
  if (Shelly.getComponentStatus("sys").unixtime === null) {
    print("Time not synchronized, waiting one second...");
    Timer.set(1000, false, init);
    return;
  }

  let now = Date.now();
  setT(new Date(now).getHours() < 15 ? getH(now, 15) + rOff : 0, getH(now, 0));

  HTTPServer.registerEndpoint("spotelly", spEP);
  HTTPServer.registerEndpoint("data", dtEP);

  Shelly.call("Schedule.List", {}, function (res) {
    let sid = Shelly.getCurrentScriptId();
    let mthd = "Schedule.Update";
    let schd = null;
    let tspc = "0 0 * * * *";
    let code = "hrly()";

    for (let job of res.jobs) {
      let call = job.calls[0];
      if (!(call.method.toLowerCase() === "script.eval" && call.params.id === sid)) {
        continue; // this is not our schedule - skip
      }
      if (job.timespec === tspc && call.params.code === code) {
        return; // this IS our schedule and it matches the configuration - we are done
      }
      schd = job;
      schd.timespec = tspc;
      call.params.code = code;
      break;
    }

    if (schd === null) {
      // schedule does not exist - create it
      mthd = "Schedule.Create";
      schd = {
        enable: true,
        timespec: tspc,
        calls: [{ method: "Script.Eval", params: { id: sid, code: code } }],
      };
    }

    Shelly.call(mthd, schd);
  });
}

init();
