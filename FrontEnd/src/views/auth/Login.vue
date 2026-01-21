<template>
  <div class="login-container">
    <!-- 背景动态装饰 -->
    <div class="bg-decoration bg-decoration-1"></div>
    <div class="bg-decoration bg-decoration-2"></div>

    <!-- 科技感网格线背景 -->
    <div class="grid-background"></div>

    <!-- 主卡片容器 -->
    <div class="login-card">
      <!-- 卡片顶部的扫光效果 -->
      <div class="card-shine"></div>

      <!-- Logo与标题 -->
      <div class="card-header">
        <div class="logo-container">
          <el-icon :size="32" class="logo-icon">
            <Lock />
          </el-icon>
        </div>
        <h1 class="card-title">管理员登录</h1>
        <p class="card-subtitle">请输入您的凭据以访问控制台</p>
      </div>

      <!-- 消息提示 -->
      <transition name="message-fade">
        <div v-if="message.text" :class="['message-box', message.type]">
          <div :class="['message-dot', message.type]"></div>
          <span>{{ message.text }}</span>
        </div>
      </transition>

      <!-- 登录表单 -->
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <!-- 邮箱输入 -->
        <div class="form-item">
          <label class="form-label">电子邮箱</label>
          <div class="input-wrapper">
            <el-icon class="input-icon">
              <Message />
            </el-icon>
            <el-input
              v-model="loginForm.email"
              type="email"
              placeholder="admin@example.com"
              class="custom-input"
              @keyup.enter="handleLogin"
            />
          </div>
        </div>

        <!-- 密码输入 -->
        <div class="form-item">
          <label class="form-label">安全密码</label>
          <div class="input-wrapper">
            <el-icon class="input-icon">
              <Lock />
            </el-icon>
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="••••••••"
              class="custom-input"
              show-password
              @keyup.enter="handleLogin"
            />
          </div>
        </div>

        <!-- 图形验证码 -->
        <div class="form-item">
          <label class="form-label">验证码</label>
          <div class="captcha-wrapper">
            <div class="input-wrapper captcha-input-wrapper">
              <el-icon class="input-icon">
                <Key />
              </el-icon>
              <el-input
                v-model="loginForm.captchaCode"
                placeholder="4位验证码"
                class="custom-input"
                maxlength="4"
                @keyup.enter="handleLogin"
              />
            </div>
            <div class="captcha-image" @click="refreshCaptcha">
              <img v-if="captchaImageUrl" :src="captchaImageUrl" alt="验证码" />
              <div v-else class="captcha-loading">
                <el-icon class="is-loading">
                  <Loading />
                </el-icon>
              </div>
              <div class="captcha-overlay">
                <el-icon>
                  <Refresh />
                </el-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- 提交按钮 -->
        <button
          type="submit"
          :disabled="loading"
          class="submit-button"
          @click="handleLogin"
        >
          <div class="button-shine"></div>
          <el-icon v-if="loading" class="button-icon">
            <Loading />
          </el-icon>
          <span v-else>立即登录</span>
          <el-icon v-if="!loading" class="button-arrow">
            <ArrowRight />
          </el-icon>
        </button>
      </el-form>

      <!-- 底部版权信息 -->
      <p class="copyright">
        &copy; 2024 AI 能力中台. All Rights Reserved.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
// Element Plus 图标已全局注册，直接使用组件名
import { useAuthStore } from '@/stores/auth'
import { getCaptcha } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loginFormRef = ref(null)
const loading = ref(false)
const captchaImageUrl = ref('')
const sessionId = ref('')
const message = reactive({ type: '', text: '' })

const loginForm = reactive({
  email: '',
  password: '',
  captchaCode: '',
  sessionId: ''
})

const loginRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  captchaCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 4, message: '验证码为4位字符', trigger: 'blur' }
  ]
}

// 获取验证码
async function fetchCaptcha() {
  try {
    const response = await getCaptcha()
    if (response.success && response.data) {
      captchaImageUrl.value = response.data.imageUrl
      sessionId.value = response.data.sessionId
      loginForm.sessionId = sessionId.value
    } else {
      showMessage('error', '获取验证码失败')
    }
  } catch (error) {
    showMessage('error', '获取验证码失败，请重试')
  }
}

// 刷新验证码
function refreshCaptcha() {
  fetchCaptcha()
}

// 显示消息
function showMessage(type, text) {
  message.type = type
  message.text = text
  setTimeout(() => {
    message.text = ''
  }, 3000)
}

// 登录
async function handleLogin() {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    message.text = ''

    try {
      const result = await authStore.loginAction({
        email: loginForm.email,
        password: loginForm.password,
        captchaCode: loginForm.captchaCode,
        sessionId: loginForm.sessionId
      })

      if (result.success) {
        showMessage('success', '欢迎回来，正在进入系统...')
        setTimeout(() => {
          const redirect = route.query.redirect || '/'
          router.push(redirect)
        }, 1000)
      } else {
        showMessage('error', result.message || '登录失败')
        refreshCaptcha()
        loginForm.captchaCode = ''
      }
    } catch (error) {
      showMessage('error', error.message || '登录失败，请重试')
      refreshCaptcha()
      loginForm.captchaCode = ''
    } finally {
      loading.value = false
    }
  })
}

onMounted(() => {
  fetchCaptcha()
})
</script>

<style scoped>
.login-container {
  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #050811;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  overflow: hidden;
  padding: 20px;
}

/* 背景动态装饰 */
.bg-decoration {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.2;
  animation: pulse 4s ease-in-out infinite;
}

.bg-decoration-1 {
  top: -10%;
  left: -10%;
  width: 40%;
  height: 40%;
  background: #3b82f6;
  animation-delay: 0s;
}

.bg-decoration-2 {
  bottom: -10%;
  right: -10%;
  width: 40%;
  height: 40%;
  background: #9333ea;
  animation-delay: 2s;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.2;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.3;
  }
}

/* 科技感网格线背景 */
.grid-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.2;
  background-image: linear-gradient(#1e293b 1px, transparent 1px),
    linear-gradient(90deg, #1e293b 1px, transparent 1px);
  background-size: 40px 40px;
}

/* 主卡片 */
.login-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 450px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 48px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

/* 卡片扫光效果 */
.card-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #06b6d4, transparent);
  opacity: 0.5;
}

/* Logo与标题 */
.card-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 8px 24px rgba(6, 182, 212, 0.2);
  border: 4px solid rgba(6, 182, 212, 0.1);
}

.logo-icon {
  color: white;
}

.card-title {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.card-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

/* 消息提示 */
.message-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 24px;
  font-size: 14px;
  border: 1px solid;
}

.message-box.success {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.message-box.error {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.message-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.message-dot.success {
  background: #34d399;
}

.message-dot.error {
  background: #f87171;
}

.message-fade-enter-active,
.message-fade-leave-active {
  transition: all 0.3s ease;
}

.message-fade-enter-from,
.message-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 表单 */
.login-form {
  margin-top: 32px;
}

.form-item {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  margin-left: 4px;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  z-index: 1;
  transition: color 0.3s;
}

.input-wrapper:focus-within .input-icon {
  color: #06b6d4;
}

.custom-input {
  width: 100%;
}

:deep(.custom-input .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding-left: 44px;
  box-shadow: none;
  transition: all 0.3s;
}

:deep(.custom-input .el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.2);
}

:deep(.custom-input .el-input__wrapper.is-focus) {
  border-color: #06b6d4;
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2);
}

:deep(.custom-input .el-input__inner) {
  color: white;
  background: transparent;
}

:deep(.custom-input .el-input__inner::placeholder) {
  color: #64748b;
}

/* 验证码 */
.captcha-wrapper {
  display: flex;
  gap: 12px;
}

.captcha-input-wrapper {
  flex: 1;
}

.captcha-image {
  position: relative;
  width: 128px;
  height: 46px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.3s;
}

.captcha-image:hover {
  border-color: rgba(6, 182, 212, 0.5);
  background: rgba(255, 255, 255, 0.08);
}

.captcha-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captcha-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.captcha-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  color: white;
}

.captcha-image:hover .captcha-overlay {
  opacity: 1;
}

/* 提交按钮 */
.submit-button {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  margin-top: 8px;
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  color: white;
  font-weight: 600;
  font-size: 15px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(6, 182, 212, 0.25);
}

.submit-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #0891b2 0%, #2563eb 100%);
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(6, 182, 212, 0.35);
}

.submit-button:active:not(:disabled) {
  transform: scale(0.98);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.button-shine {
  position: absolute;
  top: 0;
  left: -50%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transform: skewX(-20deg);
  transition: left 0.7s;
}

.submit-button:hover:not(:disabled) .button-shine {
  left: 200%;
}

.button-icon {
  animation: spin 1s linear infinite;
}

.button-arrow {
  transition: transform 0.3s;
}

.submit-button:hover:not(:disabled) .button-arrow {
  transform: translateX(4px);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 版权信息 */
.copyright {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* 响应式 */
@media (max-width: 640px) {
  .login-card {
    padding: 32px 24px;
  }

  .card-title {
    font-size: 20px;
  }
}
</style>

