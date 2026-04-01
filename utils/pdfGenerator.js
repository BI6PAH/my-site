/**
 * PDF 生成器 — 直接用 jsPDF 从数据生成 A4 PDF 文件
 * 支持：横式计算、竖式计算、混合运算
 * 调用方式：renderjs 中动态加载 jsPDF 后调用
 */

/* ========== A4 纸张常量（单位：pt，jsPDF 使用 pt） ========== */
const A4_W = 595.28;   // A4 宽度 210mm
const A4_H = 841.89;   // A4 高度 297mm
const MM2PT = 2.83465;  // 1mm = 2.83465pt

// 页边距（mm）
const PAD_TB = 20;  // 上下 20mm
const PAD_LR = 15;  // 左右 15mm

// 可用内容区（pt）
const CONTENT_W = (210 - PAD_LR * 2) * MM2PT;  // 180mm → 510.24pt
const CONTENT_H = (297 - PAD_TB * 2) * MM2PT;  // 257mm → 728.50pt

// 字号常量（pt）
const HEADER_FONT_SIZE = 22;  // 头部"姓名/日期"字号（对应7.7mm ≈ 21.8pt，取22pt）
const DIVIDER_GAP = 3 * MM2PT;  // 分隔线到内容间距 3mm
const HEADER_H = 22 * 2.5 + 3 * MM2PT;  // 头部高度估算（两行文字+间距）

/**
 * 生成完整的 PDF 文件（base64）
 * @param {Array} problems - 题目数组
 * @param {Object} options - 配置项
 * @param {string} options.format - 'horizontal' 或 'vertical'
 * @param {boolean} options.showAnswers - 是否显示答案
 * @param {number} options.perPage - 每页题数（横式20，竖式12）
 * @returns {string} PDF 的 base64 字符串（data:application/pdf;base64,...）
 */
function generatePDF(problems, options) {
  const { format, showAnswers, perPage } = options;
  // 动态获取 jsPDF（renderjs 环境中 window.jspdf.jsPDF）
  const JsPDF = (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF)
    ? window.jspdf.jsPDF
    : (typeof jsPDF !== 'undefined' ? jsPDF : null);

  if (!JsPDF) {
    throw new Error('jsPDF 未加载');
  }

  const doc = new JsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const totalPages = Math.ceil(problems.length / perPage);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();
    const pageProblems = problems.slice(page * perPage, (page + 1) * perPage);

    // 头部
    _drawHeader(doc);
    // 分隔线
    _drawDivider(doc);

    if (format === 'horizontal') {
      _drawHorizontal(doc, pageProblems, showAnswers);
    } else {
      _drawVertical(doc, pageProblems, showAnswers);
    }

    // 页码（仅多页时显示）
    if (totalPages > 1) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`第 ${page + 1} 页 / 共 ${totalPages} 页`, A4_W / 2, A4_H - 5 * MM2PT, { align: 'center' });
    }
  }

  // 输出为 base64 data URI
  return doc.output('datauristring');
}

/**
 * 生成多页 PDF 并按页返回图片数组（用于分页预览）
 */
function generatePDFPages(problems, options) {
  const { format, showAnswers, perPage } = options;
  const JsPDF = (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF)
    ? window.jspdf.jsPDF
    : (typeof jsPDF !== 'undefined' ? jsPDF : null);

  if (!JsPDF) throw new Error('jsPDF 未加载');

  const pages = [];
  const totalPages = Math.ceil(problems.length / perPage);

  for (let page = 0; page < totalPages; page++) {
    const doc = new JsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageProblems = problems.slice(page * perPage, (page + 1) * perPage);

    _drawHeader(doc);
    _drawDivider(doc);

    if (format === 'horizontal') {
      _drawHorizontal(doc, pageProblems, showAnswers);
    } else {
      _drawVertical(doc, pageProblems, showAnswers);
    }

    if (totalPages > 1) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`第 ${page + 1} 页 / 共 ${totalPages} 页`, A4_W / 2, A4_H - 5 * MM2PT, { align: 'center' });
    }

    // 每页输出为 PNG base64
    pages.push(doc.output('datauristring'));
  }

  return pages;
}

/* ========== 头部 ========== */
function _drawHeader(doc) {
  const leftX = PAD_LR * MM2PT;
  const rightX = A4_W - PAD_LR * MM2PT;
  const topY = PAD_TB * MM2PT;

  doc.setFontSize(HEADER_FONT_SIZE);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);

  doc.text('Name: ___________', leftX, topY + HEADER_FONT_SIZE + 4, { align: 'left' });
  doc.text('Date: _____/____/____', rightX, topY + HEADER_FONT_SIZE + 4, { align: 'right' });
}

/* ========== 分隔线 ========== */
function _drawDivider(doc) {
  const leftX = PAD_LR * MM2PT;
  const rightX = A4_W - PAD_LR * MM2PT;
  const y = PAD_TB * MM2PT + HEADER_H;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(leftX, y, rightX, y);
}

/* ========== 横式计算（2列×10行） ========== */
function _drawHorizontal(doc, problems, showAnswers) {
  const COLS = 2;
  const ROWS = 10;
  const startX = PAD_LR * MM2PT;
  const startY = PAD_TB * MM2PT + HEADER_H + DIVIDER_GAP;

  // 可用内容高度（去掉头部和分隔线）
  const availH = CONTENT_H - HEADER_H - DIVIDER_GAP;
  // 自适应字号：确保20行能放下
  // 每行高度 = availH / ROWS，字号取行高的70%
  const rowH = availH / ROWS;
  let fontSize = Math.min(rowH * 0.7, 18); // 上限18pt
  fontSize = Math.max(fontSize, 10);        // 下限10pt

  doc.setFontSize(fontSize);
  doc.setFont('courier', 'normal');
  doc.setTextColor(0, 0, 0);

  const colW = CONTENT_W / COLS;

  for (let i = 0; i < problems.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const p = problems[i];

    let text;
    if (p.type === 'mixed') {
      text = p.expression;
    } else {
      text = `${p.num1} ${p.operator} ${p.num2} =`;
    }

    const x = startX + col * colW;
    const y = startY + row * rowH + fontSize + 2;

    // 题目文字
    doc.text(text, x, y, { align: 'left' });

    // 答案（如果显示）
    if (showAnswers && p.result !== undefined) {
      let answerStr = String(p.result);
      if (p.remainder && p.remainder > 0) {
        answerStr += '...' + p.remainder;
      }
      // 测量题目宽度，答案从题目后面开始
      const textW = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
      doc.text(answerStr, x + textW + 4, y, { align: 'left' });
    }
  }
}

/* ========== 竖式计算（3列×4行） ========== */
function _drawVertical(doc, problems, showAnswers) {
  const COLS = 3;
  const ROWS = 4;
  const startX = PAD_LR * MM2PT;
  const startY = PAD_TB * MM2PT + HEADER_H + DIVIDER_GAP;

  const availH = CONTENT_H - HEADER_H - DIVIDER_GAP;
  const colW = CONTENT_W / COLS;

  // 确定最大数字位数（用于统一横线宽度）
  let maxDigits = 1;
  for (const p of problems) {
    const d1 = String(p.num1).length;
    const d2 = String(p.num2).length;
    const dr = String(p.result).length;
    const maxD = Math.max(d1, d2, dr);
    if (maxD > maxDigits) maxDigits = maxD;
  }

  // 字号：根据最大位数自适应（确保3列不溢出）
  // 横线宽度 = (maxDigits + 3) * charW，3列 ≤ CONTENT_W
  let fontSize = 18;
  const charW = fontSize * 0.6; // 等宽字体字符宽度比
  const lineW = (maxDigits + 3) * charW;
  const threeLineW = lineW * 3;

  if (threeLineW > CONTENT_W) {
    fontSize = CONTENT_W / ((maxDigits + 3) * 0.6 * 3);
    fontSize = Math.max(fontSize, 10);
  }

  // 行高 = (可用高度 - 答案区) / 4行
  const answerH = fontSize * 2.5; // 答案区高度
  const rowH = (availH - ROWS * answerH) / ROWS;
  const charH = fontSize * 1.3; // 数字行高

  doc.setFontSize(fontSize);
  doc.setFont('courier', 'normal');
  doc.setTextColor(0, 0, 0);

  for (let i = 0; i < problems.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const p = problems[i];
    const isDivision = (p.operation === 'division' || p.type === 'mixed');

    const colCenterX = startX + col * colW + colW / 2;
    const cellTopY = startY + row * rowH;

    if (isDivision) {
      _drawDivisionVertical(doc, p, colCenterX, cellTopY, fontSize, showAnswers, answerH);
    } else {
      _drawNormalVertical(doc, p, colCenterX, cellTopY, fontSize, showAnswers, answerH);
    }
  }
}

/**
 * 普通竖式（加减乘）
 */
function _drawNormalVertical(doc, problem, centerX, topY, fontSize, showAnswers, answerH) {
  const num1Str = String(problem.num1);
  const num2Str = String(problem.num2);
  const resultStr = String(problem.result);

  // 从字符串渲染（用空格分隔每个字符，模拟竖式排版）
  const chars1 = num1Str.split('');
  const chars2 = num2Str.split('');
  const charsR = resultStr.split('');
  const maxLen = Math.max(chars1.length, chars2.length, charsR.length);

  // 右对齐：在较短的数字前补空格
  while (chars1.length < maxLen) chars1.unshift(' ');
  while (chars2.length < maxLen) chars2.unshift(' ');

  const charW = fontSize * 0.6;
  const lineH = fontSize * 1.3;

  // 第一个数字
  const line1Y = topY + lineH + 2;
  for (let j = 0; j < maxLen; j++) {
    const x = centerX - (maxLen / 2) * charW + j * charW + charW / 2;
    doc.text(chars1[j], x, line1Y, { align: 'center' });
  }

  // 运算符 + 第二个数字
  const line2Y = line1Y + lineH;
  // 运算符在最左边
  const opX = centerX - (maxLen / 2) * charW - charW * 0.5;
  doc.text(problem.operator, opX, line2Y, { align: 'center' });
  for (let j = 0; j < maxLen; j++) {
    const x = centerX - (maxLen / 2) * charW + j * charW + charW / 2;
    doc.text(chars2[j], x, line2Y, { align: 'center' });
  }

  // 横线
  const ruleY = line2Y + fontSize * 0.3;
  const lineHalfW = (maxLen / 2 + 0.5) * charW;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(centerX - lineHalfW, ruleY, centerX + lineHalfW, ruleY);

  // 答案（或空白区）
  if (showAnswers) {
    const lineRY = ruleY + lineH + 2;
    while (charsR.length < maxLen) charsR.unshift(' ');
    for (let j = 0; j < maxLen; j++) {
      const x = centerX - (maxLen / 2) * charW + j * charW + charW / 2;
      doc.text(charsR[j], x, lineRY, { align: 'center' });
    }
  }
  // 不显示答案时，答案区留空（空白线区域 = answerH）
}

/**
 * 除法竖式（拐角括号样式）
 */
function _drawDivisionVertical(doc, problem, centerX, topY, fontSize, showAnswers, answerH) {
  const num1Str = String(problem.num1); // 被除数
  const num2Str = String(problem.num2); // 除数
  const resultStr = String(problem.result); // 商

  const charW = fontSize * 0.6;
  const lineH = fontSize * 1.3;

  // 布局：被除数在右，除数在左上（拐角括号）
  // 被除数长度
  const dividendLen = num1Str.length;
  const divisorLen = num2Str.length;
  const quotientLen = resultStr.length;

  // 拐角括号：除数在上左，被除数在横线上
  const bracketW = (dividendLen + 1) * charW;

  // 除数（左上角）
  const divisorY = topY + lineH + 2;
  doc.text(num2Str, centerX - bracketW / 2 + charW / 2, divisorY, { align: 'center' });

  // 横线（除数下方）
  const ruleY = divisorY + fontSize * 0.3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(centerX - bracketW / 2, ruleY, centerX + bracketW / 2, ruleY);

  // 竖线（除数右侧到被除数底部）
  const vertLineX = centerX - bracketW / 2 + (divisorLen + 0.5) * charW;
  const vertLineBottom = ruleY + lineH + fontSize * 0.3;
  doc.line(vertLineX, divisorY - lineH * 0.5, vertLineX, vertLineBottom);

  // 被除数（横线上方，除数右侧）
  const dividendX = vertLineX + charW * 0.3;
  doc.text(num1Str, dividendX, ruleY - 2, { align: 'left' });

  // 商（横线下方）
  if (showAnswers) {
    const quotientY = ruleY + lineH + 2;
    doc.text(resultStr, dividendX, quotientY, { align: 'left' });

    // 如果有余数
    if (problem.remainder && problem.remainder > 0) {
      doc.text('...' + problem.remainder, dividendX + (quotientLen + 0.5) * charW, quotientY, { align: 'left' });
    }
  }
}
