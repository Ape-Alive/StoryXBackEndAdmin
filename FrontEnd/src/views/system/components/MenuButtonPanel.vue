<template>
  <div class="menu-button-panel">
    <template v-if="selectedMenu">
      <div class="panel-header">
        <div class="header-info">
          <div>
            <h2 class="menu-name">{{ selectedMenu.name }}</h2>
            <p class="menu-meta">ID: {{ selectedMenu.id }}</p>
            <p v-if="selectedMenu.path" class="menu-meta">路径: {{ selectedMenu.path }}</p>
          </div>
        </div>
        <el-button type="primary" :icon="Plus" @click="$emit('add-button')">新增功能按钮</el-button>
      </div>

      <div v-loading="loading" class="panel-body">
        <h3 class="section-title">
          <el-icon><Mouse /></el-icon>
          页面操作 / 按钮权限
        </h3>

        <div v-if="buttons.length" class="button-grid">
          <div v-for="button in buttons" :key="button.id" class="button-card">
            <div class="button-card-main">
              <div class="button-icon">
                <el-icon><Operation /></el-icon>
              </div>
              <div class="button-info">
                <p class="button-name">{{ button.name }}</p>
                <p class="button-code">
                  {{ button.frontendPermissionCode || '无前端权限码' }}
                </p>
                <div class="button-tags">
                  <el-tag size="small" :type="button.isVisible ? 'success' : 'info'">
                    {{ button.isVisible ? '可见' : '隐藏' }}
                  </el-tag>
                  <el-tag size="small" :type="button.isDisabled ? 'danger' : 'success'">
                    {{ button.isDisabled ? '禁用' : '启用' }}
                  </el-tag>
                </div>
              </div>
            </div>
            <div class="button-actions">
              <el-button link type="warning" :icon="Edit" @click="$emit('edit-button', button)" />
              <el-button link type="danger" :icon="Delete" @click="$emit('delete-button', button)" />
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <el-icon :size="48" class="empty-icon"><Mouse /></el-icon>
          <p>暂无功能按钮配置</p>
        </div>
      </div>
    </template>

    <div v-else class="placeholder">
      <div class="placeholder-icon">
        <el-icon :size="64"><Menu /></el-icon>
      </div>
      <p>请在左侧选择一个菜单</p>
    </div>
  </div>
</template>

<script setup>
import { Delete, Edit, Menu, Mouse, Operation, Plus } from '@element-plus/icons-vue'

defineProps({
  selectedMenu: Object,
  buttons: { type: Array, default: () => [] },
  loading: Boolean,
})

defineEmits(['add-button', 'edit-button', 'delete-button'])
</script>

<style scoped>
.menu-button-panel {
  flex: 1;
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 520px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid #f1f5f9;
  background: rgba(248, 250, 252, 0.5);
}

.header-info {
  display: flex;
  align-items: center;
}

.menu-name {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.menu-meta {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.panel-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 15px;
  font-weight: 700;
  color: #475569;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.button-card {
  border: 2px solid #f1f5f9;
  border-radius: 16px;
  padding: 16px;
  transition: all 0.15s ease;
}

.button-card:hover {
  border-color: #dbeafe;
  background: #f8fbff;
}

.button-card-main {
  display: flex;
  gap: 12px;
}

.button-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.button-name {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.button-code {
  margin: 0 0 8px;
  font-size: 11px;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.button-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.button-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 12px;
}

.empty-state,
.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-weight: 500;
}

.placeholder-icon,
.empty-icon {
  color: #e2e8f0;
  margin-bottom: 12px;
}
</style>
