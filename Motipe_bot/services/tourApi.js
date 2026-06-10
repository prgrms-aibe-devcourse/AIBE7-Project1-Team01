const axios = require("axios");

// ==========================================================================
// 콘텐츠 타입 코드 (한국관광공사 공식 분류)
// ==========================================================================
const CONTENT_TYPE = {
  TOURIST_SPOT:  "12", // 관광지
  CULTURAL:      "14", // 문화시설
  FESTIVAL:      "15", // 축제/공연/행사
  TRAVEL_COURSE: "25", // 여행코스
  LEISURE:       "28", // 레포츠
  ACCOMMODATION: "32", // 숙박
  SHOPPING:      "38", // 쇼핑
  RESTAURANT:    "39", // 음식점
};

// ==========================================================================
// 지역 코드 매핑 (areaCode)
// ==========================================================================
const AREA_CODE = {
  서울: "1",  인천: "2",  대전: "3",  대구: "4",
  광주: "5",  부산: "6",  울산: "7",  세종: "8",
  경기: "31", 강원: "32", 충북: "33", 충남: "34",
  경북: "35", 경남: "36", 전북: "37", 전남: "38",
  제주: "39",
};

/**
 * 메시지에서 지역 코드 추출
 */
function extractAreaCode(text) {
  for (const [region, code] of Object.entries(AREA_CODE)) {
    if (text.includes(region)) return code;
  }
  return null;
}

// ==========================================================================
// Tour API 호출 — KorService2 (최신 버전)
// Base URL: https://apis.data.go.kr/B551011/KorService2
// 502 원인: KorService1(구버전) → KorService2(신버전) 으로 변경됨
// ==========================================================================
const BASE_URL = "https://apis.data.go.kr/B551011/KorService2";

// 공통 파라미터
function commonParams(extra = {}) {
  return {
    serviceKey: process.env.TOUR_API_KEY,
    MobileOS:   "ETC",
    MobileApp:  "MotipeBot",
    _type:      "json",
    numOfRows:  10,
    pageNo:     1,
    ...extra,
  };
}

/**
 * 응답 items 파싱 (단일 객체 / 배열 모두 처리)
 */
function parseItems(data) {
  const items = data?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

/**
 * 아이템 → 통일 형식 변환
 */
function normalize(item) {
  return {
    title:   item.title   || item.addr1 || "제목 없음",
    address: item.addr1   || item.addr2 || "주소 없음",
    tel:     item.tel     || "",
    mapX:    item.mapx    || "",
    mapY:    item.mapy    || "",
    imgUrl:  item.firstimage || item.firstimage2 || "",
    contentId:     item.contentid     || "",
    contentTypeId: item.contenttypeid || "",
  };
}

// --------------------------------------------------------------------------
// ① 키워드 검색 (searchKeyword2) — 기본 검색 수단
// --------------------------------------------------------------------------
async function searchByKeyword(keyword, contentTypeId = "") {
  try {
    const res = await axios.get(`${BASE_URL}/searchKeyword2`, {
      params: commonParams({
        keyword,
        contentTypeId,
        arrange: "Q", // 평점순
      }),
      timeout: 8000,
    });
    return parseItems(res.data).map(normalize);
  } catch (err) {
    console.error("키워드 검색 오류:", err.message);
    return [];
  }
}

// --------------------------------------------------------------------------
// ② 지역 기반 검색 (areaBasedList2) — 지역명 감지 시 병행 사용
// --------------------------------------------------------------------------
async function searchByArea(areaCode, contentTypeId = "") {
  try {
    const res = await axios.get(`${BASE_URL}/areaBasedList2`, {
      params: commonParams({
        areaCode,
        contentTypeId,
        arrange: "Q",
      }),
      timeout: 8000,
    });
    return parseItems(res.data).map(normalize);
  } catch (err) {
    console.error("지역 기반 검색 오류:", err.message);
    return [];
  }
}

// --------------------------------------------------------------------------
// ③ 행사 정보 조회 (searchFestival2) — 축제 전용, 날짜 기반
// --------------------------------------------------------------------------
async function searchFestival(areaCode = "") {
  // 오늘 날짜 ~ 3개월 후
  const now   = new Date();
  const after = new Date(now);
  after.setMonth(after.getMonth() + 3);

  const fmt = (d) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

  try {
    const res = await axios.get(`${BASE_URL}/searchFestival2`, {
      params: commonParams({
        eventStartDate: fmt(now),
        eventEndDate:   fmt(after),
        areaCode,
        arrange: "Q",
      }),
      timeout: 8000,
    });
    return parseItems(res.data).map(normalize);
  } catch (err) {
    console.error("축제 검색 오류:", err.message);
    return [];
  }
}

// ==========================================================================
// 메인 호출 함수 — server.js 에서 import 하는 함수
// ==========================================================================
async function fetchTourData(message, contentTypeId = "") {
  if (!process.env.TOUR_API_KEY) {
    console.warn("⚠️  TOUR_API_KEY 미설정");
    return [];
  }

  const areaCode  = extractAreaCode(message);
  const isFestival = contentTypeId === CONTENT_TYPE.FESTIVAL;

  try {
    let results = [];

    if (isFestival) {
      // 축제: searchFestival2 + 키워드 병렬 실행 후 합산
      const [festivalList, keywordList] = await Promise.all([
        searchFestival(areaCode || ""),
        searchByKeyword(message, CONTENT_TYPE.FESTIVAL),
      ]);

      // 중복 제거 (contentId 기준)
      const seen = new Set();
      for (const item of [...festivalList, ...keywordList]) {
        if (!seen.has(item.contentId)) {
          seen.add(item.contentId);
          results.push(item);
        }
      }
    } else if (areaCode) {
      // 지역 감지: 지역 기반 + 키워드 병렬 실행
      const [areaList, keywordList] = await Promise.all([
        searchByArea(areaCode, contentTypeId),
        searchByKeyword(message, contentTypeId),
      ]);

      const seen = new Set();
      for (const item of [...areaList, ...keywordList]) {
        if (!seen.has(item.contentId)) {
          seen.add(item.contentId);
          results.push(item);
        }
      }
    } else {
      // 일반: 키워드 검색만
      results = await searchByKeyword(message, contentTypeId);
    }

    return results.slice(0, 10); // 최대 10개
  } catch (err) {
    console.error("Tour API 호출 실패:", err.message);
    return [];
  }
}

module.exports = { fetchTourData, CONTENT_TYPE };