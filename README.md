# Spot-Price Based Control of Shelly Devices

## Introduction

This script uses EPEX spot hourly energy prices for the Austrian or German market to control the power
output of a Shelly device. It runs directly on the Shelly and the only technical requirement is that
the Shelly has access to the internet. The script should run on all Gen2+ Shelly switches.

The goal of the script is to activate power output when prices are at their lowest during a predefined
daily time window. The script behavior can be customized with several configuration variables and it
operates as follows:

You define a schedule (e.g. 15:00 every day), a switch on duration (e.g. 4 hours) and a time window
(e.g. 7:00 to 19:00).

With the above settings, the script runs every day at 15:00 and fetches the hourly energy prices for the
time frame from 7:00 to 19:00 of the next day. It then identifies the 4-hour-block with the lowest average
price within this time frame and sets timers to activate power output at the start of the block and deactivate
it at the end.

After each execution, the script writes the calculated switch times to the Key-Value Store of the Shelly where
they can be reviewed:
![KVS Message](https://raw.githubusercontent.com/towiat/spotelly/main/images/KVSScreen.png)

There are two additional features:

- You can define a hard price limit (e.g. 10 cent/kWh). If the calculated lowest price is higher than this
  limit, the script will NOT activate power output at all for the current time window.
- Telegram integration: Optionally, the script can send you a Telegram message with schedule and price details
  after each execution. It can also send messages when it activates and deactivates power output.

The hourly prices are retrieved from the Awattar API. Awattar generously offers free access to the Austrian
and German market prices - see their <a href="https://awattar.at" target="_blank">Austrian</a> or
<a href="https://energy.tado.com" target="_blank">German</a> websites for details about their services.

## Installation

<ol>
<li>Enter the IP Address of your Shelly in the URL field of your browser.</li>
<li>Select the <code>Scripts</code> Tab.</li>
<li>Click on the <code>Create Script</code> button.</li>
<li>Copy the COMPLETE source code from
<a href="https://raw.githubusercontent.com/towiat/spotelly/main/src/spotelly.js" target="_blank">this link</a>
into the script window.</li>
<li>(Optional): Enter a script name in the corresponding field.</li>
<li>Change the configuration variables in the script to your preference (see next section for details).</li>
<li>Click the <code>Save</code> button.</li>
<li>Click the <code>Start</code> button. The script is now running.</li>
<li>Go back to the <code>Scripts</code> tab and make sure that the text below the script name says
<code>Running</code>.</li>
<li>Activate the <code>Run on startup</code> switch to make sure that the script restarts after a reboot of the device.</li>
</ol>
Note that the installation procedure only installs the schedule which will be used by the Shelly to
start the script at the pre-defined intervals (which is every day at 15:00 with the default settings).
<br><br>
The first ACTUAL calculation occurs when the first automatic execution is run (which, in the default setting,
will be at 15:00 after the installation) and you will not see a calculation result on the KVS page before
that time.

## Configuration

The behavior of the script can be customized by changing the following variables to your needs:

### awattarCountry (default `at`)

Defines which Awattar API will be used by the script - `at` for the Austrian or `de` for the German API.

### scheduleTimeSpec (default `0 0 15 * * *`)

This is the execution schedule for the script. With the default setting, the script will run every day at 15:00.
See <a href="https://github.com/mongoose-os-libs/cron">this site</a> for a description on how to set this.<br><br>
Usually, you do not need to change this variable unless you want to run several instances of the script
simultaneously (for example when you want to have different schedules on work days and weekends).

### switchOnDuration (default `4`)

Number of hours that the device will be switched on in one go. The default of four means that the script
will activate power output during the cheapest four hours of the time window.<br><br>
The switchOnDuration must be a whole number in the range of 1 to 24.

### timeWindowStartHour & timeWindowEndHour (default `7` & `19`)

These two variables define the time window within which the cheapest hours will be found. The default time
window is 7:00 to 19:00.<br><br>
Both values must be whole numbers in the range of 0 to 23. If you want the time window to match the calendar day, set both values to zero.<br><br>
The time window will go over midnight if the end hour is less than the start hour - e. g. a start hour of 20
and an end hour of 4 sets a window from 20:00 to 4:00 on the following day.

### priceLimit (default `Infinity`)

This variable defines a price limit which is expressed in cent per kWh. If the average price of the cheapest
period in the time window is higher than this value, the power will not be switched on at all during the time
window.<br><br>
The price limit can have decimals - e.g. a value of 10.5 cent is perfectly fine.<br><br>
The default value of Infinity means that there is no price limit.

### telegramActive (default `false`)

Set this to `true` to activate the Telegram feature. In order to use this feature, you need to have Telegram
installed. You also need a Telegram token and a Telegram ChatID. A description on how to obtain both can be
found here:
<a href="https://gist.github.com/nafiesl/4ad622f344cd1dc3bb1ecbe468ff9f8a" target="_blank"> How to get
Telegram Bot Chat ID</a>.

The following variables are only used when telegramActive is `true`:

#### telegramToken & telegramChatID (default `""` and `""`)

Both variables MUST be filled when telegramActive is true - otherwise, the feature will not work.

#### deviceName (default `Shelly`)

The value of this variable will be included in the Telegram message in order to identify the sender. Especially
useful when you run the script on several Shellies and want to know which one send which message.

#### sendSchedule (default `true`)

If true, the script will send a Telegram message with the calculated times and prices after each execution.

#### sendPowerOn (default `true`)

If true, the script will send a Telegram message when power output is switched on by the script.

#### sendPowerOff (default `true`)

If true, the script will send a Telegram message when power output is switched off by the script.

## FAQ

### A new version of the script is available. How do I upgrade?

If there are no specific upgrade instructions in the CHANGELOG, use the following steps:

1. Note down the values of your configuration variables
2. Stop the script
3. COMPLETELY replace the code of the script with the new version
4. Reapply the values of your configuration variables from step 1
5. Start the script
