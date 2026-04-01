/**
 * 共享布局计算模块
 * 
 * 【唯一真相来源】预览页、PDF保存、PDF打印 三者共用此模块计算布局。
 * 任何布局修改只需改这一个文件，三端自动同步。
 * 
 * 设计原则：
 * - 输入：题目数据 + 格式 → 输出：纯数据对象（所有尺寸以 mm 为单位）
 * - 不包含任何渲染逻辑（不生成 CSS 字符串、不调用 jsPDF）
 * - 预览页将 mm 转为 rpx 生成 CSS，PDF 将 mm 转为 pt 调用 jsPDF
 */

// ============================================================
// 1. 横式布局计算
// ============================================================

/**
 * 计算横式布局参数（2列×10行，自适应铺满A4）
 * @param {Array} problems - 本页题目数组
 * @param {Boolean} showAnswers - 是否显示答案
 * @returns {Object} 横式布局参数（所有数值单位 mm，除非特别标注）
 */
function calcHorizontalLayout(problems, showAnswers) {
  if (!problems || problems.length === 0) return null;

  // --- 常量（2026-03-28 横式PDF参数定义）---
  var PAD_LR = 10;             // 左右页边距 mm
  var PAD_TB_TOP = 15;         // 上页边距 mm
  var PAD_TB_BOT = 15;         // 下页边距 mm
  var HEADER_H = 21;           // 页眉区域总高 mm（含上页边距15mm，净高6mm）
  var HEADER_FONT_PT = 14;     // 页眉字号 pt
  var DIVIDER_H = 0.3;         // 分隔线厚度 mm
  var DIVIDER_GAP_TO_HEADER = 2.82;  // 分隔线到页眉内容间距 mm（8pt ≈ 2.82mm）
  var DIVIDER_GAP = 5;         // 分隔线到内容间距 mm
  var COLS = 2;
  var ROWS = 10;
  var CHAR_RATIO = 0.6;        // 等宽字体字符宽高比
  var MM2PT = 2.83465;         // mm → pt 转换系数

  var CONTENT_W = 210 - PAD_LR * 2;  // 190mm
  // 算式纯可用高度 = 297 - 页眉区域21 - 分隔线0.3 - 间距5 - 间距5 - 下页边距15
  var CONTENT_H = 297 - HEADER_H - DIVIDER_H - DIVIDER_GAP_TO_HEADER - DIVIDER_GAP - PAD_TB_BOT; // 251.6mm

  // --- 1. 找出最长算式字符数（不含答案）---
  // 算式文本：如 "12 + 34 =" 或混合 "12 × 3 + 4 ="
  // "=" 后固定留白 5 个等宽字符宽度，便于手写答案
  var ANSWER_BLANK = 5;  // "="后留白字符数
  var maxChars = 0;
  for (var i = 0; i < problems.length; i++) {
    var p = problems[i];
    var text;
    if (p.type === 'mixed') {
      text = p.expression || '';
    } else {
      text = p.num1 + ' ' + p.operator + ' ' + p.num2 + ' =';
    }
    // 总字符数 = 算式部分 + 答案留白
    var totalChars = text.length + ANSWER_BLANK;
    if (showAnswers && p.result !== undefined) {
      totalChars = Math.max(totalChars, text.length + String(p.result).length);
    }
    if (totalChars > maxChars) maxChars = totalChars;
  }
  if (maxChars === 0) return null;

  // --- 2. 双约束字号计算 ---
  var MIN_FONT = 8 / MM2PT;        // 最小8pt → mm（≈2.82mm）
  var MAX_FONT = 22 / MM2PT;       // 最大22pt → mm（≈7.76mm）
  var maxFontByWidth = CONTENT_W / (COLS * maxChars * CHAR_RATIO);
  // 高度约束：极限填满（行间距=0）
  var maxFontByFillH = CONTENT_H / ROWS;

  var fontMM = Math.min(MAX_FONT, Math.max(MIN_FONT, Math.min(maxFontByWidth, maxFontByFillH)));

  // --- 3. 列间距 ---
  var colContentW = maxChars * fontMM * CHAR_RATIO;
  var colGapRaw = (CONTENT_W - colContentW * COLS) / (COLS - 1);
  var maxColGap = CONTENT_W * 0.2;
  var colGap = Math.max(5, Math.min(colGapRaw, maxColGap));

  // --- 4. 行间距（精确填满）---
  var rowGap = Math.max(1, (CONTENT_H - ROWS * fontMM) / ROWS);

  return {
    // 页边距
    padLR: PAD_LR,
    padTBTop: PAD_TB_TOP,
    padTBBot: PAD_TB_BOT,
    // 内容区
    contentW: CONTENT_W,
    contentH: CONTENT_H,
    // 网格
    cols: COLS,
    rows: ROWS,
    // 字号
    fontMM: fontMM,
    // 间距
    colGap: colGap,
    rowGap: rowGap,
    // 页眉
    headerFontPt: HEADER_FONT_PT, // 页眉字号 pt
    headerH: HEADER_H,            // 页眉区域总高 mm（含上页边距）
    // 分隔线
    dividerH: DIVIDER_H,
    dividerGapToHeader: DIVIDER_GAP_TO_HEADER,
    dividerGap: DIVIDER_GAP,
    // 页码
    pageNumFontPt: 12,    // 页码字号 pt
    pageNumBottom: 5,     // 页码距底边 mm
    // 题目文本信息（PDF绘制用）
    maxChars: maxChars,
    charRatio: CHAR_RATIO
  };
}

// ============================================================
// 2. 竖式布局计算
// ============================================================

/**
 * 计算竖式布局参数（3列×4行，自适应铺满A4）
 * @param {Array} problems - 本页题目数组
 * @param {Boolean} showAnswers - 是否显示答案
 * @returns {Object} 竖式布局参数（所有数值单位 mm，除非特别标注）
 */
function calcVerticalLayout(problems, showAnswers) {
  if (!problems || problems.length === 0) return null;

  // --- 常量 ---
  var PAD_TB = 15;            // 上下各 15mm
  var PAD_TB_TOP = 15;        // 上页边距 mm（与横式一致）
  var PAD_LR = 10;            // 左右各 10mm
  var MM2PT = 2.83465;        // mm → pt 转换系数
  var A4_W = 210;
  var A4_H = 297;
  var COLS = 3;
  var ROWS = 4;
  var CHAR_RATIO = 0.6;
  var LINE_H_RATIO = 1.3;     // 行高倍率
  var RULE_H = 0.4;           // 横线厚度 mm

  var CONTENT_W = A4_W - PAD_LR * 2;   // 190mm
  var CONTENT_H = A4_H - PAD_TB * 2;   // 267mm

  // --- 1. 找出最长数字位数（num1、num2，不含答案）---
  var maxDigits = 0;
  for (var i = 0; i < problems.length; i++) {
    var p = problems[i];
    var digits = Math.max(String(p.num1).length, String(p.num2).length);
    if (showAnswers && p.result !== undefined) {
      digits = Math.max(digits, String(p.result).length);
    }
    if (digits > maxDigits) maxDigits = digits;
  }
  if (maxDigits === 0) maxDigits = 2;
  // 渲染时数字间有空格分隔（如 "1 2 3 4"），实际字符数 = 位数×2-1
  // 再加 1 个字符余量（运算符/边距）
  var LINE_CHARS = maxDigits * 2 - 1 + 1;

  // --- 2. 页眉/分隔线 ---
  var HEADER_FONT = 12;       // 页眉字号 mm（竖式12mm，与横式一致）
  var HEADER_GAP = 5;         // 页眉下方间距 mm（竖式5mm，与横式一致）
  var HEADER_H = HEADER_FONT * 2.2;  // 26.4mm（含上页边距）
  var DIVIDER_H = 0.3;
  var DIVIDER_GAP_TO_HEADER = 2.82;  // 分隔线到页眉间距 mm（与横式一致）
  var DIVIDER_GAP = 5;        // 竖式分隔线到内容间距 mm
  var AREA_H = CONTENT_H - (HEADER_H - PAD_TB) - DIVIDER_H - DIVIDER_GAP; // HEADER_H含上边距，减去净页眉高度

  // --- 3. 双约束字号 ---
  var MIN_FONT = 8 / MM2PT;   // 最小8pt → mm（≈2.82mm，与横式一致）
  var MAX_FONT = 22 / MM2PT;  // 最大22pt → mm（≈7.76mm，与横式一致）

  var maxFontByWidth = CONTENT_W / (COLS * (LINE_CHARS * (CHAR_RATIO + 0.15) + 1));
  var maxFontByHeight = AREA_H / (ROWS * 3.4);
  var fontMM = Math.min(MAX_FONT, Math.max(MIN_FONT, Math.min(maxFontByWidth, maxFontByHeight)));

  // 填满约束
  var maxFontByFillH = (AREA_H - ROWS * RULE_H) / (ROWS * 2 * LINE_H_RATIO);
  var maxFontByFill = Math.min(maxFontByWidth, maxFontByFillH);
  if (maxFontByFill > fontMM) {
    fontMM = Math.min(MAX_FONT, Math.max(MIN_FONT, maxFontByFill));
  }

  // --- 6. 高度精确分配（保证4行全部显示）---
  var twoLinesH = fontMM * LINE_H_RATIO * 2;
  var minAnswerH = fontMM * 1;

  // 单题最小高度 = 两行数字 + 横线 + 答案区最小值
  var minCellH = twoLinesH + RULE_H + minAnswerH;
  // 剩余空间 = 总可用高度 - 4行最小高度 - 3个行间距最小值
  var remainH = AREA_H - ROWS * minCellH;
  // answerH 和 rowGap 按剩余空间平均分配
  var answerH, rowGap;
  if (remainH >= 0) {
    // 有余量：答案区和行间距按7:3分配
    var answerExtra = remainH * 0.7 / ROWS;
    var rowGapExtra = remainH * 0.3 / (ROWS - 1);
    answerH = minAnswerH + answerExtra;
    rowGap = rowGapExtra;
  } else {
    // 空间不足：压缩答案区
    answerH = Math.max(minAnswerH + remainH / ROWS, fontMM * 0.5);
    rowGap = 0;
  }

  // --- 7. 内部间距 ---
  var digitGap = (twoLinesH - 2 * fontMM) / 2;  // 数字行间距（上下各一半）
  var ruleTop = fontMM * 0.3;                     // 横线上方留白

  // --- 8. 字符间距 ---
  var letterSpacing = fontMM * 0.15;

  // --- 9. 单题总高度（用于PDF定位）---
  var cellH = twoLinesH + RULE_H + answerH;

  // --- 10. 统一横线宽度 ---
  // 横线必须覆盖数字实际渲染宽度（含charSpace字符间距）
  // 实际渲染：每个数字字符宽 = fontMM × CHAR_RATIO，每个字符间距 = letterSpacing
  // LINE_CHARS 已包含空格字符，所以总宽 = LINE_CHARS × (单字符宽 + 间距) + 小余量
  var lineW = LINE_CHARS * (fontMM * CHAR_RATIO + letterSpacing) + fontMM;

  // --- 11. 列间距 ---
  var colGapRaw = (CONTENT_W - lineW * COLS) / (COLS - 1);
  var maxColGap = lineW * 0.15;
  var colGap = Math.max(1, Math.min(colGapRaw, maxColGap));

  // --- 12. 除法括号CSS参数（与预览页 .division-sign 完全一致）---
  // 预览页CSS: border-left:2.5px, border-top:2.5px, padding:2px 6px 2px 5px, margin-right:2px, border-radius:3px 0 0 0
  var PX2MM = 1 / 3.78;
  var divBracketBorderW = 2.5 * PX2MM;    // 0.661mm（= 2.5px）
  var divBracketPadTop = 2 * PX2MM;       // 0.529mm
  var divBracketPadRight = 6 * PX2MM;     // 1.587mm
  var divBracketPadBottom = 2 * PX2MM;    // 0.529mm
  var divBracketPadLeft = 5 * PX2MM;      // 1.323mm
  var divBracketMarginRight = 2 * PX2MM;  // 0.529mm
  var divBracketRadius = 3 * PX2MM;       // 0.794mm

  return {
    // 页边距
    padLR: PAD_LR,
    padTB: PAD_TB,
    // 内容区
    contentW: CONTENT_W,
    contentH: CONTENT_H,
    areaH: AREA_H,
    // 网格
    cols: COLS,
    rows: ROWS,
    // 字号
    fontMM: fontMM,
    // 间距
    colGap: colGap,
    rowGap: rowGap,
    // 竖式特有
    lineW: lineW,
    maxDigits: maxDigits,
    lineChars: LINE_CHARS,
    charRatio: CHAR_RATIO,
    lineHRatio: LINE_H_RATIO,
    // 内部结构
    twoLinesH: twoLinesH,
    ruleH: RULE_H,
    answerH: answerH,
    digitGap: digitGap,
    ruleTop: ruleTop,
    letterSpacing: letterSpacing,
    cellH: cellH,
    // 页眉
    headerFontPt: 12,   // 页眉字号 pt
    headerGap: HEADER_GAP,
    headerH: HEADER_H,
    // 页码
    pageNumFontPt: 12,  // 页码字号 pt
    pageNumBottom: 5,
    // 分隔线
    dividerH: DIVIDER_H,
    dividerGap: DIVIDER_GAP,
    dividerGapToHeader: DIVIDER_GAP_TO_HEADER,
    // 页边距（与横式一致）
    padTBTop: PAD_TB_TOP,
    // 除法括号（与预览页 .division-sign CSS 一致，单位mm）
    divBracketBorderW: divBracketBorderW,
    divBracketPadTop: divBracketPadTop,
    divBracketPadRight: divBracketPadRight,
    divBracketPadBottom: divBracketPadBottom,
    divBracketPadLeft: divBracketPadLeft,
    divBracketMarginRight: divBracketMarginRight,
    divBracketRadius: divBracketRadius
  };
}

module.exports = {
  calcHorizontalLayout: calcHorizontalLayout,
  calcVerticalLayout: calcVerticalLayout
};
