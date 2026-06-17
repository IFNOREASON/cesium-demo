import type { ViewshedOptions, ViewshedResult } from '../types/spatial'

declare const Cesium: any

const degToRad = (deg: number): number => (deg * Math.PI) / 180
const radToDeg = (rad: number): number => (rad * 180) / Math.PI

export const computeViewshed = async (
  viewer: any,
  options: ViewshedOptions
): Promise<ViewshedResult> => {
  const {
    observerLongitude,
    observerLatitude,
    observerHeight,
    radius,
    heading,
    pitch,
    fov,
    near
  } = options

  const terrainProvider = viewer.terrainProvider
  const scene = viewer.scene
  const globe = scene.globe

  const observerCartographic = Cesium.Cartographic.fromDegrees(
    observerLongitude,
    observerLatitude,
    observerHeight
  )
  const observerPosition = globe.ellipsoid.cartographicToCartesian(observerCartographic)

  const visiblePositions: number[][] = []
  const occludedPositions: number[][] = []

  const azimuthSteps = 36
  const elevationSteps = 18
  const raySteps = 100

  const headingRad = degToRad(heading)
  const pitchRad = degToRad(pitch)
  const fovRad = degToRad(fov)

  const observerHeightAboveEllipsoid = observerHeight

  for (let az = 0; az < azimuthSteps; az++) {
    const azimuth = headingRad - fovRad / 2 + (fovRad * az) / (azimuthSteps - 1)

    for (let el = 0; el < elevationSteps; el++) {
      const elevation = pitchRad - fovRad / 2 + (fovRad * el) / (elevationSteps - 1)

      const direction = new Cesium.Cartesian3(
        Math.cos(elevation) * Math.sin(azimuth),
        Math.cos(elevation) * Math.cos(azimuth),
        Math.sin(elevation)
      )

      const eastNorthUp = Cesium.Transforms.eastNorthUpToFixedFrame(
        globe.ellipsoid.cartographicToCartesian(
          Cesium.Cartographic.fromDegrees(observerLongitude, observerLatitude, 0)
        )
      )

      const worldDirection = Cesium.Matrix3.multiplyByVector(
        Cesium.Matrix3.getRotation(eastNorthUp, new Cesium.Matrix3()),
        direction,
        new Cesium.Cartesian3()
      )

      let lastVisiblePoint: any = null
      let isOccluded = false

      for (let s = 0; s < raySteps; s++) {
        const distance = near + ((radius - near) * s) / (raySteps - 1)

        const targetPoint = Cesium.Cartesian3.add(
          observerPosition,
          Cesium.Cartesian3.multiplyByScalar(worldDirection, distance, new Cesium.Cartesian3()),
          new Cesium.Cartesian3()
        )

        const targetCartographic = globe.ellipsoid.cartesianToCartographic(targetPoint)

        const ray = new Cesium.Ray(observerPosition, worldDirection)
        const intersection = scene.globe.pick(ray, scene)

        if (intersection) {
          const intersectionDistance = Cesium.Cartesian3.distance(observerPosition, intersection)

          if (intersectionDistance < distance) {
            const intersectionCarto = globe.ellipsoid.cartesianToCartographic(intersection)
            const lon = radToDeg(intersectionCarto.longitude)
            const lat = radToDeg(intersectionCarto.latitude)
            const height = intersectionCarto.height

            const targetHeightAboveSealevel = targetCartographic.height

            const earthRadius = 6378137
            const horizonDistance = Math.sqrt(
              2 * earthRadius * observerHeightAboveEllipsoid + observerHeightAboveEllipsoid ** 2
            )

            if (distance > horizonDistance) {
              isOccluded = true
              break
            }

            if (height > targetHeightAboveSealevel) {
              if (!lastVisiblePoint) {
                lastVisiblePoint = { lon, lat, distance: intersectionDistance }
              }
              isOccluded = true
              break
            }
          }
        }

        lastVisiblePoint = {
          lon: radToDeg(targetCartographic.longitude),
          lat: radToDeg(targetCartographic.latitude),
          distance
        }
      }

      if (lastVisiblePoint) {
        if (isOccluded) {
          occludedPositions.push([lastVisiblePoint.lon, lastVisiblePoint.lat])
        } else {
          visiblePositions.push([lastVisiblePoint.lon, lastVisiblePoint.lat])
        }
      }
    }
  }

  return {
    visiblePositions,
    occludedPositions
  }
}

export const renderViewshed = (
  viewer: any,
  result: ViewshedResult,
  observerLongitude: number,
  observerLatitude: number
): { visibleEntity: any; occludedEntity: any; observerEntity: any } => {
  const buildHierarchy = (positions: number[][]): any => {
    if (positions.length < 3) return null

    const center = Cesium.Cartesian3.fromDegrees(observerLongitude, observerLatitude)
    const centerCarto = Cesium.Cartographic.fromCartesian(center)

    const sorted = [...positions].sort((a, b) => {
      const angleA = Math.atan2(
        a[1] - radToDeg(centerCarto.latitude),
        a[0] - radToDeg(centerCarto.longitude)
      )
      const angleB = Math.atan2(
        b[1] - radToDeg(centerCarto.latitude),
        b[0] - radToDeg(centerCarto.longitude)
      )
      return angleA - angleB
    })

    const flatCoords: number[] = []
    sorted.forEach(([lon, lat]) => {
      flatCoords.push(lon, lat)
    })

    return Cesium.Cartesian3.fromDegreesArray(flatCoords)
  }

  let visibleEntity: any = null
  let occludedEntity: any = null

  const visibleHierarchy = buildHierarchy(result.visiblePositions)
  if (visibleHierarchy) {
    visibleEntity = viewer.entities.add({
      name: '可见区域',
      polygon: {
        hierarchy: visibleHierarchy,
        material: Cesium.Color.GREEN.withAlpha(0.3),
        outline: true,
        outlineColor: Cesium.Color.GREEN.withAlpha(0.8),
        outlineWidth: 2,
        perPositionHeight: true
      }
    })
  }

  const occludedHierarchy = buildHierarchy(result.occludedPositions)
  if (occludedHierarchy) {
    occludedEntity = viewer.entities.add({
      name: '不可见区域',
      polygon: {
        hierarchy: occludedHierarchy,
        material: Cesium.Color.RED.withAlpha(0.3),
        outline: true,
        outlineColor: Cesium.Color.RED.withAlpha(0.8),
        outlineWidth: 2,
        perPositionHeight: true
      }
    })
  }

  const observerEntity = viewer.entities.add({
    name: '观察点',
    position: Cesium.Cartesian3.fromDegrees(observerLongitude, observerLatitude),
    point: {
      pixelSize: 14,
      color: Cesium.Color.YELLOW,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    },
    label: {
      text: '观察点',
      font: '12pt sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    }
  })

  return { visibleEntity, occludedEntity, observerEntity }
}

export const createViewshedPicker = (
  viewer: any,
  callback: (lon: number, lat: number) => void
): (() => void) => {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  handler.setInputAction((movement: any) => {
    const ray = viewer.camera.getPickRay(movement.position)
    const intersection = viewer.scene.globe.pick(ray, viewer.scene)

    if (intersection) {
      const cartographic = Cesium.Cartographic.fromCartesian(intersection)
      const lon = Cesium.Math.toDegrees(cartographic.longitude)
      const lat = Cesium.Math.toDegrees(cartographic.latitude)
      callback(lon, lat)
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  return () => {
    handler.destroy()
  }
}
