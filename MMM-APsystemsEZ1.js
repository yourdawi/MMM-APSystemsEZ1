Module.register("MMM-APsystemsEZ1", {
    // Default configuration
    defaults: {
        inverterIp: "192.168.1.100",
        inverterPort: 8050,

        // Solar Forecast Config
        lat: 50.0,
        lon: 10.0,
        declination: 30, // 0 = Flat, 90 = Vertical
        azimuth: 0, // 0 = South, -90 = East, 90 = West
        kwp: 0.8, // 800 Watt

        // Update intervals
        updateInterval: 30 * 1000, // 30 seconds for local inverter
        forecastInterval: 60 * 60 * 1000, // 1 hour for forecast

        // Display options
        showIndividualPanels: true, // Show P1 and P2 separately
        language: "de", // "de" or "en"
    },

    getStyles: function () {
        return ["MMM-APsystemsEZ1.css", "font-awesome.css"];
    },



    start: function () {
        Log.info("Starting module: " + this.name);
        this.inverterData = null;
        this.forecastData = null;

        // Send config to node_helper
        this.sendSocketNotification("CONFIG", this.config);
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "INVERTER_DATA") {
            this.inverterData = payload;
            this.updateDom(0);
        }
        if (notification === "FORECAST_DATA") {
            this.forecastData = payload;
            this.updateDom(0);
        }
    },

    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.className = "apsystems-wrapper";

        var isDe = this.config.language !== "en";
        var txtLoading = isDe ? "Lade Inverter Daten..." : "Loading Inverter Data...";

        if (!this.inverterData) {
            wrapper.innerHTML = txtLoading;
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        var txtTitle = isDe ? "Balkonkraftwerk" : "Balcony Power Plant";
        var txtToday = isDe ? "Heute:" : "Today:";
        var txtExpected = isDe ? "erwartet" : "expected";

        // --- Container for live data ---
        var liveDataContainer = document.createElement("div");
        liveDataContainer.className = "live-data-container";

        // Calculate total power
        var p1 = this.inverterData.p1 || 0;
        var p2 = this.inverterData.p2 || 0;
        var totalPower = p1 + p2;

        var e1 = this.inverterData.e1 || 0;
        var e2 = this.inverterData.e2 || 0;
        var totalEnergy = e1 + e2; // in kWh

        // Header
        var header = document.createElement("div");
        header.className = "aps-header medium bright";
        header.innerHTML = '<i class="fas fa-solar-panel"></i> ' + txtTitle;
        wrapper.appendChild(header);

        // Power row
        var powerRow = document.createElement("div");
        powerRow.className = "power-row large bright";

        // Animation when power is flowing
        var sunIcon = totalPower > 0 ? '<i class="fas fa-sun sun-active"></i>' : '<i class="fas fa-moon dimmed"></i>';
        powerRow.innerHTML = `${sunIcon} ${Math.round(totalPower)} W`;
        liveDataContainer.appendChild(powerRow);

        // Individual panels if enabled
        if (this.config.showIndividualPanels) {
            var panelsRow = document.createElement("div");
            panelsRow.className = "panels-row small normal";
            panelsRow.innerHTML = `
                <div class="panel-box"><i class="fas fa-arrow-down"></i> L: ${Math.round(p1)} W</div>
                <div class="panel-box">R: ${Math.round(p2)} W <i class="fas fa-arrow-up"></i></div>
            `;
            liveDataContainer.appendChild(panelsRow);
        }

        // Daily energy (Inverter + Forecast)
        var energyRow = document.createElement("div");
        energyRow.className = "energy-row small";

        var expectedEnergy = "";
        if (this.forecastData && this.forecastData.watt_hours_day) {
            var today = new Date().toISOString().split('T')[0];
            var expectedWh = this.forecastData.watt_hours_day[today] || 0;
            var expectedKwh = (expectedWh / 1000).toFixed(2);
            expectedEnergy = ` <span class="dimmed">/ ${expectedKwh} kWh ${txtExpected}</span>`;
        }

        energyRow.innerHTML = `<i class="fas fa-chart-bar"></i> ${txtToday} <span class="bright">${totalEnergy.toFixed(2)} kWh</span>${expectedEnergy}`;
        liveDataContainer.appendChild(energyRow);

        wrapper.appendChild(liveDataContainer);


        return wrapper;
    }
});
