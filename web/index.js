const {
    SciChartSurface,
    NumericAxis,
    FastLineRenderableSeries,
    XyDataSeries,
    EllipsePointMarker,
    SciChartJsNavyTheme,
    SciChartJSLightTheme,
    SciChartJSDarkv2Theme,
    NumberRange,
    CategoryAxis,
} = SciChart;

const WEBSOCKET_URL = "ws://127.0.0.1:8765/";

let currentPoint = 0;
const POINTS_LOOP = 800;
const GAP_POINTS = 30;
const STEP = 10;
const REFRESH_INTERVAL = 1000 / 130 * STEP;

const pendingData = [];
let lastUpdateTime = performance.now();
const updateInterval = 1000 / 130;

const getValuesFromData = () => {
    const xArr = [];
    const ecgArr = [];
    for (let i = 0; i < STEP && pendingData.length > 0; i++) {
        const data = pendingData.shift();
        xArr.push(currentPoint++);
        ecgArr.push(data);
    }
    return {
        xArr,
        ecgArr,
    };
};

const initSciChart = async () => {
    const { sciChartSurface, wasmContext } = await SciChartSurface.create("scichart-root", {
        theme: new SciChartJSDarkv2Theme(),
    });

    const xAxis = new CategoryAxis(wasmContext, {
        visibleRange: new NumberRange(0, POINTS_LOOP),
        isVisible: false,
    });
    sciChartSurface.xAxes.add(xAxis);

    const yAxisECG = new NumericAxis(wasmContext, {
        id: "yECG",
        visibleRange: new NumberRange(-1000, 2000),
        isVisible: true,
    });
    sciChartSurface.yAxes.add(yAxisECG);

    const pointMarkerOptions = {
        width: 7,
        height: 7,
        strokeThickness: 2,
        fill: "#83d2f5",
        lastPointOnly: true,
    };
    const fifoSweepingGap = GAP_POINTS;
    const ecgDataSeries = new XyDataSeries(wasmContext, {
        fifoCapacity: POINTS_LOOP,
        fifoSweeping: true,
        fifoSweepingGap,
    });

    sciChartSurface.renderableSeries.add(
        new FastLineRenderableSeries(wasmContext, {
            yAxisId: yAxisECG.id,
            strokeThickness: 4,
            stroke: "#f2f195",
            dataSeries: ecgDataSeries,
            pointMarker: new EllipsePointMarker(wasmContext, { ...pointMarkerOptions, stroke: "#f2f195" }),
        })
    );

    const socket = new WebSocket(WEBSOCKET_URL);

    socket.onopen = () => {
        console.log("WebSocket connection opened");
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "ecg") {
            const ecgData = message.data.data;
            pendingData.push(...ecgData);
        }
    };

    socket.onclose = () => {
        console.log("WebSocket connection closed");
    };

    socket.onerror = (error) => {
        console.log("WebSocket error: ", error);
    };

    const updateData = () => {
        const now = performance.now();
        if (now - lastUpdateTime >= updateInterval && pendingData.length > 0) {
            const { xArr, ecgArr } = getValuesFromData();
            ecgDataSeries.appendRange(xArr, ecgArr);
            lastUpdateTime = now;
        }
        requestAnimationFrame(updateData);
    };

    requestAnimationFrame(updateData);
};

initSciChart();
