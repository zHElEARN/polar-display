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

const hrValue = document.getElementById("hr-value");
const rriValue = document.getElementById("hr-rri");
const accValueX = document.getElementById("acc-x");
const accValueY = document.getElementById("acc-y");
const accValueZ = document.getElementById("acc-z");

const WEBSOCKET_URL = "ws://127.0.0.1:8765/";
const POINTS_LOOP = 800;
const GAP_POINTS = 15;
const STEP = 3;

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
            stroke: "#00FF00",
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
    sciChartSurface.watermarkPosition = EWatermarkPosition.TopLeft;

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
        // requestAnimationFrame(updateData);
        setTimeout(updateData, 20);
    };
    // requestAnimationFrame(updateData);
    updateData();
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
        accValueX.innerHTML = accData[0][0];
        accValueY.innerHTML = accData[0][1];
        accValueZ.innerHTML = accData[0][2];
        accData.forEach((d) => {
            pendingACCDataX.push(d[0]);
            pendingACCDataY.push(d[1]);
            pendingACCDataZ.push(d[2]);
        });
    } else if (message.type === "heartrate") {
        const hrData = message.data;
        hrValue.innerHTML = hrData.heartrate;
        if (hrData.rr_intervals.length === 0) {
            rriValue.innerText = "-- ms";
        } else {
            rriValue.innerHTML = hrData.rr_intervals.join(", ") + " ms";
        }
    }
};
socket.onclose = () => {
    console.log("WebSocket connection closed");
};
socket.onerror = (error) => {
    console.log("WebSocket error: ", error);
};
