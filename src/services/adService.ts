
import { UAParser } from 'ua-parser-js';
import { getApiUrl } from '../lib/api';

export interface AdDeviceInfo {
  device: string;
  os: string;
  browser: string;
}

export const getDeviceInfo = (): AdDeviceInfo => {
  const parser = new UAParser();
  const result = parser.getResult();
  
  return {
    device: result.device.type || 'desktop',
    os: result.os.name || 'Unknown',
    browser: result.browser.name || 'Unknown'
  };
};

export const trackAdEvent = async (
  adId: string, 
  eventType: 'impression' | 'click', 
  userId?: string
) => {
  try {
    const deviceInfo = getDeviceInfo();
    
    await fetch(getApiUrl('/api/trackPromotionEvent'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adId,
        eventType,
        userId,
        deviceInfo
      })
    });
  } catch (error) {
    console.error('[AdService] Erro ao rastrear evento:', error);
  }
};
