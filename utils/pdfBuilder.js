/**
 * PDF 构建模块 - APP 端逻辑层
 * 
 * 【架构】布局计算全部委托给 layoutCalc.js（唯一真相来源）
 * 本文件只负责：接收布局参数 → 转换为 pt 单位 → 调用 jsPDF 绘制
 * 
 * 保证：预览页 / 保存PDF / 打印PDF 三者 100% 一致
 */

// 直接导入字体 base64（13KB，打包后内联到 JS 中，无网络请求，100%可靠）
// 统一使用 require（CommonJS），避免 ESM/CJS 混用导致 H5 Vite 编译异常
var FONT_BASE64 = require('./fontData.js');
var calcHorizontalLayout = require('./layoutCalc.js').calcHorizontalLayout;
var calcVerticalLayout = require('./layoutCalc.js').calcVerticalLayout;

var MM2PT = 2.83465;
var A4_W_PT = 210 * MM2PT;  // 595.28
var A4_H_PT = 297 * MM2PT;  // 841.89

/**
 * 获取字体 base64（同步返回，已内联）
 */
function getFontBase64() {
  return FONT_BASE64 || '';
}

/**
 * 设置等宽字体（courier bold），用于算式数字
 * 回退链：courier bold → courier normal → helvetica bold
 * 绝不回退到 NotoSansSC（比例字体，会导致不等宽）
 */
function _setMonoFont(doc) {
  try {
    doc.setFont('courier', 'bold');
    if (doc.getFont().fontName === 'courier') return;
  } catch (e) {}
  try {
    doc.setFont('courier', 'normal');
    if (doc.getFont().fontName === 'courier') return;
  } catch (e) {}
  try { doc.setFont('helvetica', 'bold'); } catch (e) {}
}

/**
 * 设置中文字体（用于页眉/页码）
 */
function _setFont(doc) {
  doc.setFont('NotoSansSC', 'normal');
}

/**
 * 构建PDF，返回 data URI 字符串
 * @param {Object} JsPDF - jsPDF 构造函数
 * @param {Array} problems - 题目数组
 * @param {String} format - 'horizontal' 或 'vertical'
 * @param {Boolean} showAnswers - 是否显示答案
 * @param {Number} perPage - 每页题数
 * @param {String} fontBase64 - 字体 base64
 * @returns {String} data URI
 */
function buildPDF(JsPDF, problems, format, showAnswers, perPage, fontBase64) {
  var totalPages = Math.ceil(problems.length / perPage);
  var doc = new JsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // 注册中文字体
  if (fontBase64) {
    try {
      doc.addFileToVFS('NotoSansSC-Math.ttf', fontBase64);
      doc.addFont('NotoSansSC-Math.ttf', 'NotoSansSC', 'normal', 'normal');
    } catch (e) { 
      console.error('[pdfBuilder] font register failed:', e); 
    }
  }

  for (var page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();
    var pageProblems = problems.slice(page * perPage, (page + 1) * perPage);

    // 调用共享布局模块计算（与预览页完全相同的算法）
    var L = (format === 'vertical')
      ? calcVerticalLayout(pageProblems, showAnswers)
      : calcHorizontalLayout(pageProblems, showAnswers);

    if (!L) continue;

    // mm → pt 转换系数
    var padLR_pt = L.padLR * MM2PT;

    // ——— 页眉：姓名 + 日期 ———
    // 页眉区域总高 HEADER_H（含上页边距），文字居中于页眉区域内
    // 页眉基线Y = 上页边距 + (页眉区域净高 / 2) + 字号×0.35（基线偏移）
    // 净高 = HEADER_H - padTBTop
    var padTBTop_pt = (L.padTBTop || 15) * MM2PT;
    var headerNetH_pt = L.headerH * MM2PT - padTBTop_pt;
    var headerFont_pt = L.headerFontPt;  // 直接使用 pt 值
    var headerBaseY = padTBTop_pt + headerNetH_pt / 2 + headerFont_pt * 0.35;
    doc.setFontSize(headerFont_pt);
    _setFont(doc);  // 页眉是中文，用 NotoSansSC
    doc.setTextColor(0, 0, 0);
    // letter-spacing 0.3mm
    var headerSpacing = 0.3 * MM2PT;
    // 姓名/日期居中分布，间隔 21.15mm（≈80rpx）
    var headerGap_mm = 80 / 3.78;
    var centerX = A4_W_PT / 2;
    var headerGap_pt = headerGap_mm * MM2PT;
    doc.text('\u59d3\u540d\uff1a____________', centerX - headerGap_pt / 2, headerBaseY, { align: 'right', charSpace: headerSpacing });
    doc.text('\u65e5\u671f\uff1a_________\u5e74____\u6708____\u65e5', centerX + headerGap_pt / 2, headerBaseY, { align: 'left', charSpace: headerSpacing });

    // ——— 分隔线 ———
    // 分隔线位于页眉区域底部 + DIVIDER_GAP_TO_HEADER 间距
    var dividerY = L.headerH * MM2PT + (L.dividerGapToHeader || 0) * MM2PT;
    doc.setDrawColor(209, 213, 219);  // #D1D5DB
    doc.setLineWidth(L.dividerH * MM2PT);  // 0.3mm
    doc.line(padLR_pt, dividerY, A4_W_PT - padLR_pt, dividerY);

    // 内容起始位置 = 分隔线底 + 间距2mm + 间距5mm
    var contentTopY = dividerY + L.dividerH * MM2PT + (L.dividerGapToHeader || 0) * MM2PT + L.dividerGap * MM2PT;
    var leftX = padLR_pt;
    var contentW_pt = L.contentW * MM2PT;

    if (format === 'horizontal') {
      _drawHorizontal(doc, pageProblems, showAnswers, L, contentW_pt, leftX, contentTopY);
    } else {
      _drawVertical(doc, pageProblems, showAnswers, L, contentW_pt, leftX, contentTopY);
    }

    // ——— 页码（仅多页时显示）———
    if (totalPages > 1) {
      var pageNumFont_pt = L.pageNumFontPt;  // 直接使用 pt 值
      // 页码位置：距纸张底边 pageNumBottom mm
      var pageNumY = A4_H_PT - L.pageNumBottom * MM2PT;
      doc.setFontSize(pageNumFont_pt);
      _setFont(doc);
      doc.setTextColor(0, 0, 0);
      doc.text('\u7b2c ' + (page + 1) + ' \u9875 / \u5171 ' + totalPages + ' \u9875', A4_W_PT / 2, pageNumY, { align: 'center' });
    }
  }

  return doc.output('datauristring');
}

// ============================================================
// 横式绘制（布局参数由 layoutCalc.js 提供）
// ============================================================
function _drawHorizontal(doc, problems, showAnswers, L, contentW_pt, leftX, topY) {
  // 字号直接使用 layoutCalc.js 计算值
  var fontMM = L.fontMM;
  var fontPT = fontMM * MM2PT;
  var ANSWER_BLANK = 5;  // "="后固定留白5个等宽字符
  var cellH = (fontMM + L.rowGap) * MM2PT;
  var colW = contentW_pt / L.cols;

  doc.setFontSize(fontPT);
  _setMonoFont(doc);
  doc.setTextColor(0, 0, 0);

  for (var i = 0; i < problems.length; i++) {
    var col = i % L.cols;
    var row = Math.floor(i / L.cols);
    var p = problems[i];
    // 算式部分（含"="，不含答案）
    var text = (p.type === 'mixed') ? (p.expression || '') : (p.num1 + ' ' + p.operator + ' ' + p.num2 + ' =');

    var x = leftX + col * colW;
    var y = topY + row * cellH + fontPT + L.rowGap * MM2PT * 0.3;

    // 算式部分：黑色、粗体
    doc.setTextColor(0, 0, 0);
    doc.text(text, x, y, { align: 'left' });

    if (showAnswers && p.result !== undefined) {
      // 答案部分：灰色#666、courier normal 字重（与预览页 .answer-show 一致）
      var answerStr = String(p.result);
      if (p.remainder && p.remainder > 0) answerStr += '...' + p.remainder;
      var textW = doc.getStringUnitWidth(text) * fontPT / doc.internal.scaleFactor;
      doc.setTextColor(102, 102, 102);  // #666666
      // 答案用 courier normal（保持等宽），不回退到 NotoSansSC
      try {
        doc.setFont('courier', 'normal');
      } catch (e) {
        doc.setFont('courier', 'normal');
      }
      // 答案间距：与预览页 .answer-blank { margin-left: 2px } 一致
      var answerGap = 2 / 3.78 * MM2PT;  // 2px → mm → pt
      doc.text(answerStr, x + textW + answerGap, y, { align: 'left' });
      // 恢复
      _setMonoFont(doc);
      doc.setTextColor(0, 0, 0);
    }
    // 不显示答案时不画下划线，与预览页 .answer-blank 一致（纯空白区）
  }
}

// ============================================================
// 竖式绘制（布局参数由 layoutCalc.js 提供）
// ============================================================
function _drawVertical(doc, problems, showAnswers, L, contentW_pt, leftX, topY) {
  var fontPT = L.fontMM * MM2PT;
  var lh = fontPT * L.lineHRatio;  // 行高 pt
  var cellH_pt = L.cellH * MM2PT;
  var rowGap_pt = L.rowGap * MM2PT;
  var colW = contentW_pt / L.cols;

  doc.setFontSize(fontPT);
  // 竖式数字使用 courier 等宽字体（与预览页 font-family: 'Courier New', monospace 一致）
  _setMonoFont(doc);
  doc.setTextColor(0, 0, 0);

  for (var i = 0; i < problems.length; i++) {
    var col = i % L.cols;
    var row = Math.floor(i / L.cols);
    var p = problems[i];
    var isDivision = (p.operation === 'division' || p.type === 'mixed');

    var centerX = leftX + col * colW + colW / 2;
    var cellTopY = topY + row * (cellH_pt + rowGap_pt);

    if (isDivision) {
      _drawDivision(doc, p, centerX, cellTopY, fontPT, lh, L, showAnswers);
    } else {
      _drawNormalVert(doc, p, centerX, cellTopY, fontPT, lh, L, showAnswers);
    }
  }
}

// ============================================================
// 普通竖式（加减乘）
// 核心差异修复：与预览页一致，使用空格分隔数字 + text-align:right
// ============================================================
function _drawNormalVert(doc, p, cx, ty, fs, lh, L, showAns) {
  // 精确对齐方案：放弃 charSpace，用空格分隔数字，手动计算右对齐坐标
  var num1Str = String(p.num1).split('').join(' ');
  var num2Str = String(p.num2).split('').join(' ');
  var resultStr = showAns && p.result !== undefined ? String(p.result).split('').join(' ') : '';

  // 对齐基准：基于 lineW（与预览页 char-vertical 宽度一致）居中
  var lineW_pt = L.lineW * MM2PT;
  var halfW_pt = lineW_pt / 2;

  var digitGap_pt = L.digitGap * MM2PT;
  var y1 = ty + digitGap_pt + fs;    // num1 基线
  var y2 = y1 + lh;                  // num2 基线

  // 右对齐参考线 = 列中心 + 半宽
  var rightAlignX = cx + halfW_pt;

  // 字符尺寸（courier bold 等宽字体）
  var charW_pt = fs * L.charRatio;  // 单字符宽度 pt
  // 空格宽度 = charW_pt（等宽字体中空格与数字等宽）
  var spaceW_pt = charW_pt;

  // 手动计算每行文字的精确宽度（字符数 × charW + 空格数 × spaceW）
  // "1 2 3" = 3个数字 + 2个空格 = 5个字符
  function getStringWidth(str) {
    var len = str.length;
    return len * charW_pt;
  }

  // num1、num2、答案都右对齐于 rightAlignX
  // 绘制位置：文字最右端 = rightAlignX，所以 x = rightAlignX - stringWidth
  var num1W = getStringWidth(num1Str);
  var num2W = getStringWidth(num2Str);
  var num1X = rightAlignX - num1W;
  var num2X = rightAlignX - num2W;

  // 第一行数字：左对齐于手动计算的位置
  doc.text(num1Str, num1X, y1, { align: 'left' });

  // 运算符位置：在 num2 左侧
  var opW = doc.getStringUnitWidth(p.operator) * fs / doc.internal.scaleFactor;
  doc.text(p.operator, num2X - opW * 0.8, y2, { align: 'right' });

  // 第二行数字：左对齐于手动计算的位置
  doc.text(num2Str, num2X, y2, { align: 'left' });

  // 横线：左端 = 最长数字最左端再向左5字符，右端 = 个位右边缘再向右2字符
  var digitRenderW_pt = L.maxDigits * charW_pt + (L.maxDigits - 1) * spaceW_pt;  // 含间距
  var digitLeftX = rightAlignX - digitRenderW_pt;
  var ruleY = y2 + L.ruleTop * MM2PT;
  var lineLeft = digitLeftX - 5 * charW_pt;
  var lineRight = rightAlignX + 2 * charW_pt;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(L.ruleH * MM2PT);
  doc.line(lineLeft, ruleY, lineRight, ruleY);

  // 答案：右对齐于 rightAlignX
  if (showAns && resultStr) {
    var resultW = getStringWidth(resultStr);
    var yr = ruleY + lh;
    doc.text(resultStr, rightAlignX - resultW, yr, { align: 'left' });
  }
}

// ============================================================
// 除法竖式（与预览页完全一致）
// 预览页结构：division-wrapper > division-body(divisor + division-sign(dividend)) + division-empty-line(商...余数)
// 整体靠右对齐（inline-flex + align-items: flex-end）
// ============================================================
function _drawDivision(doc, p, cx, ty, fs, lh, L, showAns) {
  var dividend = String(p.num1);
  var divisor = String(p.num2);
  var quotient = showAns ? String(p.result) : '';
  var remainder = showAns && p.remainder && p.remainder > 0 ? p.remainder : 0;

  var dividendStr = dividend;  // 除法竖式取消空格分隔，直接使用原始数字

  // 布局区域基准（与普通竖式共享，cx=列中心，ty=cell顶部）
  var lineW_pt = L.lineW * MM2PT;
  var halfW_pt = lineW_pt / 2;

  // digitGap：与普通竖式一致
  var digitGap_pt = L.digitGap * MM2PT;

  // letterSpacing
  var charSpacing_pt = L.letterSpacing * MM2PT;
  var charW_pt = fs * L.charRatio;  // 单字符宽度 pt

  // 除法括号参数（从 layoutCalc 获取，与预览页 .division-sign CSS 完全一致）
  var bracketBorderW_pt = L.divBracketBorderW * MM2PT;
  var bracketPadLeft_pt = L.divBracketPadLeft * MM2PT;
  var bracketPadRight_pt = L.divBracketPadRight * MM2PT;
  var bracketPadTop_pt = L.divBracketPadTop * MM2PT;
  var bracketPadBottom_pt = L.divBracketPadBottom * MM2PT;
  var bracketMarginRight_pt = L.divBracketMarginRight * MM2PT;

  // ============ 与预览页一致的布局计算 ============
  // division-body: display:flex; align-items:flex-end
  //   division-divisor: padding-right: 6px; font-weight: bold
  //   division-sign: border-left + border-top + padding + margin-right
  //     division-dividend: font-weight: bold

  var divisorW = doc.getStringUnitWidth(divisor) * fs / doc.internal.scaleFactor;
  var dividendW = doc.getStringUnitWidth(dividendStr) * fs / doc.internal.scaleFactor;
  // division-sign 内容宽度 = padding-left + dividend + padding-right
  var bracketContentW = bracketPadLeft_pt + dividendW + bracketPadRight_pt;
  // division-body 总宽度 = divisor + padding-right(6px) + bracketContentW + margin-right(2px)
  // 注意：预览页中 padding-right:6px 是除数的右间距，bracketMarginRight 是括号的右外边距
  var divisorPaddingR_pt = 6 / 3.78;  // 6px → pt
  var bodyTotalW = divisorW + divisorPaddingR_pt + bracketContentW + bracketMarginRight_pt;

  // 整体靠右对齐：与预览页 division-wrapper align-items:flex-end 一致
  // 右端 = cx + halfW_pt（与普通竖式 rightAlignX 一致）
  var rightAlignX = cx + halfW_pt;
  var bodyRightX = rightAlignX;
  var bodyLeftX = bodyRightX - bodyTotalW;

  // ============ 绘制除数 ============
  // 除数在 division-body 最左侧，右对齐于其自身宽度+padding-right
  var y1 = ty + digitGap_pt + fs;  // 除数基线Y（与普通竖式第一行一致）
  var divisorRightX = bodyLeftX + divisorW + divisorPaddingR_pt;
  doc.text(divisor, divisorRightX, y1, { align: 'right' });

  // ============ 绘制括号 ============
  // division-sign 左端 = 除数右端
  var bracketLeft = divisorRightX;
  var bracketRight = bracketLeft + bracketContentW;

  // 括号顶部：与预览页 align-items:flex-end 一致（除数和括号底部对齐）
  var bracketTop = y1 - fs;  // 括号顶部与文字顶部对齐

  // 横线（border-top: 2.5px solid #000）
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(bracketBorderW_pt);
  doc.line(bracketLeft, bracketTop, bracketRight, bracketTop);

  // 竖线（border-left: 2.5px solid #000）
  // 竖线长度 = 括号内容高度 = padding-top + 字号 + padding-bottom
  var vBottom = bracketTop + bracketPadTop_pt + fs + bracketPadBottom_pt + L.ruleTop * MM2PT;
  doc.setLineWidth(bracketBorderW_pt);
  doc.line(bracketLeft, bracketTop, bracketLeft, vBottom);

  // ============ 绘制被除数 ============
  // 被除数在括号内部，padding-left 处开始，纵向居中（align-items: center）
  var dividendX = bracketLeft + bracketPadLeft_pt;
  // 纵向居中：括号内部可用高度 = bracketPadTop + fs + bracketPadBottom，被除数居中
  var innerH = bracketPadTop_pt + fs + bracketPadBottom_pt;
  var dividendY = bracketTop + bracketPadTop_pt + fs;  // 与预览页 flex center 对齐
  doc.text(dividendStr, dividendX, dividendY, { align: 'left' });

  // ============ 绘制商/余数 ============
  // 与预览页 division-empty-line 一致：在括号下方，整个容器宽度内显示
  if (showAns && quotient) {
    var ansY = vBottom + lh;  // 横线下方一行
    var ansText = quotient;
    if (remainder > 0) {
      ansText = quotient + '...' + remainder;
    }
    // 右对齐于容器右端（与预览页 answer-text text-align: right 一致）
    doc.text(ansText, bodyRightX, ansY, { align: 'right' });
  }
}

module.exports = {
  buildPDF: buildPDF,
  getFontBase64: getFontBase64
};
