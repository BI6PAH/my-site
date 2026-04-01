<template>
  <view class="container">
    <!-- 页面头部 -->
    <view class="page-header">
      <image class="header-logo" src="/static/logo/logo.svg" mode="aspectFit"></image>
      <text class="header-title">使用说明书</text>
      <text class="header-version">v2.1</text>
    </view>

    <!-- 内容区域 -->
    <scroll-view class="content-scroll" scroll-y>
      <!-- 简介 -->
      <view class="section">
        <text class="section-title">📖 产品简介</text>
        <text class="section-text">
          Alivn数学练习题生成器是一款专为小学生设计的智能出题工具，可以根据不同难度、运算类型和范围，自动生成个性化的数学练习题试卷。
        </text>
      </view>

      <!-- 主要功能 -->
      <view class="section">
        <text class="section-title">✨ 主要功能</text>
        <view class="feature-list">
          <view class="feature-item">
            <text class="feature-icon">🎯</text>
            <text class="feature-text">智能难度控制（基础/标准/挑战）</text>
          </view>
          <view class="feature-item">
            <text class="feature-icon">🧮</text>
            <text class="feature-text">支持加减乘除及混合运算</text>
          </view>
          <view class="feature-item">
            <text class="feature-icon">📊</text>
            <text class="feature-text">自定义计算范围和题目数量</text>
          </view>
          <view class="feature-item">
            <text class="feature-icon">📝</text>
            <text class="feature-text">竖式/横式两种出题形式</text>
          </view>
          <view class="feature-item">
            <text class="feature-icon">🔄</text>
            <text class="feature-text">自动去重，避免重复题目</text>
          </view>
          <view class="feature-item">
            <text class="feature-icon">📏</text>
            <text class="feature-text">乘法表专项练习</text>
          </view>
        </view>
      </view>

      <!-- 使用步骤 -->
      <view class="section">
        <text class="section-title">🚀 使用步骤</text>
        <view class="step-list">
          <view class="step-item" v-for="(step, index) in steps" :key="index">
            <view class="step-number">{{ index + 1 }}</view>
            <text class="step-text">{{ step }}</text>
          </view>
        </view>
      </view>

      <!-- 设置说明 -->
      <view class="section">
        <text class="section-title">⚙️ 设置说明</text>
        
        <view class="setting-group">
          <text class="setting-title">难度等级</text>
          <view class="setting-item">
            <text class="setting-name">基础</text>
            <text class="setting-desc">强制无进位/借位，适合初学者</text>
          </view>
          <view class="setting-item">
            <text class="setting-name">标准</text>
            <text class="setting-desc">60-70%进位/借位比例</text>
          </view>
          <view class="setting-item">
            <text class="setting-name">挑战</text>
            <text class="setting-desc">100%进位/借位，提升计算能力</text>
          </view>
        </view>

        <view class="setting-group">
          <text class="setting-title">运算类型</text>
          <view class="setting-item">
            <text class="setting-desc">可选择加法、减法、乘法、除法单一类型，或选择混合运算组合多种类型</text>
          </view>
        </view>

        <view class="setting-group">
          <text class="setting-title">计算范围</text>
          <view class="setting-item">
            <text class="setting-desc">设置数字的最小值和最大值，系统将在此范围内生成题目</text>
          </view>
        </view>

        <view class="setting-group">
          <text class="setting-title">出题形式</text>
          <view class="setting-item">
            <text class="setting-name">竖式计算</text>
            <text class="setting-desc">适合加减法，便于列竖式计算</text>
          </view>
          <view class="setting-item">
            <text class="setting-name">横式计算</text>
            <text class="setting-desc">适合所有运算类型，简洁明了</text>
          </view>
        </view>
      </view>

      <!-- 注意事项 -->
      <view class="section">
        <text class="section-title">💡 注意事项</text>
        <view class="warning-box">
          <text class="warning-text">
            • 混合运算模式下，只支持横式计算
          </text>
          <text class="warning-text">
            • 选择乘法表范围时，计算范围自动锁定为1-9
          </text>
          <text class="warning-text">
            • 混合运算至少需要选择2种运算类型
          </text>
          <text class="warning-text">
            • 生成的题目会自动去重，避免重复练习
          </text>
        </view>
      </view>

      <!-- 常见问题 -->
      <view class="section">
        <text class="section-title">❓ 常见问题</text>
        <view class="faq-list">
          <view class="faq-item" v-for="(faq, index) in faqs" :key="index">
            <text class="faq-question">Q: {{ faq.q }}</text>
            <text class="faq-answer">A: {{ faq.a }}</text>
          </view>
        </view>
      </view>

      <!-- 版本信息 -->
      <view class="section">
        <text class="section-title">📦 版本信息</text>
        <view class="version-info">
          <text class="version-text">当前版本：v2.1</text>
          <text class="version-text">更新日期：2026年3月</text>
          <text class="version-text">新增功能：混合运算、难度最大化算法、题目去重</text>
        </view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-spacing"></view>
    </scroll-view>

    <!-- 返回按钮 -->
    <view class="back-button" @click="goBack">
      <text class="back-text">← 返回</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      steps: [
        '选择适合的难度等级（基础/标准/挑战）',
        '选择运算类型（加减乘除或混合运算）',
        '设置计算范围（最小值和最大值）',
        '选择出题形式（竖式或横式）',
        '设置题目数量',
        '点击"生成试卷"按钮',
        '在预览页查看题目，可选择显示/隐藏答案',
        '使用导出功能保存或分享试卷'
      ],
      faqs: [
        {
          q: '为什么生成的题目有重复？',
          a: '系统会自动避免重复题目，如果题库较小而题目数量较多，可能会出现相似题目。'
        },
        {
          q: '混合运算如何计算？',
          a: '按照从左到右的顺序计算，先乘除后加减的优先级将在后续版本中加入。'
        },
        {
          q: '如何打印试卷？',
          a: '使用导出为PDF功能，然后通过PDF阅读器进行打印。'
        },
        {
          q: '为什么除法没有余数选项？',
          a: '混合运算模式下暂不支持余数除法，单一除法模式下可选择表内余数除法。'
        }
      ]
    };
  },

  methods: {
    goBack() {
      uni.navigateBack();
    }
  }
};
</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $gray-100;
}

.page-header {
  background: $white;
  padding: 40rpx 30rpx;
  text-align: center;
  box-shadow: $shadow-sm;
  position: relative;

  .header-logo {
    width: 80rpx;
    height: 80rpx;
    margin-bottom: 16rpx;
  }

  .header-title {
    display: block;
    font-size: $font-size-xl;
    font-weight: 600;
    color: $gray-900;
    margin-bottom: 8rpx;
  }

  .header-version {
    display: block;
    font-size: $font-size-sm;
    color: $gray-600;
  }
}

.content-scroll {
  flex: 1;
  overflow-y: auto;
}

.section {
  background: $white;
  margin: 20rpx 30rpx;
  padding: 30rpx;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;

  .section-title {
    display: block;
    font-size: $font-size-lg;
    font-weight: 600;
    color: $gray-900;
    margin-bottom: 24rpx;
    padding-bottom: 16rpx;
    border-bottom: 4rpx solid $primary-color;
  }

  .section-text {
    display: block;
    font-size: $font-size-base;
    color: $gray-700;
    line-height: 1.8;
    margin-bottom: 20rpx;
  }
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;

  .feature-item {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 20rpx;
    background: $gray-100;
    border-radius: $border-radius-md;

    .feature-icon {
      font-size: $font-size-xl;
      min-width: 60rpx;
    }

    .feature-text {
      font-size: $font-size-base;
      color: $gray-800;
      flex: 1;
    }
  }
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 24rpx;
  background: $gray-100;
  border-radius: $border-radius-md;
  border-left: 6rpx solid $primary-color;

  .step-number {
    width: 40rpx;
    height: 40rpx;
    background: $primary-color;
    color: $white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $font-size-sm;
    font-weight: 600;
    flex-shrink: 0;
  }

  .step-text {
    flex: 1;
    font-size: $font-size-base;
    color: $gray-800;
    line-height: 1.6;
    margin-top: 4rpx;
  }
}

.setting-group {
  margin-bottom: 30rpx;

  &:last-child {
    margin-bottom: 0;
  }

  .setting-title {
    display: block;
    font-size: $font-size-base;
    font-weight: 600;
    color: $gray-900;
    margin-bottom: 20rpx;
    padding-left: 16rpx;
    border-left: 6rpx solid $primary-color;
  }
}

.setting-item {
  margin-bottom: 20rpx;
  padding: 20rpx;
  background: $gray-100;
  border-radius: $border-radius-md;

  &:last-child {
    margin-bottom: 0;
  }

  .setting-name {
    display: block;
    font-size: $font-size-base;
    font-weight: 600;
    color: $gray-800;
    margin-bottom: 8rpx;
  }

  .setting-desc {
    display: block;
    font-size: $font-size-sm;
    color: $gray-600;
    line-height: 1.6;
  }
}

.warning-box {
  background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
  border: 2rpx solid #FCD34D;
  border-radius: $border-radius-md;
  padding: 24rpx;

  .warning-text {
    display: block;
    font-size: $font-size-sm;
    color: #92400E;
    margin-bottom: 12rpx;
    line-height: 1.6;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.faq-item {
  padding: 24rpx;
  background: $gray-100;
  border-radius: $border-radius-md;
  border: 2rpx solid $gray-300;

  .faq-question {
    display: block;
    font-size: $font-size-base;
    font-weight: 600;
    color: $primary-color;
    margin-bottom: 12rpx;
    line-height: 1.5;
  }

  .faq-answer {
    display: block;
    font-size: $font-size-sm;
    color: $gray-700;
    line-height: 1.6;
  }
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  .version-text {
    font-size: $font-size-sm;
    color: $gray-700;
  }
}

.bottom-spacing {
  height: 40rpx;
}

.back-button {
  background: $primary-gradient;
  margin: 20rpx 30rpx;
  margin-bottom: 40rpx;
  padding: 24rpx;
  border-radius: $border-radius-lg;
  text-align: center;
  box-shadow: $shadow-md;
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }

  .back-text {
    color: $white;
    font-size: $font-size-base;
    font-weight: 600;
  }
}
</style>
