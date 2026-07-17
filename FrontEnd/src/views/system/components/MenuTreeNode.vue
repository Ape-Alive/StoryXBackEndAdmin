<template>
  <div class="menu-tree-node">
    <div
      :class="['node-row', { active: selectedId === node.id }]"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      @click="$emit('select', node)"
    >
      <button
        v-if="node.children?.length"
        class="expand-btn"
        @click.stop="$emit('toggle-expand', node.id)"
      >
        <el-icon>
          <ArrowDown v-if="expandedIds.has(node.id)" />
          <ArrowRight v-else />
        </el-icon>
      </button>
      <span v-else class="expand-placeholder" />

      <el-icon class="node-icon"><Menu /></el-icon>
      <span class="node-label">{{ node.name }}</span>

      <div class="node-actions" @click.stop>
        <el-button link type="primary" :icon="Plus" title="添加子菜单" @click="$emit('add-child', node)" />
        <el-button link type="warning" :icon="Edit" title="编辑" @click="$emit('edit', node)" />
        <el-button link type="danger" :icon="Delete" title="删除" @click="$emit('delete', node)" />
      </div>
    </div>

    <template v-if="expandedIds.has(node.id) && node.children?.length">
      <MenuTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        :expanded-ids="expandedIds"
        @select="$emit('select', $event)"
        @toggle-expand="$emit('toggle-expand', $event)"
        @add-child="$emit('add-child', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </template>
  </div>
</template>

<script setup>
import { ArrowDown, ArrowRight, Delete, Edit, Menu, Plus } from '@element-plus/icons-vue'

defineOptions({ name: 'MenuTreeNode' })

defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  selectedId: String,
  expandedIds: { type: Set, default: () => new Set() },
})

defineEmits(['select', 'toggle-expand', 'add-child', 'edit', 'delete'])
</script>

<style scoped>
.node-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  margin-bottom: 2px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #334155;
}

.node-row:hover {
  background: #f8fafc;
}

.node-row.active {
  background: #eff6ff;
  color: #1d4ed8;
  box-shadow: inset 0 0 0 1px #dbeafe;
}

.expand-btn,
.expand-placeholder {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.expand-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
}

.node-icon {
  color: #94a3b8;
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-actions {
  display: none;
  align-items: center;
  gap: 2px;
}

.node-row:hover .node-actions {
  display: flex;
}
</style>
