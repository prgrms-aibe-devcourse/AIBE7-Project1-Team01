const axios = require('axios');

const CONTENT_TYPE = {
  FESTIVAL: 15 // 한국관광공사 국문 표준 축제/행사 타입 코드
};

/**
 * 1단계: 키워드 기반 축제 기본 정보 및 contentId 리스트 조회
 */
async function fetchTourData(keyword) {
  const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2/searchKeyword2';
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        serviceKey: decodeURIComponent(process.env.TOUR_API_KEY),
        MobileOS: 'ETC',
        MobileApp: 'MotipeApp',
        _type: 'json',
        keyword: keyword,
        contentTypeId: CONTENT_TYPE.FESTIVAL,
        numOfRows: 3, // LLM 컨텍스트 토큰 최적화를 위해 상위 3개 제한
        pageNo: 1,
        arrange: 'O' // 제목순 정렬
      },
      timeout: 4000
    });

    const items = response.data?.response?.body?.items?.item;
    if (!items) return [];

    const itemArray = Array.isArray(items) ? items : [items];
    return itemArray.map(item => ({
      contentId: item.contentid,
      title: item.title,
      address: item.addr1 + (item.addr2 ? ' ' + item.addr2 : ''), // 도로명/지번 주소 병합
      imageUrl: item.firstimage || item.firstimage2 || ''
    }));
  } catch (error) {
    console.error('❌ [TourAPI-Service] 기본 검색 에러:', error.message);
    return [];
  }
}

/**
 * 2단계: 특정 축제의 상세 정보 수집 (개최일시, 기간, 요금, 연락처 등)
 */
async function fetchTourDetail(contentId) {
  const DETAIL_URL = 'https://apis.data.go.kr/B551011/KorService4/detailIntro4';
  try {
    const response = await axios.get(DETAIL_URL, {
      params: {
        serviceKey: decodeURIComponent(process.env.TOUR_API_KEY),
        MobileOS: 'ETC',
        MobileApp: 'MotipeApp',
        _type: 'json',
        contentId: contentId,
        contentTypeId: CONTENT_TYPE.FESTIVAL
      },
      timeout: 3000
    });

    const detail = response.data?.response?.body?.items?.item;
    if (!detail) return null;

    return {
      eventStartDate: detail.eventstartdate || '정보 없음', 
      eventEndDate: detail.eventenddate || '정보 없음',     
      playTime: detail.playtime || '정보 없음',             
      useTimeFestival: detail.usetimefestival || '정해진 요금 없음 (확인 필요)', 
      sponsorTel: detail.sponsortel || '정보 없음'           
    };
  } catch (error) {
    console.error(`❌ [TourAPI-Service] 상세 매시업 실패 (ID: ${contentId}):`, error.message);
    return null;
  }
}

/**
 * 최종 통합 오케스트레이터 인터페이스 (라우터 호출용)
 */
async function getDetailedFestivalData(keyword) {
  const basicList = await fetchTourData(keyword);
  if (basicList.length === 0) return [];

  // ⚡ 레이턴시 최적화: 검색된 N개의 축제 상세 조회를 백엔드에서 병렬 쿼리로 동시에 실행
  return Promise.all(
    basicList.map(async (festival) => {
      const detail = await fetchTourDetail(festival.contentId);
      return {
        ...festival,
        ...detail
      };
    })
  );
}

module.exports = { getDetailedFestivalData };