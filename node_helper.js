'use strict';

/* Magic Mirror
 * Module: MMM-PIR-Sensor
 *
 * By Paul-Vincent Roll http://paulvincentroll.com
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Gpio = require('onoff').Gpio;
const exec = require('child_process').exec;

module.exports = NodeHelper.create({
  start: function () {
    this.started = false;
    this.turnedOn= false;
  },

  activateMonitor: function () {
    if (this.config.relayPIN != false) {
      this.relay.writeSync(this.config.relayOnState);
    }
    else if (this.config.relayPIN == false){
      exec("/opt/vc/bin/tvservice --preferred && sudo chvt 6 && sudo chvt 7", null);
    }
  },

  deactivateMonitor: function () {
    if (this.config.relayPIN != false) {
      this.relay.writeSync(this.config.relayOffState);
    }
    else if (this.config.relayPIN == false){
      exec("/opt/vc/bin/tvservice -o", null);
    }
  },

  delayGone: function () {

	return Date.now()-this.lastOnMillies >= this.config.delayMillies;

  },

  checkMovement: function () {
	const self = this;
      //Detected movement
	var value = this.pir.readSync();
        if (value == 1) {
          this.sendSocketNotification("USER_PRESENCE", true);
          if (this.config.powerSaving && !this.turnedOn){
            this.activateMonitor();
            this.turnedOn = true;
          }
	  this.lastOnMillies = Date.now();
         }
        else if (value == 0 && this.delayGone()) {
          this.sendSocketNotification("USER_PRESENCE", false);
          if (this.config.powerSaving){
            this.deactivateMonitor();
	    this.turnedOn= false;
          }
        }
	setTimeout(function (){self.checkMovement()},this.config.checkMillies);
  },

  // Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    if (notification === 'CONFIG' && this.started == false) {
      const self = this;
      this.config = payload;

      //Setup pins
      this.pir = new Gpio(this.config.sensorPIN, 'in', 'both');
      // exec("echo '" + this.config.sensorPIN.toString() + "' > /sys/class/gpio/export", null);
      // exec("echo 'in' > /sys/class/gpio/gpio" + this.config.sensorPIN.toString() + "/direction", null);

      if (this.config.relayPIN) {
        this.relay = new Gpio(this.config.relayPIN, 'out');
        this.relay.writeSync(this.config.relayOnState);
        exec("/opt/vc/bin/tvservice --preferred && sudo chvt 6 && sudo chvt 7", null);
      }

      this.checkMovement();

      this.started = true;

    } else if (notification === 'SCREEN_WAKEUP') {
      this.activateMonitor();
    }
  }

});
