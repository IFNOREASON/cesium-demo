export interface TerrainPoint {
  longitude: number
  latitude: number
  height: number
  distance: number
}

export interface ProfileData {
  points: TerrainPoint[]
  minHeight: number
  maxHeight: number
  totalDistance: number
}

export interface ViewshedOptions {
  observerLongitude: number
  observerLatitude: number
  observerHeight: number
  radius: number
  heading: number
  pitch: number
  fov: number
  near: number
}

export interface ViewshedResult {
  visiblePositions: number[][]
  occludedPositions: number[][]
}

export interface GeoJSONTimelineOptions {
  timeField?: string
  duration?: number
  startTime?: Date
  endTime?: Date
}

export interface GeoJSONLoadResult {
  dataSource: any
  hasTimeField: boolean
  timeField?: string
  timeRange?: { start: Date; end: Date }
}
