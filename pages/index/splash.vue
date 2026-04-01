<template>
  <view class="splash-container">
    <view class="splash-content">
      <!-- App Logo -->
      <image 
        class="app-logo" 
        src="/static/logo/logo.svg" 
        mode="aspectFit"
        @load="onLogoLoaded"
      ></image>
      
      <!-- App 名称 -->
      <text class="app-name">小学生数学题智能生成工具</text>
      <text class="app-tagline">个性化定制 · 智能出题 · 轻松学习</text>
      
      <!-- 加载动画 -->
      <view class="loading-indicator">
        <view class="loading-dot"></view>
        <view class="loading-dot"></view>
        <view class="loading-dot"></view>
      </view>
      
      <!-- 版本信息 -->
      <text class="version-info">版本 {{ version }}</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      version: '1.0.0',
      logoLoaded: false,
      minimumShowTime: 2000 // 最少显示2秒
    };
  },

  onLoad() {
    // 记录开始时间
    this.startTime = Date.now();
    
    // 检查是否是首次启动
    const isFirstLaunch = uni.getStorageSync('isFirstLaunch');
    if (isFirstLaunch === '') {
      uni.setStorageSync('isFirstLaunch', true);
    }
  },

  methods: {
    onLogoLoaded() {
      this.logoLoaded = true;
      this.checkAndNavigate();
    },

    checkAndNavigate() {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.minimumShowTime - elapsed);
      
      setTimeout(() => {
        this.navigateToHome();
      }, remaining);
    },

    navigateToHome() {
      // 跳转到首页
      uni.switchTab({
        url: '/pages/index/index',
        success: () => {
          console.log('导航到首页成功');
        },
        fail: (err) => {
          console.error('导航失败:', err);
          // 如果跳转失败，使用重定向
          uni.redirectTo({
            url: '/pages/index/index'
          });
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.splash-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.splash-content {
  text-align: center;
  padding: 60rpx;
  max-width: 600rpx;
}

.app-logo {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 40rpx;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.2);
}

.app-name {
  display: block;
  font-size: $font-size-2xl;
  font-weight: 600;
  color: $white;
  margin-bottom: 16rpx;
  line-height: 1.4;
}

.app-tagline {
  display: block;
  font-size: $font-size-base;
  color: rgba($white, 0.9);
  margin-bottom: 60rpx;
  opacity: 0.9;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 60rpx;

  .loading-dot {
    width: 16rpx;
    height: 16rpx;
    background: $white;
    border-radius: 50%;
    animation: loading 1.4s infinite ease-in-out both;

    &:nth-child(1) {
      animation-delay: -0.32s;
    }

    &:nth-child(2) {
      animation-delay: -0.16s;
    }
  }
}

.version-info {
  display: block;
  font-size: $font-size-sm;
  color: rgba($white, 0.7);
}

@keyframes loading {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
