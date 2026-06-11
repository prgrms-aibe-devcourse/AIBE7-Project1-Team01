require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const axios    = require('axios');
const { createClient } = require('@supabase/supabase-js');
const Groq     = require('groq-sdk');
const { fetchTourData, CONTENT_TYPE } = require('./services/tourApi');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── 전역 클라이언트 초기화 ──────────────────────────────────────────────────
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    : null;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================================================
// 🗺️  지역명 → 기상청 격자 변환 테이블
// ==========================================================================
const REGION_GRID = {
  서울:   { nx: 60,  ny: 127 },
  인천:   { nx: 55,  ny: 124 },
  경기:   { nx: 60,  ny: 120 },
  수원:   { nx: 60,  ny: 121 },
  부산:   { nx: 98,  ny: 76  },
  대구:   { nx: 89,  ny: 90  },
  광주:   { nx: 58,  ny: 74  },
  대전:   { nx: 67,  ny: 100 },
  울산:   { nx: 102, ny: 84  },
  세종:   { nx: 66,  ny: 103 },
  강원:   { nx: 73,  ny: 134 },
  춘천:   { nx: 73,  ny: 134 },
  강릉:   { nx: 92,  ny: 131 },
  충북:   { nx: 69,  ny: 107 },
  청주:   { nx: 69,  ny: 107 },
  충남:   { nx: 68,  ny: 100 },
  천안:   { nx: 63,  ny: 110 },
  전북:   { nx: 63,  ny: 89  },
  전주:   { nx: 63,  ny: 89  },
  전남:   { nx: 51,  ny: 67  },
  목포:   { nx: 50,  ny: 67  },
  여수:   { nx: 73,  ny: 66  },
  경북:   { nx: 89,  ny: 91  },
  포항:   { nx: 102, ny: 94  },
  경주:   { nx: 100, ny: 91  },
  경남:   { nx: 91,  ny: 77  },
  창원:   { nx: 89,  ny: 77  },
  진주:   { nx: 81,  ny: 75  },
  제주:   { nx: 52,  ny: 38  },
  서귀포: { nx: 52,  ny: 33  },
};

function getGridByText(text) {
  for (const [region, grid] of Object.entries(REGION_GRID)) {
    if (text.includes(region)) return { region, ...grid };
  }
  return null;
}

// 사용자 문장 → 검색 키워드 후보 추출
// 공공데이터 키워드 검색은 문장 전체나 두 단어 조합엔 0건을 주므로
// 불용어를 제거하고 단일 핵심어 후보 목록을 만든다.
function buildSearchKeywords(message, region) {
  const STOPWORDS = [
    '축제', '행사', '공연', '맛집', '식당', '숙소', '호텔',
    '알려줘', '알려', '추천', '추천해줘', '추천해', '해줘', '해 줘',
    '있어', '있나요', '있니', '뭐', '무엇', '어디', '정보', '좀',
    '관련', '관한', '대한', '대해', '주변', '근처', '가까운', '의',
  ];

  let cleaned = message;
  STOPWORDS.forEach(w => { cleaned = cleaned.split(w).join(' '); });

  const words = cleaned
    .split(/[\s,./?!]+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2);

  // 동의어 보강 — 공공데이터 축제명에 자주 쓰이는 표현으로 치환
  const SYNONYMS = { 먹거리: '음식', 치맥: '치맥', 불꽃: '불꽃', 벚꽃: '벚꽃', 눈꽃: '눈꽃' };
  const expanded = [];
  words.forEach(w => {
    expanded.push(w);
    if (SYNONYMS[w] && SYNONYMS[w] !== w) expanded.push(SYNONYMS[w]);
  });

  const candidates = [];
  if (region) candidates.push(region);   // 지역명 우선
  expanded.forEach(w => { if (!candidates.includes(w)) candidates.push(w); });

  return candidates;
}

// ==========================================================================
// 🌤️  기상청 단기예보
// ==========================================================================
function getBaseDateTime() {
  const kst  = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const mm   = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(kst.getUTCDate()).padStart(2, '0');
  const hour = kst.getUTCHours();

  const baseTimes    = [23, 20, 17, 14, 11, 8, 5, 2];
  const adjustedHour = hour > 0 ? hour - 1 : 23;
  const baseHour     = baseTimes.find(t => adjustedHour >= t) ?? 23;

  let baseDate = `${year}${mm}${dd}`;
  if (hour === 0 && baseHour === 23) {
    const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
    baseDate = `${prev.getUTCFullYear()}${String(prev.getUTCMonth()+1).padStart(2,'0')}${String(prev.getUTCDate()).padStart(2,'0')}`;
  }
  return { baseDate, baseTime: String(baseHour).padStart(2, '0') + '00' };
}

function parseSky(v) {
  return { 1: '☀️ 맑음', 3: '⛅ 구름많음', 4: '☁️ 흐림' }[v] ?? '알 수 없음';
}
function parsePty(v) {
  return { 0: '없음', 1: '🌧️ 비', 2: '🌨️ 비/눈', 3: '❄️ 눈', 4: '🌦️ 소나기' }[v] ?? '없음';
}

async function fetchWeatherInfo(nx, ny) {
  if (!process.env.WEATHER_API_KEY) return null;
  const { baseDate, baseTime } = getBaseDateTime();
  try {
    const res = await axios.get(
      'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst',
      {
        params: {
          serviceKey: process.env.WEATHER_API_KEY,
          pageNo: 1, numOfRows: 100,
          dataType: 'JSON', base_date: baseDate, base_time: baseTime, nx, ny,
        },
        timeout: 6000,
      }
    );
    if (res.data?.response?.header?.resultCode !== '00') return null;
    const items = res.data?.response?.body?.items?.item;
    if (!items?.length) return null;

    const firstTime = items[0].fcstTime;
    const snap = {};
    items.filter(it => it.fcstTime === firstTime).forEach(it => { snap[it.category] = it.fcstValue; });

    return {
      baseDate, baseTime,
      temperature: snap.TMP ? `${snap.TMP}°C`  : '정보 없음',
      sky:         parseSky(Number(snap.SKY)),
      pty:         parsePty(Number(snap.PTY)),
      pop:         snap.POP ? `${snap.POP}%`   : '정보 없음',
      humidity:    snap.REH ? `${snap.REH}%`   : '정보 없음',
      windSpeed:   snap.WSD ? `${snap.WSD}m/s` : '정보 없음',
      rain1h:      snap.PCP && snap.PCP !== '강수없음' ? snap.PCP : '없음',
    };
  } catch (err) {
    console.error('날씨 API 오류:', err.message);
    return null;
  }
}

// ==========================================================================
// 🚌  교통수단 — 지역별 로컬 테이블 (검증된 안정 방식)
// ==========================================================================
const CITY_TRANSPORT_INFO = {
  서울:  ['🚇 도시철도 (9호선)', '🚌 시내버스', '🚐 마을버스', '🚍 광역버스'],
  부산:  ['🚇 도시철도 (4호선)', '🚌 시내버스', '🚐 마을버스'],
  대구:  ['🚇 도시철도 (3호선)', '🚌 시내버스', '🚐 마을버스'],
  인천:  ['🚇 도시철도 (2호선)', '🚌 시내버스', '🚍 광역버스'],
  광주:  ['🚇 도시철도 (1호선)', '🚌 시내버스', '🚐 마을버스'],
  대전:  ['🚇 도시철도 (1호선)', '🚌 시내버스', '🚐 마을버스'],
  울산:  ['🚌 시내버스', '🚐 마을버스', '🚍 좌석버스'],
  세종:  ['🚌 시내버스 (BRT)', '🚐 마을버스'],
  경기:  ['🚌 시내버스', '🚍 광역버스', '🚐 마을버스'],
  수원:  ['🚌 시내버스', '🚍 광역버스', '🚐 마을버스'],
  춘천:  ['🚌 시내버스', '🚂 철도 (경춘선)'],
  강원:  ['🚌 시내버스', '🚂 철도'],
  강릉:  ['🚌 시내버스', '🚂 KTX (강릉선)'],
  청주:  ['🚌 시내버스', '🚐 마을버스'],
  충북:  ['🚌 시내버스', '🚂 철도'],
  천안:  ['🚌 시내버스', '🚂 KTX·SRT', '🚍 고속버스'],
  충남:  ['🚌 시내버스', '🚂 철도', '🚍 고속버스'],
  전주:  ['🚌 시내버스', '🚐 마을버스'],
  전북:  ['🚌 시내버스', '🚂 철도'],
  목포:  ['🚌 시내버스', '🚢 여객선'],
  여수:  ['🚌 시내버스', '🚢 여객선'],
  전남:  ['🚌 시내버스', '🚢 여객선', '🚂 철도'],
  포항:  ['🚌 시내버스', '🚂 철도'],
  경주:  ['🚌 시내버스', '🚂 KTX (경부선)'],
  경북:  ['🚌 시내버스', '🚂 철도'],
  창원:  ['🚌 시내버스', '🚍 좌석버스'],
  진주:  ['🚌 시내버스', '🚍 고속버스'],
  경남:  ['🚌 시내버스', '🚂 철도', '🚍 고속버스'],
  제주:  ['🚌 시내버스 (급행·일반)', '✈️ 항공', '🚢 여객선'],
  서귀포:['🚌 시내버스', '✈️ 항공'],
};

function getTransportList(regionName) {
  if (!regionName) return [];
  return (CITY_TRANSPORT_INFO[regionName] || []).map(mode => ({
    transportMode: mode, routeCount: '-', operInfo: '',
  }));
}

// ==========================================================================
// 🎨  축제 상세 → 구조화 데이터 (프론트에서 HTML 카드로 렌더링)
// ==========================================================================
function buildFestivalDetail(festival) {
  const roadAddr = festival.roadAddress || festival.address || '정보 없음';
  const zip      = festival.zipNo ? `(${festival.zipNo})` : '';
  const homepage = festival.eventHomepage
    ? festival.eventHomepage.replace(/<[^>]*>/g, '').trim()
    : '';

  return {
    title:      festival.title,
    eventPlace: festival.eventPlace || '',
    address:    `${roadAddr} ${zip}`.trim(),
    startDate:  festival.eventStartDate,
    endDate:    festival.eventEndDate,
    playTime:   festival.playTime && festival.playTime !== '정보 없음' ? festival.playTime : '',
    useFee:     festival.useFee || '정보 없음',
    tel:        festival.sponsorTel || '정보 없음',
    homepage,
  };
}

// 축제 1건 → ASCII 박스 (왼쪽 테두리만 사용해 한글 폭 영향 없음)
function buildFestivalBox(festival) {
  const bar = '─'.repeat(36);
  const L = [];

  const roadAddr = festival.roadAddress || festival.address || '정보 없음';
  const zip      = festival.zipNo ? ` (${festival.zipNo})` : '';
  const period   = festival.eventStartDate
    ? `${festival.eventStartDate} ~ ${festival.eventEndDate || ''}`.trim()
    : '정보 없음';

  L.push(`┌${bar}┐`);
  L.push(`│  📍 ${festival.title}`);
  L.push(`├${bar}┤`);
  L.push(`│  📌 기간 : ${period}`);
  if (festival.playTime && festival.playTime !== '정보 없음') {
    L.push(`│  📌 운영시간 : ${festival.playTime}`);
  }
  L.push(`│  📌 요금 : ${festival.useFee || '정보 없음'}`);
  L.push(`│  📌 주소 : ${roadAddr}${zip}`);
  L.push(`│  📞 연락처 : ${festival.sponsorTel || '정보 없음'}`);
  L.push(`└${bar}┘`);

  return L.join('\n');
}

function buildResponseCard({ region, weatherData, transportData, festivalList, isFestival, groqReply }) {
  const L   = [];
  const bar = '━'.repeat(36);

  // ── AI 답변 ──────────────────────────────────────────────────────────────
  L.push('💬 여행 가이드');
  L.push(bar);
  L.push(groqReply);

  // ── 날씨 카드 ────────────────────────────────────────────────────────────
  if (weatherData) {
    L.push('');
    L.push(`┌${'─'.repeat(36)}┐`);
    L.push(`│  🌤️  현재 날씨 | ${region ?? '해당 지역'}`);
    L.push(`├${'─'.repeat(36)}┤`);
    L.push(`│  🌡️  기온        ${weatherData.temperature}`);
    L.push(`│  🌈  하늘        ${weatherData.sky}`);
    if (weatherData.pty !== '없음') {
      L.push(`│  🌂  강수형태    ${weatherData.pty}`);
    }
    L.push(`│  💧  강수확률    ${weatherData.pop}`);
    L.push(`│  💦  습도        ${weatherData.humidity}`);
    L.push(`│  💨  풍속        ${weatherData.windSpeed}`);
    if (weatherData.rain1h !== '없음') {
      L.push(`│  ☔  1시간강수   ${weatherData.rain1h}`);
    }
    L.push(`│  🕐  발표기준    ${weatherData.baseDate} ${weatherData.baseTime}`);
    L.push(`└${'─'.repeat(36)}┘`);
  }

  // ── 교통수단 카드 (축제 한정) ─────────────────────────────────────────────
  if (isFestival && transportData.length > 0) {
    L.push('');
    L.push(`┌${'─'.repeat(36)}┐`);
    L.push(`│  🚌  교통수단 | ${region ?? '해당 지역'}`);
    L.push(`├${'─'.repeat(36)}┤`);
    transportData.forEach(t => {
      L.push(`│  ${t.transportMode}`);
    });
    L.push(`└${'─'.repeat(36)}┘`);
  }

  // ── 축제 상세 카드 ────────────────────────────────────────────────────────
  if (isFestival && festivalList.length > 0) {
    L.push('');
    L.push(`🎉 검색된 축제 ${festivalList.length}건`);
    festivalList.forEach(f => {
      L.push('');
      L.push('');
      L.push(buildFestivalBox(f));
    });
  } else if (!isFestival && festivalList.length > 0) {
    // 축제 외 일반 관광지
    L.push('');
    L.push(`┌${'─'.repeat(36)}┐`);
    L.push(`│  📍  관련 장소 (${festivalList.length}건)`);
    L.push(`├${'─'.repeat(36)}┤`);
    festivalList.slice(0, 5).forEach((d, i) => {
      L.push(`│  ${i + 1}. ${d.title}`);
      L.push(`│     📌 ${d.address}`);
      if (d.tel) L.push(`│     📞 ${d.tel}`);
    });
    L.push(`└${'─'.repeat(36)}┘`);
  }

  return L.join('\n');
}

// ==========================================================================
// 💬  채팅 API
// ==========================================================================
app.post('/api/chat', async (req, res) => {
  const { message, step } = req.body;

  if (!message)
    return res.status(400).json({ success: false, message: '메시지가 필요합니다.' });
  if (!groq)
    return res.status(500).json({ success: false, message: 'GROQ_API_KEY가 설정되지 않았습니다.' });

  try {
    // ── 1. 콘텐츠 타입 분류 ─────────────────────────────────────────────
    let contentType = '';
    if (message.includes('맛집') || message.includes('식당')) contentType = CONTENT_TYPE.RESTAURANT;
    if (message.includes('축제') || message.includes('행사') || message.includes('공연')) contentType = CONTENT_TYPE.FESTIVAL;
    if (message.includes('숙소') || message.includes('호텔')) contentType = CONTENT_TYPE.ACCOMMODATION;

    const isFestival = contentType === CONTENT_TYPE.FESTIVAL;
    const gridInfo   = getGridByText(message);
    const region     = gridInfo?.region ?? null;

    // ── 2. 병렬 API 호출 ────────────────────────────────────────────────
    // 키워드 후보를 순차 시도해 첫 결과가 나오는 키워드를 사용 (문장 전체 검색은 0건)
    let usedDefaultRegion = false;
    const fetchTourWithFallback = async () => {
      const keywords = buildSearchKeywords(message, region);
      for (const kw of keywords) {
        const result = await fetchTourData(kw, contentType);
        if (result.length > 0) return result;
      }
      // 원문으로 한 번 더 시도
      const raw = await fetchTourData(message, contentType);
      if (raw.length > 0) return raw;

      // 지역명·키워드가 없어 모두 실패하면 인기 지역으로 기본 검색
      const DEFAULT_REGIONS = ['서울', '부산', '제주', '대구', '인천'];
      for (const r of DEFAULT_REGIONS) {
        const result = await fetchTourData(r, contentType);
        if (result.length > 0) { usedDefaultRegion = true; return result; }
      }
      return [];
    };

    const [tourData, weatherData] = await Promise.all([
      fetchTourWithFallback(),
      gridInfo ? fetchWeatherInfo(gridInfo.nx, gridInfo.ny) : Promise.resolve(null),
    ]);

    // 교통수단은 로컬 테이블 (API 오류 없음)
    const transportData = isFestival ? getTransportList(region) : [];

    // ── 3. GROQ Context 구성 ─────────────────────────────────────────────
    let tourContext = '관광 정보 없음';
    if (tourData.length > 0) {
      if (usedDefaultRegion) {
        tourContext = '(요청하신 조건의 축제를 찾지 못해 인기 지역의 축제를 대신 안내합니다)\n';
      } else {
        tourContext = '';
      }
      if (isFestival) {
        tourContext += tourData.map((f, i) =>
          `[축제${i+1}] ${f.title} / 장소: ${f.roadAddress || f.address} / 기간: ${f.eventStartDate}~${f.eventEndDate} / 요금: ${f.useFee}`
        ).join('\n');
      } else {
        tourContext += tourData.map((d, i) => `[${i+1}] ${d.title} / ${d.address}`).join('\n');
      }
    }

    const weatherContext = weatherData
      ? `날씨: ${weatherData.sky}, 기온 ${weatherData.temperature}, 강수확률 ${weatherData.pop}, 습도 ${weatherData.humidity}`
      : '';

    const transportContext = isFestival && transportData.length > 0
      ? `교통수단: ${transportData.map(t => t.transportMode).join(', ')}`
      : '';

    // ── 4. GROQ 호출 ────────────────────────────────────────────────────
    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `당신은 대한민국 국내 여행 전문 가이드 챗봇입니다.
아래 [공공데이터]를 바탕으로 친근한 한국어로 2~4문장 핵심 답변만 작성하세요.
축제 상세 정보(날짜·요금·주소·연락처)는 별도 카드로 출력되므로 중복 나열 없이
여행 분위기와 볼거리 중심으로 자연스럽게 안내하세요.

[공공데이터]
${tourContext}
${weatherContext}
${transportContext}

[규칙]
- 한국어만 사용
- 주소·명칭은 공공데이터 그대로 인용
- [공공데이터]에 없는 축제·장소·날짜·연락처를 절대 지어내지 말 것
- 축제명, 날짜, 요금, 주소, 연락처를 답변 본문에 나열하지 말 것 (카드로 출력됨)
- 한자·외국어·이상한 유니코드 출력 금지
- [공공데이터]가 "관광 정보 없음" 이면 정보를 만들지 말고
  "해당 지역의 정확한 정보를 찾지 못했습니다. 다른 지역이나 키워드로 검색해 보세요." 로만 답변`,
        },
        { role: 'user', content: message },
      ],
      temperature: 0.3, top_p: 0.9, frequency_penalty: 0, presence_penalty: 0,
    });

    const rawReply  = chatCompletion.choices[0]?.message?.content || '답변을 생성하지 못했습니다.';
    const groqReply = rawReply.replace(/[\u4E00-\u9FFF\u0E00-\u0E7F]/g, '');

    // ── 5. 카드 통합 응답 ───────────────────────────────────────────────
    const formattedReply = buildResponseCard({
      region,
      weatherData,
      transportData,
      festivalList: tourData,
      isFestival,
      groqReply,
    });

    // 프론트 festivalData 호환 (app.js displayRecommendation 연동)
    const festivalData = isFestival && tourData.length > 0 ? {
      title:  tourData[0].title,
      region: region || '',
      date:   tourData[0].eventStartDate !== '정보 없음'
                ? `${tourData[0].eventStartDate} ~ ${tourData[0].eventEndDate}`
                : '',
      address: tourData[0].roadAddress || tourData[0].address,
    } : null;

    res.json({
      reply:            formattedReply,
      step:             (step ?? 0) + 1,
      festivalData,                     // app.js 카드 렌더링용
      festivals:        isFestival ? tourData.map(buildFestivalDetail) : [],
      rawTourData:      tourData,
      rawWeatherData:   weatherData,
      rawTransportData: transportData,
    });

  } catch (error) {
    console.error('채팅 오류:', error);
    res.status(500).json({ reply: '시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

// ==========================================================================
// 📋  여행 이력 API
// ==========================================================================
app.get('/api/history', async (req, res) => {
  try {
    res.json({
      success: true,
      data: [{ id: 1, title: '대구 치맥 페스티벌', date: '2025-07-05', region: '대구' }],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '이력을 가져오지 못했습니다.' });
  }
});

app.post('/api/history', async (req, res) => {
  const { title, date } = req.body;
  if (!title)
    return res.status(400).json({ success: false, message: '여행지 이름이 필요합니다.' });
  console.log(`✅ [이력 추가] 여행지: ${title}, 날짜: ${date}`);
  res.json({ success: true, message: '여행 이력이 성공적으로 추가되었습니다!' });
});

// ==========================================================================
// 🔖  보관함 API
// ==========================================================================
app.get('/api/saved', async (req, res) => {
  const userId = req.headers['user-id'];
  if (!supabase)
    return res.status(500).json({ success: false, message: 'Supabase 환경변수가 설정되지 않았습니다.' });
  if (!userId)
    return res.json({ success: true, data: [] });
  try {
    const { data, error } = await supabase
      .from('saved_destinations')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: '보관함 목록을 가져오지 못했습니다.' });
  }
});

app.post('/api/saved', async (req, res) => {
  const { title, region, date } = req.body;
  const userId = req.headers['user-id'];
  if (!supabase)
    return res.status(500).json({ success: false, message: 'Supabase 환경변수가 설정되지 않았습니다.' });
  if (!userId)
    return res.status(400).json({ success: false, message: 'user-id 헤더가 필요합니다.' });
  try {
    const { error } = await supabase
      .from('saved_destinations')
      .insert([{ title, region, date, user_id: userId }]);
    if (error) throw error;
    res.json({ success: true, message: '성공적으로 저장되었습니다!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE 보관함 항목 삭제 (app.js deleteSaved 연동)
app.delete('/api/saved/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['user-id'];
  if (!supabase)
    return res.status(500).json({ success: false, message: 'Supabase 환경변수가 설정되지 않았습니다.' });
  if (!userId)
    return res.status(400).json({ success: false, message: 'user-id 헤더가 필요합니다.' });
  try {
    const { error } = await supabase
      .from('saved_destinations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true, message: '삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================================
// 🗺️  추천 및 이미지 API
// ==========================================================================
app.get('/api/recommendation', (req, res) => {
  const regions = ['서산', '부산', '제주도'];
  res.json({ success: true, region: regions[Math.floor(Math.random() * regions.length)] });
});

app.get('/api/planner-photo', async (req, res) => {
  const keyword = req.query.keyword;
  if (!keyword)
    return res.status(400).json({ success: false, message: 'keyword 파라미터가 필요합니다.' });
  if (!process.env.PEXELS_API_KEY)
    return res.status(500).json({ success: false, message: '이미지 API 키가 설정되지 않았습니다.' });

  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      params:  { query: keyword, per_page: 5, page: 1, orientation: 'landscape', size: 'medium', locale: 'ko-KR' },
      timeout: 7000,
    });
    let photos = response.data?.photos;

    if (!photos || photos.length === 0) {
      const fb = await axios.get('https://api.pexels.com/v1/search', {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params:  { query: 'Korea travel', per_page: 5, page: 1, orientation: 'landscape' },
        timeout: 7000,
      });
      photos = fb.data?.photos;
    }
    if (!photos || photos.length === 0)
      return res.status(404).json({ success: false, message: '이미지를 찾을 수 없습니다.' });

    const pick = photos[Math.floor(Math.random() * photos.length)];
    return res.json({ success: true, imageUrl: pick.src.large, photographer: pick.photographer, pexelsUrl: pick.url });
  } catch (err) {
    const status = err.response?.status;
    if (status === 401) return res.status(500).json({ success: false, message: '이미지 API 인증 실패.' });
    if (status === 429) return res.status(429).json({ success: false, message: '이미지 요청 한도 초과.' });
    return res.status(500).json({ success: false, message: '이미지를 불러오지 못했습니다.' });
  }
});

// 단독 실행(node server.js)일 때만 포트 listen.
// require()로 불러와 다른 서버에 마운트할 때는 app만 내보낸다.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 서버가 포트 ${PORT}에서 작동 중입니다.`);
  });
}

module.exports = app;