import type { GeoJSONTimelineOptions, GeoJSONLoadResult } from '../types/spatial'

declare const Cesium: any

const TIME_FIELD_CANDIDATES = ['time', 'timestamp', 'date', 'datetime', 'created_at', 'updated_at', 'startTime', 'endTime']

const parseDate = (value: any): Date | null => {
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!isNaN(parsed)) return new Date(parsed)
  }
  return null
}

const detectTimeField = (properties: Record<string, any>): string | null => {
  for (const candidate of TIME_FIELD_CANDIDATES) {
    if (properties[candidate] !== undefined) {
      const parsed = parseDate(properties[candidate])
      if (parsed) return candidate
    }
  }
  for (const key of Object.keys(properties)) {
    const parsed = parseDate(properties[key])
    if (parsed) return key
  }
  return null
}

const extractTimeRange = (geojson: any, timeField: string): { start: Date; end: Date } | null => {
  const times: Date[] = []

  const extractFromFeature = (feature: any) => {
    if (feature.properties && feature.properties[timeField]) {
      const parsed = parseDate(feature.properties[timeField])
      if (parsed) times.push(parsed)
    }
  }

  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(extractFromFeature)
  } else if (geojson.type === 'Feature') {
    extractFromFeature(geojson)
  }

  if (times.length === 0) return null

  const minTime = new Date(Math.min(...times.map(d => d.getTime())))
  const maxTime = new Date(Math.max(...times.map(d => d.getTime())))

  return { start: minTime, end: maxTime }
}

export const parseGeoJSON = (content: string): any => {
  try {
    return JSON.parse(content)
  } catch (e) {
    throw new Error('GeoJSON 解析失败：无效的 JSON 格式')
  }
}

export const loadGeoJSON = async (
  viewer: any,
  geojson: any,
  options: GeoJSONTimelineOptions = {}
): Promise<GeoJSONLoadResult> => {
  const { timeField: customTimeField, duration = 10 } = options

  let timeField: string | undefined = customTimeField
  let hasTimeField = false
  let timeRange: { start: Date; end: Date } | undefined

  if (geojson.type === 'FeatureCollection' && geojson.features.length > 0) {
    const firstFeature = geojson.features[0]
    if (firstFeature.properties) {
      if (!timeField) {
        timeField = detectTimeField(firstFeature.properties) || undefined
      }
      if (timeField) {
        hasTimeField = true
        timeRange = extractTimeRange(geojson, timeField) || undefined
      }
    }
  }

  const dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
    stroke: Cesium.Color.HOTPINK,
    fill: Cesium.Color.PINK.withAlpha(0.5),
    strokeWidth: 3,
    clampToGround: true
  })

  if (hasTimeField && timeField && timeRange) {
    const startTime = options.startTime || timeRange.start
    const endTime = options.endTime || timeRange.end
    const totalDuration = (endTime.getTime() - startTime.getTime()) || 1000

    const entities = dataSource.entities.values
    entities.forEach((entity: any, index: number) => {
      const feature = geojson.features[index]
      if (!feature || !feature.properties) return

      const featureTime = parseDate(feature.properties[timeField!])
      if (!featureTime) return

      const normalizedTime = (featureTime.getTime() - startTime.getTime()) / totalDuration
      const availabilityStart = Cesium.JulianDate.fromDate(
        new Date(startTime.getTime() + normalizedTime * duration * 1000)
      )
      const availabilityEnd = Cesium.JulianDate.fromDate(
        new Date(startTime.getTime() + (normalizedTime + 0.1) * duration * 1000)
      )

      entity.availability = new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({
          start: availabilityStart,
          stop: availabilityEnd
        })
      ])
    })

    const clockStartTime = Cesium.JulianDate.fromDate(new Date(startTime.getTime()))
    const clockEndTime = Cesium.JulianDate.fromDate(new Date(startTime.getTime() + duration * 1000))

    viewer.clock.startTime = clockStartTime
    viewer.clock.stopTime = clockEndTime
    viewer.clock.currentTime = clockStartTime
    viewer.clock.multiplier = 1
    viewer.clock.shouldAnimate = true

    if (viewer.timeline) {
      viewer.timeline.zoomTo(clockStartTime, clockEndTime)
    }
  }

  viewer.dataSources.add(dataSource)

  return {
    dataSource,
    hasTimeField,
    timeField,
    timeRange
  }
}

export const setupDragAndDrop = (
  viewer: any,
  container: HTMLElement,
  onLoad: (result: GeoJSONLoadResult) => void,
  onError?: (error: Error) => void
): (() => void) => {
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) {
      return
    }

    const file = e.dataTransfer.files[0]
    if (!file.name.endsWith('.geojson') && !file.name.endsWith('.json')) {
      onError?.(new Error('请拖放 .geojson 或 .json 文件'))
      return
    }

    try {
      const content = await file.text()
      const geojson = parseGeoJSON(content)
      const result = await loadGeoJSON(viewer, geojson)

      viewer.flyTo(result.dataSource)

      onLoad(result)
    } catch (error) {
      console.error('加载 GeoJSON 失败:', error)
      onError?.(error as Error)
    }
  }

  container.addEventListener('dragover', handleDragOver)
  container.addEventListener('drop', handleDrop)

  return () => {
    container.removeEventListener('dragover', handleDragOver)
    container.removeEventListener('drop', handleDrop)
  }
}

export const enableTimeline = (viewer: any): void => {
  if (viewer.animation) {
    viewer.animation.container.style.display = 'block'
  }
  if (viewer.timeline) {
    viewer.timeline.container.style.display = 'block'
  }
}

export const disableTimeline = (viewer: any): void => {
  if (viewer.animation) {
    viewer.animation.container.style.display = 'none'
  }
  if (viewer.timeline) {
    viewer.timeline.container.style.display = 'none'
  }
}
