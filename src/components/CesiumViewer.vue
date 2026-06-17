<template>
  <div ref="containerRef" class="cesium-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { getLayerById, type MapLayer } from '../types/layer'
import { sampleTerrainAlongLine, createPolylineBetweenPoints, createPointMarker, createHighlightMarker } from '../utils/terrainAnalysis'
import { computeViewshed, renderViewshed, createViewshedPicker } from '../utils/viewshedAnalysis'
import { loadGeoJSON, setupDragAndDrop, enableTimeline, disableTimeline } from '../utils/geojsonLoader'
import type { ProfileData, ViewshedOptions, ViewshedResult, GeoJSONLoadResult } from '../types/spatial'

declare const Cesium: any

const props = defineProps<{
  code: string
  layerId?: string
}>()

const emit = defineEmits<{
  (e: 'error', error: Error): void
  (e: 'profile-data', data: ProfileData): void
  (e: 'highlight-point', point: any): void
}>()

const containerRef = ref<HTMLElement | null>(null)

let viewer: any = null
let currentLayerId: string | null = null
let highlightMarker: any = null
let cleanupFunctions: Array<() => void> = []

const createImageryProvider = (layer: MapLayer) => {
  const options: any = {
    url: layer.url,
    credit: new Cesium.Credit(layer.creditText),
    maximumLevel: layer.maximumLevel
  }

  if (layer.id.startsWith('cartodb')) {
    options.subdomains = ['a', 'b', 'c', 'd']
  }

  return new Cesium.UrlTemplateImageryProvider(options)
}

const setBaseLayer = (layerId: string) => {
  if (!viewer) return

  if (currentLayerId === layerId) {
    return
  }

  try {
    const layerConfig = getLayerById(layerId)
    const newProvider = createImageryProvider(layerConfig)

    const oldLayerCount = viewer.imageryLayers.length
    const newLayer = viewer.imageryLayers.addImageryProvider(newProvider, 0)
    newLayer.show = true

    if (newProvider.readyPromise) {
      newProvider.readyPromise.then(() => {
        while (viewer.imageryLayers.length > 1) {
          viewer.imageryLayers.remove(viewer.imageryLayers.get(viewer.imageryLayers.length - 1))
        }
        currentLayerId = layerId
      }).catch((error: any) => {
        console.warn('新图层加载失败，保留当前图层:', error)
        if (viewer.imageryLayers.length > oldLayerCount) {
          viewer.imageryLayers.remove(newLayer)
        }
      })
    } else {
      while (viewer.imageryLayers.length > 1) {
        viewer.imageryLayers.remove(viewer.imageryLayers.get(viewer.imageryLayers.length - 1))
      }
      currentLayerId = layerId
    }
  } catch (error) {
    console.error('切换图层失败:', error)
    ensureBaseLayer()
  }
}

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

const setupHighlightListeners = () => {
  const handleHighlightPoint = (event: any) => {
    const { longitude, latitude } = event.detail
    if (highlightMarker) {
      viewer.entities.remove(highlightMarker)
    }
    highlightMarker = createHighlightMarker(viewer, longitude, latitude)
  }

  const handleClearHighlight = () => {
    if (highlightMarker) {
      viewer.entities.remove(highlightMarker)
      highlightMarker = null
    }
  }

  window.addEventListener('viewer:highlight-point', handleHighlightPoint)
  window.addEventListener('viewer:clear-highlight', handleClearHighlight)

  cleanupFunctions.push(() => {
    window.removeEventListener('viewer:highlight-point', handleHighlightPoint)
    window.removeEventListener('viewer:clear-highlight', handleClearHighlight)
  })
}

const executeCode = (code: string) => {
  if (!viewer) return

  try {
    viewer.entities.removeAll()
    viewer.dataSources.removeAll()
    if (highlightMarker) {
      viewer.entities.remove(highlightMarker)
      highlightMarker = null
    }

    cleanupFunctions.forEach(fn => fn())
    cleanupFunctions = []

    ensureBaseLayer()
    setupHighlightListeners()

    const spatialUtils = {
      sampleTerrainAlongLine: (startLon: number, startLat: number, endLon: number, endLat: number, count?: number) =>
        sampleTerrainAlongLine(viewer, startLon, startLat, endLon, endLat, count),
      createPolylineBetweenPoints: (startLon: number, startLat: number, endLon: number, endLat: number, color?: any, width?: number) =>
        createPolylineBetweenPoints(viewer, startLon, startLat, endLon, endLat, color, width),
      createPointMarker: (lon: number, lat: number, color?: any, label?: string) =>
        createPointMarker(viewer, lon, lat, color, label),
      computeViewshed: (options: ViewshedOptions) =>
        computeViewshed(viewer, options),
      renderViewshed: (result: ViewshedResult, obsLon: number, obsLat: number) =>
        renderViewshed(viewer, result, obsLon, obsLat),
      createViewshedPicker: (callback: (lon: number, lat: number) => void) =>
        createViewshedPicker(viewer, callback),
      loadGeoJSON: (geojson: any, options?: any) =>
        loadGeoJSON(viewer, geojson, options),
      setupDragAndDrop: (container: HTMLElement, onLoad: (result: GeoJSONLoadResult) => void, onError?: (error: Error) => void) => {
        const cleanup = setupDragAndDrop(viewer, container, onLoad, onError)
        cleanupFunctions.push(cleanup)
        return cleanup
      },
      enableTimeline: () => enableTimeline(viewer),
      disableTimeline: () => disableTimeline(viewer),
      emitProfileData: (data: ProfileData) => emit('profile-data', data)
    }

    const executeFunction = new Function(
      'viewer',
      'Cesium',
      'spatialUtils',
      'cleanupFunctions',
      `
      "use strict";
      ${code}
      `
    )

    executeFunction(viewer, Cesium, spatialUtils, cleanupFunctions)
  } catch (error) {
    console.error('执行代码出错:', error)
    emit('error', error as Error)
  }
}

watch(
  () => props.code,
  (newCode) => {
    if (viewer) {
      executeCode(newCode)
    }
  }
)

watch(
  () => props.layerId,
  (newLayerId) => {
    if (viewer && newLayerId) {
      setBaseLayer(newLayerId)
    }
  }
)

onMounted(async () => {
  if (!containerRef.value) return

  const defaultLayer = getLayerById(props.layerId || 'arcgis-imagery')
  const defaultProvider = createImageryProvider(defaultLayer)

  viewer = new Cesium.Viewer(containerRef.value, {
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: true,
    timeline: true,
    fullscreenButton: false,
    vrButton: false,
    infoBox: false,
    selectionIndicator: false,
    baseLayer: new Cesium.ImageryLayer(defaultProvider),
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    shouldAnimate: true
  })

  if (viewer.animation) {
    viewer.animation.container.style.display = 'none'
  }
  if (viewer.timeline) {
    viewer.timeline.container.style.display = 'none'
  }

  currentLayerId = props.layerId || 'arcgis-imagery'

  ensureBaseLayer()
  setupHighlightListeners()

  executeCode(props.code)

  try {
    console.log('正在加载世界地形数据...')
    const worldTerrain = await Cesium.createWorldTerrainAsync()
    viewer.terrainProvider = worldTerrain
    console.log('世界地形数据加载完成')
  } catch (error) {
    console.warn('世界地形加载失败，使用默认椭球地形:', error)
  }
})

onUnmounted(() => {
  cleanupFunctions.forEach(fn => fn())
  cleanupFunctions = []

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

:deep(.cesium-viewer-timelineContainer) {
  left: 0 !important;
  right: 0 !important;
}
</style>
