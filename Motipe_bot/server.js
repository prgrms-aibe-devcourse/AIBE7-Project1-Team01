require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Supabase 클라이언트 초기화
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 임시 테스트용 유저 ID (원래는 Auth 연동 필요)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

// ===== 외부 API 연동 모듈 =====



// 1. 한국관광공사 TourAPI 4.0 - 행사/축제 정보 조회
async function getFestivalInfo(areaCode = '') {
    try {
        // ⭐️ 환경변수에 저장된 인코딩 키를 명시적으로 디코딩합니다.
        const decodedKey = decodeURIComponent(process.env.TOUR_API_KEY);

        const response = await axios.get('https://apis.data.go.kr/B551011/KorService2/searchFestival2', {
            params: {
                serviceKey: decodedKey, // 디코딩된 키를 전달 -> axios가 한 번만 인코딩함
                MobileOS: 'ETC',
                MobileApp: 'Motipe_bot',
                _type: 'json',
                listYN: 'Y',
                arrange: 'A',
                eventStartDate: '20260601', // 예시 날짜 (2026년 기준)
                areaCode: areaCode
            }
        });
        return response.data.response?.body?.items?.item || [];
    } catch (error) {
        console.error('TourAPI 에러:', error.message);
        return [];
    }
}

// 2. 기상청 단기예보 API 2.0 - 날씨 조회 (내부 디코딩 및 날짜 동적화 적용)
async function getWeatherData(nx = 55, ny = 127) {
    try {
        // 인코딩된 환경변수 키를 코드 내에서 디코딩
        const decodedKey = decodeURIComponent(process.env.WEATHER_API_KEY);
        
        // 현재 날짜 기준 YYYYMMDD 계산 (2026년 동적 처리)
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const baseDate = `${year}${month}${date}`; 

        const response = await axios.get('https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst', {
            params: {
                serviceKey: decodedKey, // 디코딩된 키 주입
                pageNo: 1,
                numOfRows: 10,
                dataType: 'JSON',
                base_date: baseDate,
                base_time: '0600',
                nx: nx,
                ny: ny
            }
        });
        return response.data.response?.body?.items?.item || [];
    } catch (error) {
        console.error('기상청 API 에러:', error.message);
        return [];
    }
}


// 3. TMAP API - 대중교통 최적 경로 조회
async function getTmapTransitRoute(startX, startY, endX, endY) {
    try {
        const response = await axios.post('https://apis.openapi.sk.com/transit/routes', {
            startX: startX,   // 출발지 경도 (String)
            startY: startY,   // 출발지 위도 (String)
            endX: endX,       // 목적지 경도 (String)
            endY: endY,       // 목적지 위도 (String)
            lang: 0,          // 0: 국문, 1: 영문
            format: 'json'
        }, {
            headers: {
                'appKey': process.env.TMAP_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const itineraries = response.data?.metaData?.plan?.itineraries;
        if (itineraries && itineraries.length > 0) {
            const bestRoute = itineraries[0]; // TMAP이 추천하는 최적 경로 (첫 번째 아이템)
            
            return {
                totalTime: Math.round(bestRoute.totalTime / 60), // 초(sec) 단위를 분(min)으로 변환
                fare: bestRoute.fare?.regular?.totalFare || 0,   // 총 요금
                transferCount: bestRoute.transferCount,          // 환승 횟수
                firstMode: bestRoute.legs[0]?.mode || '도보'      // 첫 이동 수단 (WALK, BUS, SUBWAY 등)
            };
        }
        return null;
    } catch (error) {
        console.error('TMAP API 에러:', error.response?.data || error.message);
        return null;
    }
}

// ===== CRUD API 엔드포인트 =====

// CREATE: 과거 여행 기록 추가
app.post('/api/history', async (req, res) => {
    const { destination_name, visit_date, rating, review_text } = req.body;
    const { data, error } = await supabase
        .from('travel_history')
        .insert([{ user_id: TEST_USER_ID, destination_name, visit_date, rating, review_text }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
});

// READ: 과거 여행 기록 조회
app.get('/api/history', async (req, res) => {
    const { data, error } = await supabase
        .from('travel_history')
        .select('*')
        .order('visit_date', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// DELETE: 과거 여행 기록 삭제
app.delete('/api/history/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('travel_history').delete().eq('id', id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: '삭제 성공' });
});

// CREATE: 축제/여행지 스크랩(저장)
app.post('/api/saved', async (req, res) => {
    const { content_id, title, addr, event_start_date, event_end_date } = req.body;
    const { data, error } = await supabase
        .from('saved_destinations')
        .insert([{ user_id: TEST_USER_ID, content_id, title, addr, event_start_date, event_end_date }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
});

// READ: 스크랩 리스트 조회
app.get('/api/saved', async (req, res) => {
    const { data, error } = await supabase.from('saved_destinations').select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// UPDATE: 스크랩 메모 수정
app.put('/api/saved/:id', async (req, res) => {
    const { id } = req.params;
    const { user_memo } = req.body;
    const { data, error } = await supabase
        .from('saved_destinations')
        .update({ user_memo })
        .eq('id', id)
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// DELETE: 스크랩 취소
app.delete('/api/saved/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('saved_destinations').delete().eq('id', id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: '스크랩 취소 성공' });
});

// ===== 대화형 AI 추천 시뮬레이션 엔드포인트 =====
// Claude Code 환경처럼 챗봇 대화를 주고받는 라우터입니다.
app.post('/api/chat', async (req, res) => {
    const { message, step } = req.body; 
    
    if (step === 1) {
        return res.json({
            step: 2,
            reply: `안녕하세요! 맞춤 축제 여행을 도와드릴게요. 혹시 **최근에 다녀오신 여행지 중 가장 좋았던 곳과 아쉬웠던 곳**을 말씀해주시겠어요? (예: 부산 광안리 좋았음 / 경주 보문단지 사람 너무 많아 아쉬웠음)`
        });
    } 
    
    if (step === 2) {
        // 1. TourAPI로 축제 정보 조회
        const festivals = await getFestivalInfo('35'); 
        const sampleFestival = festivals[0] || { title: "대구 치맥 페스티벌", addr1: "대구 달서구", mapx: "128.557", mapy: "35.846" };
        
        // 2. 기상청 API로 날씨 조회
        const weather = await getWeatherData(89, 90);
        const tempItem = weather.find(i => i.category === 'TMP');
        const currentTemp = tempItem ? `${tempItem.fcstValue}°C` : '24°C';

        // 3. ⭐️ TMAP API로 대중교통 경로 조회 ⭐️
        // (예시) 출발지: 서울역 좌표 (126.972, 37.554) -> 목적지: 축제 장소 좌표
        const startX = "126.972";
        const startY = "37.554";
        const endX = sampleFestival.mapx || "128.557"; // TourAPI에서 제공하는 경도
        const endY = sampleFestival.mapy || "35.846"; // TourAPI에서 제공하는 위도
        
        const transitInfo = await getTmapTransitRoute(startX, startY, endX, endY);
        
        let transportReply = `교통 정보 조회가 원활하지 않습니다.`;
        if (transitInfo) {
            transportReply = `서울역 기준 대중교통으로 약 **${transitInfo.totalTime}분** 소요되며, 예상 요금은 **${transitInfo.fare.toLocaleString()}원**입니다. (환승 ${transitInfo.transferCount}회)`;
        }

        return res.json({
            step: 3,
            reply: `분석을 완료했습니다! 이 축제는 어떠신가요?
            
🌟 **지금 시즌 강력 추천 여행지 & 축제**
- **축제명:** ${sampleFestival.title}
- **위치:** ${sampleFestival.addr1}
- **기간:** ${sampleFestival.eventstartdate} ~ ${sampleFestival.eventenddate}
- **현재 시즌 숙박 가성비 지수:** 🟢 매우 좋음 (비성수기 프로모션 지역)
- **축제 당일 예상 날씨:** ☀️ 맑음 (${currentTemp})

🚗 **TMAP 실시간 대중교통 추천 경로:**
- ${transportReply}

이 여행지가 마음에 드신다면 **[이 여행지 스크랩하기]** 버튼을 눌러 저장해보세요!`,
            festivalData: {
                content_id: sampleFestival.contentid || '12345',
                title: sampleFestival.title,
                addr: sampleFestival.addr1,
                event_start_date: sampleFestival.eventstartdate,
                event_end_date: sampleFestival.eventenddate
            }
        });
    }

    res.json({ step: 1, reply: "대화가 초기화되었습니다." });
});




app.listen(PORT, () => {
    console.log(`🚀 Motipe_챗봇 서버가 http://localhost:${PORT} 에서 작동 중입니다.`);
});