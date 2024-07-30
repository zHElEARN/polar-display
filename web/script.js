var ctxECG = document.getElementById("ecgChart");
var ctxACC = document.getElementById("accChart");
var ecgData = Array.from({ length: 1000 }, () => 0); // 初始化 1000 个数据点
var accXData = Array.from({ length: 1000 }, () => 0);
var accYData = Array.from({ length: 1000 }, () => 0);
var accZData = Array.from({ length: 1000 }, () => 0);
var socket;

var ecgChart = new Chart(ctxECG, {
    type: "line",
    data: {
        labels: ecgData.map((_, index) => index), // 初始化 x 轴标签
        datasets: [
            {
                label: "ECG Signal",
                data: ecgData,
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
                fill: false,
                pointRadius: 0, // 隐藏数据点
                pointHoverRadius: 0, // 鼠标悬停时不显示数据点
            },
        ],
    },
    options: {
        maintainAspectRatio: false,
        animation: false, // 禁用动画
        scales: {
            x: {
                display: false, // 隐藏 x 轴标签
            },
            y: {
                title: { display: true, text: "Voltage (µV)" },
            },
        },
        plugins: {
            legend: { display: false }, // 隐藏图例
        },
    },
});

var accChart = new Chart(ctxACC, {
    type: "line",
    data: {
        labels: accXData.map((_, index) => index), // 初始化 x 轴标签
        datasets: [
            {
                label: "Acc X",
                data: accXData,
                borderColor: "rgba(255, 99, 132, 1)",
                borderWidth: 1,
                fill: false,
                pointRadius: 0, // 隐藏数据点
                pointHoverRadius: 0, // 鼠标悬停时不显示数据点
            },
            {
                label: "Acc Y",
                data: accYData,
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1,
                fill: false,
                pointRadius: 0, // 隐藏数据点
                pointHoverRadius: 0, // 鼠标悬停时不显示数据点
            },
            {
                label: "Acc Z",
                data: accZData,
                borderColor: "rgba(75, 192, 192, 1)",
                borderWidth: 1,
                fill: false,
                pointRadius: 0, // 隐藏数据点
                pointHoverRadius: 0, // 鼠标悬停时不显示数据点
            },
        ],
    },
    options: {
        maintainAspectRatio: false,
        animation: false, // 禁用动画
        scales: {
            x: {
                display: false, // 隐藏 x 轴标签
            },
            y: {
                title: { display: true, text: "Acceleration (mg)" },
            },
        },
    },
});

function updateECGChart(newDataArray) {
    ecgData.push(...newDataArray);
    ecgData = ecgData.slice(-1000); // 保持数据长度，避免图表过于庞大
    ecgChart.data.labels = ecgData.map((_, index) => index); // 更新 x 轴标签
    ecgChart.data.datasets[0].data = ecgData;
    ecgChart.update("none"); // 禁用更新动画
}

function updateACCChart(newDataArray) {
    newDataArray.forEach(([x, y, z]) => {
        accXData.push(x);
        accYData.push(y);
        accZData.push(z);
    });
    accXData = accXData.slice(-1000);
    accYData = accYData.slice(-1000);
    accZData = accZData.slice(-1000);
    accChart.data.labels = accXData.map((_, index) => index); // 更新 x 轴标签
    accChart.data.datasets[0].data = accXData;
    accChart.data.datasets[1].data = accYData;
    accChart.data.datasets[2].data = accZData;
    accChart.update("none"); // 禁用更新动画
}

function connectWebSocket() {
    var wsAddress = document.getElementById("wsAddress").value;
    socket = new WebSocket(wsAddress);

    socket.onopen = function (event) {
        console.log("WebSocket is connected.");
        document.getElementById("wsStatus").textContent = "Status: Connected";

        // 清除先前的 ECG 数据
        ecgData = Array.from({ length: 1000 }, () => 0);
        ecgChart.data.labels = ecgData.map((_, index) => index);
        ecgChart.data.datasets[0].data = ecgData;
        ecgChart.update("none"); // 禁用更新动画

        // 清除先前的加速度数据
        accXData = Array.from({ length: 1000 }, () => 0);
        accYData = Array.from({ length: 1000 }, () => 0);
        accZData = Array.from({ length: 1000 }, () => 0);
        accChart.data.labels = accXData.map((_, index) => index);
        accChart.data.datasets[0].data = accXData;
        accChart.data.datasets[1].data = accYData;
        accChart.data.datasets[2].data = accZData;
        accChart.update("none"); // 禁用更新动画

        // 清除心率数据显示
        document.getElementById("heartrateDisplay").textContent = "Heart Rate: -- bpm";
        document.getElementById("rrIntervalsDisplay").textContent = "RR Intervals: -- ms";
    };

    socket.onmessage = function (event) {
        var message = JSON.parse(event.data);
        if (message.type === "ecg") {
            updateECGChart(message.data.data);
        } else if (message.type === "acc") {
            updateACCChart(message.data.data);
        } else if (message.type === "heartrate") {
            updateHeartRate(message.data);
        }
    };

    socket.onclose = function (event) {
        console.log("WebSocket is closed.");
        document.getElementById("wsStatus").textContent = "Status: Disconnected";
    };

    socket.onerror = function (error) {
        console.log("WebSocket error:", error);
        document.getElementById("wsStatus").textContent = "Status: Error";
    };
}

function disconnectWebSocket() {
    if (socket) {
        socket.close();
        document.getElementById("wsStatus").textContent = "Status: Disconnected";
    }
}

function updateHeartRate(data) {
    var heartrate = data.heartrate;
    var rrIntervals = data.rr_intervals.join(", "); // 将 RR 间隔数组转换为字符串
    document.getElementById("heartrateDisplay").textContent = "Heart Rate: " + heartrate + " bpm";
    document.getElementById("rrIntervalsDisplay").textContent = "RR Intervals: " + rrIntervals + " ms";
}

document.getElementById("connectBtn").addEventListener("click", connectWebSocket);
document.getElementById("disconnectBtn").addEventListener("click", disconnectWebSocket);