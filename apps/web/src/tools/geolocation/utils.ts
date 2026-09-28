/**
 * geolocation —— 地理位置检测的纯函数层
 *
 * getCurrentPosition 经参数注入（可为字面 mock）并 Promise 化；
 * 坐标格式化、OSM 地图链接生成均为纯函数。
 * 需要 HTTPS 环境，无 API 或用户拒绝时抛中文错。
 */

/** 定位坐标（全部为可空原始值之外的确定字段） */
export interface GeoCoords {
  readonly latitude: number
  readonly longitude: number
  readonly accuracy: number
  readonly altitude: number | null
  readonly altitudeAccuracy: number | null
  readonly heading: number | null
  readonly speed: number | null
}

/** GeolocationPosition 的 coords 子集 */
export interface GeoCoordsLike {
  readonly latitude: number
  readonly longitude: number
  readonly accuracy: number
  readonly altitude?: number | null
  readonly altitudeAccuracy?: number | null
  readonly heading?: number | null
  readonly speed?: number | null
}

/** GeolocationPosition 子集 */
export interface GeoPositionLike {
  readonly coords: GeoCoordsLike
}

/** GeolocationPositionError 子集 */
export interface GeoErrorLike {
  readonly code: number
  readonly message: string
}

/** 可注入的 geolocation 形状 */
export interface GeolocationLike {
  getCurrentPosition?: (
    success: (pos: GeoPositionLike) => void,
    error?: (err: GeoErrorLike) => void,
    options?: object,
  ) => void
}

const GEO_ERROR_TEXT: Record<number, string> = {
  1: '用户拒绝了位置权限，请在浏览器设置中允许定位后重试',
  2: '位置信息不可用，请检查设备定位服务是否开启',
  3: '定位超时，请稍后重试',
}

/**
 * 获取当前位置。geo 为空或无 getCurrentPosition 时抛中文错；
 * 浏览器返回的错误码映射为中文提示。
 * 组件中传入 navigator.geolocation；测试中可注入字面 mock。
 */
export async function getPosition(geo?: GeolocationLike | null): Promise<GeoCoords> {
  const getPos = geo?.getCurrentPosition
  if (typeof getPos !== 'function') {
    throw new Error('当前浏览器不支持 Geolocation API（需要 HTTPS 环境）')
  }
  return new Promise<GeoCoords>((resolve, reject) => {
    getPos(
      (pos) => {
        const c = pos.coords
        resolve({
          latitude: c.latitude,
          longitude: c.longitude,
          accuracy: c.accuracy,
          altitude: c.altitude ?? null,
          altitudeAccuracy: c.altitudeAccuracy ?? null,
          heading: c.heading ?? null,
          speed: c.speed ?? null,
        })
      },
      (err) => {
        reject(new Error(GEO_ERROR_TEXT[err.code] ?? `定位失败：${err.message}`))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}

/** 坐标中文格式化，如 "纬度 31.2304°N，经度 121.4737°E，精度 ±20 米" */
export function formatCoords(c: GeoCoords): string {
  const lat = `${Math.abs(c.latitude).toFixed(4)}°${c.latitude >= 0 ? 'N' : 'S'}`
  const lng = `${Math.abs(c.longitude).toFixed(4)}°${c.longitude >= 0 ? 'E' : 'W'}`
  return `纬度 ${lat}，经度 ${lng}，精度 ±${Math.max(0, Math.round(c.accuracy))} 米`
}

/** 经纬度 → OpenStreetMap 定位链接 */
export function coordsToMapLink(lat: number, lng: number): string {
  const la = lat.toFixed(6)
  const lo = lng.toFixed(6)
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=16/${la}/${lo}`
}
