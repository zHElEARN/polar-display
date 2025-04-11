/**
 * 初始化Canvas元素
 * @param {HTMLCanvasElement} canvas - Canvas元素
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {boolean} clear - 是否清除画布
 * @param {Function} callback - 回调函数
 * @param {Function} resetCallback - 重置回调函数
 */
function initializeCanvas(
  canvas,
  ctx,
  width,
  height,
  clear = false,
  callback = null,
  resetCallback = null
) {
  // 设置canvas的实际大小为其显示大小的2倍，以提高清晰度
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // 缩放绘图上下文以匹配分辨率
  ctx.scale(dpr, dpr);

  if (clear) {
    ctx.clearRect(0, 0, width, height);
  }

  if (resetCallback) {
    resetCallback();
  }

  if (callback) {
    callback();
  }
}

/**
 * 将数据值缩放到Canvas的y坐标
 * @param {number} value - 数据值
 * @param {number} height - Canvas高度
 * @param {number} min - 最小数据值
 * @param {number} max - 最大数据值
 * @returns {number} - 缩放后的y坐标
 */
function scaleY(value, height, min, max) {
  const range = max - min;
  const scaledValue = (value - min) / range;
  return height - scaledValue * height;
}

/**
 * 绘制背景和单位
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @param {number} dataMin - 数据最小值
 * @param {number} dataMax - 数据最大值
 * @param {string} unit - 单位
 */
function drawBackground(ctx, width, height, dataMin, dataMax, unit) {
  // 清除背景
  ctx.clearRect(0, 0, width, height);

  // 绘制最大值和最小值标签
  ctx.fillStyle = "#999";
  ctx.font = "10px Arial";
  ctx.textAlign = "left";

  // 最大值标签(顶部)
  ctx.fillText(`${dataMax}`, 5, 12);

  // 最小值标签(底部)
  ctx.fillText(`${dataMin}`, 5, height - 5);

  // 中间值
  const middleValue = Math.round((dataMax + dataMin) / 2);
  const middleY = height / 2;
  ctx.fillText(`${middleValue}`, 5, middleY);
}
