<template>
  <div id="app">
    <header class="app-header">
      <div class="header-left">
        <span class="app-title">Cesium Demo</span>
      </div>
      <div class="header-right">
        <span class="header-info">在线编辑 & 预览</span>
      </div>
    </header>
    
    <main class="app-main">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">示例列表</span>
        </div>
        <div class="sidebar-content">
          <DemoList
            :demos="demos"
            :active-demo-id="activeDemo.id"
            @select="handleDemoSelect"
          />
        </div>
      </aside>
      
      <section class="content">
        <div class="demo-info-bar">
          <div class="info-left">
            <span class="demo-name">{{ activeDemo.name }}</span>
            <span class="demo-desc">{{ activeDemo.description }}</span>
          </div>
          <div class="info-right">
            <div class="layer-selector">
              <button class="layer-btn" @click="toggleLayerPanel">
                <span class="layer-icon">{{ currentLayer.icon }}</span>
                <span class="layer-text">{{ currentLayer.name }}</span>
                <span class="layer-arrow" :class="{ open: showLayerPanel }">▼</span>
              </button>
              
              <div v-if="showLayerPanel" class="layer-dropdown" ref="layerDropdownRef">
                <div class="layer-list">
                  <div
                    v-for="layer in mapLayers"
                    :key="layer.id"
                    :class="['layer-item', { selected: layer.id === currentLayerId }]"
                    @click="selectLayer(layer.id)"
                  >
                    <span class="item-icon">{{ layer.icon }}</span>
                    <span class="item-text">
                      <span class="item-name">{{ layer.name }}</span>
                      <span class="item-desc">{{ layer.description }}</span>
                    </span>
                    <span v-if="layer.id === currentLayerId" class="item-check">✓</span>
                  </div>
                </div>
              </div>
            </div>
            
            <button v-if="errorMessage" class="error-btn" @click="errorMessage = null">
              {{ errorMessage }}
            </button>
          </div>
        </div>
        
        <div class="main-content">
          <div 
            class="code-panel" 
            :class="{ collapsed: isCodeCollapsed }"
            :style="{ width: isCodeCollapsed ? '40px' : codePanelWidth + 'px' }"
          >
            <div class="panel-header">
              <span class="panel-title" v-show="!isCodeCollapsed">代码编辑器</span>
              <div class="panel-actions">
                <button class="action-btn" @click="toggleCodePanel" :title="isCodeCollapsed ? '展开' : '收起'">
                  {{ isCodeCollapsed ? '▶' : '◀' }}
                </button>
                <button 
                  v-show="!isCodeCollapsed" 
                  class="action-btn run-btn" 
                  @click="runCode"
                  :title="运行代码"
                >
                  ▶ 运行
                </button>
              </div>
            </div>
            
            <div class="panel-body" v-show="!isCodeCollapsed">
              <CodeEditor
                v-model:code="currentCode"
                @run="runCode"
              />
              
              <div v-if="activeDemo.frameworks" class="frameworks-section">
                <div class="frameworks-header">
                  <span class="frameworks-title">框架集成参考</span>
                </div>
                <div class="framework-tabs">
                  <button
                    v-for="(code, framework) in activeDemo.frameworks"
                    :key="framework"
                    :class="['tab-btn', { active: activeFramework === framework }]"
                    @click="activeFramework = framework"
                  >
                    {{ getFrameworkName(framework) }}
                  </button>
                </div>
                <div v-if="activeFramework" class="framework-code">
                  <pre><code>{{ activeDemo.frameworks[activeFramework] }}</code></pre>
                  <button class="copy-btn" @click="copyFrameworkCode">
                    复制
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="resize-handle" @mousedown="startResize"></div>
          
          <div class="map-panel">
            <CesiumViewer
              :key="viewerKey"
              :code="currentCode"
              :layer-id="currentLayerId"
              @error="handleViewerError"
            />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import CesiumViewer from './components/CesiumViewer.vue'
import CodeEditor from './components/CodeEditor.vue'
import DemoList from './components/DemoList.vue'
import { demos } from './data/demos'
import { mapLayers } from './types/layer'
import type { Demo } from './types/demo'
import type { MapLayer } from './types/layer'

// 状态管理
const activeDemoId = ref(demos[0].id)
const currentCode = ref(demos[0].code)
const viewerKey = ref(0)
const errorMessage = ref<string | null>(null)
const activeFramework = ref<string | null>(null)
const isCodeCollapsed = ref(false)
const currentLayerId = ref('arcgis-imagery')
const showLayerPanel = ref(false)
const codePanelWidth = ref(400)

// 调整大小相关
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// DOM 引用
const layerDropdownRef = ref<HTMLElement | null>(null)

// 计算属性
const activeDemo = computed<Demo>(() => {
  return demos.find(d => d.id === activeDemoId.value) || demos[0]
})

const currentLayer = computed<MapLayer>(() => {
  return mapLayers.find(layer => layer.id === currentLayerId.value) || mapLayers[1]
})

// 方法
const toggleCodePanel = () => {
  isCodeCollapsed.value = !isCodeCollapsed.value
}

const toggleLayerPanel = (event: MouseEvent) => {
  event.stopPropagation()
  showLayerPanel.value = !showLayerPanel.value
}

const selectLayer = (layerId: string) => {
  currentLayerId.value = layerId
  showLayerPanel.value = false
}

const handleDemoSelect = (demoId: string) => {
  const demo = demos.find(d => d.id === demoId)
  if (demo) {
    activeDemoId.value = demoId
    currentCode.value = demo.code
    errorMessage.value = null
    activeFramework.value = null
  }
}

const runCode = () => {
  errorMessage.value = null
  viewerKey.value++
}

const handleViewerError = (error: Error) => {
  errorMessage.value = `错误: ${error.message}`
}

const getFrameworkName = (framework: string): string => {
  const names: Record<string, string> = {
    vue: 'Vue 3',
    react: 'React',
    vanilla: '原生 JS'
  }
  return names[framework] || framework
}

const copyFrameworkCode = () => {
  if (activeFramework.value && activeDemo.value.frameworks) {
    const code = activeDemo.value.frameworks[activeFramework.value]
    navigator.clipboard.writeText(code).then(() => {
      alert('代码已复制')
    }).catch(() => {
      alert('复制失败')
    })
  }
}

// 调整大小功能
const startResize = (event: MouseEvent) => {
  isResizing.value = true
  startX.value = event.clientX
  startWidth.value = codePanelWidth.value
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value) return
  
  const diff = startX.value - event.clientX
  const newWidth = Math.max(200, Math.min(800, startWidth.value + diff))
  codePanelWidth.value = newWidth
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// 点击外部关闭图层面板
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.layer-selector')) {
    showLayerPanel.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  stopResize()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 13px;
  color: #333;
  background-color: #1e1e1e;
}

#app {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 35px;
  padding: 0 12px;
  background-color: #252526;
  border-bottom: 1px solid #3c3c3c;
}

.app-title {
  font-size: 13px;
  font-weight: 500;
  color: #cccccc;
}

.header-info {
  font-size: 12px;
  color: #858585;
}

/* Main Content */
.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 200px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: #252526;
  border-right: 1px solid #3c3c3c;
}

.sidebar-header {
  display: flex;
  align-items: center;
  height: 35px;
  padding: 0 12px;
  border-bottom: 1px solid #3c3c3c;
}

.sidebar-title {
  font-size: 11px;
  font-weight: 600;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

/* Content Area */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #1e1e1e;
}

/* Demo Info Bar */
.demo-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 35px;
  padding: 0 12px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
}

.info-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.demo-name {
  font-size: 13px;
  font-weight: 500;
  color: #d4d4d4;
}

.demo-desc {
  font-size: 12px;
  color: #858585;
}

.info-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Layer Selector */
.layer-selector {
  position: relative;
}

.layer-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  background-color: #3c3c3c;
  border: 1px solid #555;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: #d4d4d4;
  transition: background-color 0.15s;
}

.layer-btn:hover {
  background-color: #4a4a4a;
}

.layer-icon {
  font-size: 14px;
}

.layer-text {
  font-size: 12px;
}

.layer-arrow {
  font-size: 9px;
  color: #858585;
  transition: transform 0.15s;
}

.layer-arrow.open {
  transform: rotate(180deg);
}

/* Layer Dropdown */
.layer-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background-color: #252526;
  border: 1px solid #454545;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 220px;
  max-height: 350px;
  overflow-y: auto;
}

.layer-list {
  padding: 4px 0;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.layer-item:hover {
  background-color: #2a2d2e;
}

.layer-item.selected {
  background-color: #094771;
}

.item-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.item-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 12px;
  color: #d4d4d4;
}

.item-desc {
  font-size: 11px;
  color: #858585;
}

.item-check {
  font-size: 12px;
  color: #4fc1ff;
  flex-shrink: 0;
}

/* Error Button */
.error-btn {
  height: 24px;
  padding: 0 10px;
  background-color: #f14c4c1a;
  border: 1px solid #f14c4c40;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  color: #f14c4c;
}

/* Main Content Area */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Code Panel */
.code-panel {
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  border-right: 1px solid #3c3c3c;
  overflow: hidden;
}

.code-panel.collapsed {
  border-right: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 35px;
  padding: 0 10px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
}

.panel-title {
  font-size: 12px;
  font-weight: 500;
  color: #d4d4d4;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: #d4d4d4;
  transition: background-color 0.15s;
}

.action-btn:hover {
  background-color: #3c3c3c;
}

.action-btn.run-btn {
  width: auto;
  padding: 0 10px;
  background-color: #0e639c;
  color: #fff;
}

.action-btn.run-btn:hover {
  background-color: #1177bb;
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
}

/* Resize Handle */
.resize-handle {
  width: 4px;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.15s;
}

.resize-handle:hover {
  background-color: #007fd4;
}

/* Map Panel */
.map-panel {
  flex: 1;
  overflow: hidden;
  background-color: #000;
}

/* Frameworks Section */
.frameworks-section {
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  border-top: 1px solid #3c3c3c;
  overflow: hidden;
}

.frameworks-header {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  background-color: #2d2d2d;
}

.frameworks-title {
  font-size: 11px;
  font-weight: 500;
  color: #858585;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.framework-tabs {
  display: flex;
  padding: 6px 10px;
  background-color: #252526;
  border-bottom: 1px solid #3c3c3c;
  gap: 4px;
}

.tab-btn {
  padding: 4px 10px;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  color: #858585;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: #d4d4d4;
  background-color: #2a2d2e;
}

.tab-btn.active {
  background-color: #0e639c;
  color: #fff;
  border-color: #0e639c;
}

.framework-code {
  position: relative;
  flex: 1;
  overflow: auto;
  background-color: #1e1e1e;
  min-height: 100px;
}

.framework-code pre {
  margin: 0;
  padding: 10px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #d4d4d4;
}

.copy-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 4px 10px;
  background-color: #3c3c3c;
  color: #d4d4d4;
  border: 1px solid #555;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: background-color 0.15s;
}

.copy-btn:hover {
  background-color: #4a4a4a;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background-color: #1e1e1e;
}

::-webkit-scrollbar-thumb {
  background-color: #424242;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #4f4f4f;
}

/* DemoList Component Overrides */
:deep(.demo-list) {
  background-color: transparent;
}

:deep(.list-title) {
  display: none;
}

:deep(.list-item) {
  padding: 6px 12px;
  border-bottom: none;
  color: #cccccc;
}

:deep(.list-item:hover) {
  background-color: #2a2d2e;
}

:deep(.list-item.active) {
  background-color: #094771;
  border-left: none;
}

:deep(.item-name) {
  color: #cccccc;
  font-size: 12px;
}

:deep(.item-description) {
  color: #858585;
  font-size: 11px;
}
</style>
