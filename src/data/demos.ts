import type { Demo } from '../types/demo'

export const demos: Demo[] = [
  {
    id: 'basic-viewer',
    name: '基础地图查看器',
    description: '一个简单的 Cesium 地图查看器示例，展示如何初始化地图视图。',
    code: `// 设置初始视图位置
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(116.397, 39.908, 1500000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-90),
    roll: 0
  }
});

// 添加一个简单的实体点
viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(116.397, 39.908),
  point: {
    pixelSize: 10,
    color: Cesium.Color.RED,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2
  },
  label: {
    text: '北京',
    font: '14pt monospace',
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 2,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -10)
  }
});

console.log('基础地图查看器已初始化');`,
    frameworks: {
      vue: `
<template>
  <div ref="containerRef" style="width: 100%; height: 600px;"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'

const containerRef = ref<HTMLElement | null>(null)
let viewer: Cesium.Viewer | null = null

onMounted(() => {
  if (!containerRef.value) return
  
  viewer = new Cesium.Viewer(containerRef.value, {
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    vrButton: false
  })

  // 设置初始视图
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(116.397, 39.908, 1500000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    }
  })

  // 添加实体点
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(116.397, 39.908),
    point: {
      pixelSize: 10,
      color: Cesium.Color.RED
    }
  })
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
  }
})
</script>
`,
      react: `
import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'

const CesiumViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    viewerRef.current = new Cesium.Viewer(containerRef.current, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false
    })

    const viewer = viewerRef.current

    // 设置初始视图
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(116.397, 39.908, 1500000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      }
    })

    // 添加实体点
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(116.397, 39.908),
      point: {
        pixelSize: 10,
        color: Cesium.Color.RED
      }
    })

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy()
      }
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '600px' }} />
}

export default CesiumViewer
`,
      vanilla: `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Cesium 基础示例</title>
  <script src="https://unpkg.com/cesium@1.121/Build/Cesium/Cesium.js"></script>
  <link href="https://unpkg.com/cesium@1.121/Build/Cesium/Widgets/widgets.css" rel="stylesheet">
  <style>
    #cesiumContainer {
      width: 100%;
      height: 600px;
    }
  </style>
</head>
<body>
  <div id="cesiumContainer"></div>
  <script>
    // 初始化 Cesium
    const viewer = new Cesium.Viewer('cesiumContainer', {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false
    });

    // 设置初始视图
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(116.397, 39.908, 1500000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      }
    });

    // 添加实体点
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(116.397, 39.908),
      point: {
        pixelSize: 10,
        color: Cesium.Color.RED
      }
    });
  </script>
</body>
</html>
`
    }
  },
  {
    id: 'add-entities',
    name: '添加实体标记',
    description: '在地图上添加各种类型的实体，包括点、线、面等。',
    code: `// 设置初始视图
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(116.397, 39.908, 50000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-45),
    roll: 0
  }
});

// 添加点实体
viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(116.397, 39.908),
  point: {
    pixelSize: 15,
    color: Cesium.Color.RED,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2
  },
  label: {
    text: '北京',
    font: '16pt sans-serif',
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    outlineWidth: 2,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -20),
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
  }
});

// 添加多边形实体
viewer.entities.add({
  name: '多边形示例',
  polygon: {
    hierarchy: Cesium.Cartesian3.fromDegreesArray([
      116.35, 39.90,
      116.45, 39.90,
      116.45, 39.95,
      116.35, 39.95
    ]),
    material: Cesium.Color.BLUE.withAlpha(0.5),
    outline: true,
    outlineColor: Cesium.Color.BLACK
  }
});

// 添加线实体
viewer.entities.add({
  name: '线段示例',
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArray([
      116.30, 39.85,
      116.50, 39.85,
      116.50, 39.95
    ]),
    width: 5,
    material: Cesium.Color.GREEN
  }
});

// 添加圆柱体
viewer.entities.add({
  name: '圆柱体',
  position: Cesium.Cartesian3.fromDegrees(116.40, 39.85),
  cylinder: {
    length: 10000,
    topRadius: 2000,
    bottomRadius: 5000,
    material: Cesium.Color.PURPLE.withAlpha(0.8)
  }
});

console.log('实体添加完成');`,
    frameworks: {
      vue: `
<template>
  <div ref="containerRef" style="width: 100%; height: 600px;"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as Cesium from 'cesium'

const containerRef = ref<HTMLElement | null>(null)
let viewer: Cesium.Viewer | null = null

onMounted(() => {
  if (!containerRef.value) return
  
  viewer = new Cesium.Viewer(containerRef.value, {
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    vrButton: false
  })

  // 设置初始视图
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(116.397, 39.908, 50000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0
    }
  })

  // 添加点实体
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(116.397, 39.908),
    point: {
      pixelSize: 15,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    }
  })

  // 添加多边形实体
  viewer.entities.add({
    name: '多边形示例',
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray([
        116.35, 39.90,
        116.45, 39.90,
        116.45, 39.95,
        116.35, 39.95
      ]),
      material: Cesium.Color.BLUE.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.BLACK
    }
  })
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
  }
})
</script>
`
    }
  }
]
