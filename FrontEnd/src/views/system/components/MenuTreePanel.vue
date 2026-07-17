<template>
  <div class="menu-tree-panel">
    <div class="panel-header">
      <h3 class="panel-title">导航菜单</h3>
      <el-button type="primary" :icon="Plus" circle @click="$emit('add-root')" />
    </div>

    <div class="panel-search">
      <el-input
        :model-value="keyword"
        placeholder="搜索菜单..."
        clearable
        :prefix-icon="Search"
        @update:model-value="$emit('update:keyword', $event)"
        @keyup.enter="$emit('search')"
        @clear="$emit('search')"
      />
    </div>

    <div v-loading="loading" class="panel-body">
      <template v-if="treeData.length">
        <MenuTreeNode
          v-for="node in treeData"
          :key="node.id"
          :node="node"
          :selected-id="selectedId"
          :expanded-ids="expandedIds"
          @select="$emit('select', $event)"
          @toggle-expand="$emit('toggle-expand', $event)"
          @add-child="$emit('add-child', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
        />
      </template>
      <el-empty v-else description="暂无菜单数据" :image-size="80" />
    </div>
  </div>
</template>

<script setup>
import { Plus, Search } from '@element-plus/icons-vue'
import MenuTreeNode from './MenuTreeNode.vue'

defineProps({
  treeData: { type: Array, default: () => [] },
  selectedId: String,
  expandedIds: { type: Set, default: () => new Set() },
  keyword: String,
  loading: Boolean,
})

defineEmits([
  'update:keyword',
  'search',
  'select',
  'toggle-expand',
  'add-root',
  'add-child',
  'edit',
  'delete',
])
</script>

<style scoped>
.menu-tree-panel {
  width: 320px;
  flex-shrink: 0;
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f1f5f9;
  background: rgba(248, 250, 252, 0.8);
}

.panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.panel-search {
  padding: 16px 16px 8px;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px 16px;
  min-height: 420px;
}
</style>
