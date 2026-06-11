// js/map_api.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 축제 목록 조회
 * @param {Object} options
 * @param {string} options.period  - 'ongoing' | 'this-month' | '3months'
 * @param {string} options.areaCode - 지역 코드 (없으면 전국)
 */
export async function fetchFestivals({ period = 'ongoing', areaCode = '' } = {}) {
  const today = new Date();
  const todayStr = toDateStr(today);

  let endLimit;
  if (period === 'ongoing') {
    endLimit = todayStr;
  } else if (period === 'this-month') {
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endLimit = toDateStr(lastDay);
  } else {
    // 3개월
    const future = new Date(today);
    future.setMonth(future.getMonth() + 3);
    endLimit = toDateStr(future);
  }

  let query = supabase
    .from('festivals')
    .select('id, content_id, title, start_date, end_date, addr, lat, lng, image_url, detail_url, area_code')
    .lte('start_date', endLimit)   // 시작일이 기준일 이하
    .gte('end_date', todayStr)     // 종료일이 오늘 이상 (이미 끝난 것 제외)
    .order('start_date', { ascending: true });

  if (areaCode) {
    query = query.eq('area_code', areaCode);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}
