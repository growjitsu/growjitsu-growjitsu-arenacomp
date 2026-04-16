
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
    
    // Using generic names to bypass ad blockers
    await fetch(getApiUrl('/api/pAnalytics'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pid: adId,
        et: eventType,
        uid: userId,
        cli: deviceInfo
      })
    });
  } catch (error) {
    // Silently handle errors to not pollute user experience
    // Ad analytics are secondary to core app functionality
    console.warn('[Analytics] Skipped tracking');
  }
};
