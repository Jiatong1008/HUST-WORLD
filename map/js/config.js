/**
 * 全局配置 — 小组同学如果要改地图参数、添加地点类型等，从这里改
 */

export const MAP = {
  width: 8000,
  height: 4000,
  bgImage: '../map/mapdata/HUST_map.png',
  locJson: '../map/mapdata/map_locations.json',
  colJson: '../map/mapdata/map_collisions.json',
};

export const TYPES = {
  dormitory:         { icon: '🏠', color: '#F2B84B', label: '宿舍' },
  canteen:           { icon: '🍽️', color: '#FF6F91', label: '食堂' },
  teaching_building: { icon: '🏛️', color: '#0042BA', label: '教学楼' },
  college:           { icon: '🏢', color: '#43C7D6', label: '学院' },
  landmark:          { icon: '📍', color: '#68C77B', label: '地标' },
  shop:              { icon: '🏪', color: '#CEAA70', label: '商店' },
  hospital:          { icon: '🏥', color: '#DA0000', label: '医院' },
  bus_stop:          { icon: '🚌', color: '#8B7CF6', label: '巴士站' },
  playground:        { icon: '⚽', color: '#7CC36A', label: '操场' },
};

export const BUS_FARE = 1;
export const BUS_ROUTES = [
  { id: 1, name: '校园环线', stops: [25, 45, 28, 44, 26, 46, 27, 43, 25], price: 1 },
  { id: 2, name: '东西线',   stops: [25, 45, 28, 44, 26],               price: 1 },
  { id: 3, name: '南北线',   stops: [43, 27, 46, 28],                     price: 1 },
];

export const CHARACTER_DEFAULTS = {
  // 南大门：所有新角色与无效旧存档的统一出生点
  startX: 2526,
  startY: 2773,
  baseSpeed: 0.65,
  fastSpeed: 1.8,
};

export const BUS_PROXIMITY = 120;
