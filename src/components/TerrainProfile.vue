<template>
  <div class="terrain-profile" v-if="visible">
    <div class="profile-header">
      <span class="profile-title">地形剖面图</span>
      <div class="profile-info" v-if="profileData">
        <span class="info-item">距离: {{ formatDistance(profileData.totalDistance) }}</span>
        <span class="info-item">最高: {{ formatHeight(profileData.maxHeight) }}</span>
        <span class="info-item">最低: {{ formatHeight(profileData.minHeight) }}</span>
      </div>
      <button class="close-btn" @click="handleClose">×</button>
    </div>
    <div class="profile-body">
      <canvas
        ref="canvasRef"
        class="profile-canvas"
        @mousemove="handleMouseMove"
        @mouseleave="handleMouseLeave"
      ></canvas>
      <div v-if="hoveredPoint" class="tooltip" :style="tooltipStyle">
        <div>距离: {{ formatDistance(hoveredPoint.distance) }}</div>
        <div>海拔: {{ formatHeight(hoveredPoint.height) }}</div>
        <div>经度: {{ hoveredPoint.longitude.toFixed(4) }}°</div>
        <div>纬度: {{ hoveredPoint.latitude.toFixed(4) }}°</div>
      </div>
    </div>
    <div v-if="!profileData" class="empty-state">
      <span>点击地球上两个点生成地形剖面</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import type { ProfileData, TerrainPoint } from '../types/spatial'

const props = defineProps<{
  visible: boolean
  profileData: ProfileData | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'point-hover', point: TerrainPoint | null): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerWidth = ref(600)
const containerHeight = ref(200)
const hoveredIndex = ref<number>(-1)
const mouseX = ref(0)
const mouseY = ref(0)

const hoveredPoint = computed<TerrainPoint | null>(() => {
  if (!props.profileData || hoveredIndex.value < 0) return null
  return props.profileData.points[hoveredIndex.value] || null
})

const tooltipStyle = computed(() => ({
  left: `${mouseX.value + 10}px`,
  top: `${mouseY.value + 10}px`
}))

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`
  }
  return `${meters.toFixed(0)} m`
}

const formatHeight = (meters: number): string => {
  return `${meters.toFixed(0)} m`
}

const handleClose = () => {
  emit('close')
}

const handleMouseMove = (event: MouseEvent) => {
  if (!canvasRef.value || !props.profileData) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  mouseX.value = x
  mouseY.value = y

  const padding = { left: 50, right: 20, top: 20, bottom: 30 }
  const chartWidth = containerWidth.value - padding.left - padding.right
  const chartHeight = containerHeight.value - padding.top - padding.bottom

  if (x >= padding.left && x <= padding.left + chartWidth) {
    const relativeX = x - padding.left
    const ratio = relativeX / chartWidth
    const index = Math.round(ratio * (props.profileData.points.length - 1))
    hoveredIndex.value = Math.max(0, Math.min(index, props.profileData.points.length - 1))
    emit('point-hover', props.profileData.points[hoveredIndex.value])
  } else {
    hoveredIndex.value = -1
    emit('point-hover', null)
  }
}

const handleMouseLeave = () => {
  hoveredIndex.value = -1
  emit('point-hover', null)
}

const drawProfile = () => {
  const canvas = canvasRef.value
  if (!canvas || !props.profileData) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = containerWidth.value * dpr
  canvas.height = containerHeight.value * dpr
  canvas.style.width = `${containerWidth.value}px`
  canvas.style.height = `${containerHeight.value}px`
  ctx.scale(dpr, dpr)

  const { points, minHeight, maxHeight, totalDistance } = props.profileData

  const padding = { left: 50, right: 20, top: 20, bottom: 30 }
  const chartWidth = containerWidth.value - padding.left - padding.right
  const chartHeight = containerHeight.value - padding.top - padding.bottom

  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(0, 0, containerWidth.value, containerHeight.value)

  const heightRange = maxHeight - minHeight || 1
  const getX = (distance: number) => padding.left + (distance / totalDistance) * chartWidth
  const getY = (height: number) => padding.top + chartHeight - ((height - minHeight) / heightRange) * chartHeight

  ctx.strokeStyle = '#3c3c3c'
  ctx.lineWidth = 1

  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(padding.left + chartWidth, y)
    ctx.stroke()

    const heightValue = maxHeight - (heightRange / 5) * i
    ctx.fillStyle = '#858585'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${heightValue.toFixed(0)}m`, padding.left - 5, y + 3)
  }

  for (let i = 0; i <= 5; i++) {
    const x = padding.left + (chartWidth / 5) * i
    const distanceValue = (totalDistance / 5) * i
    ctx.fillStyle = '#858585'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      distanceValue >= 1000 ? `${(distanceValue / 1000).toFixed(1)}km` : `${distanceValue.toFixed(0)}m`,
      x,
      padding.top + chartHeight + 18
    )
  }

  ctx.strokeStyle = '#555'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padding.left, padding.top)
  ctx.lineTo(padding.left, padding.top + chartHeight)
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight)
  ctx.stroke()

  ctx.fillStyle = 'rgba(100, 181, 246, 0.3)'
  ctx.beginPath()
  ctx.moveTo(getX(points[0].distance), getY(minHeight))
  points.forEach((point, index) => {
    const x = getX(point.distance)
    const y = getY(point.height)
    if (index === 0) {
      ctx.lineTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.lineTo(getX(points[points.length - 1].distance), getY(minHeight))
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#64b5f6'
  ctx.lineWidth = 2
  ctx.beginPath()
  points.forEach((point, index) => {
    const x = getX(point.distance)
    const y = getY(point.height)
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()

  if (hoveredIndex.value >= 0 && hoveredIndex.value < points.length) {
    const point = points[hoveredIndex.value]
    const x = getX(point.distance)
    const y = getY(point.height)

    ctx.strokeStyle = '#00bcd4'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(x, padding.top)
    ctx.lineTo(x, padding.top + chartHeight)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#00bcd4'
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.fillStyle = '#858585'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('距离', containerWidth.value / 2, containerHeight.value - 5)

  ctx.save()
  ctx.translate(12, containerHeight.value / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('海拔 (m)', 0, 0)
  ctx.restore()
}

const handleResize = () => {
  if (!canvasRef.value) return
  const parent = canvasRef.value.parentElement
  if (parent) {
    containerWidth.value = parent.clientWidth
  }
  nextTick(() => drawProfile())
}

watch(
  () => props.profileData,
  () => {
    nextTick(() => drawProfile())
  },
  { deep: true }
)

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      nextTick(() => {
        handleResize()
      })
    }
  }
)

watch(hoveredIndex, () => {
  drawProfile()
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.terrain-profile {
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  border-top: 1px solid #3c3c3c;
  height: 220px;
  min-height: 220px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 30px;
  padding: 0 12px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
}

.profile-title {
  font-size: 12px;
  font-weight: 500;
  color: #d4d4d4;
}

.profile-info {
  display: flex;
  gap: 16px;
  flex: 1;
}

.info-item {
  font-size: 11px;
  color: #858585;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: #858585;
  font-size: 18px;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.15s;
}

.close-btn:hover {
  background-color: #3c3c3c;
  color: #d4d4d4;
}

.profile-body {
  flex: 1;
  position: relative;
  padding: 0;
  overflow: hidden;
}

.profile-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

.tooltip {
  position: absolute;
  background-color: rgba(37, 37, 38, 0.95);
  border: 1px solid #454545;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 11px;
  color: #d4d4d4;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  line-height: 1.6;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6a6a6a;
  font-size: 12px;
}
</style>
