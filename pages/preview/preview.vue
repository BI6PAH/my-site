<template>
  <view class="page">
    <!-- A4纸张容器（可捏合缩放） -->
    <movable-area class="paper-area">
      <movable-view
        class="paper-movable"
        direction="all"
        scale="true"
        scale-min="0.5"
        scale-max="3"
        :scale-value="paperScale"
        @scale="onScale"
      >
        <!-- A4 纸张 -->
        <view id="a4-paper" class="a4-paper" :class="{ 'no-padding': currentFormat === 'vertical' }">
        <!-- 纸张头部（横式模式下由JS控制样式） -->
        <view class="paper-header" :style="currentFormat === 'horizontal' ? horizHeaderStyle : vertHeaderStyle">
          <text class="header-name">姓名：____________</text>
          <text class="header-date">日期：_________年____月____日</text>
        </view>

        <!-- 分隔线 -->
        <view class="paper-divider" :style="currentFormat === 'horizontal' ? horizDividerStyle : vertDividerStyle"></view>

        <!-- 横式计算：智能布局（JS 计算字号+间距） -->
        <view v-if="currentFormat === 'horizontal'" class="horizontal-grid" :style="horizGridStyle">
          <view
            v-for="(problem, index) in pageProblems"
            :key="'h-'+index"
            class="horizontal-item"
            :style="horizItemStyle"
          >
            <text class="expression" :style="{ fontSize: horizFontSize + 'rpx' }">
              {{ problem.type === 'mixed' ? problem.expression : (problem.num1 + ' ' + problem.operator + ' ' + problem.num2 + ' =') }}
            </text>
            <text v-if="showAnswers" class="expression answer-show" :style="{ fontSize: horizFontSize + 'rpx' }">{{ problem.result }}</text>
            <view v-else class="answer-blank"></view>
          </view>
        </view>

        <!-- 竖式计算 3列×4行（智能布局） -->
        <view v-else class="vertical-grid" :style="vertGridStyle">
          <view
            v-for="(problem, index) in pageProblems"
            :key="'v-'+index"
            class="vertical-item"
            :style="vertItemStyle"
          >
            <!-- 加减乘竖式 -->
            <view v-if="problem.operation !== 'division' && problem.type !== 'mixed'" class="vertical-wrapper">
              <view class="char-vertical" :style="vertCharStyle">
                <text class="line1">{{ formatNumWithSpace(problem.num1) }}</text>
                <text class="operator-char" :style="{ fontSize: vertFontSize + 'rpx' }">{{ problem.operator }}</text>
                <text class="num2-span">{{ formatNumWithSpace(problem.num2) }}</text>
                <view class="divider" :style="vertRuleStyle"></view>
                <view class="empty-line" :style="vertEmptyMinH" v-if="showAnswers">
                  <text class="answer-text" :style="{ fontSize: vertFontSize + 'rpx' }">{{ problem.result }}</text>
                </view>
                <view v-else class="empty-line" :style="vertEmptyMinH"></view>
              </view>
            </view>

            <!-- 除法竖式 -->
            <view v-else class="division-wrapper" :style="vertDivStyle">
              <view class="division-body">
                <text class="division-divisor" :style="{ fontSize: vertFontSize + 'rpx' }">{{ problem.num2 }}</text>
                <view class="division-sign">
                  <text class="division-dividend" :style="{ fontSize: vertFontSize + 'rpx' }">{{ formatNumWithSpace(problem.num1) }}</text>
                </view>
              </view>
              <view class="division-empty-line" :style="vertEmptyMinH" v-if="showAnswers">
                <text class="answer-text" :style="{ fontSize: vertFontSize + 'rpx' }">{{ problem.result }}{{ problem.remainder > 0 ? '...' + problem.remainder : '' }}</text>
              </view>
              <view v-else class="division-empty-line" :style="vertEmptyMinH"></view>
            </view>
          </view>
        </view>

        <!-- 纸张内页码：仅多页时显示，绝对定位在纸张底部 0.5cm，字号与头部一致 -->
        <view v-if="totalPages > 1" class="paper-page-num" :style="paperPageNumStyle">
          <text>第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</text>
        </view>
      </view>
      </movable-view>
    </movable-area>

    <!-- 底部操作栏（单行4按钮：上一页 / 保存PDF / 直接打印 / 下一页） -->
    <view class="bottom-bar">
      <view class="btn-row">
        <!-- 上一页：文字不换行 -->
        <view class="btn btn-primary btn-nav" :class="{ disabled: currentPage <= 1 }" @click="prevPage">
          <text class="btn-text btn-text-nowrap">上一页</text>
        </view>
        <!-- 保存PDF：两行显示 -->
        <view class="btn btn-primary btn-action" @click="savePDF">
          <text class="btn-text btn-text-wrap">保存</text>
          <text class="btn-text btn-text-wrap">PDF</text>
        </view>
        <!-- 直接打印：两行显示 -->
        <view class="btn btn-primary btn-action" @click="printDirect">
          <text class="btn-text btn-text-wrap">直接</text>
          <text class="btn-text btn-text-wrap">打印</text>
        </view>
        <!-- 下一页：文字不换行 -->
        <view class="btn btn-primary btn-nav" :class="{ disabled: currentPage >= totalPages }" @click="nextPage">
          <text class="btn-text btn-text-nowrap">下一页</text>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import { generateWorksheet, OPERATION_TYPES, clearGeneratedProblems } from '@/utils/generator.js';
import { buildPDF, getFontBase64 } from '@/utils/pdfBuilder.js';
import { calcHorizontalLayout, calcVerticalLayout } from '@/utils/layoutCalc.js';

var MM2PT = 2.83465;  // mm → pt 转换系数

// APP端：本地加载 jsPDF（数据驱动 PDF 生成，100%可靠）
// #ifdef APP-PLUS
var _jsPDF = null;
var _jsPDFLoading = false;
function _getJsPDF(callback) {
  if (_jsPDF) { callback(_jsPDF); return; }
  if (_jsPDFLoading) {
    var t = setInterval(function() {
      if (_jsPDF) { clearInterval(t); callback(_jsPDF); }
    }, 100);
    setTimeout(function() { clearInterval(t); callback(null); }, 12000);
    return;
  }
  _jsPDFLoading = true;
    // 通过 require 加载本地 jsPDF UMD 文件
    try {
    var jsPDFModule = require('@/libs/jspdf.umd.min.js');
    // UMD 格式在 CommonJS require 时，jsPDF 构造函数在多个位置
    _jsPDF = jsPDFModule && (jsPDFModule.jsPDF || jsPDFModule.default || (jsPDFModule.jspdf && jsPDFModule.jspdf.jsPDF)) || null;
    _jsPDFLoading = false;
    if (_jsPDF) {
      console.log('[APP] jsPDF 本地加载成功');
      callback(_jsPDF);
    } else {
      console.error('[APP] jsPDF 加载后格式异常');
      callback(null);
    }
  } catch (e) {
    console.error('[APP] jsPDF 本地加载失败:', e);
    _jsPDFLoading = false;
    callback(null);
  }
}
// #endif

// 小程序端：本地加载 jsPDF（数据驱动 PDF 生成，100%可靠）
// #ifdef MP-WEIXIN
var _jsPDF_WX = null;
var _jsPDFLoading_WX = false;
function _getJsPDF(callback) {
  if (_jsPDF_WX) { callback(_jsPDF_WX); return; }
  if (_jsPDFLoading_WX) {
    var t = setInterval(function() {
      if (_jsPDF_WX) { clearInterval(t); callback(_jsPDF_WX); }
    }, 100);
    setTimeout(function() { clearInterval(t); callback(null); }, 12000);
    return;
  }
  _jsPDFLoading_WX = true;
  try {
    var jsPDFModule = require('@/libs/jspdf.umd.min.js');
    _jsPDF_WX = jsPDFModule && (jsPDFModule.jsPDF || jsPDFModule.default || (jsPDFModule.jspdf && jsPDFModule.jspdf.jsPDF)) || null;
    _jsPDFLoading_WX = false;
    if (_jsPDF_WX) {
      console.log('[WX] jsPDF 本地加载成功');
      callback(_jsPDF_WX);
    } else {
      console.error('[WX] jsPDF 加载后格式异常');
      callback(null);
    }
  } catch (e) {
    console.error('[WX] jsPDF 本地加载失败:', e);
    _jsPDFLoading_WX = false;
    callback(null);
  }
}
// #endif

// H5端：本地加载 jsPDF（数据驱动 PDF 生成，100%可靠）
// #ifdef H5
var _jsPDF_H5 = null;
var _jsPDFLoading_H5 = false;
function _getJsPDF(callback) {
  console.log('[H5] _getJsPDF called, cached:', !!_jsPDF_H5, 'loading:', _jsPDFLoading_H5);
  if (_jsPDF_H5) { callback(_jsPDF_H5); return; }
  if (_jsPDFLoading_H5) {
    var t = setInterval(function() {
      if (_jsPDF_H5) { clearInterval(t); callback(_jsPDF_H5); }
    }, 100);
    setTimeout(function() { clearInterval(t); console.warn('[H5] jsPDF 等待超时'); callback(null); }, 12000);
    return;
  }
  _jsPDFLoading_H5 = true;
  try {
    var jsPDFModule = require('@/libs/jspdf.umd.min.js');
    console.log('[H5] require jsPDF 返回类型:', typeof jsPDFModule, 'keys:', jsPDFModule ? Object.keys(jsPDFModule).slice(0, 10) : 'null');
    _jsPDF_H5 = jsPDFModule && (jsPDFModule.jsPDF || jsPDFModule.default || (jsPDFModule.jspdf && jsPDFModule.jspdf.jsPDF)) || null;
    _jsPDFLoading_H5 = false;
    if (_jsPDF_H5) {
      console.log('[H5] jsPDF 本地加载成功');
      callback(_jsPDF_H5);
    } else {
      console.error('[H5] jsPDF 加载后格式异常, module keys:', jsPDFModule ? Object.keys(jsPDFModule) : 'null');
      callback(null);
    }
  } catch (e) {
    console.error('[H5] jsPDF 本地加载失败:', e);
    _jsPDFLoading_H5 = false;
    callback(null);
  }
}
// #endif

export default {
  data() {
    return {
      problems: [],
      showAnswers: false,
      params: {},
      currentPage: 1,
      perPage: 10, // 竖式12题，横式20题（onLoad中根据格式设置）
      currentFormat: 'horizontal',
      paramsBackup: null,
      // 横式自适应字号（rpx）
      horizFontSize: 48,
      // 横式智能布局（JS 计算，动态注入 CSS）
      horizGridStyle: '',
      horizItemStyle: '',
      horizHeaderStyle: '',   // 横式头部样式
      horizDividerStyle: '',  // 横式分隔线样式
      // 竖式智能布局（JS 计算，动态注入 CSS）
      vertFontSize: 68,
      vertGridStyle: '',
      vertItemStyle: '',
      vertCharStyle: '',
      vertEmptyMinH: '',
      vertLineW: 0,            // 统一横线宽度（rpx），全页所有竖式一致
      vertRuleStyle: '',       // 横线上方留白（JS动态）
      vertDivStyle: '',        // 除法容器样式（JS动态）
      vertHeaderStyle: '',     // 头部样式（JS动态）
      vertDividerStyle: '',    // 分隔线样式（JS动态）
      paperPageNumStyle: '',   // 纸张内页码样式（JS动态）
      // 缩放相关（movable-view 捏合缩放）
      paperScale: 1       // 当前缩放比例
    };
  },

  computed: {
    totalPages() {
      return Math.ceil(this.problems.length / this.perPage) || 1;
    },
    pageProblems() {
      const start = (this.currentPage - 1) * this.perPage;
      return this.problems.slice(start, start + this.perPage);
    }
  },

  watch: {
  },

  onLoad(options) {
    // 计算初始缩放：A4宽度(210mm)适配屏幕宽度
    const sysInfo = uni.getSystemInfoSync();
    const screenW = sysInfo.windowWidth;
    const availW = screenW - 16;
    const a4WidthPx = 210 * 3.7795;
    this.paperScale = Math.min(1, availW / a4WidthPx);

    if (options.params) {
      this.paramsBackup = options.params;
      this.params = JSON.parse(decodeURIComponent(options.params));
      this.currentFormat = this.params.format || 'horizontal';
      this.perPage = this.currentFormat === 'horizontal' ? 20 : 12;
      this.generateProblems();
    }
  },

  // 页面渲染完成后计算布局
  onReady() {
    this.$nextTick(() => {
      if (this.currentFormat === 'horizontal') {
        this.calcHorizLayout();
      } else {
        this.calcVerticalLayout();
      }
    });
  },

  // 页面卸载时清理
  onUnload() {
  },

  methods: {
    generateProblems() {
      try {
        clearGeneratedProblems();
        this.problems = generateWorksheet(this.params);
        this.currentPage = 1;
        uni.showToast({ title: '试卷生成成功', icon: 'success' });

        // 生成后计算布局
        this.$nextTick(() => {
          if (this.currentFormat === 'horizontal') {
            this.calcHorizLayout();
          } else {
            this.calcVerticalLayout();
          }
        });
      } catch (error) {
        console.error('生成试卷失败:', error);
        uni.showToast({ title: '生成失败，请重试', icon: 'none' });
      }
    },

    // 数字添加空格（竖式用）
    formatNumWithSpace(num) {
      return num.toString().split('').join(' ');
    },

    // 捏合缩放回调（movable-view @scale 事件）
    onScale(e) {
      if (e && e.scale !== undefined) {
        this.paperScale = e.scale;
      }
    },

    // 横式智能布局：调用共享模块计算，生成 CSS 样式注入
    calcHorizLayout() {
      var L = calcHorizontalLayout(this.pageProblems, this.showAnswers);
      if (!L) return;

      var MM2RPX = 3.78;

      // 字号
      this.horizFontSize = Math.round(L.fontMM * MM2RPX);

      // Grid 样式
      this.horizGridStyle =
        'display: grid;' +
        'grid-template-columns: repeat(2, 1fr);' +
        'grid-template-rows: repeat(10, 1fr);' +
        'column-gap: ' + L.colGap.toFixed(1) + 'mm;' +
        'row-gap: ' + L.rowGap.toFixed(1) + 'mm;' +
        'flex: 1; min-height: 0;';

      this.horizItemStyle =
        'height: auto; padding: ' + (L.rowGap / 3).toFixed(1) + 'mm 0;';

      // 页眉样式
      // HEADER_H = 25mm（含上页边距15mm），页面padding-top=15mm
      // 页眉净高 = 21 - 15 = 6mm，文字12pt居中于6mm区域内
      var headerNetH = L.headerH - (L.padTBTop || 15); // 6mm
      // 页眉字号现在用 pt，预览页需要 pt→mm→rpx 转换
      var headerFontMM = L.headerFontPt / MM2PT;  // 12pt → mm
      var headerPullUp = (L.padTBTop || 15) - headerFontMM; // 拉到padding区域内
      // margin-bottom = 页眉净高 - 文字拉回 + 分隔线到页眉间距
      // = 10mm - (-3mm拉回) → 不对，直接用固定值
      // 页眉块需要占据 HEADER_H - padTBTop = 10mm 的空间
      // margin-bottom 应使 header + divider 占满 10mm → margin-bottom = 10 - 12 + 3(headerPullUp) ... 
      // 简化：margin-bottom = (L.headerH - (L.padTBTop||15) - L.dividerH - (L.dividerGapToHeader||0)).toFixed(1)
      var headerMB = L.headerH - (L.padTBTop || 15) - L.dividerGapToHeader;
      this.horizHeaderStyle =
        'font-size: ' + Math.round(headerFontMM * MM2RPX) + 'rpx;' +
        'font-weight: bold;' +
        'margin-top: -' + headerPullUp.toFixed(1) + 'mm;' +
        'margin-bottom: ' + headerMB.toFixed(1) + 'mm;' +
        'letter-spacing: ' + Math.round(0.3 * MM2RPX) + 'rpx;' +
        'justify-content: center;' +
        'gap: 80rpx;';

      this.horizDividerStyle =
        'height: 0.3mm;' +
        'margin-bottom: ' + L.dividerGap.toFixed(1) + 'mm;';

      // 纸张内页码（横式）
      var pageNumFontMM = L.pageNumFontPt / MM2PT;  // pt → mm
      this.paperPageNumStyle =
        'font-size: ' + Math.round(pageNumFontMM * MM2RPX) + 'rpx;' +
        'bottom: ' + L.pageNumBottom.toFixed(1) + 'mm;';
    },

    // 竖式智能布局：调用共享模块计算，生成 CSS 样式注入
    calcVerticalLayout() {
      var L = calcVerticalLayout(this.pageProblems, this.showAnswers);
      if (!L) return;

      var MM2RPX = 3.78;

      // 字号
      this.vertFontSize = Math.round(L.fontMM * MM2RPX);
      this.vertLineW = Math.round(L.lineW * MM2RPX);

      // 页眉样式
      // HEADER_H = headerFont × 2.2 = 26.4mm（含上页边距），页面padding-top=15mm
      var vertHeaderFontMM = L.headerFontPt / MM2PT;  // pt → mm
      var headerPullUp = 15 - vertHeaderFontMM; // 拉到页眉区域内合适位置
      this.vertHeaderStyle =
        'font-size: ' + Math.round(vertHeaderFontMM * MM2RPX) + 'rpx;' +
        'font-weight: bold;' +
        'margin-top: -' + headerPullUp.toFixed(1) + 'mm;' +
        'margin-bottom: ' + L.headerGap.toFixed(1) + 'mm;' +
        'letter-spacing: ' + Math.round(0.3 * MM2RPX) + 'rpx;' +
        'justify-content: center;' +
        'gap: 80rpx;';

      this.vertDividerStyle =
        'height: 0.3mm;' +
        'margin-bottom: ' + L.dividerGap.toFixed(1) + 'mm;';

      // 纸张内页码（竖式，字号复用 headerFont）
      var vertPageNumFontMM = L.pageNumFontPt / MM2PT;  // pt → mm
      this.paperPageNumStyle =
        'font-size: ' + Math.round(vertPageNumFontMM * MM2RPX) + 'rpx;' +
        'bottom: ' + L.pageNumBottom.toFixed(1) + 'mm;';

      // 转 rpx
      var answerRpx = Math.round(L.answerH * MM2RPX);
      var ruleTopRpx = Math.round(L.ruleTop * MM2RPX);
      var digitGapRpx = Math.round(L.digitGap * MM2RPX);
      var letterSpacingRpx = Math.round(L.letterSpacing * MM2RPX);

      // Grid 样式：强制3列×4行布局
      this.vertGridStyle =
        'display: grid;' +
        'grid-template-columns: repeat(3, 1fr);' +
        'column-gap: ' + L.colGap.toFixed(1) + 'mm;' +
        'row-gap: ' + L.rowGap.toFixed(1) + 'mm;' +
        'flex: 1; min-height: 0;' +
        'align-content: flex-start;';

      this.vertItemStyle =
        'display: flex; align-items: flex-start; justify-content: center;' +
        'overflow: hidden;' +
        'min-width: 0;';

      // char-vertical 容器样式（预览页宽度自适应item，不设固定width）
      this.vertCharStyle =
        'font-size: ' + this.vertFontSize + 'rpx;' +
        'line-height: ' + L.lineHRatio.toFixed(2) + ';' +
        'font-family: "Courier New", Courier, monospace;' +
        'letter-spacing: ' + letterSpacingRpx + 'rpx;' +
        'width: auto;' +
        'padding-top: ' + digitGapRpx + 'rpx;' +
        'box-sizing: border-box;';

      this.vertRuleStyle = 'margin-top: ' + ruleTopRpx + 'rpx;';
      this.vertEmptyMinH = 'min-height: ' + answerRpx + 'rpx;';
      this.vertDivStyle = 'width: auto;';
    },

    toggleAnswers() {
      this.showAnswers = !this.showAnswers;
      this.$nextTick(() => {
        if (this.currentFormat === 'horizontal') {
          this.calcHorizLayout();
        } else {
          this.calcVerticalLayout();
        }
      });
    },

    // 翻页：上一页
    prevPage() {
      if (this.currentPage <= 1) return;
      this.currentPage--;
      this._afterPageChange();
    },

    // 翻页：下一页
    nextPage() {
      if (this.currentPage >= this.totalPages) return;
      this.currentPage++;
      this._afterPageChange();
    },

    // 翻页后重置缩放位置 + 重新计算布局
    _afterPageChange() {
      this.paperScale = (() => {
        const sysInfo = uni.getSystemInfoSync();
        const screenW = sysInfo.windowWidth;
        const availW = screenW - 16;
        const a4WidthPx = 210 * 3.7795;
        return Math.min(1, availW / a4WidthPx);
      })();
      this.$nextTick(() => {
        if (this.currentFormat === 'horizontal') {
          this.calcHorizLayout();
        } else {
          this.calcVerticalLayout();
        }
      });
    },

    regenerate() {
      uni.showModal({
        title: '提示',
        content: '重新生成将替换当前试卷，是否继续？',
        success: (res) => {
          if (res.confirm) {
            this.generateProblems();
          }
        }
      });
    },


    // ========== 保存PDF（三端统一：数据驱动 + pdfBuilder.js） ==========
    savePDF() {
      if (!this.problems || this.problems.length === 0) {
        uni.showToast({ title: '没有题目可保存', icon: 'none' });
        return;
      }

      // 三端统一：逻辑层直接调用 pdfBuilder.js 生成 PDF
      this._savePDFLogic();
    },

    // 三端统一：逻辑层直接生成PDF（数据驱动，不依赖 DOM）
    _savePDFLogic() {
      var self = this;
      uni.showLoading({ title: '正在生成PDF...', mask: true });

      _getJsPDF(function(JsPDF) {
        if (!JsPDF) {
          uni.hideLoading();
          uni.showModal({ title: '错误', content: 'PDF库加载失败，请重启应用重试', showCancel: false });
          return;
        }

        // 字体已内联，直接获取（同步，无网络请求）
        var fontBase64 = getFontBase64();
        if (!fontBase64) {
          console.warn('[savePDFLogic] 字体数据为空，PDF中文可能乱码');
        }

        try {
          var base64DataUri = buildPDF(JsPDF, self.problems, self.currentFormat, self.showAnswers, self.perPage, fontBase64);
          uni.hideLoading();
          // #ifdef APP-PLUS
          self._savePDFFile(base64DataUri);
          // #endif
          // #ifdef H5
          self._downloadPDF(base64DataUri);
          // #endif
          // #ifdef MP-WEIXIN
          self._savePDFToWxFile(base64DataUri);
          // #endif
        } catch (e) {
          uni.hideLoading();
          console.error('[savePDFLogic] PDF生成异常:', e);
          console.error('[savePDFLogic] 详细堆栈:', e.stack);
          uni.showToast({ title: 'PDF生成失败: ' + (e.message || e), icon: 'none', duration: 3000 });
        }
      });
    },

    // ========== 直接打印（三端统一：数据驱动 + pdfBuilder.js） ==========
    printDirect() {
      if (!this.problems || this.problems.length === 0) {
        uni.showToast({ title: '没有题目可打印', icon: 'none' });
        return;
      }

      // #ifdef APP-PLUS || H5
      this._printLogic();
      // #endif

      // #ifdef MP-WEIXIN
      // 微信小程序：提示用户保存后打印
      uni.showModal({
        title: '提示',
        content: '小程序不支持直接打印，请使用"保存PDF"功能，然后从文件管理器打开打印',
        showCancel: false
      });
      // #endif
    },

    // APP/H5端：逻辑层生成PDF → 分发打印（数据驱动，不依赖 DOM）
    _printLogic() {
      var self = this;
      uni.showLoading({ title: '正在生成PDF...', mask: true });

      _getJsPDF(function(JsPDF) {
        if (!JsPDF) {
          uni.hideLoading();
          uni.showModal({ title: '错误', content: 'PDF库加载失败，请重启应用重试', showCancel: false });
          return;
        }

        var fontBase64 = getFontBase64();

        try {
          var base64DataUri = buildPDF(JsPDF, self.problems, self.currentFormat, self.showAnswers, self.perPage, fontBase64);
          console.log('[_printLogic] PDF生成成功，长度:', base64DataUri.length);
          // #ifdef APP-PLUS
          self._printViaFile(base64DataUri);
          // #endif
          // #ifdef H5
          self._printViaBrowser(base64DataUri);
          // #endif
        } catch (e) {
          uni.hideLoading();
          console.error('[_printLogic] PDF生成异常:', e);
          uni.showToast({ title: 'PDF生成失败: ' + (e.message || e), icon: 'none', duration: 3000 });
        }
      });
    },

    // ========== APP端：保存PDF文件（plus.android 原生方式） ==========
    // 与旧版本一致：Java 原生 IO，100% 兼容 HarmonyOS
    // 流程：请求权限 → SAF 选择保存路径 → Java FileOutputStream 写入
    _savePDFFile(base64DataUri) {
      // #ifdef APP-PLUS
      var commaIdx = base64DataUri.indexOf(',');
      var pureBase64 = (commaIdx >= 0) ? base64DataUri.slice(commaIdx + 1) : base64DataUri;

      var self = this;
      var now = new Date();
      var pad = function(n) { return String(n).padStart(2, '0'); };
      var dateStr = now.getFullYear() + '' + pad(now.getMonth()+1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes());
      var fileName = '数学练习题_' + dateStr + '.pdf';

      // 第1步：申请存储权限
      plus.android.requestPermissions(
        ['android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.READ_EXTERNAL_STORAGE'],
        function(result) {
          if (result && result.deniedAlways && result.deniedAlways.length > 0) {
            // 用户永久拒绝权限，引导去设置
            uni.hideLoading();
            uni.showModal({
              title: '需要存储权限',
              content: '请允许访问存储空间以保存PDF文件',
              confirmText: '去设置',
              success: function(res) {
                if (res.confirm) {
                  var Intent = plus.android.importClass('android.content.Intent');
                  var Settings = plus.android.importClass('android.provider.Settings');
                  var Uri = plus.android.importClass('android.net.Uri');
                  var mainActivity = plus.android.runtimeMainActivity();
                  var intent = new Intent();
                  intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                  intent.setData(Uri.fromParts('package', mainActivity.getPackageName(), null));
                  mainActivity.startActivity(intent);
                }
              }
            });
            return;
          }

          // 第2步：弹出 SAF 文件选择器，让用户指定保存路径
          self._showSAFSaveDialog(pureBase64, fileName);
        },
        function(error) {
          console.warn('[_savePDFFile] 权限请求异常:', error && error.message);
          // 即使权限异常也尝试弹出 SAF 选择器（SAF 本身不需要存储权限）
          self._showSAFSaveDialog(pureBase64, fileName);
        }
      );
      // #endif
    },

    // 弹出 SAF 文件选择器（ACTION_CREATE_DOCUMENT）
    // 流程：先写入临时文件 → 弹出 SAF 让用户选位置 → 从临时文件复制到目标 → 显示成功
    _showSAFSaveDialog(pureBase64, suggestedFileName) {
      // #ifdef APP-PLUS
      var self = this;

      // 第1步：先把 PDF 写入临时文件（Java 原生 IO，与旧版本一致）
      uni.showLoading({ title: '正在保存PDF...', mask: true });

      try {
        var File = plus.android.importClass('java.io.File');
        var FileOutputStream = plus.android.importClass('java.io.FileOutputStream');

        var tempDir = '/storage/emulated/0/MathPractice/';
        var tempDirFile = new File(tempDir);
        if (!tempDirFile.exists()) { tempDirFile.mkdirs(); }
        var tempPath = tempDir + suggestedFileName;

        // Base64 → byte[]
        var binaryStr = atob(pureBase64);
        var len = binaryStr.length;
        var byteArr = [];
        for (var i = 0; i < len; i++) {
          byteArr.push(binaryStr.charCodeAt(i) >= 128 ? binaryStr.charCodeAt(i) - 256 : binaryStr.charCodeAt(i));
        }

        // Java 原生 IO 写入临时文件
        var fos = new FileOutputStream(tempPath);
        fos.write(byteArr);
        fos.close();
        console.log('[_showSAFSaveDialog] 临时文件写入成功:', tempPath, '大小:', len, '字节');

        // 验证临时文件确实存在且非空
        var tempFile = new File(tempPath);
        if (!tempFile.exists() || tempFile.length() === 0) {
          uni.hideLoading();
          uni.showModal({ title: '保存失败', content: 'PDF文件写入失败，请检查存储权限后重试', showCancel: false });
          return;
        }

        console.log('[_showSAFSaveDialog] 临时文件验证通过，大小:', tempFile.length(), '字节');

        // 第2步：弹出 SAF 文件选择器，让用户指定保存路径
        uni.hideLoading();

        try {
          var Intent = plus.android.importClass('android.content.Intent');
          var mainActivity = plus.android.runtimeMainActivity();
          var intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
          intent.addCategory(Intent.CATEGORY_OPENABLE);
          intent.setType('application/pdf');
          intent.putExtra(Intent.EXTRA_TITLE, suggestedFileName);

          // 记录临时文件路径，用于 SAF 回调时复制
          self._safTempPath = tempPath;
          self._safFileName = suggestedFileName;

          // 监听 Activity 返回结果（uni-app 标准方式）
          plus.android.onActivityResult = function(requestCode, resultCode, data) {
            console.log('[_showSAFSaveDialog] onActivityResult 触发, requestCode:', requestCode, 'resultCode:', resultCode);
            self._onSAFResult(requestCode, resultCode, data);
          };

          mainActivity.startActivityForResult(intent, 1001);
          console.log('[_showSAFSaveDialog] SAF 选择器已启动');

          // 超时保护：如果 60 秒内 SAF 回调未触发，直接打开临时文件
          if (self._safTimeout) { clearTimeout(self._safTimeout); }
          self._safTimeout = setTimeout(function() {
            console.warn('[_showSAFSaveDialog] SAF 回调超时(60s)，打开临时文件');
            self._safTimeout = null;
            self._safTempPath = tempPath;
            self._safFileName = suggestedFileName;
            self._showSaveSuccess(tempPath, suggestedFileName, true);
          }, 60000);

        } catch (safErr) {
          console.error('[_showSAFSaveDialog] SAF 弹出异常:', safErr);
          // SAF 不可用，降级：直接打开临时文件
          self._showSaveSuccess(tempPath, suggestedFileName, true);
        }

      } catch (e) {
        console.error('[_showSAFSaveDialog] 临时文件写入异常:', e);
        uni.hideLoading();
        uni.showModal({
          title: '保存失败',
          content: 'PDF文件写入异常：' + (e.message || '未知错误'),
          showCancel: false
        });
      }
      // #endif
    },

    // SAF 回调处理（用户选择保存位置后触发）
    // 参数来自 plus.android.onActivityResult(requestCode, resultCode, data)
    _onSAFResult(requestCode, resultCode, data) {
      // #ifdef APP-PLUS
      console.log('[_onSAFResult] requestCode:', requestCode, 'resultCode:', resultCode);

      // 清除超时保护
      if (this._safTimeout) {
        clearTimeout(this._safTimeout);
        this._safTimeout = null;
      }

      // 只处理我们发起的请求（requestCode = 1001）
      if (requestCode !== 1001) return;

      // 没有临时文件路径，无法继续
      if (!this._safTempPath) {
        console.warn('[_onSAFResult] 无临时文件路径');
        return;
      }

      // Android Activity.RESULT_CANCELED = 0
      // Android Activity.RESULT_OK = -1
      if (resultCode !== -1) {
        // 用户取消了选择 → 文件已在临时目录，直接打开临时文件
        console.log('[_onSAFResult] 用户取消选择，打开临时文件');
        this._showSaveSuccess(this._safTempPath, this._safFileName, true);
        return;
      }

      // 用户选择了保存位置 → 将临时文件复制到目标位置
      try {
        if (!data) {
          console.warn('[_onSAFResult] data 为空，降级打开临时文件');
          this._showSaveSuccess(this._safTempPath, this._safFileName, true);
          return;
        }

        // 从 Intent data 中获取 Uri
        var uri = data.getData ? data.getData() : null;
        if (!uri) {
          console.warn('[_onSAFResult] 无法获取目标 Uri，降级打开临时文件');
          this._showSaveSuccess(this._safTempPath, this._safFileName, true);
          return;
        }

        uni.showLoading({ title: '正在保存...', mask: true });

        var self = this;
        var targetUriStr = uri.toString();
        console.log('[_onSAFResult] 目标路径:', targetUriStr);

        // 使用 ContentResolver 将临时文件复制到用户选择的位置
        var FileInputStream = plus.android.importClass('java.io.FileInputStream');
        var mainActivity = plus.android.runtimeMainActivity();
        var resolver = mainActivity.getContentResolver();

        var fis = new FileInputStream(this._safTempPath);
        var os = resolver.openOutputStream(uri);

        if (!os) {
          uni.hideLoading();
          console.error('[_onSAFResult] openOutputStream 返回 null');
          this._showSaveSuccess(this._safTempPath, this._safFileName, true);
          return;
        }

        // 缓冲区复制
        var buf = [];
        for (var i = 0; i < 4096; i++) { buf.push(0); }
        var bytesRead;
        while ((bytesRead = fis.read(buf)) !== -1) {
          os.write(buf.slice(0, bytesRead));
        }
        os.flush();
        os.close();
        fis.close();

        console.log('[_onSAFResult] 文件已保存到用户选择的位置');
        uni.hideLoading();

        // 保存成功：显示目标路径 + 提示打开
        this._showSaveSuccess(this._safTempPath, this._safFileName, false, targetUriStr);

      } catch (e) {
        console.error('[_onSAFResult] 复制到目标路径失败:', e);
        uni.hideLoading();
        // 降级：临时文件已存在，直接打开
        this._showSaveSuccess(this._safTempPath, this._safFileName, true);
      }
      // #endif
    },

    // 显示保存成功弹窗并打开PDF
    // @param {String} filePath - 本地文件路径（用于打开）
    // @param {String} fileName - 文件名
    // @param {Boolean} isTempLocation - 是否保存到临时目录（true=固定目录，false=用户自选目录）
    // @param {String} targetUriStr - 用户通过 SAF 选择的目标路径（可选）
    _showSaveSuccess(filePath, fileName, isTempLocation, targetUriStr) {
      // #ifdef APP-PLUS
      // 构建保存位置描述
      var locationDesc = '';
      if (isTempLocation) {
        locationDesc = '文件保存在：MathPractice 文件夹\n（手机存储根目录）';
      } else if (targetUriStr) {
        // 从 SAF Uri 中提取可读路径（如 content://... → 显示文件名）
        locationDesc = '文件已保存到您选择的位置';
      } else {
        locationDesc = '文件已保存';
      }

      var msg = locationDesc + '\n\n文件名：' + fileName + '\n\n是否立即打开查看？';

      uni.showModal({
        title: '✅ 保存成功',
        content: msg,
        confirmText: '打开',
        cancelText: '关闭',
        success: function(res) {
          if (res.confirm && filePath) {
            plus.runtime.openFile(filePath);
          }
        }
      });
      // #endif
    },

    // ========== APP端：打印（申请权限 → Java IO 写文件 → 打开PDF） ==========
    _printViaFile(base64DataUri) {
      // #ifdef APP-PLUS
      console.log('[printViaFile] 开始打印流程');

      // 第1步：检查 base64 数据
      var commaIdx = base64DataUri.indexOf(',');
      var pureBase64 = (commaIdx >= 0) ? base64DataUri.slice(commaIdx + 1) : base64DataUri;
      if (!pureBase64 || pureBase64.length < 50) {
        uni.hideLoading();
        uni.showToast({ title: 'PDF数据异常，请重试', icon: 'none', duration: 3000 });
        return;
      }
      console.log('[printViaFile] base64 length:', pureBase64.length);

      // 第2步：申请存储权限
      var self = this;
      plus.android.requestPermissions(
        ['android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.READ_EXTERNAL_STORAGE'],
        function(event) {
          console.log('[printViaFile] 权限 granted:', event.granted, 'denied:', event.deniedPresent);
          self._doWritePdfAndOpen(pureBase64);
        },
        function(error) {
          console.warn('[printViaFile] 权限请求异常:', error && error.message);
          self._doWritePdfAndOpen(pureBase64);
        }
      );
      // #endif
    },

    // 实际写入 PDF 并打开（plus.android 原生 Java IO，与旧版本一致）
    _doWritePdfAndOpen(pureBase64) {
      // #ifdef APP-PLUS
      try {
        var now = new Date();
        var pad2 = function(n) { return String(n).padStart(2, '0'); };
        var dateStr = now.getFullYear() + '' + pad2(now.getMonth() + 1) + pad2(now.getDate()) + pad2(now.getHours()) + pad2(now.getMinutes());
        var fileName = '数学练习题_' + dateStr + '.pdf';
        var dirPath = '/storage/emulated/0/MathPractice/';
        var filePath = dirPath + fileName;

        console.log('[doWritePdfAndOpen] 开始写入, file:', filePath);

        // Base64 → Java byte[]
        var binaryStr = atob(pureBase64);
        var len = binaryStr.length;
        var byteArr = [];
        for (var j = 0; j < len; j++) {
          byteArr.push(binaryStr.charCodeAt(j) >= 128 ? binaryStr.charCodeAt(j) - 256 : binaryStr.charCodeAt(j));
        }

        // Java 原生 IO 写入
        var File = plus.android.importClass('java.io.File');
        var FileOutputStream = plus.android.importClass('java.io.FileOutputStream');
        var dir = new File(dirPath);
        if (!dir.exists()) { dir.mkdirs(); }
        var fos = new FileOutputStream(filePath);
        fos.write(byteArr);
        fos.close();

        console.log('[doWritePdfAndOpen] 写入完成, bytes:', len);

        uni.hideLoading();
        uni.showToast({ title: '正在打开PDF...', icon: 'success', duration: 1500 });

        var self = this;
        setTimeout(function() {
          self._launchPrint(filePath);
        }, 500);
      } catch (e) {
        console.error('[doWritePdfAndOpen] 异常:', e.message || e);
        uni.hideLoading();
        uni.showToast({ title: '生成失败: ' + (e.message || '未知错误'), icon: 'none', duration: 3000 });
      }
      // #endif
    },

    // APP端：打开 PDF 文件
    // plus.runtime.openFile(filepath, options, errorCB)
    //   filepath: 绝对路径（如 /storage/emulated/0/MathPractice/xxx.pdf）
    //   options: null（不指定优先应用，让系统自动选择）
    //   errorCB: 打开失败的回调
    _launchPrint(filePath) {
      // #ifdef APP-PLUS
      console.log('[launchPrint] 打开文件:', filePath);

      plus.runtime.openFile(filePath, null, function(e) {
        console.warn('[launchPrint] 打开失败:', e && e.message);
        uni.showModal({
          title: '提示',
          content: '自动打开失败\n\n请在「文件管理」中找到 MathPractice 文件夹手动打开',
          showCancel: false,
          confirmText: '知道了'
        });
      });
      // #endif
    },

    // ========== H5端：下载PDF文件 ==========
    _downloadPDF(base64DataUri) {
      // #ifdef H5
      console.log('[H5] _downloadPDF called, dataUri length:', base64DataUri ? base64DataUri.length : 0);
      try {
        var now = new Date();
        var pad = function(n) { return String(n).padStart(2, '0'); };
        var dateStr = now.getFullYear() + '' + pad(now.getMonth()+1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes());
        var fileName = '数学练习题_' + dateStr + '.pdf';

        // 将 data URI 转为 Blob 再下载（比直接 a.href=dataURI 更可靠）
        var parts = base64DataUri.split(',');
        var mimeMatch = parts[0].match(/:(.*?);/);
        var mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        var raw = atob(parts[1]);
        var arr = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) { arr[i] = raw.charCodeAt(i); }
        var blob = new Blob([arr], { type: mime });
        var url = URL.createObjectURL(blob);

        var link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 释放 URL
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        uni.showToast({ title: 'PDF已开始下载', icon: 'success' });
      } catch (e) {
        console.error('[H5] _downloadPDF 异常:', e);
        uni.showToast({ title: 'PDF下载失败: ' + (e.message || e), icon: 'none', duration: 3000 });
      }
      // #endif
    },

    // ========== H5端：PDF打印（与APP端统一逻辑） ==========
    _printViaBrowser(base64DataUri) {
      // #ifdef H5
      var self = this;

      // 动态加载 pdf.js（如果还没加载）
      if (!window.pdfjsLib) {
        console.log('[_printViaBrowser] 加载 pdf.js...');
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
        script.onload = function() {
          console.log('[_printViaBrowser] pdf.js 加载完成');
          self._renderPDFAndPrint(base64DataUri);
        };
        script.onerror = function() {
          console.error('[_printViaBrowser] pdf.js 加载失败');
          uni.hideLoading();
          uni.showToast({ title: 'PDF库加载失败，请检查网络', icon: 'none', duration: 3000 });
        };
        document.head.appendChild(script);
      } else {
        // pdf.js 已加载，直接渲染
        this._renderPDFAndPrint(base64DataUri);
      }
      // #endif
    },

    // ========== H5端：渲染PDF并打印（iframe隔离方案） ==========
    _renderPDFAndPrint(base64DataUri) {
      // #ifdef H5
      var self = this;

      console.log('[_renderPDFAndPrint] 开始渲染PDF，base64长度:', base64DataUri.length);

      // 检查pdf.js是否可用
      if (!window.pdfjsLib) {
        console.error('[_renderPDFAndPrint] pdfjsLib 未加载');
        uni.hideLoading();
        uni.showToast({ title: 'PDF库未加载', icon: 'none', duration: 3000 });
        return;
      }

      // 提取base64数据
      var base64Data = base64DataUri.split(',')[1];
      if (!base64Data) {
        console.error('[_renderPDFAndPrint] 无法提取base64数据');
        uni.hideLoading();
        uni.showToast({ title: 'PDF数据格式错误', icon: 'none', duration: 3000 });
        return;
      }

      // 解码base64
      var pdfData;
      try {
        pdfData = atob(base64Data);
      } catch (e) {
        console.error('[_renderPDFAndPrint] base64解码失败:', e);
        uni.hideLoading();
        uni.showToast({ title: 'PDF数据解码失败', icon: 'none', duration: 3000 });
        return;
      }

      // 用pdf.js加载PDF
      var loadingTask = window.pdfjsLib.getDocument({ data: pdfData });

      loadingTask.promise.then(function(pdf) {
        console.log('[_renderPDFAndPrint] PDF加载成功，页数:', pdf.numPages);

        var canvases = [];
        var renderPromises = [];
        var totalPages = pdf.numPages;

        // 在主文档中渲染所有canvas（确保pdf.js正常工作）
        for (var pageNum = 1; pageNum <= totalPages; pageNum++) {
          (function(pageNum) {
            var renderPromise = pdf.getPage(pageNum).then(function(page) {
              var viewport = page.getViewport({ scale: 2.0 });
              var canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              // 非最后一页设置分页
              if (pageNum < totalPages) {
                canvas.style.pageBreakAfter = 'always';
              }
              var ctx = canvas.getContext('2d');
              return page.render({
                canvasContext: ctx,
                viewport: viewport
              }).promise.then(function() {
                canvases.push(canvas);
              });
            });
            renderPromises.push(renderPromise);
          })(pageNum);
        }

        Promise.all(renderPromises).then(function() {
          console.log('[_renderPDFAndPrint] 所有canvas渲染完成，数量:', canvases.length);

          // 创建隐藏的iframe，用srcdoc确保内容就绪
          var iframe = document.createElement('iframe');
          iframe.style.position = 'fixed';
          iframe.style.left = '0';
          iframe.style.top = '0';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = 'none';
          iframe.style.opacity = '0';
          iframe.srcdoc = '<!DOCTYPE html><html><head><style>'
            + '* { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }'
            + 'body { background: #fff !important; }'
            + 'canvas { display: block !important; width: 210mm !important; height: 297mm !important; page-break-inside: avoid !important; }'
            + '@page { size: A4 portrait; margin: 0; }'
            + '</style></head><body></body></html>';
          document.body.appendChild(iframe);

          // srcdoc的iframe onload一定会触发（有内容加载）
          iframe.onload = function() {
            var iframeBody = (iframe.contentDocument || iframe.contentWindow.document).body;

            // 将渲染好的canvas移动到iframe中
            for (var i = 0; i < canvases.length; i++) {
              iframeBody.appendChild(canvases[i]);
            }

            console.log('[_renderPDFAndPrint] canvas已移入iframe，准备打印');

            // 等待布局完成后打印
            setTimeout(function() {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();

              // 打印完成后清理
              setTimeout(function() {
                if (iframe.parentNode) {
                  iframe.parentNode.removeChild(iframe);
                }
                uni.hideLoading();
                console.log('[_renderPDFAndPrint] iframe已清理');
              }, 2000);
            }, 300);
          };

        }).catch(function(err) {
          console.error('[_renderPDFAndPrint] 渲染失败:', err);
          uni.hideLoading();
          uni.showToast({ title: 'PDF渲染失败', icon: 'none', duration: 3000 });
        });

      }).catch(function(err) {
        console.error('[_renderPDFAndPrint] PDF加载失败:', err);
        uni.hideLoading();
        uni.showToast({ title: 'PDF加载失败', icon: 'none', duration: 3000 });
      });
      // #endif
    },



    // ========== 微信小程序：保存PDF到本地 ==========
    _savePDFToWxFile(base64DataUri, isForPrint) {
      // #ifdef MP-WEIXIN
      const commaIdx = base64DataUri.indexOf(',');
      const pureBase64 = base64DataUri.slice(commaIdx + 1);

      // 将 base64 转为 ArrayBuffer
      const binaryStr = atob(pureBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const buffer = bytes.buffer;

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
      const filePath = `${uni.env.USER_DATA_PATH}/数学练习题_${dateStr}.pdf`;

      const fsm = uni.getFileSystemManager();
      fsm.writeFile({
        filePath,
        data: buffer,
        encoding: 'binary',
        success: () => {
          uni.hideLoading();
          uni.openDocument({
            filePath,
            showMenu: true,
            fileType: 'pdf',
            success: () => {
              if (isForPrint) {
                uni.showModal({
                  title: '打印指引',
                  content: 'PDF已打开，请按以下步骤打印：\n1. 点击右上角 "..." 菜单\n2. 选择"用其他应用打开"\n3. 选择打印机或打印服务',
                  showCancel: false,
                  confirmText: '知道了'
                });
              } else {
                uni.showModal({
                  title: '保存成功',
                  content: 'PDF已打开，请点击右上角 "..." 保存到手机或用其他应用打开。',
                  showCancel: false,
                  confirmText: '知道了'
                });
              }
            },
            fail: () => {
              uni.showToast({ title: '无法打开PDF，请检查文件管理器权限', icon: 'none', duration: 3000 });
            }
          });
        },
        fail: () => {
          uni.hideLoading();
          uni.showToast({ title: 'PDF生成失败', icon: 'none' });
        }
      });
      // #endif
    }
  }
};
</script>

<style lang="scss" scoped>
/* ========== 页面整体 ========== */
.page {
  min-height: 100vh;
  background: $gray-100;
  padding-bottom: 0; /* paper-area 已用 height:100vh-70px 占满，不需要额外 padding */
}

/* ========== movable-area 缩放区域 ========== */
.paper-area {
  width: 100%;
  /* 底部操作栏约 120rpx（88rpx按钮 + 32rpx padding） */
  height: calc(100vh - 60px);
  overflow: hidden;
}

/* ========== movable-view 可移动/缩放容器 ========== */
.paper-movable {
  width: 210mm;
  height: auto;
}

/* ========== A4纸张（真实物理尺寸） ========== */
.a4-paper {
  background: #FFFFFF;
  /* A4 物理尺寸：210mm × 297mm */
  width: 210mm;
  height: 297mm;
  margin: 8px auto;
  padding: 15mm 10mm;
  border-radius: 0;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  position: relative; /* 支持纸张内页码绝对定位 */
}

/* 纸张内页码：绝对定位在纸张底部 0.5cm，居中，仅多页时显示 */
.paper-page-num {
  position: absolute;
  left: 0;
  right: 0;
  text-align: center;
  color: #000000;
  font-weight: normal;
  letter-spacing: 0.5px;
  /* font-size 和 bottom 由 JS 动态注入 */
}

/* 竖式A4纸：页边距上下15mm左右10mm，其余由JS算法控制 */
.a4-paper.no-padding {
  padding: 15mm 10mm;
}

/* 竖式模式下头部和间距全部由JS动态注入，不硬编码 */

/* ========== 纸张头部信息（横式/竖式样式各自独立注入） ========== */
.paper-header {
  display: flex;
  align-items: baseline;
  justify-content: center;
  color: #000000;
  /* 横式：horizHeaderStyle / 竖式：vertHeaderStyle 动态注入（所有样式由JS控制，包括font-size和margin） */
  letter-spacing: 0.5px;
}

.header-name,
.header-date {
  display: inline;
}

/* ========== 分隔线（横式/竖式样式各自独立注入） ========== */
.paper-divider {
  width: 100%;
  background: #D1D5DB;
  /* 横式：horizDividerStyle / 竖式：vertDividerStyle 动态注入（高度和margin由JS控制） */
}

/* ========== 横式计算：CSS Grid 骨架（间距由 JS 动态计算） ========== */
.horizontal-grid {
  /* 实际样式由 horizGridStyle 动态注入 */
  flex: 1;
  min-height: 0;
  overflow: hidden;
  font-family: 'Courier New', 'SimHei', monospace;
  align-items: center;
}

.horizontal-item {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;
}

.expression {
  font-family: 'Courier New', 'SimHei', monospace;
  font-weight: bold;
  letter-spacing: 0;
  color: #000000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
  line-height: 1;
}

.expression.answer-show {
  color: #666;
  font-weight: normal;
}

/* 横式答案空白区（=号后手写空间） */
.answer-blank {
  flex: 1;
  min-height: 1em;
  border-bottom: none;
  margin-left: 2px;
}

/* ========== 竖式计算：3列×4行（间距由 JS 动态计算） ========== */
.vertical-grid {
  /* 基础骨架，实际样式由 vertGridStyle 动态注入 */
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  min-height: 0;
}

.vertical-item {
  /* 基础骨架，实际样式由 vertItemStyle 动态注入 */
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: hidden;
}

/* 竖式通用包装器 */
.vertical-wrapper {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* 加减乘竖式容器 — CSS Grid 骨架（宽度由 vertCharStyle 统一注入） */
.char-vertical {
  display: grid;
  grid-template-columns: 1em 1fr auto;
  grid-template-rows: auto auto auto 1fr;
  row-gap: 0;
  line-height: 1;
  /* width、padding-top、font-size、letter-spacing 均由 vertCharStyle 统一动态注入 */
}

/* 第一行数字 */
.char-vertical .line1 {
  grid-column: 2 / 4;
  grid-row: 1;
  font-weight: bold;
  text-align: right;
  min-width: 2em;
}

/* 运算符号（字号由模板动态绑定） */
.char-vertical .operator-char {
  grid-column: 1;
  grid-row: 2;
  font-weight: 900;
  text-align: center;
  line-height: 1;
  align-self: end;
}

/* 第二行数字 */
.char-vertical .num2-span {
  grid-column: 2 / 4;
  grid-row: 2;
  font-weight: bold;
  text-align: right;
}

/* 横线（margin-top 由 vertRuleStyle 动态注入） */
.char-vertical .divider {
  grid-column: 1 / 4;
  grid-row: 3;
  border-top: 1.5px solid #000;
}

/* 答案空白区（高度由 JS 动态注入） */
.char-vertical .empty-line {
  grid-column: 1 / 4;
  grid-row: 4;
}

.answer-text {
  font-weight: bold;
  color: #000;
  text-align: right;
  display: block;
  width: 100%;
}

/* 除法竖式容器（宽度由 vertDivStyle 统一注入，跟随统一横线宽度） */
.division-wrapper {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
}

.division-body {
  display: flex;
  align-items: flex-end;
}

.division-divisor {
  padding-right: 6px;
  font-weight: bold;
}

.division-sign {
  border-left: 2.5px solid #000;
  border-top: 2.5px solid #000;
  padding: 2px 6px 2px 5px;
  margin-right: 2px;
  border-radius: 3px 0 0 0;
  display: flex;
  align-items: center;
}

.division-dividend {
  font-weight: bold;
}

.division-empty-line {
  width: 100%;
}



/* ========== 底部操作栏（单行4按钮，对齐项目设计系统） ========== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: $white;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.08);
  z-index: 100;
  box-sizing: border-box;
}

.btn-row {
  display: flex;
  gap: 16rpx;
  align-items: stretch;
}

/* 所有按钮基础样式 */
.btn {
  flex: 1;
  min-height: 88rpx;
  border-radius: $border-radius-btn;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;
  box-sizing: border-box;

  &.disabled {
    opacity: 0.42;
    pointer-events: none;
  }

  &:active:not(.disabled) {
    transform: scale(0.96);
    opacity: 0.85;
  }
}

/* 渐变蓝主色按钮 */
.btn-primary {
  background: $primary-gradient;
  box-shadow: $primary-shadow;
}

/* 上一页/下一页：单行文字，高度稍矮 */
.btn-nav {
  min-height: 88rpx;
  flex-direction: column;
}

/* 保存PDF/直接打印：两行文字，竖向排列 */
.btn-action {
  flex-direction: column;
  gap: 2rpx;
}

/* 不换行文字（上一页/下一页） */
.btn-text-nowrap {
  color: $white;
  font-size: $font-size-base;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 1rpx;
}

/* 换行文字每行（保存/PDF、直接/打印） */
.btn-text-wrap {
  color: $white;
  font-size: $font-size-base;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  letter-spacing: 1rpx;
}

.page-indicator-text {
  font-size: $font-size-sm;
  color: $gray-500;
  font-weight: 500;
  text-align: center;
  flex-shrink: 0;
}

/* ========== H5纯CSS打印样式 ========== */
@media print {
  /* 隐藏原始页面中的所有元素 */
  .page,
  .bottom-bar,
  .paper-area,
  movable-area,
  movable-view,
  .page-indicator,
  .page-movable,
  .paper-movable,
  .a4-paper {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    overflow: hidden !important;
  }

  /* 打印设置 - 移除所有默认边距和页眉页脚 */
  @page {
    size: A4 portrait;
    margin: 0;
  }

  html, body {
    width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  /* canvas 打印样式：精确匹配 A4 尺寸 */
  body > canvas {
    display: block !important;
    width: 210mm !important;
    height: 297mm !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    page-break-inside: avoid !important;
    page-break-after: always !important;
  }

  /* 最后一页 canvas 不再分页 */
  body > canvas:last-child {
    page-break-after: auto !important;
  }
}
</style>
