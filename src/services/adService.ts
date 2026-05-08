
import { UAParser } from 'ua-parser-js';
import { getApiUrl } from '../lib/api';
import { ArenaProfile } from '../types';

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

const getAgeRange = (birthDate?: string): string => {
  if (!birthDate) return 'Unknown';
  try {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    if (age < 18) return 'Under 18';
    if (age <= 24) return '18-24';
    if (age <= 34) return '25-34';
    if (age <= 44) return '35-44';
    if (age <= 54) return '45-54';
    return '55+';
  } catch (e) {
    return 'Unknown';
  }
};

export const trackAdEvent = async (
  adId: string, 
  eventType: 'impression' | 'click', 
  profile?: ArenaProfile | null
) => {
  try {
    // If adId is missing, skip
    if (!adId) return;

    // Use /api/ads/track which is the new standardized endpoint
    await fetch(getApiUrl('/api/ads/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ad_id: adId,
        event_type: eventType,
        user_id: profile?.id,
        user_role: profile?.role,
        gender: profile?.genero,
        age_range: getAgeRange(profile?.birth_date),
        source: window.location.pathname
      })
    });
  } catch (error) {
    // Silently handle errors
    console.warn('[Analytics] Tracking failed');
  }
};
