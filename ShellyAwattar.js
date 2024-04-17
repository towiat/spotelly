/*
This script uses EPEX spot hourly energy prices for the Austrian or German market (provided by the Awattar
API) to control the power output of a Shelly device. It has been developed and tested on a
Shelly Plus Plug S with firmware version 1.2.3. No warranties given - use at your own risk.

The goal is to activate power output when prices are at their lowest during a predefined daily time
window. The script can be customized by setting several variables and works as follows:

You define a schedule, (e. g. 15:00 every day), a switch on period (e.g. 4 hours) and a time window
(e.g. 7:00 to 19:00).

With the above settings, every day at 15:00, the script fetches the EPEX spot prices and finds the
cheapest 4 hour block between 7:00 and 19:00 on the next day. It then sets timers to activate power
output at the start of this period and deactivate it at the end.

Optionally, the script can also send telegram messages to keep you informed about its activities.

This script was inspired by https://elspotcontrol.netlify.app/find_cheapest.js which offers a similar
solution for the Finnish market.
*/

// <<<<< START OF CONFIGURATION - change values below to your preference >>>>>

// defines whether the Austrian or German Awattar API will be used
let awattarCountry = "at"; // at for Austrian or de for German API

// defines the schedule for running the script - defaults to 15:00 every day
// see https://github.com/mongoose-os-libs/cron for a description on how to set this
// note: when you change this setting after the script has run at least once, you have to
// delete the "Awattar eval" schedule in the Shelly Web UI and then stop and restart the script
let scheduleTimeSpec = "0 0 15 * * *";

// this sets the number of hours that the device will be switched on in one go (no decimals allowed)
let switchOnDuration = 4; // minimum 1, maximum 24

// these two variables set the time window within which the lowest prices will be found
// e. g. start hour 7 and end hour 19 for a time window from 7:00 to 19:00
// the time window will go over midnight if end hour is less than start hour
// e. g. start hour of 20 and end hour of 4 sets window from 20:00 to 4:00 on the following day
// set both values to 0 to match the calendar day
// both values MUST be whole numbers from 0 to 23
let timeWindowStartHour = 7; // minimum 0, maximum 23
let timeWindowEndHour = 19; // minimum 0, maximum 23

// if true, telegram messages will be sent for certain events
let telegramActive = false;

// Token and ChatID must be set if telegramActive is true
let telegramToken = "";
let telegramChatID = "";
let deviceName = "Shelly Plug"; // will be included in the message to identify the sender

// these settings determine which messages will be sent by the script
// they have no effect if telegramActive is false
let sendSchedule = true; // after each execution, send telegram with timing and price details
let sendPowerOn = true; // send telegram when power has been switched on by this script
let sendPowerOff = true; // send telegram when power has been switched off by this script

// <<<<< END OF CONFIGURATION - no changes needed below this line >>>>>

let kvsKey = "Awattar-Schedule-" + JSON.stringify(Shelly.getCurrentScriptId());

function sendTelegramMessage(msg) {
  let message = deviceName + ": " + msg;
  Shelly.call("http.post", {
    url: "https://api.telegram.org/bot" + telegramToken + "/sendMessage",
    header: { content_type: "application/json" },
    body: { chat_id: telegramChatID, text: message },
  });
}

function logAndNotify(msg, notify) {
  print(msg);
  if (telegramActive && notify) {
    sendTelegramMessage(msg);
  }
}

function switchOnPower() {
  Shelly.call(
    "Switch.Set",
    { id: 0, on: true },
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        logAndNotify(
          "Stromzufuhr konnte nicht eingeschaltet werden.",
          sendPowerOn
        );
        return;
      }
      logAndNotify("Die Stromzufuhr wurde eingeschaltet.", sendPowerOn);
    }
  );
}

function switchOffPower() {
  Shelly.call(
    "Switch.Set",
    { id: 0, on: false },
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        logAndNotify(
          "Stromzufuhr konnte nicht ausgeschaltet werden.",
          sendPowerOff
        );
        return;
      }
      logAndNotify("Die Stromzufuhr wurde ausgeschaltet.", sendPowerOff);
    }
  );
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
  let date = new Date(timestamp);
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

function setSchedule(response) {
  prices = JSON.parse(response.body)["data"];

  let switchOn = 0;
  let switchOff = 0;
  let lowestSum = 999999999;
  for (let i = 0, j = switchOnDuration; j <= prices.length; i++, j++) {
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
  logAndNotify(
    "Die Stromzufuhr wird " +
      formatDate(switchOn) +
      " ein- und " +
      formatDate(switchOff) +
      " ausgeschaltet. Der durchschnittliche Marktpreis ist " +
      Math.round((lowestSum / 10 / switchOnDuration) * 100) / 100 +
      " cent/kWh.",
    sendSchedule
  );

  let now = Date.now();
  Timer.set(switchOn - now, false, switchOnPower);
  Timer.set(switchOff - now, false, switchOffPower);
}

function awattar() {
  let start = findHour(Date.now(), timeWindowStartHour);
  let end = findHour(start, timeWindowEndHour);

  let runData = {
    scheduleTimeSpec: scheduleTimeSpec,
    switchOnDuration: switchOnDuration,
    timeWindowStartHour: timeWindowStartHour,
    timeWindowEndHour: timeWindowEndHour,
    systemTime: Date.now(),
    calculatedStart: start,
    calculatedEnd: end,
  };

  print(JSON.stringify(runData));

  let baseURL = "https://api.awattar." + awattarCountry;
  Shelly.call(
    "http.get",
    {
      url: baseURL + "/v1/marketdata?start=" + start + "&end=" + end,
    },
    setSchedule
  );
}

// The following logic was adapted from the https://github.com/ALLTERCO/shelly-script-examples
// repository and used under the terms of the the Apache 2.0 license:
// https://github.com/ALLTERCO/shelly-script-examples/blob/main/LICENSE

function registerIfNotRegistered() {
  Shelly.call(
    "KVS.Get",
    {
      key: kvsKey,
    },
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        installSchedule();
        return;
      }
      let scheduleID = result.value;
      Shelly.call("Schedule.List", {}, function (result) {
        for (let i = 0; i < result.jobs.length; i++) {
          if (result.jobs[i].id === scheduleID) return;
        }
        installSchedule();
      });
    }
  );
}

function saveScheduleIDInKVS(scheduleId) {
  Shelly.call("KVS.Set", {
    key: kvsKey,
    value: scheduleId,
  });
}

function installSchedule() {
  Shelly.call(
    "Schedule.Create",
    {
      enable: true,
      timespec: scheduleTimeSpec,
      calls: [
        {
          method: "script.eval",
          params: {
            id: Shelly.getCurrentScriptId(),
            code: "awattar()",
          },
        },
      ],
    },
    function (result) {
      saveScheduleIDInKVS(result.id);
    }
  );
}

registerIfNotRegistered();
