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
    EWatermarkPosition
} = SciChart;

const heartRateValue = document.getElementsByClassName("value")[0];

const WEBSOCKET_URL = "ws://127.0.0.1:8765/";

let currentPoint = 0;
const POINTS_LOOP = 800;
const GAP_POINTS = 20;
const STEP = 10;

const pendingData = [];

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

    sciChartSurface.watermarkPosition = EWatermarkPosition.TopLeft;

    const xAxis = new CategoryAxis(wasmContext, {
        visibleRange: new NumberRange(0, POINTS_LOOP),
        isVisible: false,
    });
    sciChartSurface.xAxes.add(xAxis);

    const yAxisECG = new NumericAxis(wasmContext, {
        id: "yECG",
        visibleRange: new NumberRange(-1000, 2000),
        isVisible: false,
    });
    sciChartSurface.yAxes.add(yAxisECG);

    const pointMarkerOptions = {
        width: 7,
        height: 7,
        strokeThickness: 2,
        fill: "#00FF00",
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
            stroke: "#00FF00",
            dataSeries: ecgDataSeries,
            pointMarker: new EllipsePointMarker(wasmContext, { ...pointMarkerOptions, stroke: "#00FF00" }),
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
        else if (message.type === "heartrate") {
            const heartrate = message.data.heartrate;
            heartRateValue.innerHTML = heartrate;
        }
    };

    socket.onclose = () => {
        console.log("WebSocket connection closed");
    };

    socket.onerror = (error) => {
        console.log("WebSocket error: ", error);
    };

    const updateData = () => {
        const { xArr, ecgArr } = getValuesFromData();
        ecgDataSeries.appendRange(xArr, ecgArr);
        requestAnimationFrame(updateData);
    };

    requestAnimationFrame(updateData);
};

initSciChart();
