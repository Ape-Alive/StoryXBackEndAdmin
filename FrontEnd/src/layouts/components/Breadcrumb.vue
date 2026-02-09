<template>
  <el-breadcrumb separator="/" class="app-breadcrumb">
    <el-breadcrumb-item
      v-for="(item, index) in breadcrumbList"
      :key="index"
      :to="index === 0 ? undefined : (item.path || undefined)"
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

  // 从路由 matched 数组中获取所有匹配的路由，按顺序构建面包屑
  if (matched && matched.length > 0) {
    matched.forEach((routeRecord, index) => {
      // 只处理有 meta.title 的路由（跳过布局组件）
      if (routeRecord.meta && routeRecord.meta.title) {
        // 对于动态路由，需要替换参数为实际值
        let routePath = routeRecord.path
        
        // 处理动态路由参数
        if (routeRecord.path.includes(':') && route.params) {
          Object.keys(route.params).forEach((key) => {
            if (route.params[key]) {
              routePath = routePath.replace(`:${key}`, route.params[key])
            }
          })
        }
        
        // 确保路径格式正确
        if (!routePath.startsWith('/')) {
          routePath = `/${routePath}`
        }
        
        // 构建完整的路径
        let fullPath = routePath
        
        // 如果路径中还有未替换的参数（动态路由），使用当前路径
        if (routePath.includes(':')) {
          fullPath = path
        } else {
          // 对于最后一个匹配的路由，使用当前路径
          // 对于父路由，使用路由路径（已经是完整路径）
          if (index === matched.length - 1) {
            fullPath = path
          } else {
            // 父路由使用其定义的路径
            fullPath = routePath
          }
        }
        
        list.push({
          title: routeRecord.meta.title,
          path: fullPath
        })
      }
    })
  }

  // 如果从 matched 中没有获取到，尝试从菜单映射中获取
  if (list.length === 0) {
    const menuItem = menuMap[path]
    if (menuItem) {
      // 添加父级菜单（第一层，不可点击）
      if (menuItem.parent) {
        list.push({
          title: menuItem.parent,
          path: null
        })
      }
      // 添加当前页面
      list.push({
        title: menuItem.title,
        path: path
      })
    } else {
      // 检查当前路由是否有 parentTitle 和 parentPath（用于显示嵌套关系）
      const currentRoute = matched && matched.length > 0 ? matched[matched.length - 1] : null
      if (currentRoute && currentRoute.meta && currentRoute.meta.parentTitle) {
        // 添加父级路由（第一层，不可点击）
        list.push({
          title: currentRoute.meta.parentTitle,
          path: null
        })
        // 添加当前路由
        list.push({
          title: currentRoute.meta.title,
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
  }

  // 确保第一层不可点击
  if (list.length > 0) {
    list[0].path = null
  }

  breadcrumbList.value = list
}

// 监听路由变化和 matched 变化，确保嵌套路由也能正确更新
watch(() => [route.path, route.matched], () => {
  generateBreadcrumb()
}, { immediate: true, deep: true })
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

