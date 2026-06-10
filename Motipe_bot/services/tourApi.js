const axios = require('axios');
 
const CONTENT_TYPE = {
  TOURIST_SPOT:  '12',
  CULTURAL:      '14',
  FESTIVAL:      '15', // 축제/공연/행사
  ACCOMMODATION: '32',
  RESTAURANT:    '39',
};
 
const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';
 
// 공통 파라미터
function commonParams(extra = {}) {
  return {
    serviceKey: process.env.TOUR_API_KEY,
    MobileOS:   'ETC',
    MobileApp:  'MotipeBot',
    _type:      'json',
    numOfRows:  5,
    pageNo:     1,
    ...extra,
  };
}
 
// 응답 items 배열 파싱 (단일/배열 모두 처리)
function parseItems(data) {
  const items = data?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}
 
// ────────────────────────────────────────────────────────────────
// ① 키워드 검색 — 축제 기본 목록 (contentId, 제목, 주소, 이미지)
// ────────────────────────────────────────────────────────────────
async function fetchBasicList(keyword, contentTypeId = '') {
  try {
    const res = await axios.get(`${BASE_URL}/searchKeyword2`, {
      params: commonParams({ keyword, contentTypeId, arrange: 'Q' }),
      timeout: 8000,
    });
    return parseItems(res.data).map(item => ({
      contentId:     item.contentid     || '',
      contentTypeId: item.contenttypeid || '',
      title:         item.title         || '제목 없음',
      address:       [item.addr1, item.addr2].filter(Boolean).join(' ') || '주소 없음',
      mapX:          item.mapx          || '',
      mapY:          item.mapy          || '',
      imageUrl:      item.firstimage    || item.firstimage2 || '',
      tel:           item.tel           || '',
    }));
  } catch (err) {
    console.error('키워드 검색 오류:', err.message);
    return [];
  }
}
 
// ────────────────────────────────────────────────────────────────
// ② 축제 전용 상세 소개 정보 (개최일시/기간/요금/연락처)
//    KorService4/detailIntro4 — 업로드된 tourApi.js 구조 유지
// ────────────────────────────────────────────────────────────────
async function fetchFestivalDetail(contentId) {
  try {
    const res = await axios.get(`${BASE_URL}/detailIntro2`, {
      params: commonParams({
        contentId,
        contentTypeId: CONTENT_TYPE.FESTIVAL,
      }),
      timeout: 5000,
    });
 
    const item = res.data?.response?.body?.items?.item;
    if (!item) return null;
 
    const d = Array.isArray(item) ? item[0] : item;
 
    // 날짜 포맷 헬퍼 (20250615 → 2025-06-15)
    const fmtDate = (v) => {
      if (!v || v === '정보 없음') return '정보 없음';
      const s = String(v);
      if (s.length === 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
      return s;
    };
 
    return {
      eventStartDate:   fmtDate(d.eventstartdate) || '정보 없음',
      eventEndDate:     fmtDate(d.eventenddate)   || '정보 없음',
      playTime:         d.playtime                || '정보 없음',
      useFee:           d.usetimefestival         || d.usefee || '무료 (현장 확인 권장)',
      sponsorTel:       d.sponsortel              || d.tel    || '정보 없음',
      eventPlace:       d.eventplace              || '',      // 행사장명
      eventHomepage:    d.eventhomepage           || '',
    };
  } catch (err) {
    console.error(`축제 상세 조회 실패 (ID: ${contentId}):`, err.message);
    return null;
  }
}
 
// ────────────────────────────────────────────────────────────────
// ③ 도로명 주소 조회 — 지번 주소를 새주소로 변환
//    행정안전부 도로명주소 API
// ────────────────────────────────────────────────────────────────
async function fetchRoadAddress(jibunAddress) {
  if (!jibunAddress || jibunAddress === '주소 없음') return null;
  if (!process.env.JUSO_API_KEY) return null;
 
  try {
    const res = await axios.get(
      'https://business.juso.go.kr/addrlink/addrLinkApi.do',
      {
        params: {
          confmKey:   process.env.JUSO_API_KEY,
          currentPage: 1,
          countPerPage: 1,
          keyword:    jibunAddress,
          resultType: 'json',
        },
        timeout: 4000,
      }
    );
 
    const juso = res.data?.results?.juso?.[0];
    if (!juso) return null;
 
    return {
      roadAddr:    juso.roadAddr    || '',  // 도로명 전체
      roadAddrPart1: juso.roadAddrPart1 || '',
      zipNo:       juso.zipNo       || '',
      siNm:        juso.siNm        || '',
      sggNm:       juso.sggNm       || '',
    };
  } catch (err) {
    console.error('도로명 주소 조회 오류:', err.message);
    return null;
  }
}
 
// ────────────────────────────────────────────────────────────────
// 메인 통합 함수 — server.js 에서 호출
// ────────────────────────────────────────────────────────────────
async function fetchTourData(keyword, contentTypeId = '') {
  if (!process.env.TOUR_API_KEY) {
    console.warn('⚠️  TOUR_API_KEY 미설정');
    return [];
  }
 
  // 1단계: 기본 목록 조회
  const basicList = await fetchBasicList(keyword, contentTypeId);
  if (basicList.length === 0) return [];
 
  const isFestival = contentTypeId === CONTENT_TYPE.FESTIVAL ||
                     String(contentTypeId) === '15';
 
  if (!isFestival) {
    // 축제 외 콘텐츠는 기본 정보만 반환
    return basicList.slice(0, 5);
  }
 
  // 2단계: 축제인 경우 — 상세 + 도로명주소 병렬 조회
  const enriched = await Promise.all(
    basicList.map(async (item) => {
      // 상세 정보 + 도로명 주소 동시 조회
      const [detail, roadInfo] = await Promise.all([
        fetchFestivalDetail(item.contentId),
        fetchRoadAddress(item.address),
      ]);
 
      return {
        ...item,
        // 도로명 주소 (새 주소) — 없으면 기존 주소 유지
        roadAddress: roadInfo?.roadAddr || item.address,
        zipNo:       roadInfo?.zipNo    || '',
        // 축제 상세 필드
        eventStartDate: detail?.eventStartDate || '정보 없음',
        eventEndDate:   detail?.eventEndDate   || '정보 없음',
        playTime:       detail?.playTime       || '정보 없음',
        useFee:         detail?.useFee         || '정보 없음',
        sponsorTel:     detail?.sponsorTel     || item.tel || '정보 없음',
        eventPlace:     detail?.eventPlace     || '',
        eventHomepage:  detail?.eventHomepage  || '',
      };
    })
  );
 
  return enriched;
}
 
module.exports = { fetchTourData, CONTENT_TYPE };