const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper for: " + this.name);
        this.config = null;
        this.forecastData = null;
        this.inverterData = null;
        
        this.inverterTimer = null;
        this.forecastTimer = null;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;
            this.startFetching();
        }
    },

    startFetching: function() {
        // Initial fetches
        this.fetchInverterData();
        this.fetchForecastData();

        // Set up timers
        if(!this.inverterTimer) {
            this.inverterTimer = setInterval(() => {
                this.fetchInverterData();
            }, this.config.updateInterval);
        }

        if(!this.forecastTimer) {
            this.forecastTimer = setInterval(() => {
                this.fetchForecastData();
            }, this.config.forecastInterval);
        }
    },

    fetchInverterData: async function() {
        if (!this.config.inverterIp) return;
        
        try {
            const response = await fetch(`http://${this.config.inverterIp}:${this.config.inverterPort}/getOutputData`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.data) {
                    this.inverterData = data.data;
                    this.sendSocketNotification("INVERTER_DATA", this.inverterData);
                }
            } else {
                console.error("[MMM-APsystemsEZ1] Inverter API Error:", response.statusText);
            }
        } catch (error) {
            console.error("[MMM-APsystemsEZ1] Error fetching inverter data:", error.message);
        }
    },

    fetchForecastData: async function() {
        if (!this.config.lat || !this.config.lon) return;

        // URL for forecast.solar
        const url = `https://api.forecast.solar/estimate/${this.config.lat}/${this.config.lon}/${this.config.declination}/${this.config.azimuth}/${this.config.kwp}`;
        
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { "Accept": "application/json" }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.result) {
                    this.forecastData = data.result;
                    this.sendSocketNotification("FORECAST_DATA", this.forecastData);
                }
            } else {
                console.error("[MMM-APsystemsEZ1] Forecast API Error:", response.statusText);
            }
        } catch (error) {
            console.error("[MMM-APsystemsEZ1] Error fetching forecast data:", error.message);
        }
    }
});
