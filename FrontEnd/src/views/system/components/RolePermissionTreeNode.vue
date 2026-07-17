<template>
  <div class="permission-tree-node">
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

      <el-checkbox
        :model-value="checkState.checked"
        :indeterminate="checkState.indeterminate"
        :disabled="readonly"
        @click.stop
        @change="checked => $emit('toggle-menu', node, checked)"
      />

      <el-icon class="node-icon"><Menu /></el-icon>
      <span class="node-label">{{ node.name }}</span>
    </div>

    <template v-if="expandedIds.has(node.id) && node.children?.length">
      <RolePermissionTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        :expanded-ids="expandedIds"
        :checked-menu-ids="checkedMenuIds"
        :readonly="readonly"
        @select="$emit('select', $event)"
        @toggle-expand="$emit('toggle-expand', $event)"
        @toggle-menu="(menu, checked) => $emit('toggle-menu', menu, checked)"
      />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowDown, ArrowRight, Menu } from '@element-plus/icons-vue'
import { getMenuCheckState } from '../composables/useRolePermissionTree'

defineOptions({ name: 'RolePermissionTreeNode' })

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  selectedId: String,
  expandedIds: { type: Set, default: () => new Set() },
  checkedMenuIds: { type: Set, default: () => new Set() },
  readonly: Boolean,
})

defineEmits(['select', 'toggle-expand', 'toggle-menu'])

const checkState = computed(() => getMenuCheckState(props.node, props.checkedMenuIds))
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
</style>
