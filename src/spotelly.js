// Spotelly Version 1.0
// This script uses EPEX spot hourly energy prices to control the power output of a Shelly device.
// See https://github.com/towiat/spotelly for the full documentation.

// <<<<< START OF CONFIGURATION - change values below to your preference >>>>>

const awattarCountry = "at"; // at for Austrian or de for German API

const scheduleTimeSpec = "0 0 15 * * *"; // the schedule for the script execution

const switchOnDuration = 4; // minimum 1, maximum 24
const timeWindowStartHour = 7; // minimum 0, maximum 23
const timeWindowEndHour = 19; // minimum 0, maximum 23
const priceLimit = Infinity; // in cent/kWh

const telegramActive = false; // set to true to activate the Telegram feature

// the following settings have no effect when telegramActive is false
const telegramToken = ""; // must be set when telegramActive is true
const telegramChatID = ""; // must be set when telegramActive is true
const deviceName = "Shelly"; // will be included in telegrams to identify the sender
const sendSchedule = true; // send telegram with schedule and price details after each run
const sendPowerOn = true; // send telegram when power has been switched on by this script
const sendPowerOff = true; // send telegram when power has been switched off by this script

// <<<<< END OF CONFIGURATION - no changes needed below this line >>>>>

const scriptID = Shelly.getCurrentScriptId();
const kvsPlanKey = "Awattar-Plan-" + JSON.stringify(scriptID);

function logAndNotify(msg, sendTelegram, kvsKey) {
  print(msg);
  if (typeof kvsKey !== "undefined") {
    Shelly.call("KVS.Set", { key: kvsKey, value: msg });
  }
  if (telegramActive && sendTelegram) {
    Shelly.call("http.post", {
      url: "https://api.telegram.org/bot" + telegramToken + "/sendMessage",
      header: { content_type: "application/json" },
      body: { chat_id: telegramChatID, text: deviceName + ": " + msg },
    });
  }
}

function setPowerSwitch(value) {
  const switchText = value ? "eingeschaltet" : "ausgeschaltet";
  const messageFlag = value ? sendPowerOn : sendPowerOff;
  Shelly.call("Switch.Set", { id: 0, on: value }, function (result, error_code) {
    if (error_code !== 0) {
      logAndNotify("Die Stromzufuhr konnte nicht " + switchText + " werden.", messageFlag);
    } else {
      logAndNotify("Die Stromzufuhr wurde " + switchText + ".", messageFlag);
    }
  });
}

function findHour(start, hour) {
  let timestamp = start - (start % 3600000) + 3600000;
  for (let i = 0; i < 25; i++) {
    if (new Date(timestamp).getHours() === hour) {
      break;
    }
    timestamp += 3600000;
  }
  return timestamp;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return [
    "am ",
    date.getDate(),
    ".",
    date.getMonth() + 1,
    ".",
    date.getFullYear(),
    " um ",
    date.getHours(),
    ":00",
  ].join("");
}

function setTimers(response) {
  const prices = JSON.parse(response.body).data;

  let switchOn = 0;
  let switchOff = 0;
  let lowestSum = Infinity;
  for (let i = 0, j = switchOnDuration; j <= prices.length; i++, j++) {
    // eslint-disable-next-line prefer-const
    let slice = prices.slice(i, j);
    let sliceSum = 0;
    slice.forEach(function (ele) {
      sliceSum += ele.marketprice;
    });
    if (sliceSum < lowestSum) {
      switchOn = slice[0].start_timestamp;
      switchOff = slice[slice.length - 1].end_timestamp;
      lowestSum = sliceSum;
    }
  }

  const centPerKWH = lowestSum / 10 / switchOnDuration;

  if (centPerKWH > priceLimit) {
    const message = [
      "Der günstigste Durchschnittspreis beträgt",
      centPerKWH.toFixed(2),
      "cent/kWh und liegt über dem Schwellenwert von",
      priceLimit.toFixed(2),
      "cent/kWh. Die Stromzufuhr wird im aktuellen Zeitfenster nicht eingeschaltet.",
    ].join(" ");
    logAndNotify(message, sendSchedule, kvsPlanKey);
    return;
  }

  const message = [
    "Die Stromzufuhr wird",
    formatDate(switchOn),
    "ein- und",
    formatDate(switchOff),
    "ausgeschaltet. Der durchschnittliche Marktpreis ist",
    centPerKWH.toFixed(2),
    "cent/kWh.",
  ].join(" ");
  logAndNotify(message, sendSchedule, kvsPlanKey);

  const now = Date.now();
  Timer.set(switchOn - now, false, setPowerSwitch, true);
  Timer.set(switchOff - now, false, setPowerSwitch, false);
}

// eslint-disable-next-line no-unused-vars
function calculate() {
  const start = findHour(Date.now(), timeWindowStartHour);
  const end = findHour(start, timeWindowEndHour);

  print(
    JSON.stringify({
      scheduleTimeSpec: scheduleTimeSpec,
      switchOnDuration: switchOnDuration,
      timeWindowStartHour: timeWindowStartHour,
      timeWindowEndHour: timeWindowEndHour,
      systemTime: Date.now(),
      calculatedStart: start,
      calculatedEnd: end,
    }),
  );

  Shelly.call(
    "http.get",
    {
      url:
        "https://api.awattar." + awattarCountry + "/v1/marketdata?start=" + start + "&end=" + end,
    },
    setTimers,
  );
}

function createOrUpdateSchedule() {
  Shelly.call("Schedule.List", {}, function (result) {
    let scheduleMethod = "Schedule.Update";
    let scheduleObject = null;
    const code = "calculate()";

    for (const job of result.jobs) {
      const call = job.calls[0];
      if (!(call.method.toLowerCase() === "script.eval" && call.params.id === scriptID)) {
        continue; // this is not our schedule - skip
      }
      if (job.timespec === scheduleTimeSpec && call.params.code === code) {
        return; // this IS our schedule and it matches the configuration - we are done
      }
      print("Schedule has changed.");
      scheduleObject = job;
      scheduleObject.timespec = scheduleTimeSpec;
      call.params.code = code;
      break;
    }

    if (scheduleObject === null) {
      // schedule does not exist - create it
      scheduleMethod = "Schedule.Create";
      scheduleObject = {
        enable: true,
        timespec: scheduleTimeSpec,
        calls: [{ method: "Script.Eval", params: { id: scriptID, code: code } }],
      };
    }

    Shelly.call(scheduleMethod, scheduleObject);
  });
}

createOrUpdateSchedule();
