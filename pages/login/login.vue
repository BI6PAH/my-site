<template>
  <view class="container">
    <!-- 页面头部 -->
    <view class="login-header">
      <image class="login-logo" src="/static/logo/logo.svg" mode="aspectFit"></image>
      <text class="login-title">登录</text>
      <text class="login-subtitle">登录后可享受更多功能</text>
    </view>

    <!-- 登录表单 -->
    <view class="login-form">
      <!-- 手机号登录 -->
      <view class="form-section" v-if="loginType === 'phone'">
        <view class="form-item">
          <text class="form-label">手机号</text>
          <input 
            class="form-input" 
            type="number" 
            v-model="phoneNumber"
            placeholder="请输入手机号"
            maxlength="11"
          />
        </view>
        
        <view class="form-item">
          <text class="form-label">验证码</text>
          <view class="verify-group">
            <input 
              class="form-input verify-input" 
              type="number" 
              v-model="verifyCode"
              placeholder="请输入验证码"
              maxlength="6"
            />
            <button 
              class="btn-verify" 
              :disabled="!canSendCode || sendingCode"
              @click="sendVerifyCode"
            >
              {{ codeButtonText }}
            </button>
          </view>
        </view>
        
        <button class="btn-login" @click="phoneLogin" :disabled="!canLogin">
          登录
        </button>
      </view>

      <!-- 微信登录 -->
      <view class="form-section" v-if="loginType === 'wechat'">
        <view class="wechat-login-tips">
          <text class="tips-text">使用微信一键登录</text>
          <text class="tips-desc">无需输入手机号，快速安全</text>
        </view>
        
        <button class="btn-wechat-login" @click="wechatLogin">
          <image class="wechat-icon" src="/static/images/wechat.png" mode="aspectFit"></image>
          微信一键登录
        </button>
      </view>

      <!-- 登录方式切换 -->
      <view class="login-type-switch">
        <text class="switch-text" @click="toggleLoginType">
          {{ loginType === 'phone' ? '使用微信一键登录' : '使用手机号登录' }}
        </text>
      </view>
    </view>

    <!-- 协议勾选 -->
    <view class="agreement-section">
      <checkbox class="agreement-checkbox" :checked="agreed" @click="toggleAgreement" />
      <text class="agreement-text">
        我已阅读并同意
        <text class="agreement-link" @click="viewUserAgreement">用户协议</text>
        和
        <text class="agreement-link" @click="viewPrivacyPolicy">隐私政策</text>
      </text>
    </view>

    <!-- 游客模式 -->
    <view class="guest-section">
      <text class="guest-text" @click="guestLogin">游客模式试用</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loginType: 'phone', // 'phone' 或 'wechat'
      phoneNumber: '',
      verifyCode: '',
      agreed: false,
      canSendCode: false,
      sendingCode: false,
      codeCountdown: 0,
      countdownTimer: null
    };
  },

  computed: {
    codeButtonText() {
      if (this.sendingCode) return '发送中...';
      if (this.codeCountdown > 0) return `${this.codeCountdown}s后重试`;
      return '获取验证码';
    },

    canLogin() {
      if (this.loginType === 'phone') {
        return this.phoneNumber.length === 11 && 
               this.verifyCode.length === 6 && 
               this.agreed;
      }
      return this.agreed;
    }
  },

  watch: {
    phoneNumber(val) {
      // 简单的手机号验证
      const phoneRegex = /^1[3-9]\d{9}$/;
      this.canSendCode = phoneRegex.test(val) && this.codeCountdown === 0;
    }
  },

  onUnload() {
    // 清理倒计时定时器
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
  },

  methods: {
    // 切换登录方式
    toggleLoginType() {
      this.loginType = this.loginType === 'phone' ? 'wechat' : 'phone';
    },

    // 切换协议勾选
    toggleAgreement() {
      this.agreed = !this.agreed;
    },

    // 发送验证码
    sendVerifyCode() {
      if (!this.canSendCode || this.sendingCode) return;
      
      this.sendingCode = true;
      
      // 模拟发送验证码
      setTimeout(() => {
        uni.showToast({
          title: '验证码已发送',
          icon: 'success'
        });
        
        this.sendingCode = false;
        this.startCountdown();
      }, 1000);
    },

    // 开始倒计时
    startCountdown() {
      this.codeCountdown = 60;
      this.countdownTimer = setInterval(() => {
        this.codeCountdown--;
        if (this.codeCountdown <= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = null;
          // 重新检查是否可以发送
          const phoneRegex = /^1[3-9]\d{9}$/;
          this.canSendCode = phoneRegex.test(this.phoneNumber);
        }
      }, 1000);
    },

    // 手机号登录
    phoneLogin() {
      if (!this.canLogin) return;
      
      uni.showLoading({ title: '登录中...' });
      
      // 模拟登录
      setTimeout(() => {
        uni.hideLoading();
        
        // 保存登录状态
        uni.setStorageSync('userInfo', {
          id: 'user_' + Date.now(),
          phone: this.phoneNumber,
          loginType: 'phone',
          loginTime: new Date().toISOString()
        });
        uni.setStorageSync('isLoggedIn', true);
        
        uni.showToast({
          title: '登录成功',
          icon: 'success',
          success: () => {
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          }
        });
      }, 1500);
    },

    // 微信登录
    wechatLogin() {
      // #ifdef APP-PLUS
      // 微信一键登录（需要配置微信SDK）
      uni.showLoading({ title: '微信登录中...' });
      
      // 模拟微信登录
      setTimeout(() => {
        uni.hideLoading();
        
        // 保存登录状态
        uni.setStorageSync('userInfo', {
          id: 'wechat_user_' + Date.now(),
          nickname: '微信用户',
          loginType: 'wechat',
          loginTime: new Date().toISOString()
        });
        uni.setStorageSync('isLoggedIn', true);
        
        uni.showToast({
          title: '微信登录成功',
          icon: 'success',
          success: () => {
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          }
        });
      }, 1500);
      // #endif
      
      // #ifndef APP-PLUS
      uni.showToast({
        title: '请在App中使用微信登录',
        icon: 'none'
      });
      // #endif
    },

    // 游客登录
    guestLogin() {
      uni.showModal({
        title: '提示',
        content: '游客模式下部分功能可能受限，是否继续？',
        success: (res) => {
          if (res.confirm) {
            uni.setStorageSync('isLoggedIn', false);
            uni.setStorageSync('userInfo', {
              id: 'guest_' + Date.now(),
              loginType: 'guest',
              loginTime: new Date().toISOString()
            });
            
            uni.showToast({
              title: '已进入游客模式',
              icon: 'success',
              success: () => {
                setTimeout(() => {
                  uni.navigateBack();
                }, 1500);
              }
            });
          }
        }
      });
    },

    // 查看用户协议
    viewUserAgreement() {
      uni.showModal({
        title: '用户协议',
        content: '用户协议内容待完善...',
        showCancel: false
      });
    },

    // 查看隐私政策
    viewPrivacyPolicy() {
      uni.showModal({
        title: '隐私政策',
        content: '隐私政策内容待完善...',
        showCancel: false
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.container {
  padding: 40rpx;
  min-height: 100vh;
  background: linear-gradient(135deg, $gray-100 0%, #E0E7FF 100%);
}

.login-header {
  text-align: center;
  margin-bottom: 60rpx;
  padding-top: 40rpx;

  .login-logo {
    width: 120rpx;
    height: 120rpx;
    margin-bottom: 24rpx;
  }

  .login-title {
    display: block;
    font-size: $font-size-2xl;
    font-weight: 600;
    color: $gray-900;
    margin-bottom: 8rpx;
  }

  .login-subtitle {
    display: block;
    font-size: $font-size-sm;
    color: $gray-600;
  }
}

.login-form {
  background: $white;
  border-radius: $border-radius-xl;
  padding: 40rpx;
  margin-bottom: 40rpx;
  box-shadow: $shadow-lg;

  .form-section {
    .form-item {
      margin-bottom: 40rpx;

      &:last-child {
        margin-bottom: 40rpx;
      }

      .form-label {
        display: block;
        font-size: $font-size-base;
        font-weight: 600;
        color: $gray-800;
        margin-bottom: 16rpx;
      }

      .form-input {
        width: 100%;
        height: 90rpx;
        padding: 0 30rpx;
        border: 2rpx solid $gray-300;
        border-radius: $border-radius-md;
        font-size: $font-size-base;
        background: $white;
        transition: all 0.3s ease;

        &:focus {
          border-color: $primary-color;
          background: #F8F9FF;
        }
      }

      .verify-group {
        display: flex;
        gap: 20rpx;

        .verify-input {
          flex: 1;
        }

        .btn-verify {
          height: 90rpx;
          padding: 0 30rpx;
          background: $primary-gradient;
          color: $white;
          border: none;
          border-radius: $border-radius-md;
          font-size: $font-size-sm;
          font-weight: 500;
          transition: all 0.3s ease;
          white-space: nowrap;

          &:active {
            transform: scale(0.95);
          }

          &:disabled {
            opacity: 0.6;
            pointer-events: none;
          }
        }
      }
    }

    .btn-login {
      width: 100%;
      height: 100rpx;
      background: $primary-gradient;
      color: $white;
      border: none;
      border-radius: $border-radius-lg;
      font-size: $font-size-lg;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: $shadow-md;

      &:active {
        transform: scale(0.98);
      }

      &:disabled {
        opacity: 0.6;
        pointer-events: none;
      }
    }

    .wechat-login-tips {
      text-align: center;
      margin-bottom: 40rpx;

      .tips-text {
        display: block;
        font-size: $font-size-base;
        font-weight: 600;
        color: $gray-800;
        margin-bottom: 8rpx;
      }

      .tips-desc {
        display: block;
        font-size: $font-size-sm;
        color: $gray-600;
      }
    }

    .btn-wechat-login {
      width: 100%;
      height: 100rpx;
      background: #07C160;
      color: $white;
      border: none;
      border-radius: $border-radius-lg;
      font-size: $font-size-lg;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20rpx;
      transition: all 0.3s ease;
      box-shadow: $shadow-md;

      &:active {
        transform: scale(0.98);
      }

      .wechat-icon {
        width: 48rpx;
        height: 48rpx;
      }
    }
  }

  .login-type-switch {
    text-align: center;
    margin-top: 40rpx;

    .switch-text {
      font-size: $font-size-sm;
      color: $primary-color;
      text-decoration: underline;
    }
  }
}

.agreement-section {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 40rpx;

  .agreement-checkbox {
    margin-top: 6rpx;
    transform: scale(0.8);
  }

  .agreement-text {
    flex: 1;
    font-size: $font-size-sm;
    color: $gray-600;
    line-height: 1.6;

    .agreement-link {
      color: $primary-color;
      text-decoration: underline;
    }
  }
}

.guest-section {
  text-align: center;

  .guest-text {
    font-size: $font-size-sm;
    color: $gray-500;
    text-decoration: underline;
  }
}
</style>
