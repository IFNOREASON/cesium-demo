import type { Demo } from '../types/demo'

export const demos: Demo[] = [
  {
    id: 'terrain-profile',
    name: '地形剖面图分析',
    description: '点击地球上两个点，自动生成两点之间的地形剖面图，支持悬停交互高亮。',
    code: `// 地形剖面图分析示例
// 使用说明：在地球上点击两个点，系统会自动生成地形剖面图
// 鼠标悬停剖面图上可反向高亮地球上对应的位置

// 设置初始视图到珠穆朗玛峰区域
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(86.925, 27.988, 50000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-30),
    roll: 0
  }
});

let clickCount = 0;
let startPoint: { lon: number; lat: number } | null = null;
let endPoint: { lon: number; lat: number } | null = null;
let startEntity: any = null;
let endEntity: any = null;
let lineEntity: any = null;

// 创建屏幕空间事件处理器
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

// 处理左键点击事件
handler.setInputAction(async (movement: any) => {
  const ray = viewer.camera.getPickRay(movement.position);
  const intersection = viewer.scene.globe.pick(ray, viewer.scene);
  
  if (!intersection) return;
  
  const cartographic = Cesium.Cartographic.fromCartesian(intersection);
  const lon = Cesium.Math.toDegrees(cartographic.longitude);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);
  
  clickCount++;
  
  if (clickCount === 1) {
    // 第一个点
    startPoint = { lon, lat };
    if (startEntity) viewer.entities.remove(startEntity);
    if (endEntity) viewer.entities.remove(endEntity);
    if (lineEntity) viewer.entities.remove(lineEntity);
    
    startEntity = spatialUtils.createPointMarker(
      lon, lat, Cesium.Color.GREEN, '起点'
    );
    
    console.log('已选择起点:', lon.toFixed(4), lat.toFixed(4));
  } else if (clickCount === 2) {
    // 第二个点
    endPoint = { lon, lat };
    endEntity = spatialUtils.createPointMarker(
      lon, lat, Cesium.Color.RED, '终点'
    );
    
    // 绘制连线
    lineEntity = spatialUtils.createPolylineBetweenPoints(
      startPoint!.lon, startPoint!.lat,
      endPoint.lon, endPoint.lat,
      Cesium.Color.YELLOW, 4
    );
    
    console.log('已选择终点:', lon.toFixed(4), lat.toFixed(4));
    console.log('正在计算地形剖面...');
    
    try {
      // 采样地形数据
      const profileData = await spatialUtils.sampleTerrainAlongLine(
        startPoint!.lon, startPoint!.lat,
        endPoint.lon, endPoint.lat,
        100
      );
      
      console.log('地形剖面计算完成');
      console.log('总距离:', profileData.totalDistance.toFixed(0), '米');
      console.log('最高海拔:', profileData.maxHeight.toFixed(0), '米');
      console.log('最低海拔:', profileData.minHeight.toFixed(0), '米');
      
      // 发送数据到剖面图面板
      spatialUtils.emitProfileData(profileData);
    } catch (error) {
      console.error('地形剖面计算失败:', error);
    }
    
    // 重置计数
    clickCount = 0;
    startPoint = null;
    endPoint = null;
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

console.log('地形剖面图分析已就绪');
console.log('请在地球上点击两个点开始分析...');`
  },
  {
    id: 'viewshed-analysis',
    name: '可视域分析',
    description: '选择观察点，设置观察半径和方向，计算可见区域（绿色）和不可见区域（红色）。',
    code: `// 可视域分析示例
// 使用说明：在地球上点击选择观察点，系统会自动计算该点的可视域
// 绿色区域表示可见，红色区域表示被遮挡不可见

// 设置初始视图到一个有地形起伏的区域
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-122.4, 37.6, 10000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-30),
    roll: 0
  }
});

// 可视域参数配置（可在代码中修改）
const viewshedConfig = {
  observerHeight: 100,      // 观察者高度（米）
  radius: 3000,             // 观察半径（米）
  heading: 0,              // 观察方向角（度）
  pitch: 0,                // 俯仰角（度）
  fov: 90,                 // 视场角（度）
  near: 10                 // 最近距离（米）
};

let observerEntity: any = null;
let visibleEntity: any = null;
let occludedEntity: any = null;
let isComputing = false;

console.log('可视域分析已就绪');
console.log('当前配置:');
console.log('  观察高度:', viewshedConfig.observerHeight, '米');
console.log('  观察半径:', viewshedConfig.radius, '米');
console.log('  视场角:', viewshedConfig.fov, '度');
console.log('请在地球上点击选择观察点...');

// 创建屏幕空间事件处理器
const handler = spatialUtils.createViewshedPicker(async (lon, lat) => {
  if (isComputing) {
    console.log('正在计算中，请稍候...');
    return;
  }
  
  // 清除之前的结果
  if (observerEntity) viewer.entities.remove(observerEntity);
  if (visibleEntity) viewer.entities.remove(visibleEntity);
  if (occludedEntity) viewer.entities.remove(occludedEntity);
  
  console.log('观察点:', lon.toFixed(5), lat.toFixed(5));
  console.log('正在计算可视域...');
  
  isComputing = true;
  
  try {
    // 构建可视域选项
    const options = {
      observerLongitude: lon,
      observerLatitude: lat,
      observerHeight: viewshedConfig.observerHeight,
      radius: viewshedConfig.radius,
      heading: viewshedConfig.heading,
      pitch: viewshedConfig.pitch,
      fov: viewshedConfig.fov,
      near: viewshedConfig.near
    };
    
    // 计算可视域
    const result = await spatialUtils.computeViewshed(options);
    
    console.log('可视域计算完成');
    console.log('  可见采样点数:', result.visiblePositions.length);
    console.log('  不可见采样点数:', result.occludedPositions.length);
    
    // 渲染结果
    const renderResult = spatialUtils.renderViewshed(result, lon, lat);
    observerEntity = renderResult.observerEntity;
    visibleEntity = renderResult.visibleEntity;
    occludedEntity = renderResult.occludedEntity;
    
    // 飞行到观察点
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        lon, lat, viewshedConfig.radius * 1.5
      ),
      orientation: {
        heading: Cesium.Math.toRadians(viewshedConfig.heading),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 1.5
    });
    
  } catch (error) {
    console.error('可视域计算失败:', error);
  } finally {
    isComputing = false;
  }
});

console.log('提示: 可在代码中修改 viewshedConfig 调整可视域参数');`
  },
  {
    id: 'spatiotemporal-visualization',
    name: '时空数据可视化',
    description: '拖拽 GeoJSON 文件到地图，自动解析渲染，含时间字段则生成时间轴动画。',
    code: `// 时空数据可视化示例
// 使用说明：
// 1. 将 .geojson 或 .json 文件拖拽到地图上
// 2. 如果 GeoJSON 包含时间字段，会自动生成时间轴动画
// 3. 数据会按时间顺序依次出现

// 设置初始视图
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(116.397, 39.908, 1000000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-45),
    roll: 0
  }
});

let currentDataSource: any = null;

console.log('时空数据可视化已就绪');
console.log('请拖放 GeoJSON 文件到地图上...');
console.log('支持的时间字段: time, timestamp, date, datetime 等');

// 示例 GeoJSON 数据（带时间字段）
const sampleGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "点 A",
        time: "2024-01-01T00:00:00Z",
        description: "第一个出现的点"
      },
      geometry: {
        type: "Point",
        coordinates: [116.3, 39.9]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "点 B",
        time: "2024-01-01T02:00:00Z",
        description: "两小时后出现"
      },
      geometry: {
        type: "Point",
        coordinates: [116.4, 39.95]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "点 C",
        time: "2024-01-01T04:00:00Z",
        description: "四小时后出现"
      },
      geometry: {
        type: "Point",
        coordinates: [116.5, 39.85]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "点 D",
        time: "2024-01-01T06:00:00Z",
        description: "六小时后出现"
      },
      geometry: {
        type: "Point",
        coordinates: [116.35, 39.98]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "点 E",
        time: "2024-01-01T08:00:00Z",
        description: "最后出现的点"
      },
      geometry: {
        type: "Point",
        coordinates: [116.45, 39.82]
      }
    }
  ]
};

// 拖拽功能
const container = viewer.container;

// 添加拖拽提示
const dropHint = document.createElement('div');
dropHint.style.cssText = \`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 40px 60px;
  background: rgba(14, 99, 156, 0.9);
  color: white;
  border-radius: 8px;
  font-size: 16px;
  text-align: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1000;
  border: 2px dashed #4fc1ff;
\`;
dropHint.innerHTML = '释放鼠标加载 GeoJSON 文件';
container.appendChild(dropHint);

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  dropHint.style.opacity = '1';
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  dropHint.style.opacity = '0';
};

container.addEventListener('dragover', handleDragOver);
container.addEventListener('dragleave', handleDragLeave);

// 设置拖拽加载
const cleanup = spatialUtils.setupDragAndDrop(
  container,
  (result) => {
    currentDataSource = result.dataSource;
    dropHint.style.opacity = '0';
    
    console.log('GeoJSON 加载成功!');
    console.log('  要素数量:', result.dataSource.entities.values.length);
    
    if (result.hasTimeField) {
      console.log('  检测到时间字段:', result.timeField);
      console.log('  时间范围:', result.timeRange?.start, '-', result.timeRange?.end);
      console.log('  时间轴动画已启用');
      
      // 显示时间轴控件
      spatialUtils.enableTimeline();
    } else {
      console.log('  未检测到时间字段，静态显示');
    }
    
    setTimeout(() => {
      if (dropHint.parentNode) {
        dropHint.parentNode.removeChild(dropHint);
      }
    }, 1000);
  },
  (error) => {
    dropHint.style.opacity = '0';
    console.error('加载失败:', error.message);
  }
);

// 通过代码直接加载示例数据
const loadSampleData = async () => {
  console.log('正在加载示例数据...');
  
  const result = await spatialUtils.loadGeoJSON(sampleGeoJSON, {
    duration: 10  // 动画持续 10 秒
  });
  
  currentDataSource = result.dataSource;
  
  console.log('示例数据加载完成!');
  if (result.hasTimeField) {
    spatialUtils.enableTimeline();
    console.log('时间轴已启用，点击播放按钮查看动画');
  }
};

// 5 秒后自动加载示例数据
const autoLoadTimer = setTimeout(() => {
  if (!currentDataSource) {
    console.log('自动加载示例数据...');
    loadSampleData();
  }
}, 5000);

// 清理
cleanupFunctions.push(() => {
  clearTimeout(autoLoadTimer);
  container.removeEventListener('dragover', handleDragOver);
  container.removeEventListener('dragleave', handleDragLeave);
  if (dropHint.parentNode) {
    dropHint.parentNode.removeChild(dropHint);
  }
  spatialUtils.disableTimeline();
});

console.log('提示: 5 秒后将自动加载示例数据进行演示');`
  },
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
