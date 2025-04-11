/**
 * 监测图表基类
 */
class MonitorChart {
  /**
   * @param {HTMLElement} container - 图表容器
   * @param {Array} data - 初始数据
   * @param {number} height - 图表高度
   * @param {number} dataMin - 数据最小值
   * @param {number} dataMax - 数据最大值
   * @param {number} dataSampleRate - 数据采样率
   * @param {string} unit - 单位
   * @param {string[]} lineColors - 线条颜色
   * @param {number} xScale - x轴缩放
   * @param {number} eraseWidth - 擦除宽度
   * @param {Function} extractValues - 提取数据值的函数
   */
  constructor(
    container,
    data,
    height,
    dataMin,
    dataMax,
    dataSampleRate,
    unit,
    lineColors,
    xScale,
    eraseWidth,
    extractValues
  ) {
    this.container = container;
    this.data = data;
    this.height = height;
    this.adjustedHeight = height + 1;
    this.dataMin = dataMin;
    this.dataMax = dataMax;
    this.dataSampleRate = dataSampleRate;
    this.unit = unit;
    this.lineColors = lineColors;
    this.xScale = xScale;
    this.eraseWidth = eraseWidth;
    this.extractValues = extractValues;

    // 引用
    this.drawPosition = 0;
    this.dataIndex = 0;
    this.lastPoints = null;
    this.width = 0;
    this.accumulatedPoints = 0;
    this.lastTimestamp = null;
    this.animationFrameId = null;

    // 创建Canvas元素
    this.createCanvases();

    // 初始化图表
    this.initialize();
  }

  /**
   * 创建Canvas元素
   */
  createCanvases() {
    // 创建背景Canvas
    this.backgroundCanvas = document.createElement("canvas");
    this.backgroundCanvas.style.position = "absolute";
    this.backgroundCanvas.style.top = "0";
    this.backgroundCanvas.style.left = "0";
    this.backgroundCanvas.style.zIndex = "0";
    this.backgroundCanvas.style.width = "100%";
    this.backgroundCanvas.style.height = `${this.adjustedHeight}px`;

    // 创建前景Canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "1";
    this.canvas.style.width = "100%";
    this.canvas.style.height = `${this.adjustedHeight}px`;

    // 添加到容器中
    this.container.style.position = "relative";
    this.container.style.width = "100%";
    this.container.style.height = `${this.adjustedHeight}px`;
    this.container.appendChild(this.backgroundCanvas);
    this.container.appendChild(this.canvas);

    // 获取Canvas上下文
    this.ctx = this.canvas.getContext("2d");
    this.bgCtx = this.backgroundCanvas.getContext("2d");
  }

  /**
   * 重置引用
   */
  resetRefs() {
    this.drawPosition = 0;
    this.dataIndex = 0;
    this.lastPoints = null;
  }

  /**
   * 更新数据
   * @param {Array} newData - 新数据
   */
  updateData(newData) {
    this.data = newData;
    this.dataIndex = 0;
  }

  /**
   * 更新图表高度
   * @param {number} height - 新的图表高度
   */
  updateHeight(height) {
    this.height = height;
    this.adjustedHeight = height + 1;

    // 更新Canvas元素样式
    this.backgroundCanvas.style.height = `${this.adjustedHeight}px`;
    this.canvas.style.height = `${this.adjustedHeight}px`;
    this.container.style.height = `${this.adjustedHeight}px`;

    // 重新初始化图表
    this.initialize();
  }

  /**
   * 初始化图表
   */
  initialize() {
    // 获取canvas的显示尺寸
    this.width = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;

    // 初始化Canvas
    initializeCanvas(
      this.canvas,
      this.ctx,
      this.width,
      canvasHeight,
      false,
      undefined,
      () => this.resetRefs()
    );

    initializeCanvas(
      this.backgroundCanvas,
      this.bgCtx,
      this.width,
      canvasHeight,
      true,
      () =>
        drawBackground(
          this.bgCtx,
          this.width,
          canvasHeight,
          this.dataMin,
          this.dataMax,
          this.unit,
          500
        )
    );

    // 监听容器大小变化
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.container) {
          this.width = this.canvas.clientWidth;
          const newHeight = this.canvas.clientHeight;

          initializeCanvas(
            this.canvas,
            this.ctx,
            this.width,
            newHeight,
            false,
            undefined,
            () => this.resetRefs()
          );

          initializeCanvas(
            this.backgroundCanvas,
            this.bgCtx,
            this.width,
            newHeight,
            true,
            () =>
              drawBackground(
                this.bgCtx,
                this.width,
                newHeight,
                this.dataMin,
                this.dataMax,
                this.unit,
                500
              )
          );
        }
      }
    });

    this.resizeObserver.observe(this.container);

    // 启动绘制
    this.startDrawing();
  }

  /**
   * 开始绘制
   */
  startDrawing() {
    // 停止之前的动画
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const draw = (timestamp) => {
      if (this.dataIndex >= this.data.length) {
        this.animationFrameId = requestAnimationFrame(draw);
        return;
      }

      if (this.lastTimestamp === null) {
        this.lastTimestamp = timestamp;
      }

      let deltaTime = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;

      if (deltaTime > 40) {
        deltaTime = 40; // 限制deltaTime，防止帧率过低时绘制过多点
      }

      const fps = 1000 / deltaTime;
      this.accumulatedPoints += this.dataSampleRate / fps;
      const pointsToDraw = Math.floor(this.accumulatedPoints);
      this.accumulatedPoints -= pointsToDraw;

      for (let i = 0; i < pointsToDraw; i++) {
        if (this.dataIndex >= this.data.length) {
          break;
        }

        const x = (this.drawPosition * this.xScale) % this.width;

        // 检测X坐标是否发生回绕
        const isWrapped = this.lastPoints && x < this.lastPoints[0].x;

        // 计算擦除区域的起始和结束位置
        const eraseStart = (x + 1) % this.width;
        const eraseEnd = (x + this.eraseWidth) % this.width;

        if (eraseEnd > eraseStart) {
          this.ctx.clearRect(
            eraseStart,
            0,
            eraseEnd - eraseStart,
            this.adjustedHeight
          );
        } else {
          this.ctx.clearRect(
            eraseStart,
            0,
            this.width - eraseStart,
            this.adjustedHeight
          );
          this.ctx.clearRect(0, 0, eraseEnd, this.adjustedHeight);
        }

        // 获取当前数据点的值数组
        const values = this.extractValues(this.data[this.dataIndex]);

        // 初始化上一点坐标
        if (!this.lastPoints) {
          this.lastPoints = values.map((value) => ({
            x,
            y: scaleY(value, this.adjustedHeight, this.dataMin, this.dataMax),
          }));
        }

        values.forEach((value, idx) => {
          // 限制value在dataMin和dataMax之间
          const clampedValue = Math.max(
            this.dataMin,
            Math.min(this.dataMax, value)
          );
          const y = scaleY(
            clampedValue,
            this.adjustedHeight,
            this.dataMin,
            this.dataMax
          );

          this.ctx.beginPath();
          if (this.lastPoints && !isWrapped) {
            this.ctx.moveTo(this.lastPoints[idx].x, this.lastPoints[idx].y);
          } else {
            this.ctx.moveTo(x, y);
          }
          this.ctx.lineTo(x, y);
          this.ctx.strokeStyle = this.lineColors[idx];
          this.ctx.lineWidth = 2;
          this.ctx.stroke();

          this.lastPoints[idx] = { x, y };
        });

        // 更新绘制位置和数据索引
        this.drawPosition += 1;
        this.dataIndex += 1;
      }

      // 请求下一帧
      this.animationFrameId = requestAnimationFrame(draw);
    };

    // 开始绘制
    this.animationFrameId = requestAnimationFrame(draw);
  }

  /**
   * 销毁图表
   */
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}

/**
 * ECG图表
 */
class ECGChart {
  /**
   * @param {HTMLElement} container - 图表容器
   * @param {number[]} data - 初始数据
   * @param {number} height - 图表高度
   */
  constructor(container, data, height) {
    // 提取数据值的函数
    const extractValues = (dataPoint) => [dataPoint];

    // 创建监测图表
    this.chart = new MonitorChart(
      container,
      data,
      height,
      -1000,
      2000,
      130, // dataSampleRate
      "μV", // unit
      ["#00e676"], // lineColors
      1.3, // xScale
      15, // eraseWidth
      extractValues
    );
  }

  /**
   * 更新数据
   * @param {number[]} data - 新数据
   */
  updateData(data) {
    this.chart.updateData(data);
  }

  /**
   * 销毁图表
   */
  destroy() {
    this.chart.destroy();
  }
}

/**
 * 加速度图表
 */
class ACCChart {
  /**
   * @param {HTMLElement} container - 图表容器
   * @param {{ x: number, y: number, z: number }[]} data - 初始数据
   * @param {number} height - 图表高度
   * @param {number} dataSampleRate - 数据采样率
   * @param {number} xScale - x轴缩放
   */
  constructor(container, data, height, dataSampleRate, xScale) {
    // 提取数据值的函数
    const extractValues = (dataPoint) => [
      dataPoint.x,
      dataPoint.y,
      dataPoint.z,
    ];

    // 创建监测图表 - 使用更好看的配色
    this.chart = new MonitorChart(
      container,
      data,
      height,
      -1500, // dataMin
      1500, // dataMax
      dataSampleRate,
      "mG", // unit
      ["#ff9e80", "#80d8ff", "#b388ff"], // 橙色、浅蓝色、紫色 - 更现代化的配色
      xScale,
      10, // eraseWidth
      extractValues
    );
  }

  /**
   * 更新数据
   * @param {{ x: number, y: number, z: number }[]} data - 新数据
   */
  updateData(data) {
    this.chart.updateData(data);
  }

  /**
   * 销毁图表
   */
  destroy() {
    this.chart.destroy();
  }
}
