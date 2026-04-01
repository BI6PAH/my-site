<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  onLaunch() {
    console.log('App Launch')
    // 初始化云开发环境
    // #ifdef MP-WEIXIN
    if (uniCloud) {
      uniCloud.init({
        env: 'your-env-id' // 后续替换为真实的云环境ID
      })
    }
    // #endif
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  }
}
</script>

<style lang="scss">
/* 全局样式 */
@import "./uni.scss";

page {
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
}

/* 全局容器 */
.container {
  padding: 20rpx;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 卡片样式 */
.card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

/* 按钮样式 */
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx 40rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
}

.btn-secondary {
  background: #f1f3f4;
  color: #5f6368;
  border-radius: 12rpx;
  padding: 20rpx 36rpx;
  font-size: 28rpx;
  border: none;
  transition: all 0.3s ease;
  
  &:active {
    background: #e8eaed;
  }
}

/* 标题样式 */
.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #202124;
  margin-bottom: 24rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #5f6368;
  margin-bottom: 16rpx;
}

/* 输入框样式 */
.input-field {
  background: #f8f9fa;
  border: 2rpx solid #dadce0;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  transition: all 0.3s ease;
  
  &:focus {
    border-color: #667eea;
    background: #ffffff;
  }
}
</style>
