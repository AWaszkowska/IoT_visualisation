/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
$(document).ready(() => {
  // if deployed to a site supporting SSL, use wss://
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  // A class for holding the last N points of telemetry for a device
  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.timeData = new Array(this.maxLen);
      this.temperatureData = new Array(this.maxLen);
      this.humidityData = new Array(this.maxLen);
      this.temperatureData2 = new Array(this.maxLen);
      this.humidityData2 = new Array(this.maxLen);

    }

    addData(time, temperature, humidity, temperature2, humidity2) {
      this.timeData.push(time);
      this.temperatureData.push(temperature);
      // this.humidityData.push(humidity || null);
      this.humidityData.push(humidity);
      this.temperatureData2.push(temperature2);
      // this.humidityData2.push(humidity2 || null);
      this.humidityData2.push(humidity2);

      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.temperatureData.shift();
        this.humidityData.shift();
        this.temperatureData2.shift();
        this.humidityData2.shift();
      }

    }

    calculateAverageTemperature() {
      if (this.temperatureData.length === 0) {
        return 0;
      }
      const sumTemperature = this.temperatureData.reduce((sum, temperature) => sum + temperature, 0);
      return sumTemperature / this.temperatureData.length;
    }
    calculateAverageHum() {
      if (this.humidityData.length === 0) {
        return 0;
      }
      const sumHum = this.humidityData.reduce((sum, humidity) => sum + humidity, 0);
      return sumHum / this.humidityData.length;
    }
    calculateAverageTemperature2() {
      if (this.temperatureData2.length === 0) {
        return 0;
      }
      const sumTemperature = this.temperatureData2.reduce((sum, temperature) => sum + temperature, 0);
      return sumTemperature / this.temperatureData2.length;
    }
    calculateAverageHum2() {
      if (this.humidityData2.length === 0) {
        return 0;
      }
      const sumHum = this.humidityData2.reduce((sum, humidity) => sum + humidity, 0);
      return sumHum / this.humidityData2.length;
    }

  }

  // All the devices in the list (those that have been sending telemetry)
  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    // Find a device based on its Id
    findDevice(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i];
        }
      }

      return undefined;
    }

    getDevicesCount() {
      return this.devices.length;
    }
  }

  const trackedDevices = new TrackedDevices();

  // Define the chart axes
  const chartData = {
    datasets: [
      {
        fill: false,
        label: 'Temperature',
        yAxisID: 'Temperature',
        borderColor: 'rgba(255, 204, 0, 1)',
        pointBoarderColor: 'rgba(255, 204, 0, 1)',
        backgroundColor: 'rgba(255, 204, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'Humidity',
        yAxisID: 'Humidity',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBoarderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
      }
    ]
  };

  const chartData2 = {
    datasets: [
      {
        fill: false,
        label: 'Temperature',
        yAxisID: 'Temperature',
        borderColor: 'rgba(255, 204, 0, 1)',
        pointBoarderColor: 'rgba(255, 204, 0, 1)',
        backgroundColor: 'rgba(255, 204, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'Humidity',
        yAxisID: 'Humidity',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBoarderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
      }
    ]
  };

  const chartOptions = {
    scales: {
      yAxes: [{
        id: 'Temperature',
        type: 'linear',
        scaleLabel: {
          labelString: 'Temperature (ºC)',
          display: true,
        },
        position: 'left',
        ticks: {
          suggestedMin: 0,
          suggestedMax: 100,
          beginAtZero: true
        }
      },
      {
        id: 'Humidity',
        type: 'linear',
        scaleLabel: {
          labelString: 'Humidity (%)',
          display: true,
        },
        position: 'right',
        ticks: {
          suggestedMin: 0,
          suggestedMax: 100,
          beginAtZero: true
        }
      }]
    }
  };

  // Get the context of the canvas element we want to select
  const ctx = document.getElementById('iotChart').getContext('2d');
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

    const ctx2 = document.getElementById('iotChart2').getContext('2d');
    const myLineChart2 = new Chart(
      ctx2,
      {
        type: 'line',
        data: chartData2,
        options: chartOptions,
      });

  // Manage a list of devices in the UI, and update which device data the chart is showing
  // based on selection
  let needsAutoSelect = true;
  const deviceCount = document.getElementById('deviceCount');
  const listOfDevices = document.getElementById('listOfDevices');
  function OnSelectionChange() {
    const device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.temperatureData;
    chartData.datasets[1].data = device.humidityData;
    myLineChart.update();
    chartData2.labels = device.timeData;
    chartData2.datasets[0].data = device.temperatureData2;
    chartData2.datasets[1].data = device.humidityData2;
    myLineChart2.update();
  }
  listOfDevices.addEventListener('change', OnSelectionChange, false);

  // When a web socket message arrives:
  // 1. Unpack it
  // 2. Validate it has date/time and temperature
  // 3. Find or create a cached device to hold the telemetry data
  // 4. Append the telemetry data
  // 5. Update the chart UI
  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      console.log(messageData);

      const iotData = JSON.parse(messageData.IotData);
      // time and either temperature or humidity are required
      // if (!messageData.MessageDate || (!messageData.IotData.temperature && !messageData.IotData.humidity)) 
      if (!messageData.MessageDate || (!iotData["Temperature_1"] && !iotData["Humidity_1"]))
      {
        // const iotData = JSON.parse(messageData.IotData);
        // const temperature = iotData["Temperature"];

        // console.log(temperature);
        console.log('nie ma');
        return;
      }
      // else{
      //   const iotData = JSON.parse(messageData.IotData);
      //   const temperature = iotData["Temperature"];

      //   console.log(temperature);
      //   return;
      // }

      // find or add device to list of tracked devices
      const existingDeviceData = trackedDevices.findDevice(messageData.DeviceId);

      if (existingDeviceData) {
        console.log('siedzi');
        temp = iotData["Temperature_1"];
        hum = iotData["Humidity_1"];
        temp2 = iotData["Temperature_2"];
        hum2 = iotData["Humidity_2"];
        // existingDeviceData.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity);
        existingDeviceData.addData(messageData.MessageDate, temp, hum, temp2, hum2);
        const averageTemperature = existingDeviceData.calculateAverageTemperature();
        const averageHum = existingDeviceData.calculateAverageHum();
        const averageTemperature2 = existingDeviceData.calculateAverageTemperature2();
        const averageHum2 = existingDeviceData.calculateAverageHum2();
        console.log(averageTemperature);

        if (iotData["Temperature_1"] > 30) {
          const alarmDiv = document.querySelector('.alarm');
          alarmDiv.style.backgroundColor = 'red';
        } else {
          const alarmDiv = document.querySelector('.alarm');
          alarmDiv.style.backgroundColor = 'white';
        }

        if (iotData["Temperature_2"] > 20) {
          const alarmDiv = document.querySelector('.alarm2');
          alarmDiv.style.backgroundColor = 'red';
        } else {
          const alarmDiv = document.querySelector('.alarm2');
          alarmDiv.style.backgroundColor = 'white';
        }

        if (iotData["Humidity_1"] > 80) {
          const alarmDiv = document.querySelector('.alarm');
          alarmDiv.style.backgroundColor = 'red';
        } else {
          const alarmDiv = document.querySelector('.alarm');
          alarmDiv.style.backgroundColor = 'white';
        }

        if (iotData["Humidity_2"] > 70) {
          const alarmDiv = document.querySelector('.alarm2');
          alarmDiv.style.backgroundColor = 'red';
        } else {
          const alarmDiv = document.querySelector('.alarm2');
          alarmDiv.style.backgroundColor = 'white';
        }


        // that's for html
        if (!isNaN(averageTemperature)) {
          // Update the HTML element with the average temperature
          const averageTemperatureElement = document.getElementById('averageTemperature');
          if (averageTemperatureElement) {
            averageTemperatureElement.innerText = `Average Temperature: ${averageTemperature} °C`;
          }
        }
        if (!isNaN(averageHum)) {
          // Update the HTML element with the average temperature
          const averageHumElement = document.getElementById('averageHum');
          if (averageHumElement) {
            averageHumElement.innerText = `Average Humidity: ${averageHum} %`;
          }
        }
        if (!isNaN(averageTemperature2)) {
          // Update the HTML element with the average temperature
          const averageTemperatureElement2 = document.getElementById('averageTemperature2');
          if (averageTemperatureElement2) {
            averageTemperatureElement2.innerText = `Average Temperature: ${averageTemperature2} °C`;
          }
        }
        if (!isNaN(averageHum2)) {
          // Update the HTML element with the average temperature
          const averageHumElement2 = document.getElementById('averageHum2');
          if (averageHumElement2) {
            averageHumElement2.innerText = `Average Humidity: ${averageHum2} %`;
          }
        }

      } else {
        console.log('nie tym razem');
        const newDeviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(newDeviceData);
        const numDevices = trackedDevices.getDevicesCount();
        deviceCount.innerText = numDevices === 1 ? `${numDevices} device` : `${numDevices} devices`;
        newDeviceData.addData(messageData.MessageDate, messageData.IotData.temperature, messageData.IotData.humidity);
        

        // add device to the UI list
        const node = document.createElement('option');
        const nodeText = document.createTextNode(messageData.DeviceId);
        node.appendChild(nodeText);
        listOfDevices.appendChild(node);

        // if this is the first device being discovered, auto-select it
        if (needsAutoSelect) {
          needsAutoSelect = true; //
          listOfDevices.selectedIndex = 0;
          OnSelectionChange();
        }
      }

      myLineChart.update();
      myLineChart2.update();

      

    } catch (err) {
      console.error(err);
    }
  };
});
