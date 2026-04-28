<template>
  <div ref="containerRef" class="cesium-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { getLayerById, type MapLayer } from '../types/layer'

// 声明全局 Cesium 变量（通过 CDN 引入）
declare const Cesium: any

// 定义属性
const props = defineProps<{
  code: string
  layerId?: string
}>()

// 定义事件
const emit = defineEmits<{
  (e: 'error', error: Error): void
}>()

// 容器引用
const containerRef = ref<HTMLElement | null>(null)

// Cesium 实例
let viewer: any = null

// 当前图层 ID
let currentLayerId: string | null = null

// 从 MapLayer 创建 ImageryProvider
const createImageryProvider = (layer: MapLayer) => {
  const options: any = {
    url: layer.url,
    credit: new Cesium.Credit(layer.creditText),
    maximumLevel: layer.maximumLevel
  }

  // 对于 CartoDB 图层，需要添加 subdomains
  if (layer.id.startsWith('cartodb')) {
    options.subdomains = ['a', 'b', 'c', 'd']
  }

  return new Cesium.UrlTemplateImageryProvider(options)
}

// 设置底图图层
const setBaseLayer = (layerId: string) => {
  if (!viewer) return

  // 如果已经是当前图层，不做任何操作
  if (currentLayerId === layerId) {
    return
  }

  try {
    // 获取新图层配置
    const layerConfig = getLayerById(layerId)
    
    // 创建新的 imagery provider
    const newProvider = createImageryProvider(layerConfig)

    // 记录当前图层数量
    const oldLayerCount = viewer.imageryLayers.length

    // 先添加新图层到最底部
    const newLayer = viewer.imageryLayers.addImageryProvider(newProvider, 0)
    newLayer.show = true

    // 等待新图层准备好后，移除旧图层
    if (newProvider.readyPromise) {
      newProvider.readyPromise.then(() => {
        // 移除旧图层（从后往前移除，避免索引问题）
        while (viewer.imageryLayers.length > 1) {
          viewer.imageryLayers.remove(viewer.imageryLayers.get(viewer.imageryLayers.length - 1))
        }
        currentLayerId = layerId
      }).catch((error: any) => {
        console.warn('新图层加载失败，保留当前图层:', error)
        // 如果新图层加载失败，移除新添加的图层
        if (viewer.imageryLayers.length > oldLayerCount) {
          viewer.imageryLayers.remove(newLayer)
        }
      })
    } else {
      // 如果没有 readyPromise，直接切换
      // 移除旧图层（从后往前移除）
      while (viewer.imageryLayers.length > 1) {
        viewer.imageryLayers.remove(viewer.imageryLayers.get(viewer.imageryLayers.length - 1))
      }
      currentLayerId = layerId
    }
  } catch (error) {
    console.error('切换图层失败:', error)
    // 确保至少有一个底图
    ensureBaseLayer()
  }
}

// 确保至少有一个底图
const ensureBaseLayer = () => {
  if (!viewer) return

  if (viewer.imageryLayers.length === 0) {
    console.log('没有底图，添加默认图层...')
    const defaultLayer = getLayerById('arcgis-imagery')
    const provider = createImageryProvider(defaultLayer)
    viewer.imageryLayers.addImageryProvider(provider)
    currentLayerId = 'arcgis-imagery'
  }
}

// 执行代码的函数
const executeCode = (code: string) => {
  if (!viewer) return

  try {
    // 清理之前的实体
    viewer.entities.removeAll()

    // 确保底图存在
    ensureBaseLayer()

    // 创建沙箱环境
    const executeFunction = new Function(
      'viewer',
      'Cesium',
      `
      "use strict";
      ${code}
      `
    )

    executeFunction(viewer, Cesium)
  } catch (error) {
    console.error('执行代码出错:', error)
    emit('error', error as Error)
  }
}

// 监听代码变化
watch(
  () => props.code,
  (newCode) => {
    if (viewer) {
      executeCode(newCode)
    }
  }
)

// 监听图层 ID 变化
watch(
  () => props.layerId,
  (newLayerId) => {
    if (viewer && newLayerId) {
      setBaseLayer(newLayerId)
    }
  }
)

onMounted(() => {
  if (!containerRef.value) return

  // 设置 Cesium 令牌（如果需要）
  // Cesium.Ion.defaultAccessToken = 'your-token-here'

  // 使用默认图层初始化 Viewer
  const defaultLayer = getLayerById(props.layerId || 'arcgis-imagery')
  const defaultProvider = createImageryProvider(defaultLayer)

  // 初始化 Cesium Viewer
  viewer = new Cesium.Viewer(containerRef.value, {
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    vrButton: false,
    infoBox: false,
    selectionIndicator: false,
    baseLayer: new Cesium.ImageryLayer(defaultProvider),
  })

  // 记录当前图层
  currentLayerId = props.layerId || 'arcgis-imagery'

  // 确保底图存在
  ensureBaseLayer()

  // 执行初始代码
  executeCode(props.code)
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
}

:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
