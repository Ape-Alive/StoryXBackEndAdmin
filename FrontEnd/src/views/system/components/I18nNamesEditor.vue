<template>
  <div class="i18n-names-editor">
    <div class="i18n-row required-row">
      <span class="field-label required">简体中文 *</span>
      <el-input
        v-model="zhLabel"
        class="label-input"
        placeholder="请输入简体中文名称"
        @input="emitChange"
        @blur="emitBlur"
      />
    </div>

    <div v-for="(item, index) in extraRows" :key="item._key" class="i18n-row pair-row">
      <el-input
        v-model="extraRows[index].language"
        class="language-input"
        placeholder="language"
        @input="emitChange"
      />
      <el-input
        v-model="extraRows[index].label"
        class="label-input"
        placeholder="label"
        @input="emitChange"
      />
      <el-button link type="danger" :icon="Delete" title="移除" @click="removeRow(index)" />
    </div>

    <el-button type="primary" link :icon="Plus" @click="addRow">添加语言</el-button>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import { REQUIRED_LANGUAGE } from '../composables/useMenuApi'

const LEGACY_LOCALE_MAP = {
  'zh-CN': 'zh',
  'en-US': 'en',
  'ja-JP': 'ja',
}

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'blur'])

const zhLabel = ref('')
const extraRows = ref([])
const isInternalUpdate = ref(false)
let rowKeySeed = 0

function createRow(language = '', label = '') {
  rowKeySeed += 1
  return { _key: `row-${rowKeySeed}`, language, label }
}

function resolveLanguage(item) {
  if (item?.language) return item.language
  if (item?.locale) return LEGACY_LOCALE_MAP[item.locale] || item.locale
  return ''
}

function resolveLabel(item) {
  return item?.label ?? item?.name ?? ''
}

function syncFromProps() {
  const items = props.modelValue || []
  const map = new Map(items.map(item => [resolveLanguage(item), resolveLabel(item)]))
  zhLabel.value = map.get(REQUIRED_LANGUAGE) || ''
  extraRows.value = items
    .filter(item => resolveLanguage(item) !== REQUIRED_LANGUAGE)
    .map(item => createRow(resolveLanguage(item), resolveLabel(item)))
}

function buildValue() {
  const result = [{ language: REQUIRED_LANGUAGE, label: zhLabel.value ?? '' }]
  extraRows.value.forEach(item => {
    result.push({
      language: item.language ?? '',
      label: item.label ?? '',
    })
  })
  return result
}

function emitChange() {
  isInternalUpdate.value = true
  emit('update:modelValue', buildValue())
  nextTick(() => {
    isInternalUpdate.value = false
  })
}

function emitBlur() {
  emit('blur')
  emitChange()
}

function addRow() {
  extraRows.value.push(createRow())
  emitChange()
}

function removeRow(index) {
  extraRows.value.splice(index, 1)
  emitChange()
}

watch(
  () => props.modelValue,
  () => {
    if (!isInternalUpdate.value) {
      syncFromProps()
    }
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.i18n-names-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.i18n-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.field-label {
  min-width: 100px;
  font-size: 13px;
  color: #64748b;
  flex-shrink: 0;
}

.field-label.required {
  color: #ef4444;
  font-weight: 600;
}

.language-input {
  width: 140px;
  flex-shrink: 0;
}

.label-input {
  flex: 1;
}

.pair-row {
  padding-left: 0;
}
</style>
