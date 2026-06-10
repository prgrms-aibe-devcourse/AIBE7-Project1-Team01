require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const Groq = require("groq-sdk");
const { getDetailedFestivalData } = require("./services/tourApi");

const app = express();
const PORT = process.env.PORT || 3000;

// ── 전역 클라이언트 초기화 ─────────────────────────────────────────────────
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    : null;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==========================================================================
// 🗺️  지역명 → 기상청 격자 변환 테이블 (단 한 번만 선언)
// ==========================================================================
const REGION_GRID = {
  서울: { nx: 60, ny: 127 },
  인천: { nx: 55, ny: 124 },
  경기: { nx: 60, ny: 120 },
  수원: { nx: 60, ny: 121 },
  부산: { nx: 98, ny: 76 },
  대구: { nx: 89, ny: 90 },
  광주: { nx: 58, ny: 74 },
  대전: { nx: 67, ny: 100 },
  울산: { nx: 102, ny: 84 },
  세종: { nx: 66, ny: 103 },
  강원: { nx: 73, ny: 134 },
  춘천: { nx: 73, ny: 134 },
  강릉: { nx: 92, ny: 131 },
  충북: { nx: 69, ny: 107 },
  청주: { nx: 69, ny: 107 },
  충남: { nx: 68, ny: 100 },
  천안: { nx: 63, ny: 110 },
  전북: { nx: 63, ny: 89 },
  전주: { nx: 63, ny: 89 },
  전남: { nx: 51, ny: 67 },
  목포: { nx: 50, ny: 67 },
  여수: { nx: 73, ny: 66 },
  경북: { nx: 89, ny: 91 },
  포항: { nx: 102, ny: 94 },
  경주: { nx: 100, ny: 91 },
  경남: { nx: 91, ny: 77 },
  창원: { nx: 89, ny: 77 },
  진주: { nx: 81, ny: 75 },
  제주: { nx: 52, ny: 38 },
  서귀포: { nx: 52, ny: 33 },
};

// 메시지에서 지역 + 격자 추출
function getGridByText(text) {
  for (const [region, grid] of Object.entries(REGION_GRID)) {
    if (text.includes(region)) return { region, ...grid };
  }
  return null;
}

// ==========================================================================
// 🌤️  기상청 단기예보 유틸
// ==========================================================================
function getBaseDateTime() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);

  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  const hour = kst.getUTCHours();

  const baseTimes = [23, 20, 17, 14, 11, 8, 5, 2];
  const adjustedHour = hour > 0 ? hour - 1 : 23;
  const baseHour = baseTimes.find((t) => adjustedHour >= t) ?? 23;

  let baseDate = `${year}${month}${day}`;
  if (hour === 0 && baseHour === 23) {
    const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
    baseDate = `${prev.getUTCFullYear()}${String(prev.getUTCMonth() + 1).padStart(2, "0")}${String(prev.getUTCDate()).padStart(2, "0")}`;
  }

  return { baseDate, baseTime: String(baseHour).padStart(2, "0") + "00" };
}

function parseSky(v) {
  return { 1: "☀️ 맑음", 3: "⛅ 구름많음", 4: "☁️ 흐림" }[v] ?? "알 수 없음";
}

function parsePty(v) {
  return (
    { 0: "없음", 1: "🌧️ 비", 2: "🌨️ 비/눈", 3: "❄️ 눈", 4: "🌦️ 소나기" }[v] ??
    "없음"
  );
}

async function fetchWeatherInfo(nx, ny) {
  if (!process.env.WEATHER_API_KEY) return null;

  const { baseDate, baseTime } = getBaseDateTime();

  try {
    const res = await axios.get(
      "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst",
      {
        params: {
          serviceKey: process.env.WEATHER_API_KEY,
          pageNo: 1,
          numOfRows: 100,
          dataType: "JSON",
          base_date: baseDate,
          base_time: baseTime,
          nx,
          ny,
        },
        timeout: 6000,
      },
    );

    if (res.data?.response?.header?.resultCode !== "00") return null;

    const items = res.data?.response?.body?.items?.item;
    if (!items?.length) return null;

    const firstTime = items[0].fcstTime;
    const snap = {};
    items
      .filter((it) => it.fcstTime === firstTime)
      .forEach((it) => {
        snap[it.category] = it.fcstValue;
      });

    return {
      baseDate,
      baseTime,
      temperature: snap.TMP ? `${snap.TMP}°C` : "정보 없음",
      sky: parseSky(Number(snap.SKY)),
      pty: parsePty(Number(snap.PTY)),
      pop: snap.POP ? `${snap.POP}%` : "정보 없음",
      humidity: snap.REH ? `${snap.REH}%` : "정보 없음",
      windSpeed: snap.WSD ? `${snap.WSD}m/s` : "정보 없음",
      rain1h: snap.PCP && snap.PCP !== "강수없음" ? snap.PCP : "없음",
    };
  } catch (err) {
    console.error("날씨 API 오류:", err.message);
    return null;
  }
}

// ==========================================================================
// 🚌  국토교통부 교통수단 정보 조회
// ==========================================================================
async function fetchTransportInfo(regionName) {
  if (!process.env.TRANSPORT_API_KEY || !regionName) return [];

  try {
    const res = await axios.get(
      "https://apis.data.go.kr/1613000/PublicTransportationMode",
      {
        params: {
          serviceKey: process.env.TRANSPORT_API_KEY,
          pageNo: 1,
          numOfRows: 10,
          regionNm: regionName,
          _type: "json",
        },
        timeout: 5000,
      },
    );

    const items = res.data?.response?.body?.items?.item;
    if (!items) return [];

    return (Array.isArray(items) ? items : [items]).map((item) => ({
      transportMode: item.transportMode || item.transModNm || "정보 없음",
      routeCount: item.routeCo || item.routeCount || "-",
      operInfo: item.operInfo || item.operDe || "",
    }));
  } catch (err) {
    console.error("교통수단 API 오류:", err.message);
    return [];
  }
}

// ==========================================================================
// 🎨  응답 카드 포맷터
// ==========================================================================
const TRANSPORT_ICON = {
  마을버스: "🚐",
  시내버스: "🚌",
  좌석버스: "🪑",
  고속버스: "🚍",
  도시철도: "🚇",
  지하철: "🚇",
  철도: "🚂",
  기차: "🚂",
};

function getTransportIcon(name) {
  const match = Object.entries(TRANSPORT_ICON).find(([k]) => name.includes(k));
  return match ? match[1] : "🚏";
}

function buildResponseCard({
  region,
  weatherData,
  transportData,
  tourData,
  isFestival,
  groqReply,
}) {
  const L = []; // lines

  // ── AI 답변 블록 ────────────────────────────────────────────────────────
  L.push("💬 여행 가이드");
  L.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  L.push(groqReply);

  // ── 날씨 카드 ───────────────────────────────────────────────────────────
  if (weatherData) {
    const title = `🌤️ 현재 날씨 | ${region ?? "해당 지역"}`;
    L.push("");
    L.push(`┌──────────────────────────────────┐`);
    L.push(`│  ${title}`);
    L.push(`├──────────────────────────────────┤`);
    L.push(`│  🌡️  기온        ${weatherData.temperature}`);
    L.push(`│  🌈  하늘        ${weatherData.sky}`);
    if (weatherData.pty !== "없음") {
      L.push(`│  🌂  강수형태    ${weatherData.pty}`);
    }
    L.push(`│  💧  강수확률    ${weatherData.pop}`);
    L.push(`│  💦  습도        ${weatherData.humidity}`);
    L.push(`│  💨  풍속        ${weatherData.windSpeed}`);
    if (weatherData.rain1h !== "없음") {
      L.push(`│  ☔  1시간강수   ${weatherData.rain1h}`);
    }
    L.push(
      `│  🕐  발표기준    ${weatherData.baseDate} ${weatherData.baseTime}`,
    );
    L.push(`└──────────────────────────────────┘`);
  }

  // ── 교통수단 카드 (축제 한정) ────────────────────────────────────────────
  if (isFestival) {
    L.push("");
    L.push(`┌──────────────────────────────────┐`);
    L.push(`│  🚌 교통수단 | ${region ?? "해당 지역"}`);
    L.push(`├──────────────────────────────────┤`);
    if (transportData.length > 0) {
      transportData.forEach((t) => {
        const icon = getTransportIcon(t.transportMode);
        const routes = t.routeCount !== "-" ? `  (노선 ${t.routeCount}개)` : "";
        L.push(`│  ${icon}  ${t.transportMode}${routes}`);
        if (t.operInfo) L.push(`│      └ ${t.operInfo}`);
      });
    } else {
      L.push(`│  ℹ️  교통수단 정보를 불러오지 못했습니다.`);
    }
    L.push(`└──────────────────────────────────┘`);
  }

  // ── 관광지 카드 ─────────────────────────────────────────────────────────
  if (tourData.length > 0) {
    L.push("");
    L.push(`┌──────────────────────────────────┐`);
    L.push(`│  📍 관련 장소 (${tourData.length}건)`);
    L.push(`├──────────────────────────────────┤`);
    tourData.slice(0, 5).forEach((d, i) => {
      L.push(`│  ${i + 1}. ${d.title}`);
      L.push(`│     📌 ${d.address}`);
      if (d.tel) L.push(`│     📞 ${d.tel}`);
    });
    L.push(`└──────────────────────────────────┘`);
  }

  return L.join("\n");
}

// ==========================================================================
// 💬  채팅 API
// ==========================================================================
app.post("/api/chat", async (req, res) => {
  const { message, step } = req.body;

  if (!message)
    return res
      .status(400)
      .json({ success: false, message: "메시지가 필요합니다." });
  if (!groq)
    return res
      .status(500)
      .json({ success: false, message: "GROQ_API_KEY가 설정되지 않았습니다." });

  try {
    // 1. 콘텐츠 타입 분류
    let contentType = "";
    if (message.includes("맛집") || message.includes("식당"))
      contentType = CONTENT_TYPE.RESTAURANT;
    if (message.includes("축제") || message.includes("행사"))
      contentType = CONTENT_TYPE.FESTIVAL;
    if (message.includes("숙소") || message.includes("호텔"))
      contentType = CONTENT_TYPE.ACCOMMODATION;

    const isFestival = contentType === CONTENT_TYPE.FESTIVAL;
    const gridInfo = getGridByText(message);
    const region = gridInfo?.region ?? null;

    // 2. 3개 API 병렬 호출
    const [tourData, weatherData, transportData] = await Promise.all([
      fetchTourData(message, contentType),
      gridInfo
        ? fetchWeatherInfo(gridInfo.nx, gridInfo.ny)
        : Promise.resolve(null),
      isFestival ? fetchTransportInfo(region) : Promise.resolve([]),
    ]);

    // 3. GROQ 자연어 답변 생성
    const tourContext =
      tourData.length > 0
        ? tourData
            .map((d, i) => `[${i + 1}] ${d.title} / ${d.address}`)
            .join("\n")
        : "관광 정보 없음";

    const weatherContext = weatherData
      ? `날씨: ${weatherData.sky}, 기온 ${weatherData.temperature}, 강수확률 ${weatherData.pop}, 습도 ${weatherData.humidity}`
      : "";

    const transportContext =
      isFestival && transportData.length > 0
        ? `교통수단: ${transportData.map((t) => t.transportMode).join(", ")}`
        : "";

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `당신은 대한민국 국내 여행 전문 가이드 챗봇입니다.
아래 [공공데이터]를 바탕으로 친근한 한국어로 2~4문장 핵심 답변만 작성하세요.
날씨·교통 수치는 별도 카드로 출력되므로 반복 나열 없이 여행 맥락으로만 녹여주세요.

[공공데이터]
${tourContext}
${weatherContext}
${transportContext}

[규칙]
- 한국어만 사용
- 주소·명칭은 공공데이터 그대로 인용
- 한자·외국어·이상한 유니코드 출력 금지
- 정보 없으면 "해당 지역의 정확한 정보를 찾지 못했습니다." 로 답변`,
        },
        { role: "user", content: message },
      ],
      temperature: 0.3,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const rawReply =
      chatCompletion.choices[0]?.message?.content ||
      "답변을 생성하지 못했습니다.";
    const groqReply = rawReply.replace(/[\u4E00-\u9FFF\u0E00-\u0E7F]/g, "");

    // 4. 카드 통합 응답
    const formattedReply = buildResponseCard({
      region,
      weatherData,
      transportData,
      tourData,
      isFestival,
      groqReply,
    });

    res.json({
      reply: formattedReply,
      step: (step ?? 0) + 1,
      rawTourData: tourData,
      rawWeatherData: weatherData,
      rawTransportData: transportData,
    });
  } catch (error) {
    console.error("채팅 오류:", error);
    res
      .status(500)
      .json({
        reply: "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
  }
});

// ==========================================================================
// 📋  여행 이력 API
// ==========================================================================
app.get("/api/history", async (req, res) => {
  try {
    res.json({
      success: true,
      data: [
        {
          id: 1,
          title: "대구 치맥 페스티벌",
          date: "2025-07-05",
          region: "대구",
        },
      ],
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "이력을 가져오지 못했습니다." });
  }
});

app.post("/api/history", async (req, res) => {
  const { title, date } = req.body;
  if (!title)
    return res
      .status(400)
      .json({ success: false, message: "여행지 이름이 필요합니다." });
  console.log(`✅ [이력 추가] 여행지: ${title}, 날짜: ${date}`);
  res.json({
    success: true,
    message: "여행 이력이 성공적으로 추가되었습니다!",
  });
});

// ==========================================================================
// 🔖  보관함 API
// ==========================================================================
app.get("/api/saved", async (req, res) => {
  try {
    res.json({
      success: true,
      data: [{ id: 1, title: "제주도 감귤 체험", date: "2026-10-12" }],
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "보관함 목록을 가져오지 못했습니다." });
  }
});

app.post("/api/saved", async (req, res) => {
  const { title, region, date } = req.body;
  const userId = req.headers["user-id"];

  if (!supabase)
    return res
      .status(500)
      .json({
        success: false,
        message: "Supabase 환경변수가 설정되지 않았습니다.",
      });

  try {
    const { error } = await supabase
      .from("saved_destinations")
      .insert([{ title, region, date, user_id: userId }]);
    if (error) throw error;
    res.json({ success: true, message: "성공적으로 저장되었습니다!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================================================
// 🗺️  추천 및 이미지 API
// ==========================================================================
app.get("/api/recommendation", (req, res) => {
  const regions = ["서산", "부산", "제주도"];
  res.json({
    success: true,
    region: regions[Math.floor(Math.random() * regions.length)],
  });
});

app.get("/api/planner-photo", async (req, res) => {
  const keyword = req.query.keyword;

  // ── 키워드 검증 ──────────────────────────────────────────────────────────
  if (!keyword) {
    return res
      .status(400)
      .json({ success: false, message: "keyword 파라미터가 필요합니다." });
  }

  // ── API 키 검증 ──────────────────────────────────────────────────────────
  if (!process.env.PEXELS_API_KEY) {
    console.error("❌ PEXELS_API_KEY 환경변수가 설정되지 않았습니다.");
    return res
      .status(500)
      .json({
        success: false,
        message: "이미지 API 키가 설정되지 않았습니다.",
      });
  }

  try {
    // ── Pexels 이미지 검색 ───────────────────────────────────────────────
    const response = await axios.get("https://api.pexels.com/v1/search", {
      headers: {
        Authorization: process.env.PEXELS_API_KEY, // Bearer 불필요, 키 그대로 전달
      },
      params: {
        query: keyword,
        per_page: 5, // 5장 중 랜덤 1장 선택 → 매번 다른 이미지
        page: 1,
        orientation: "landscape",
        size: "medium",
        locale: "ko-KR",
      },
      timeout: 7000,
    });

    const photos = response.data?.photos;

    // ── 결과 없음 처리 ───────────────────────────────────────────────────
    if (!photos || photos.length === 0) {
      // 한국어 키워드로 결과 없으면 영어로 재시도
      const fallbackResponse = await axios.get(
        "https://api.pexels.com/v1/search",
        {
          headers: { Authorization: process.env.PEXELS_API_KEY },
          params: {
            query: "Korea travel", // 기본 폴백 키워드
            per_page: 5,
            page: 1,
            orientation: "landscape",
          },
          timeout: 7000,
        },
      );

      const fallbackPhotos = fallbackResponse.data?.photos;
      if (!fallbackPhotos || fallbackPhotos.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "이미지를 찾을 수 없습니다." });
      }

      const pick =
        fallbackPhotos[Math.floor(Math.random() * fallbackPhotos.length)];
      return res.json({
        success: true,
        imageUrl: pick.src.large, // 399×224 대역 최적 사이즈
        photographer: pick.photographer, // 저작자 (Pexels 정책상 표시 권장)
        pexelsUrl: pick.url,
      });
    }

    // ── 랜덤 1장 선택 후 반환 ───────────────────────────────────────────
    const pick = photos[Math.floor(Math.random() * photos.length)];
    return res.json({
      success: true,
      imageUrl: pick.src.large,
      photographer: pick.photographer,
      pexelsUrl: pick.url,
    });
  } catch (err) {
    // ── 에러 유형별 안내 ────────────────────────────────────────────────
    const status = err.response?.status;
    if (status === 401) {
      console.error("❌ Pexels API 인증 실패 — API 키를 확인하세요.");
      return res
        .status(500)
        .json({
          success: false,
          message: "이미지 API 인증에 실패했습니다. API 키를 확인하세요.",
        });
    }
    if (status === 429) {
      console.error("❌ Pexels API 요청 한도 초과");
      return res
        .status(429)
        .json({
          success: false,
          message:
            "이미지 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
        });
    }
    console.error("이미지 API 오류:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "이미지를 불러오지 못했습니다." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 작동 중입니다.`);
});
