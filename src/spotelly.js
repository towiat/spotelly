// Spotelly Version 3.6
// This script uses EPEX spot energy prices to control the power output of a Shelly device.
// See https://github.com/towiat/spotelly for the full documentation.
// This script uses price data from http://energy-charts.info

// <<<<< START OF CONFIGURATION - change values below to your preference >>>>>

let epexBZN = "AT"; // EPEX Bidding Zone - see documentation for valid codes

let hourMode = true; // true for hourly, false for quarter-hourly calculation
let blockMode = true; // set calculation mode

let switchOnDuration = 4; // hours if hourMode is true, else quarter hours
let timeWindowStartHour = 7; // minimum 0, maximum 23
let timeWindowEndHour = 19; // minimum 0, maximum 23
let priceLimit = Infinity; // in cent/kWh
let useFallback = true; // if true, use fallback when price retrieval fails

// change this function to display prices according to the conditions of your contract
function priceModifier(datetime, spotPrice) {
  return spotPrice; // spotPrice is in cent/kWh
}

let switchID = 0; // set the switch ID for multi-switch devices
let invertSwitch = false; // if true, switch will be OFF for cheapest hours and ON for the rest

let telegramActive = false; // set to true to activate the Telegram feature

// the following settings have no effect when telegramActive is false
let telegramToken = ""; // must be set when telegramActive is true
let telegramChatID = ""; // must be set when telegramActive is true
let deviceName = "Shelly"; // will be included in telegrams to identify the sender
let sendSchedule = true; // send telegram with schedule and price details after each run
let sendPowerOn = true; // send telegram when power has been switched on by this script
let sendPowerOff = true; // send telegram when power has been switched off by this script

// <<<<< END OF CONFIGURATION - no changes needed below this line >>>>>

let prc = [];
let on = [];
let anch = 0;
let rOff = Math.ceil(Math.random() * 300000);
let timH = undefined;
let html = atob("{{ html }}"); // placeholder for compressed html - used by build script
let intv = hourMode ? 3_600_000 : 900_000;

function next() {
  let info = Timer.getInfo(timH);
  if (info === undefined) return 0;
  return Math.floor(Date.now()) + info.next - Shelly.getUptimeMs();
}

function log(msg, sendTelegram) {
  console.log(msg);
  if (telegramActive && sendTelegram) {
    Shelly.call("http.post", {
      url: "https://api.telegram.org/bot" + telegramToken + "/sendMessage",
      content_type: "application/json",
      body: { chat_id: telegramChatID, text: deviceName + ": " + msg },
    });
  }
}

function set(val) {
  if (invertSwitch) val = !val;
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

function getP() {
  let now = new Date();
  let day_offset = 1;
  if (now.getHours() < 15) {
    day_offset = 0;
  }
  let strt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day_offset);
  let year = strt.getFullYear().toString();
  let month = (strt.getMonth() + 1).toString();
  let day = strt.getDate().toString();
  let parm = [
    year,
    "-",
    month.length === 1 ? "0" + month : month,
    "-",
    day.length === 1 ? "0" + day : day,
  ].join("");

  let url = "https://api.energy-charts.info/price?bzn=" + epexBZN + "&start=" + parm;

  Shelly.call("http.get", { url: url }, prcP, strt.getTime());
}

function prcP(res, errc, errm, strt) {
  let fbm = false;
  let dsix = prc.length;
  let mult = hourMode ? 1 : 4;
  let dt = strt;

  let err = "";
  if (errc !== 0) {
    err = "Shelly error: " + errc + "/" + errm;
  } else if (res.code !== 200) {
    err = "Server error " + res.code + "/" + res.message;
  } else {
    delete res.headers; // free up RAM to reduce peak memory usage
    let pstr = res.body.indexOf('"price":') + 8;
    let pend = res.body.indexOf("]", pstr) + 1;
    res.body = res.body.substring(pstr, pend);
    let prcs = JSON.parse(res.body);
    delete res.body;
    if (hourMode) {
      for (let i = 0; i < prcs.length; i += 4) {
        let psum = 0;
        for (let j = i; j < i + 4; j++) psum += prcs[j] / 10;
        prc.push(priceModifier(new Date(dt), parseFloat((psum / 4).toFixed(3))));
        dt += intv;
      }
    } else {
      for (let p of prcs) {
        prc.push(priceModifier(new Date(dt), p / 10));
        dt += intv;
      }
    }
  }

  if (err) {
    if (strt > Date.now() + 1800000) {
      // retry only if day starts at least 30 minutes in the future
      timH = Timer.set(1200000, false, getP);
      console.log(err, "Trying again at", next());
      return;
    }

    if (!useFallback) return;

    // no prices retrieved and useFallback is true - do the fallback
    fbm = true;
    for (let p of [
      7.56, 6.98, 6.73, 6.53, 6.63, 7.33, 8.97, 10.16, 9.74, 8.21, 6.87, 6.0, 5.35, 5.02, 5.28,
      6.38, 7.85, 9.75, 11.16, 12.1, 11.58, 10.02, 9.01, 7.97,
    ])
      for (let i = 0; i < mult; i++) {
        prc.push(priceModifier(new Date(dt), p)); // if not in hourMode, push each price 4 times
        dt += intv;
      }
  }

  if (anch === 0) anch = strt;

  let wsix = dsix + timeWindowStartHour * mult;
  let weix = timeWindowEndHour ? prc.length - (24 * mult - timeWindowEndHour * mult) : prc.length;
  let dur = Math.min(switchOnDuration, weix - wsix);

  if (blockMode) {
    let sidx = 0;
    let lSum = Infinity;
    for (let i = wsix, j = wsix + dur; j < weix; i++, j++) {
      let sSum = 0;
      for (let h = i; h < j; h++) sSum += prc[h];
      if (sSum < lSum) {
        sidx = i;
        lSum = sSum;
      }
    }
    for (let i = sidx; i < sidx + dur; i++) on[i] = true;
  } else {
    for (let i = 0; i < dur; i++) {
      let midx;
      let mprc = Infinity;
      for (let j = wsix; j < weix; j++) {
        if (prc[j] < mprc && !on[j]) {
          midx = j;
          mprc = prc[j];
        }
      }
      on[midx] = true;
    }
  }

  for (let i = dsix; i < prc.length; i++) {
    if (fbm) prc[i] = NaN;
    if (!fbm && prc[i] >= priceLimit) delete on[i];
  }

  log("Timetable has been updated.", sendSchedule);
}

// eslint-disable-next-line no-unused-vars
function chck() {
  let now = Math.floor(Date.now());
  let time = new Date(now - (now % intv));
  if (time.getTime() === anch) {
    prc.splice(0, 1)[0];
    set(Boolean(on.splice(0, 1)[0]));
    anch = prc.length === 0 ? 0 : anch + intv;
  }

  if (time.getHours() === 15 && time.getMinutes() === 0) timH = Timer.set(rOff, false, getP);
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
    let idx = (data.h - anch) / intv;
    if (idx >= 0 && idx < prc.length) data.o ? (on[idx] = true) : delete on[idx];
  }
  res.headers = [["Content-Type", "application/json"]];
  res.body = JSON.stringify({ i: intv, a: anch, n: next(), s: switchID, p: prc, o: on, r: rOff });
  res.code = 200;
  res.send();
}

function init() {
  if (Shelly.getComponentStatus("sys").unixtime === null) {
    console.log("Time not synchronized, waiting one second...");
    Timer.set(1000, false, init);
    return;
  }

  // get prices on startup
  timH = Timer.set(0, false, getP);

  HTTPServer.registerEndpoint("spotelly", spEP);
  HTTPServer.registerEndpoint("data", dtEP);

  Shelly.call("Schedule.List", {}, function (res) {
    let call = { method: "Script.Eval", params: { id: Script.id, code: "chck()" } };
    let schd = {
      enable: true,
      timespec: hourMode ? "0 0 * * * *" : "0 */15 * * * *",
      calls: [call],
    };

    for (let job of res.jobs) {
      let cll = job.calls[0];
      if (cll.method.toLowerCase() !== "script.eval" || cll.params.id !== Script.id) continue;
      if (job.timespec === schd.timespec && cll.params.code === call.params.code) return;
      schd.id = job.id;
      break;
    }

    Shelly.call("id" in schd ? "Schedule.Update" : "Schedule.Create", schd);
  });
}

init();
