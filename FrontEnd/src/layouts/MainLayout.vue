<template>
  <div class="main-layout">
    <!-- 顶部导航栏 -->
    <header class="top-header">
      <div class="header-left">
        <div class="logo-section">
          <div class="logo-icon">
            <el-icon :size="24"><Grid /></el-icon>
          </div>
          <div class="logo-text">
            <h1 class="logo-title">CAPABILITY <span class="logo-highlight">HUB</span></h1>
            <p class="logo-subtitle">Admin Control v2.5</p>
          </div>
        </div>

        <!-- 顶部导航菜单 -->
        <nav class="top-nav">
          <button
            v-for="item in topNavMenu"
            :key="item.path"
            :class="['nav-item', { active: route.path.startsWith(item.path) }]"
            @click="router.push(item.path)"
          >
            {{ item.label }}
          </button>
        </nav>
      </div>

      <div class="header-right">
        <!-- 搜索框 -->
        <div class="search-wrapper">
          <el-icon class="search-icon"><Search /></el-icon>
          <input
            v-model="searchKeyword"
            type="text"
            class="search-input"
            placeholder="搜索实体、UUID或终端..."
            @keyup.enter="handleSearch"
          />
        </div>

        <!-- 通知按钮 -->
        <button class="icon-button notification-button">
          <el-icon :size="22"><Bell /></el-icon>
          <span class="notification-badge"></span>
        </button>

        <!-- 用户信息 -->
        <div class="user-section" @click="showUserMenu = !showUserMenu">
          <div class="user-info">
            <p class="user-name">{{ authStore.admin?.username || '管理员' }}</p>
            <p class="user-role">{{ getRoleName(authStore.admin?.role) }}</p>
          </div>
          <div class="user-avatar">
            <el-icon :size="20"><User /></el-icon>
          </div>
          <el-icon class="dropdown-icon" :class="{ rotate: showUserMenu }">
            <ArrowDown />
          </el-icon>
        </div>

        <!-- 用户下拉菜单 -->
        <transition name="dropdown-fade">
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="dropdown-item" @click="handleProfile">
              <el-icon><User /></el-icon>
              <span>个人信息</span>
            </div>
            <div class="dropdown-item" @click="handlePassword">
              <el-icon><Key /></el-icon>
              <span>修改密码</span>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item logout" @click="handleLogout">
              <el-icon><SwitchButton /></el-icon>
              <span>安全退出</span>
            </div>
          </div>
        </transition>
      </div>
    </header>

    <div class="layout-body">
      <!-- 侧边栏 -->
      <aside :class="['sidebar', { collapsed: sidebarCollapsed }]">
        <div class="sidebar-content">
          <div ref="menuListRef" class="menu-list" :style="{ height: menuListHeight + 'px' }">
            <div v-for="(menu, index) in menuStructure" :key="index" class="menu-group">
              <!-- 菜单标题（小字） -->
              <div v-if="!sidebarCollapsed" class="menu-title">
                {{ menu.title }}
              </div>

              <!-- 菜单项列表 -->
              <div class="menu-items">
                <button
                  v-for="child in menu.children"
                  :key="child.id"
                  :class="['menu-item', { active: route.path === child.path }]"
                  @click="router.push(child.path)"
                  :title="sidebarCollapsed ? child.label : ''"
                >
                  <el-icon :size="20" class="menu-item-icon">
                    <component :is="child.icon || menu.icon" />
                  </el-icon>
                  <span v-if="!sidebarCollapsed" class="menu-item-label">{{ child.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 底部退出按钮 -->
          <div class="sidebar-footer">
            <button class="logout-button" @click="handleLogout">
              <el-icon :size="22"><SwitchButton /></el-icon>
              <span v-if="!sidebarCollapsed">安全退出</span>
            </button>
          </div>
        </div>

        <!-- 折叠按钮 -->
        <button class="collapse-button" @click="handleSidebarToggle">
          <el-icon>
            <component :is="sidebarCollapsed ? 'ArrowRight' : 'ArrowLeft'" />
          </el-icon>
        </button>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <div class="content-wrapper">
          <!-- 面包屑导航（可通过路由 meta.showBreadcrumb 控制是否展示，默认 true） -->
          <Breadcrumb v-if="showBreadcrumb" />
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
// Element Plus 图标已全局注册，直接使用组件名
import { useAuthStore } from '@/stores/auth'
import { MENU_STRUCTURE, TOP_NAV_MENU } from '@/config/menu'
import Breadcrumb from './components/Breadcrumb.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 是否展示面包屑（路由 meta.showBreadcrumb，默认 true；设置为 false 时隐藏）
const showBreadcrumb = computed(() => {
  const meta = route.matched[route.matched.length - 1]?.meta
  return meta?.showBreadcrumb !== false
})

const searchKeyword = ref('')
const showUserMenu = ref(false)
const sidebarCollapsed = ref(false)
const menuListRef = ref(null)
const menuListHeight = ref(0)
const isCalculating = ref(false) // 防止重复计算

const menuStructure = MENU_STRUCTURE
const topNavMenu = TOP_NAV_MENU

// 计算菜单列表高度
function calculateMenuListHeight() {
  // 防止重复计算
  if (isCalculating.value) return
  if (!menuListRef.value) return

  const sidebarContent = menuListRef.value.parentElement
  if (!sidebarContent) return

  // 获取 sidebar-content 的高度
  const contentHeight = sidebarContent.offsetHeight
  if (contentHeight === 0) return

  // 获取 sidebar-footer 元素的高度
  const sidebarFooter = sidebarContent.querySelector('.sidebar-footer')
  const footerHeight = sidebarFooter ? sidebarFooter.offsetHeight : 0

  // 计算新的高度
  const newHeight = Math.max(contentHeight - footerHeight, 200)

  // 只有当高度真正改变时才更新（差值大于2px），避免无限循环
  if (Math.abs(menuListHeight.value - newHeight) > 2) {
    isCalculating.value = true
    menuListHeight.value = newHeight
    // 使用 nextTick 确保更新完成后再允许下次计算
    nextTick(() => {
      isCalculating.value = false
    })
  }
}

// 窗口大小改变时重新计算
function handleResize() {
  // 使用防抖优化性能
  clearTimeout(window.menuHeightResizeTimer)
  window.menuHeightResizeTimer = setTimeout(() => {
    requestAnimationFrame(() => {
      calculateMenuListHeight()
    })
  }, 100)
}

// 侧边栏折叠/展开
function handleSidebarToggle() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  // 等待动画完成后重新计算高度
  nextTick(() => {
    setTimeout(() => {
      calculateMenuListHeight()
    }, 300)
  })
}

// 获取角色显示名称
function getRoleName(role) {
  const roleMap = {
    super_admin: 'Root_Admin',
    platform_admin: 'Platform_Admin',
    operator: 'Operator',
    risk_control: 'Risk_Control',
    finance: 'Finance',
    read_only: 'Read_Only'
  }
  return roleMap[role] || 'Admin'
}

// 菜单不再需要展开/收起功能，已移除

// 搜索
function handleSearch() {
  if (searchKeyword.value.trim()) {
    ElMessage.info(`搜索: ${searchKeyword.value}`)
    // TODO: 实现搜索功能
  }
}

// 个人信息
function handleProfile() {
  showUserMenu.value = false
  ElMessage.info('个人信息功能开发中')
}

// 修改密码
function handlePassword() {
  showUserMenu.value = false
  ElMessage.info('修改密码功能开发中')
}

// 退出登录
function handleLogout() {
  showUserMenu.value = false
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      authStore.logout()
      ElMessage.success('已退出登录')
      router.push('/login')
    })
    .catch(() => {})
}

// 点击外部关闭用户菜单
function handleClickOutside(event) {
  const userSection = event.target.closest('.user-section')
  const userDropdown = event.target.closest('.user-dropdown')
  if (!userSection && !userDropdown) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)

  // 使用 nextTick 确保 DOM 完全渲染
  nextTick(() => {
    // 延迟一点确保所有样式都应用完成
    setTimeout(() => {
      calculateMenuListHeight()
    }, 50)
  })

  // 只在窗口大小改变和特定事件时计算，不使用 ResizeObserver 避免循环触发
  // ResizeObserver 会在设置高度时触发，导致循环计算
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)

  // 清理定时器
  if (window.menuHeightResizeTimer) {
    clearTimeout(window.menuHeightResizeTimer)
  }
})
</script>

<style scoped>
.main-layout {
  height: 100vh;
  overflow: hidden;
  background: #f8fafc;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 顶部导航栏 */
.top-header {
  height: 64px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid #e2e8f0;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo-icon {
  width: 44px;
  height: 44px;
  background: #2563eb;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.2);
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
  line-height: 1;
  letter-spacing: -0.5px;
}

.logo-highlight {
  color: #2563eb;
}

.logo-subtitle {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin: 2px 0 0 0;
}

.top-nav {
  display: none;
  align-items: center;
  gap: 40px;
  border-left: 1px solid #e2e8f0;
  padding-left: 40px;
}

@media (min-width: 1280px) {
  .top-nav {
    display: flex;
  }
}

.nav-item {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.3s;
  padding: 0;
}

.nav-item:hover {
  color: #2563eb;
}

.nav-item.active {
  color: #2563eb;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 32px;
}

/* 搜索框 */
.search-wrapper {
  position: relative;
  display: none;
}

@media (min-width: 1024px) {
  .search-wrapper {
    display: block;
  }
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 288px;
  background: #f1f5f9;
  border: 1px solid transparent;
  border-radius: 16px;
  padding: 10px 16px 10px 44px;
  font-size: 14px;
  color: #0f172a;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  background: white;
  border-color: rgba(37, 99, 235, 0.3);
}

.search-input::placeholder {
  color: #94a3b8;
}

/* 图标按钮 */
.icon-button {
  position: relative;
  padding: 10px;
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button:hover {
  color: #2563eb;
}

.notification-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  border: 2px solid white;
}

/* 用户信息 */
.user-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 32px;
  border-left: 1px solid #e2e8f0;
  cursor: pointer;
  position: relative;
}

.user-info {
  text-align: right;
}

.user-name {
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
  transition: color 0.3s;
}

.user-section:hover .user-name {
  color: #2563eb;
}

.user-role {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.user-avatar {
  width: 44px;
  height: 44px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #64748b;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.user-section:hover .user-avatar {
  border-color: #2563eb;
}

.dropdown-icon {
  color: #94a3b8;
  transition: transform 0.3s;
}

.dropdown-icon.rotate {
  transform: rotate(180deg);
}

/* 用户下拉菜单 */
.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 8px;
  min-width: 200px;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: #0f172a;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s;
}

.dropdown-item:hover {
  background: #f1f5f9;
}

.dropdown-item.logout {
  color: #ef4444;
}

.dropdown-item.logout:hover {
  background: #fef2f2;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 4px 0;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.2s;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 布局主体 */
.layout-body {
  display: flex;
  min-height: calc(100vh - 64px);
}

/* 侧边栏 */
.sidebar {
  width: 288px;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  position: relative;
}

.sidebar.collapsed {
  width: 96px;
}

.sidebar-content {
  height: calc(100vh - 64px);
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.menu-list::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.menu-group {
  margin-bottom: 24px;
}

/* 菜单标题（小字） */
.menu-title {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 8px 20px 8px 20px;
  margin-bottom: 4px;
}

/* 菜单项列表 */
.menu-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 菜单项 */
.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}

.sidebar:not(.collapsed) .menu-item {
  justify-content: flex-start;
  padding: 12px 20px;
}

.menu-item:hover {
  color: #0f172a;
  background: #f1f5f9;
}

.menu-item.active {
  color: #2563eb;
  background: #eff6ff;
  font-weight: 600;
}

.menu-item-icon {
  flex-shrink: 0;
  color: inherit;
}

.menu-item-label {
  white-space: nowrap;
}

/* 侧边栏底部 */
.sidebar-footer {
  padding-top: 32px;
  border-top: 1px solid #f1f5f9;
  margin-top: auto;
}

.logout-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  color: #94a3b8;
  background: none;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.logout-button:hover {
  color: #ef4444;
  background: #fef2f2;
}

/* 折叠按钮 */
.collapse-button {
  position: absolute;
  top: 50%;
  right: -16px;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  z-index: 10;
}

.collapse-button:hover {
  background: #f1f5f9;
  border-color: #2563eb;
  color: #2563eb;
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 48px;
  background: #ffffff;
  height: calc(100vh - 60px);
}

.content-wrapper {
  /* max-width: 1500px; */
  margin: 0 auto;
}

/* 响应式 */
@media (max-width: 1024px) {
  .top-header {
    padding: 0 24px;
  }

  .header-left {
    gap: 20px;
  }

  .main-content {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 64px;
    height: calc(100vh - 64px);
    z-index: 40;
    transform: translateX(-100%);
  }

  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }
}
</style>
