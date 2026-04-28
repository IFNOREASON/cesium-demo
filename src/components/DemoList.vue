<template>
  <div class="demo-list">
    <h3 class="list-title">示例列表</h3>
    <ul class="list-items">
      <li
        v-for="demo in demos"
        :key="demo.id"
        :class="['list-item', { active: activeDemoId === demo.id }]"
        @click="handleSelect(demo.id)"
      >
        <span class="item-name">{{ demo.name }}</span>
        <p class="item-description">{{ demo.description }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { Demo } from '../types/demo'

// 定义属性
const props = defineProps<{
  demos: Demo[]
  activeDemoId: string
}>()

// 定义事件
const emit = defineEmits<{
  (e: 'select', demoId: string): void
}>()

// 处理选择
const handleSelect = (demoId: string) => {
  emit('select', demoId)
}
</script>

<style scoped>
.demo-list {
  height: 100%;
  border-right: 1px solid #ddd;
  background-color: #fafafa;
  overflow-y: auto;
}

.list-title {
  padding: 16px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #ddd;
}

.list-items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.list-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #eee;
}

.list-item:hover {
  background-color: #f0f0f0;
}

.list-item.active {
  background-color: #e3f2fd;
  border-left: 3px solid #2196F3;
}

.item-name {
  display: block;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.item-description {
  margin: 0;
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}
</style>
