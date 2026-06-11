// js/map_api.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 축제 목록 조회
 */
export async function fetchFestivals({
  period = "ongoing",
  areaCode = "",
  category = "",
  dateFrom = "",
  dateTo = "",
} = {}) {
  const today = new Date();
  const todayStr = toDateStr(today);

  let endLimit;
  if (period === "custom" && dateFrom && dateTo) {
    endLimit = dateTo;
  } else if (period === "all") {
    // 날짜 제한 없이 전체 조회
    endLimit = "2099-12-31";
  } else if (period === "ongoing") {
    endLimit = todayStr;
  } else if (period === "this-month") {
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endLimit = toDateStr(lastDay);
  } else {
    const future = new Date(today);
    future.setMonth(future.getMonth() + 3);
    endLimit = toDateStr(future);
  }

  let query = supabase
    .from("festivals")
    .select(
      "id, content_id, title, start_date, end_date, addr, lat, lng, image_url, detail_url, area_code, category",
    )
    .lte("start_date", endLimit)
    .gte(
      "end_date",
      period === "custom"
        ? dateFrom
        : period === "all"
          ? "2000-01-01"
          : todayStr,
    )
    .order("start_date", { ascending: true });

  if (areaCode) query = query.eq("area_code", areaCode);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ===== 즐겨찾기 =====

/** 내 즐겨찾기 festival_id 목록 조회 */
export async function fetchMyBookmarks() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("festival_bookmarks")
    .select("festival_id")
    .eq("user_id", user.id);

  if (error) throw error;
  return data.map((b) => b.festival_id);
}

/** 즐겨찾기 추가 */
export async function addBookmark(festivalId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "login_required" };

  const { error } = await supabase
    .from("festival_bookmarks")
    .insert({ user_id: user.id, festival_id: festivalId });

  return { error };
}

/** 즐겨찾기 삭제 */
export async function removeBookmark(festivalId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "login_required" };

  const { error } = await supabase
    .from("festival_bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("festival_id", festivalId);

  return { error };
}

/** 즐겨찾기한 축제 전체 조회 (마이페이지용) */
export async function fetchBookmarkedFestivals() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("festival_bookmarks")
    .select(
      "festival_id, festivals(id, title, start_date, end_date, addr, image_url, detail_url)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map((b) => b.festivals);
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}
