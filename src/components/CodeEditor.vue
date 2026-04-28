<template>
  <div class="code-editor">
    <textarea
      ref="textareaRef"
      :value="code"
      @input="handleInput"
      class="editor-textarea"
      spellcheck="false"
      placeholder="// 在这里输入 Cesium 代码..."
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 定义属性
const props = defineProps<{
  code: string
}>()

// 定义事件
const emit = defineEmits<{
  (e: 'update:code', value: string): void
  (e: 'run', value: string): void
}>()

// 引用
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 处理输入
const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:code', target.value)
}
</script>

<style scoped>
.code-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  padding: 10px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  border: none;
  outline: none;
  resize: none;
  background-color: #1e1e1e;
  color: #d4d4d4;
  tab-size: 2;
}

.editor-textarea::placeholder {
  color: #6a6a6a;
}

.editor-textarea:focus {
  background-color: #1a1a1a;
}
</style>
