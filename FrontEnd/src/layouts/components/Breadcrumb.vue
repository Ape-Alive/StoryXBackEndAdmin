<template>
  <el-breadcrumb separator="/" class="app-breadcrumb">
    <el-breadcrumb-item
      v-for="(item, index) in breadcrumbList"
      :key="index"
      :to="item.path"
    >
      {{ item.title }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { MENU_STRUCTURE } from '@/config/menu'

const route = useRoute()
const breadcrumbList = ref([])

// 从菜单配置中构建路径映射
function buildMenuMap() {
  const map = {}
  MENU_STRUCTURE.forEach(menu => {
    menu.children.forEach(child => {
      map[child.path] = {
        title: child.label,
        parent: menu.title
      }
    })
  })
  return map
}

const menuMap = buildMenuMap()

// 生成面包屑
function generateBreadcrumb() {
  const path = route.path
  const matched = route.matched
  const list = []

  // 从菜单映射中获取标题
  const menuItem = menuMap[path]

  if (menuItem) {
    // 添加父级菜单
    if (menuItem.parent) {
      list.push({
        title: menuItem.parent,
        path: null // 父级菜单通常不可点击
      })
    }
    // 添加当前页面
    list.push({
      title: menuItem.title,
      path: path
    })
  } else {
    // 如果没有找到映射，尝试从路由 meta 获取
    const routeMeta = matched[matched.length - 1]?.meta
    if (routeMeta?.title) {
      list.push({
        title: routeMeta.title,
        path: path
      })
    } else {
      // 默认显示路径（首字母大写）
      const pathSegments = path.split('/').filter(Boolean)
      pathSegments.forEach((segment, index) => {
        const segmentPath = '/' + pathSegments.slice(0, index + 1).join('/')
        const title = segment.charAt(0).toUpperCase() + segment.slice(1)
        list.push({
          title: title,
          path: segmentPath
        })
      })
    }
  }

  breadcrumbList.value = list
}

// 监听路由变化
watch(() => route.path, () => {
  generateBreadcrumb()
}, { immediate: true })
</script>

<style scoped>
.app-breadcrumb {
  margin-bottom: 24px;
}
</style>

<style>
.app-breadcrumb :deep(.el-breadcrumb__item) .el-breadcrumb__inner {
  color: #64748b;
  font-weight: 500;
}

.app-breadcrumb :deep(.el-breadcrumb__item:last-child) .el-breadcrumb__inner {
  color: #0f172a;
  font-weight: 600;
}
</style>

