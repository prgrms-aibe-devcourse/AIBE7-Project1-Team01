const axios = require('axios');

// Tour API 4.0 관광타입 상수 정의 (개발자 가독성용)
const CONTENT_TYPE = {
  TOURIST_ATTRACTION: 12, // 관광지
  CULTURE_FACILITY: 14,   // 문화시설
  FESTIVAL: 15,           // 축제/공연/행사
  LEISURE_SPORTS: 28,     // 레포츠
  ACCOMMODATION: 32,      // 숙박
  SHOPPING: 38,           // 쇼핑
  RESTAURANT: 39          // 음식점
};

/**
 * 키워드 기반 관광정보 검색 (Tour API 4.0)
 * @param {string} keyword - 검색어 (예: "부산 해운대", "강릉 맛집")
 * @param {number} contentTypeId - 관광 타입 ID (선택 사항)
 */
async function fetchTourData(keyword, contentTypeId = '') {
  const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2/searchFestival2';
  
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        serviceKey: decodeURIComponent(process.env.TOUR_API_KEY), // 🔥 axios 내부 인코딩 버그 방지를 위해 decode 후 주입
        MobileOS: 'ETC',
        MobileApp: 'MotipeApp',
        _type: 'json',
        keyword: keyword,
        contentTypeId: contentTypeId,
        numOfRows: 5, // 챗봇 콘텍스트용이므로 상위 5개만 호출
        pageNo: 1,
        arrange: 'O' // 제목순 정렬
      },
      timeout: 5000 // 공공 API 지연 대비 타임아웃 5초 설정
    });

    const items = response.data?.response?.body?.items?.item;
    
    if (!items) return [];
    
    // 배열 보장 및 필요한 데이터만 매핑 (전처리)
    return (Array.isArray(items) ? items : [items]).map(item => ({
      title: item.title,
      address: item.addr1 + (item.addr2 ? ' ' + item.addr2 : ''),
      imageUrl: item.firstimage || item.firstimage2 || '',
      mapX: item.mapx,
      mapY: item.mapy,
      tel: item.tel || '정보 없음'
    }));
  } catch (error) {
    console.error('❌ Tour API 호출 실패:', error.message);
    return []; // API가 터져도 서비스는 유지되도록 빈 배열 반환
  }
}

module.exports = { fetchTourData, CONTENT_TYPE };