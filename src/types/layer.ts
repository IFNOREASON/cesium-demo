export interface MapLayer {
  id: string
  name: string
  icon: string
  description: string
  url: string
  maximumLevel: number
  creditText: string
}

export const mapLayers: MapLayer[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    icon: '🗺️',
    description: '开源街道地图',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maximumLevel: 19,
    creditText: '© OpenStreetMap contributors'
  },
  {
    id: 'arcgis-imagery',
    name: 'ArcGIS 卫星影像',
    icon: '🛰️',
    description: '高清卫星影像图层',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maximumLevel: 19,
    creditText: 'Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
  },
  {
    id: 'arcgis-street',
    name: 'ArcGIS 街道图',
    icon: '🏙️',
    description: 'Esri 世界街道地图',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maximumLevel: 17,
    creditText: '© Esri'
  },
  {
    id: 'arcgis-terrain',
    name: 'ArcGIS 地形图',
    icon: '🏔️',
    description: '地形着色地图',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    maximumLevel: 16,
    creditText: '© Esri'
  },
  {
    id: 'cartodb-dark',
    name: 'CartoDB 暗色',
    icon: '🌙',
    description: '暗色主题地图',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    maximumLevel: 19,
    creditText: '© CartoDB, © OpenStreetMap contributors'
  },
  {
    id: 'cartodb-positron',
    name: 'CartoDB 浅色',
    icon: '☀️',
    description: '浅色主题地图',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    maximumLevel: 19,
    creditText: '© CartoDB, © OpenStreetMap contributors'
  }
]

export const getLayerById = (id: string): MapLayer => {
  return mapLayers.find(layer => layer.id === id) || mapLayers[1]
}
