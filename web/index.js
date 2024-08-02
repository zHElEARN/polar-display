const {
    SciChartSurface,
    NumericAxis,
    FastLineRenderableSeries,
    XyDataSeries,
    EllipsePointMarker,
    NumberRange,
    CategoryAxis,
    EWatermarkPosition,
    RightAlignedOuterVerticallyStackedAxisLayoutStrategy,
} = SciChart;

const heartRateValue = document.getElementById("ecg");

const WEBSOCKET_URL = "ws://127.0.0.1:8765/";
const POINTS_LOOP = 800;
const GAP_POINTS = 20;
const STEP = 10;

const pointMarkerOptions = {
    width: 0,
    height: 0,
};
const fifoSweepingGap = GAP_POINTS;
const fifoOptions = {
    fifoCapacity: POINTS_LOOP,
    fifoSweeping: true,
    fifoSweepingGap,
};

let ecgCurrentPoint = 0;
let accCurrentPoint = 0;
const pendingECGData = [];
const pendingACCDataX = [];
const pendingACCDataY = [];
const pendingACCDataZ = [];

const getValuesFromData = (currentPoint, dataQueue) => {
    const xArr = [];
    const yArr = [];
    for (let i = 0; i < STEP && dataQueue.length > 0; i++) {
        const data = dataQueue.shift();
        xArr.push(currentPoint++);
        yArr.push(data);
    }
    return { xArr, yArr };
};

const initSciECGChart = async () => {
    const { sciChartSurface, wasmContext } = await SciChartSurface.create("scichart-ecg-root");
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

    const ecgDataSeries = new XyDataSeries(wasmContext, fifoOptions);
    sciChartSurface.renderableSeries.add(
        new FastLineRenderableSeries(wasmContext, {
            yAxisId: yAxisECG.id,
            strokeThickness: 4,
            stroke: "#8A2BE2",
            dataSeries: ecgDataSeries,
            pointMarker: new EllipsePointMarker(wasmContext, pointMarkerOptions),
        })
    );

    const updateData = () => {
        const { xArr, yArr } = getValuesFromData(ecgCurrentPoint, pendingECGData);
        ecgDataSeries.appendRange(xArr, yArr);
        requestAnimationFrame(updateData);
    };
    requestAnimationFrame(updateData);
};

const initSciACCChart = async () => {
    const { sciChartSurface, wasmContext } = await SciChartSurface.create("scichart-acc-root");
    sciChartSurface.watermarkPosition = EWatermarkPosition.ButtonLeft;

    const xAxis = new CategoryAxis(wasmContext, {
        visibleRange: new NumberRange(0, POINTS_LOOP),
        isVisible: false,
    });
    sciChartSurface.xAxes.add(xAxis);

    const yAxisACC = new NumericAxis(wasmContext, {
        id: "yACC",
        visibleRange: new NumberRange(-1500, 1000),
        isVisible: false,
    });
    sciChartSurface.yAxes.add(yAxisACC);

    const accDataSeriesX = new XyDataSeries(wasmContext, fifoOptions);
    const accDataSeriesY = new XyDataSeries(wasmContext, fifoOptions);
    const accDataSeriesZ = new XyDataSeries(wasmContext, fifoOptions);

    sciChartSurface.renderableSeries.add(
        new FastLineRenderableSeries(wasmContext, {
            yAxisId: yAxisACC.id,
            strokeThickness: 4,
            stroke: "#00FFFF",
            dataSeries: accDataSeriesX,
            pointMarker: new EllipsePointMarker(wasmContext, pointMarkerOptions),
        })
    );
    sciChartSurface.renderableSeries.add(
        new FastLineRenderableSeries(wasmContext, {
            yAxisId: yAxisACC.id,
            strokeThickness: 4,
            stroke: "#FFFF00",
            dataSeries: accDataSeriesY,
            pointMarker: new EllipsePointMarker(wasmContext, pointMarkerOptions),
        })
    );
    sciChartSurface.renderableSeries.add(
        new FastLineRenderableSeries(wasmContext, {
            yAxisId: yAxisACC.id,
            strokeThickness: 4,
            stroke: "#FFA500",
            dataSeries: accDataSeriesZ,
            pointMarker: new EllipsePointMarker(wasmContext, pointMarkerOptions),
        })
    );

    const updateData = () => {
        if (pendingACCDataX.length > 0) {
            const { xArr, yArr: accArrX } = getValuesFromData(accCurrentPoint, pendingACCDataX);
            accDataSeriesX.appendRange(xArr, accArrX);
        }
        if (pendingACCDataY.length > 0) {
            const { xArr, yArr: accArrY } = getValuesFromData(accCurrentPoint, pendingACCDataY);
            accDataSeriesY.appendRange(xArr, accArrY);
        }
        if (pendingACCDataZ.length > 0) {
            const { xArr, yArr: accArrZ } = getValuesFromData(accCurrentPoint, pendingACCDataZ);
            accDataSeriesZ.appendRange(xArr, accArrZ);
        }
        requestAnimationFrame(updateData);
    };
    requestAnimationFrame(updateData);
};

initSciECGChart();
initSciACCChart();

const socket = new WebSocket(WEBSOCKET_URL);
socket.onopen = () => {
    console.log("WebSocket connection opened");
};
socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "ecg") {
        const ecgData = message.data.data;
        pendingECGData.push(...ecgData);
    } else if (message.type === "acc") {
        const accData = message.data.data;
        accData.forEach((d) => {
            pendingACCDataX.push(d[0]);
            pendingACCDataY.push(d[1]);
            pendingACCDataZ.push(d[2]);
        });
    } else if (message.type === "heartrate") {
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
