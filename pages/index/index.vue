<template>
  <view class="page">
    <!-- 顶部标题栏 -->
    <view class="page-header">
      <view class="header-brand">
        <text class="page-title">Alvin 数页 V1.0</text>
        <text class="page-slogan">计算范围你定义，数学练习随你印</text>
      </view>
      <view class="header-icon" @click="goToSettings">
        <text class="icon-text">⚙</text>
      </view>
    </view>

    <!-- 配置卡片区域 -->
    <view class="card-list">

      <!-- 难度等级 -->
      <view class="card">
        <view class="card-title">
          <view class="card-title-bar"></view>
          <text class="card-title-text">难度等级</text>
        </view>
        <view class="tag-row">
          <view
            v-for="(item, index) in difficultyOptions"
            :key="index"
            class="tag tag-full"
            :class="{ active: difficulty === item.value }"
            @click="selectDifficulty(item.value)"
          >
            <text class="tag-text">{{ item.label }}</text>
          </view>
        </view>
      </view>

        <!-- 运算方法 -->
        <view class="card">
        <view class="card-title">
          <view class="card-title-bar"></view>
          <text class="card-title-text">运算方法</text>
        </view>
        <view class="tag-row">
          <view
            v-for="(item, index) in basicOperationOptions"
            :key="'a'+index"
            class="tag tag-full"
            :class="{ active: selectedBasicOps.includes(item.value) }"
            @click="toggleBasicOperation(item.value)"
          >
            <text class="tag-text">{{ item.label }}</text>
          </view>
          <!-- 混合 -->
          <view
            class="tag tag-full"
            :class="{ active: isMixedMode }"
            @click="toggleMixedOperation"
          >
            <text class="tag-text">混合</text>
          </view>
        </view>
      </view>

      <!-- 计算类型（动态显示） -->
      <view class="card" v-if="showCalculationTypes">
        <view class="card-title">
          <view class="card-title-bar"></view>
          <text class="card-title-text">计算类型</text>
        </view>

        <!-- 非混合运算模式 -->
        <template v-if="!isMixedMode">
          <!-- 计算类型标签（蓝色选中态） -->
          <view class="tag-row" v-if="displayRow1.length > 0">
            <view
              v-for="(item, index) in displayRow1"
              :key="'r1-'+index"
              class="tag tag-full"
              :class="{ active: item.active }"
              @click="handleCalculationTypeClick(item)"
            >
              <text class="tag-text">{{ item.label }}</text>
            </view>
          </view>
          <view class="tag-row" v-if="displayRow2.length > 0">
            <view
              v-for="(item, index) in displayRow2"
              :key="'r2-'+index"
              class="tag tag-full"
              :class="{ active: item.active }"
              @click="handleCalculationTypeClick(item)"
            >
              <text class="tag-text">{{ item.label }}</text>
            </view>
          </view>
        </template>

        <!-- 混合运算模式：第一行运算组合，第二行计算类型 -->
        <template v-else>
          <!-- 第一行：加法、减法、乘法、除法 -->
          <view class="tag-row">
            <view
              v-for="(item, index) in mixedOperationOptions"
              :key="'m1-'+index"
              class="tag tag-full"
              :class="{ active: selectedMixedOps.includes(item.value) }"
              @click="toggleMixedOperationOption(item.value)"
            >
              <text class="tag-text">{{ item.label }}</text>
            </view>
          </view>
          <!-- 第二行：计算类型标签（粉红色选中态） -->
          <view class="tag-row" :class="{ 'tag-row-center': isMixedMode && selectedMixedOps.includes(OPERATION_TYPES.MULTIPLICATION) && !selectedMixedOps.includes(OPERATION_TYPES.DIVISION) }">
            <view
              v-if="selectedMixedOps.includes(OPERATION_TYPES.MULTIPLICATION)"
              class="tag tag-full tag-pink"
              :class="{ active: mixedUseTableMult, 'tag-center': isMixedMode && selectedMixedOps.includes(OPERATION_TYPES.MULTIPLICATION) && !selectedMixedOps.includes(OPERATION_TYPES.DIVISION) }"
              @click="toggleMixedTableMult"
            >
              <text class="tag-text">表内乘法</text>
            </view>
            <view
              v-for="(item, index) in mixedDivisionOptions"
              :key="'md-'+index"
              class="tag tag-full tag-pink"
              :class="{
                active: mixedDivTypes.includes(item.value),
                disabled: !selectedMixedOps.includes(OPERATION_TYPES.DIVISION)
              }"
              @click="toggleMixedDivType(item.value)"
            >
              <text class="tag-text">{{ item.label }}</text>
            </view>
          </view>
          <text class="mixed-hint">至少选择2种运算</text>
        </template>
      </view>

      <!-- 计算范围 -->
      <view class="card">
        <view class="card-title">
          <view class="card-title-bar"></view>
          <text class="card-title-text">计算范围</text>
        </view>
        <view class="range-row">
          <text class="range-label">最小值</text>
          <input
            class="range-input"
            type="number"
            v-model="rangeMin"
            :disabled="rangeLocked"
            placeholder="10"
          />
          <text class="range-separator">—</text>
          <text class="range-label">最大值</text>
          <input
            class="range-input"
            type="number"
            v-model="rangeMax"
            :disabled="rangeLocked"
            placeholder="100"
          />
        </view>
      </view>

      <!-- 出题形式 -->
      <view class="card">
        <view class="card-title">
          <view class="card-title-bar"></view>
          <text class="card-title-text">出题形式</text>
        </view>
        <view class="tag-row">
          <view
            v-for="(item, index) in formatOptionsComputed"
            :key="'f'+index"
            class="tag tag-full"
            :class="{
              active: format === item.value,
              disabled: item.disabled
            }"
            @click="!item.disabled && selectFormat(item.value)"
          >
            <text class="tag-text">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 生成页数 -->
      <view class="card">
        <view class="card-title">
          <view class="card-title-bar"></view>
          <text class="card-title-text">生成页数</text>
        </view>
        <view class="page-input-row">
          <text class="page-label">我需要</text>
          <input
            class="page-input"
            type="number"
            v-model="pageCount"
            placeholder="1"
          />
          <text class="page-label">页</text>
        </view>
      </view>

    </view>

    <!-- 底部悬浮生成按钮 -->
    <view class="bottom-bar">
      <view
        class="btn-generate"
        :class="{ disabled: !canGenerate }"
        @click="generateWorksheet"
      >
        <text class="btn-generate-text">生成</text>
      </view>
      <text v-if="!canGenerate" class="generate-hint">请至少选择一种运算方法</text>
    </view>
  </view>
</template>

<script>
import { OPERATION_TYPES, DIVISION_TYPES } from '@/utils/generator.js';

export default {
  beforeCreate() {
    // 将常量注册到实例，使 data() 和模板都能访问
    this.OPERATION_TYPES = OPERATION_TYPES;
    this.DIVISION_TYPES = DIVISION_TYPES;
  },
  data() {
    return {
      // 难度等级
      difficulty: 'basic',
      difficultyOptions: [
        { value: 'basic', label: '容易' },
        { value: 'standard', label: '中等' },
        { value: 'challenge', label: '困难' }
      ],

      // 运算方法（默认选中加法）
      selectedBasicOps: [OPERATION_TYPES.ADDITION],
      basicOperationOptions: [
        { value: OPERATION_TYPES.ADDITION, label: '加法' },
        { value: OPERATION_TYPES.SUBTRACTION, label: '减法' },
        { value: OPERATION_TYPES.MULTIPLICATION, label: '乘法' },
        { value: OPERATION_TYPES.DIVISION, label: '除法' }
      ],

      // 混合运算
      isMixedMode: false,
      selectedMixedOps: [OPERATION_TYPES.ADDITION, OPERATION_TYPES.SUBTRACTION],
      mixedOperationOptions: [
        { value: OPERATION_TYPES.ADDITION, label: '加法' },
        { value: OPERATION_TYPES.SUBTRACTION, label: '减法' },
        { value: OPERATION_TYPES.MULTIPLICATION, label: '乘法' },
        { value: OPERATION_TYPES.DIVISION, label: '除法' }
      ],
      // 混合运算模式下的计算类型
      mixedUseTableMult: false,
      mixedDivTypes: [], // 混合运算除法类型
      mixedDivisionOptions: [
        { value: DIVISION_TYPES.TABLE, label: '表内除法' }
        // 表内余数和一般余数不适用于混合运算（混合运算除法只支持精确整除）
      ],

      // 乘法表选项
      useTableMult: false,

      // 除法选项
      selectedDivTypes: [],
      divisionOptions: [
        { value: DIVISION_TYPES.TABLE, label: '表内除法' },
        { value: DIVISION_TYPES.TABLE_WITH_REMAINDER, label: '表内余数' },
        { value: DIVISION_TYPES.NORMAL_WITH_REMAINDER, label: '一般余数' }
      ],

      // 计算范围
      rangeMin: 10,
      rangeMax: 100,

      // 出题形式
      format: 'horizontal',
      formatOptions: [
        { value: 'horizontal', label: '横式计算（20题）', disabled: false },
        { value: 'vertical', label: '竖式计算（12题）', disabled: false }
      ],

      // 生成设置（页数）
      pageCount: 1
    };
  },

  computed: {
    canGenerate() {
      if (this.isMixedMode) {
        return this.selectedMixedOps.length >= 2;
      }
      return this.selectedBasicOps.length > 0;
    },

    // 计算类型标签栏是否显示
    showCalculationTypes() {
      if (this.isMixedMode) return true;
      const hasMult = this.selectedBasicOps.includes(OPERATION_TYPES.MULTIPLICATION);
      const hasDiv = this.selectedBasicOps.includes(OPERATION_TYPES.DIVISION);
      return hasMult || hasDiv;
    },

    // 非混合模式：所有计算类型选项一行显示
    displayRow1() {
      const options = [];
      const hasMult = this.selectedBasicOps.includes(OPERATION_TYPES.MULTIPLICATION);
      const hasDiv = this.selectedBasicOps.includes(OPERATION_TYPES.DIVISION);
      if (hasMult) {
        options.push({ type: 'multiplication', value: 'tableMult', label: '表内乘法', active: this.useTableMult });
      }
      if (hasDiv) {
        this.divisionOptions.forEach(opt => {
          options.push({
            type: 'division',
            value: opt.value,
            label: opt.label,
            active: this.selectedDivTypes.includes(opt.value)
          });
        });
      }
      return options;
    },

    // 非混合模式：第二行（始终为空，所有选项一行显示）
    displayRow2() {
      return [];
    },

    // 出题形式可用性：混合运算时竖式禁用
    formatOptionsComputed() {
      return this.formatOptions.map(item => {
        return {
          ...item,
          disabled: this.isMixedMode && item.value === 'vertical'
        };
      });
    },

    // 混合运算模式：表内除法选中状态（兼容旧引用）
    selectedMixedDivType() {
      return this.mixedDivTypes.includes(DIVISION_TYPES.TABLE);
    },

    // 计算范围锁定：表内乘法、表内除法、表内余数被勾选时锁定（一般余数不锁定），混合模式同理
    rangeLocked() {
      if (this.isMixedMode) {
        // 混合运算：表内乘法或表内除法选中时锁定
        return this.mixedUseTableMult || this.mixedDivTypes.includes(DIVISION_TYPES.TABLE);
      }
      // 非混合模式：表内乘法、表内除法、表内余数
      const tableDivTypes = [DIVISION_TYPES.TABLE, DIVISION_TYPES.TABLE_WITH_REMAINDER];
      const hasTableDiv = this.selectedDivTypes.some(t => tableDivTypes.includes(t));
      return this.useTableMult || hasTableDiv;
    },

    // 预计生成题目数
    estimateCount() {
      const perPage = this.format === 'horizontal' ? 20 : 12;
      return (parseInt(this.pageCount) || 1) * perPage;
    }
  },

  watch: {
    // 表内乘法切换：锁定/恢复计算范围
    useTableMult() {
      this.$nextTick(() => this.syncRangeLock());
    },
    // 除法子选项切换：锁定/恢复计算范围
    selectedDivTypes: {
      handler() {
        this.$nextTick(() => this.syncRangeLock());
      },
      deep: true
    },
    // 混合运算表内乘法切换：锁定/恢复计算范围
    mixedUseTableMult() {
      this.$nextTick(() => this.syncRangeLock());
    },
    // 混合运算除法子选项切换：锁定/恢复计算范围
    mixedDivTypes: {
      handler() {
        this.$nextTick(() => this.syncRangeLock());
      },
      deep: true
    },
    // 混合运算模式切换时，自动处理出题形式
    isMixedMode(newVal) {
      if (newVal && this.format === 'vertical') {
        this.format = 'horizontal';
      }
    },
    // 监听混合运算的乘法/除法选择，控制表内选项的可用性
    selectedMixedOps: {
      handler(newVal) {
        // 如果乘法被取消，自动取消表内乘法
        if (!newVal.includes(OPERATION_TYPES.MULTIPLICATION)) {
          this.mixedUseTableMult = false;
        }
        // 如果除法被取消，自动清除除法类型选择
        if (!newVal.includes(OPERATION_TYPES.DIVISION)) {
          this.mixedDivTypes = [];
        }
      },
      deep: true
    }
  },

  methods: {
    // 统一处理计算范围锁定/恢复
    syncRangeLock() {
      if (this.rangeLocked) {
        this.rangeMin = 1;
        this.rangeMax = 81;
      } else {
        this.rangeMin = 10;
        this.rangeMax = 100;
      }
    },

    selectDifficulty(value) {
      this.difficulty = value;
    },

    toggleBasicOperation(value) {
      if (this.isMixedMode) {
        this.isMixedMode = false;
      }
      const index = this.selectedBasicOps.indexOf(value);
      if (index > -1) {
        this.selectedBasicOps.splice(index, 1);
      } else {
        this.selectedBasicOps.push(value);
      }
    },

    toggleMixedOperation() {
      this.isMixedMode = !this.isMixedMode;
      if (this.isMixedMode) {
        this.selectedBasicOps = [];
        // 重置混合运算的计算类型
        this.mixedUseTableMult = false;
        this.mixedDivTypes = [];
        // 确保至少有两个运算被选中
        if (this.selectedMixedOps.length < 2) {
          this.selectedMixedOps = [OPERATION_TYPES.ADDITION, OPERATION_TYPES.SUBTRACTION];
        }
      }
    },

    toggleMixedOperationOption(value) {
      const index = this.selectedMixedOps.indexOf(value);
      if (index > -1) {
        if (this.selectedMixedOps.length > 2) {
          this.selectedMixedOps.splice(index, 1);
        } else {
          uni.showToast({ title: '至少选择2种运算', icon: 'none' });
        }
      } else {
        this.selectedMixedOps.push(value);
      }
    },

    toggleMixedTableMult() {
      if (!this.selectedMixedOps.includes(OPERATION_TYPES.MULTIPLICATION)) return;
      this.mixedUseTableMult = !this.mixedUseTableMult;
    },

    toggleMixedDivType(value) {
      if (!this.selectedMixedOps.includes(OPERATION_TYPES.DIVISION)) return;
      const index = this.mixedDivTypes.indexOf(value);
      if (index > -1) {
        this.mixedDivTypes.splice(index, 1);
      } else {
        this.mixedDivTypes.push(value);
      }
    },

    toggleTableMult() {
      this.useTableMult = !this.useTableMult;
    },

    toggleDivisionType(value) {
      const index = this.selectedDivTypes.indexOf(value);
      if (index > -1) {
        this.selectedDivTypes.splice(index, 1);
      } else {
        this.selectedDivTypes.push(value);
      }
    },

    handleCalculationTypeClick(item) {
      if (item.type === 'multiplication') {
        this.toggleTableMult();
      } else if (item.type === 'division') {
        this.toggleDivisionType(item.value);
      }
    },

    selectFormat(value) {
      this.format = value;
    },

    goToSettings() {
      // 预留设置入口
      uni.showToast({ title: '设置功能开发中', icon: 'none' });
    },

    generateWorksheet() {
      if (!this.canGenerate) {
        uni.showToast({ title: '请至少选择一种运算方法', icon: 'none' });
        return;
      }

      const perPage = this.format === 'horizontal' ? 20 : 12;
      const params = {
        difficulty: this.difficulty,
        min: parseInt(this.rangeMin),
        max: parseInt(this.rangeMax),
        count: (parseInt(this.pageCount) || 1) * perPage,
        perPage: perPage,
        useTableMult: this.useTableMult,
        format: this.format,
        divType: this.selectedDivTypes[0] || null,
        selectedDivTypes: this.selectedDivTypes.length > 0 ? [...this.selectedDivTypes] : []
      };

      if (this.isMixedMode) {
        params.operationType = 'mixed';
        params.selectedOps = this.selectedMixedOps;
        params.selectedMixedOps = this.selectedMixedOps;
        params.useTableMult = this.mixedUseTableMult;
        // 混合运算除法类型：将 mixedDivTypes 转换为 divType 传入
        if (this.mixedDivTypes.includes(DIVISION_TYPES.TABLE)) {
          params.divType = DIVISION_TYPES.TABLE;
        }
      } else {
        // 多选模式：传 selectedOps 数组，generator.js 按配额分配
        // 单选模式：传 operationType 单一值
        if (this.selectedBasicOps.length === 1) {
          params.operationType = this.selectedBasicOps[0];
        } else {
          params.selectedOps = [...this.selectedBasicOps];
        }
      }

      uni.navigateTo({
        url: '/pages/preview/preview?params=' + encodeURIComponent(JSON.stringify(params))
      });
    }
  }
};
</script>

<style lang="scss" scoped>
/* ========== 页面整体 ========== */
.page {
  min-height: 100vh;
  background: $gray-50;
  padding-bottom: $bottom-safe;
}

/* ========== 顶部标题栏 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40rpx 32rpx 28rpx;
  background: $white;

  .header-brand {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }

  .page-title {
    font-size: 40rpx;
    font-weight: 700;
    color: $primary-600;
    letter-spacing: 1rpx;
  }

  .page-slogan {
    font-size: 24rpx;
    color: $gray-400;
    letter-spacing: 1rpx;
  }

  .header-icon {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .icon-text {
      font-size: 40rpx;
      color: $gray-600;
    }
  }
}

/* ========== 卡片列表 ========== */
.card-list {
  padding: 0 $container-padding;
  padding-top: $spacing-lg;
}

/* ========== 卡片 ========== */
.card {
  background: $white;
  border-radius: $border-radius-card;
  margin-bottom: $card-gap;
  padding: $card-padding;
  box-shadow: $shadow-sm;
}

/* ========== 卡片标题（左侧蓝色竖条） ========== */
.card-title {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;

  .card-title-bar {
    width: 8rpx;
    height: 32rpx;
    background: $primary-500;
    border-radius: 4rpx;
  }

  .card-title-text {
    font-size: $font-size-lg;
    font-weight: 500;
    color: $gray-700;
  }
}

/* ========== 标签行 ========== */
.tag-row {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;

  &:last-child {
    margin-bottom: 0;
  }
}

/* ========== 标签按钮 ========== */
.tag {
  height: 72rpx;
  border-radius: $border-radius-tag;
  background: $gray-100;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-normal;
  border: 2rpx solid transparent;
  cursor: pointer;

  &.active {
    background: $primary-100;
    border-color: $primary-500;
  }

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
    background: $gray-100;
    border-color: transparent;
  }

  .tag-text {
    font-size: $font-size-base;
    color: $gray-600;
  }

  &.active .tag-text {
    color: $primary-600;
    font-weight: 500;
  }

  &.disabled .tag-text {
    color: $gray-400;
  }
}

.tag-full {
  flex: 1;
}

/* 混合运算计算类型行：单标签居中 */
.tag-row-center {
  justify-content: center;
}

.tag-center {
  flex: none;
  min-width: 200rpx;
}

/* 计算类型标签（表内乘法/表内除法/表内余数/一般余数）：粉红色选中态 */
.tag-pink.active {
  background: $pink-100;
  border-color: $pink-500;
}

.tag-pink.active .tag-text {
  color: $pink-600;
}

/* ========== 计算范围 ========== */
.range-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;

  .range-label {
    font-size: $font-size-base;
    color: $gray-700;
    white-space: nowrap;
  }

  .range-input {
    width: 120rpx;
    height: 72rpx;
    padding: 0 $spacing-md;
    border-radius: $border-radius-sm;
    background: $gray-100;
    border: 2rpx solid transparent;
    font-size: $font-size-md;
    color: $gray-700;
    text-align: center;

    &:focus {
      border-color: $primary-500;
      background: $white;
    }

    &:disabled {
      background: $gray-100;
      color: $gray-400;
    }
  }

  .range-separator {
    font-size: $font-size-base;
    color: $gray-400;
  }
}

.lock-hint {
  display: block;
  font-size: $font-size-sm;
  color: $success-color;
  margin-top: $spacing-sm;
}

/* ========== 出题形式提示 ========== */
.format-hint {
  display: block;
  font-size: $font-size-xs;
  color: $gray-400;
  margin-top: $spacing-sm;
}

/* ========== 生成设置 ========== */
.page-input-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-md;

  .page-label {
    font-size: $font-size-base;
    color: $gray-700;
  }

  .page-input {
    width: 140rpx;
    height: 72rpx;
    padding: 0 $spacing-md;
    border-radius: $border-radius-sm;
    background: $gray-100;
    border: 2rpx solid transparent;
    font-size: $font-size-md;
    color: $gray-700;
    text-align: center;

    &:focus {
      border-color: $primary-500;
      background: $white;
    }
  }
}

.estimate-hint {
  display: block;
  text-align: center;
  font-size: $font-size-sm;
  color: $gray-500;
  margin-top: $spacing-sm;
}

/* ========== 混合运算提示 ========== */
.mixed-hint {
  display: block;
  font-size: $font-size-xs;
  color: $gray-400;
  margin-top: $spacing-sm;
}

/* ========== 底部悬浮栏 ========== */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx $container-padding;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: $white;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
  z-index: 100;

  .btn-generate {
    width: 100%;
    height: 96rpx;
    background: $primary-500;
    border-radius: $border-radius-btn;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: $primary-shadow;
    transition: all $transition-normal;
    cursor: pointer;

    &:active {
      opacity: 0.9;
      transform: scale(0.98);
    }

    &.disabled {
      background: $gray-300;
      box-shadow: none;
      pointer-events: none;
    }

    .btn-generate-text {
      color: $white;
      font-size: 32rpx;
      font-weight: 500;
    }
  }

  .generate-hint {
    display: block;
    text-align: center;
    font-size: $font-size-xs;
    color: $error-color;
    margin-top: $spacing-sm;
  }
}
</style>
