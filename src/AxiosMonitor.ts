
import { Logger } from './Logger';

/**
 * Bu monitor artıq loqları birbaşa atmır, çünki NetworkMonitor (XHR) 
 * hər şeyi tam URL ilə tutur. Duplikatın qarşısını almaq üçün 
 * AxiosMonitor-dan loqlama funksiyasını çıxardıq.
 */
export const setupAxiosMonitor = (axiosInstance: any) => {
  // Axios sorğularına heç bir müdaxilə etmirik ki, 
  // NetworkMonitor (XHR) onları təbii şəkildə tutsun.
};
