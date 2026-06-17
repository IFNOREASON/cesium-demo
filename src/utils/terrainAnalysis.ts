import type { TerrainPoint, ProfileData } from '../types/spatial'

declare const Cesium: any

const waitForTerrainReady = async (terrainProvider: any): Promise<void> => {
  if (terrainProvider.ready) return

  if (terrainProvider.readyPromise) {
    await terrainProvider.readyPromise
    return
  }

  await new Promise<void>((resolve) => {
    const checkReady = () => {
      if (terrainProvider.ready) {
        resolve()
      } else {
        requestAnimationFrame(checkReady)
      }
    }
    checkReady()
  })
}

export const sampleTerrainAlongLine = async (
  viewer: any,
  startLongitude: number,
  startLatitude: number,
  endLongitude: number,
  endLatitude: number,
  sampleCount: number = 100
): Promise<ProfileData> => {
  const terrainProvider = viewer.terrainProvider

  await waitForTerrainReady(terrainProvider)

  const positions: any[] = []
  const step = 1 / (sampleCount - 1)

  for (let i = 0; i < sampleCount; i++) {
    const t = i * step
    const lon = startLongitude + (endLongitude - startLongitude) * t
    const lat = startLatitude + (endLatitude - startLatitude) * t
    positions.push(Cesium.Cartographic.fromDegrees(lon, lat))
  }

  const sampledPositions = await Cesium.sampleTerrainMostDetailed(terrainProvider, positions)

  const points: TerrainPoint[] = []
  let totalDistance = 0
  let prevPoint: TerrainPoint | null = null

  const wgs84 = Cesium.Ellipsoid.WGS84

  for (let i = 0; i < sampledPositions.length; i++) {
    const carto = sampledPositions[i]
    const lon = Cesium.Math.toDegrees(carto.longitude)
    const lat = Cesium.Math.toDegrees(carto.latitude)
    const height = carto.height

    const currentPoint: TerrainPoint = {
      longitude: lon,
      latitude: lat,
      height: Math.max(0, height),
      distance: 0
    }

    if (prevPoint) {
      const c1 = Cesium.Cartographic.fromDegrees(prevPoint.longitude, prevPoint.latitude)
      const c2 = Cesium.Cartographic.fromDegrees(lon, lat)
      const p1 = wgs84.cartographicToCartesian(c1)
      const p2 = wgs84.cartographicToCartesian(c2)
      const segmentDistance = Cesium.Cartesian3.distance(p1, p2)
      totalDistance += segmentDistance
      currentPoint.distance = totalDistance
    }

    points.push(currentPoint)
    prevPoint = currentPoint
  }

  const heights = points.map(p => p.height)
  const minHeight = Math.min(...heights)
  const maxHeight = Math.max(...heights)

  return {
    points,
    minHeight,
    maxHeight,
    totalDistance
  }
}

export const createPolylineBetweenPoints = (
  viewer: any,
  startLongitude: number,
  startLatitude: number,
  endLongitude: number,
  endLatitude: number,
  color: any = Cesium.Color.YELLOW,
  width: number = 3
): any => {
  return viewer.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        startLongitude, startLatitude,
        endLongitude, endLatitude
      ]),
      width,
      material: color,
      clampToGround: true
    }
  })
}

export const createPointMarker = (
  viewer: any,
  longitude: number,
  latitude: number,
  color: any = Cesium.Color.RED,
  label?: string
): any => {
  const entityOptions: any = {
    position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
    point: {
      pixelSize: 12,
      color,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    }
  }

  if (label) {
    entityOptions.label = {
      text: label,
      font: '12pt sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -15),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    }
  }

  return viewer.entities.add(entityOptions)
}

export const createHighlightMarker = (
  viewer: any,
  longitude: number,
  latitude: number
): any => {
  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
    point: {
      pixelSize: 16,
      color: Cesium.Color.CYAN,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 3,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    }
  })
}
