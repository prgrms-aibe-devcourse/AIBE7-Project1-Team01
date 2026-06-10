
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const Groq = require("groq-sdk");
const { fetchTourData, CONTENT_TYPE } = require("./services/tourApi");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Fix 3: 최상위 스코프로 이동 (라우터 핸들러 내부에서 초기화하면 요청마다 재생성됨)
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    : null;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==========================================================================
// 💬 채팅 API — Tour API + GROQ 통합
// ✅ Fix 1+2: router 제거, app 단일화 / /api/chat 중복 제거
// ✅ Fix 4: contextString 을 이 핸들러 안에서 생성 (올바른 스코프)
// ==========================================================================
app.post("/api/chat", async (req, res) => {
  const { message, step } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: "메시지가 필요합니다." });
  }

  if (!groq) {
    return res.status(500).json({ success: false, message: "GROQ_API_KEY가 설정되지 않았습니다." });
  }

  try {
    // 콘텐츠 타입 분류
    let contentType = "";
    if (message.includes("맛집") || message.includes("식당")) contentType = CONTENT_TYPE.RESTAURANT;
    if (message.includes("축제") || message.includes("행사")) contentType = CONTENT_TYPE.FESTIVAL;
    if (message.includes("숙소") || message.includes("호텔")) contentType = CONTENT_TYPE.ACCOMMODATION;

    // Tour API 조회
    const tourData = await fetchTourData(message, contentType);

    // ✅ Fix 4: contextString 을 이 핸들러 스코프 안에서 생성
    let contextString = "검색된 실시간 관광 정보가 없습니다.";
    if (tourData.length > 0) {
      contextString = tourData
        .map(
          (data, idx) =>
            `[관광지 ${idx + 1}] 명칭: ${data.title}, 주소: ${data.address}, 전화번호: ${data.tel}`
        )
        .join("\n");
    }

    // GROQ 호출
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `당신은 대한민국 국내 여행 전문 가이드 챗봇입니다.
사용자의 질문에 답변할 때, 아래 제공되는 [공공데이터 자료]를 '최우선 변수'로 삼아 답변을 구성하세요.

[공공데이터 자료]
${contextString}

[🔥 답변 규칙 🔥]
1. 반드시 한국어로만 자연스럽게 대화하듯 답변하세요.
2. [공공데이터 자료]에 있는 명칭과 주소를 정확히 인용하고, 절대 임의로 주소를 지어내지 마세요.
3. 한자나 태국어 등 이상한 외국어/유니코드는 절대 출력하지 마세요.
4. 자료가 비어있다면 "죄송합니다, 해당 지역의 정확한 정보를 찾지 못했습니다."라고 답변하세요.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.2,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    let rawReply =
      chatCompletion.choices[0]?.message?.content || "답변을 생성하지 못했습니다.";

    // 유니코드 오염 방어 필터링
    let safeReply = rawReply.replace(/[\u4E00-\u9FFF\u0E00-\u0E7F]/g, "");

    res.json({
      reply: safeReply,
      step: (step ?? 0) + 1,
      rawTourData: tourData,
    });
  } catch (error) {
    console.error("채팅 오류:", error);
    res.status(500).json({ reply: "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
  }
});

// ==========================================================================
// 📋 여행 이력 API
// ==========================================================================
app.get("/api/history", async (req, res) => {
  try {
    const dummyHistory = [
      { id: 1, title: "대구 치맥 페스티벌", date: "2025-07-05", region: "대구" },
    ];
    res.json({ success: true, data: dummyHistory });
  } catch (error) {
    console.error("이력 조회 에러:", error.message);
    res.status(500).json({ success: false, message: "이력을 가져오지 못했습니다." });
  }
});

app.post("/api/history", async (req, res) => {
  const { title, date } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: "여행지 이름이 필요합니다." });
  }
  try {
    console.log(`✅ [이력 추가 요청 수신] 여행지: ${title}, 날짜: ${date}`);
    res.json({ success: true, message: "여행 이력이 성공적으로 추가되었습니다!" });
  } catch (error) {
    console.error("이력 추가 에러:", error.message);
    res.status(500).json({ success: false, message: "이력 추가에 실패했습니다." });
  }
});

// ==========================================================================
// 🔖 보관함(스크랩) API
// ==========================================================================
app.get("/api/saved", async (req, res) => {
  try {
    const dummySaved = [{ id: 1, title: "제주도 감귤 체험", date: "2026-10-12" }];
    res.json({ success: true, data: dummySaved });
  } catch (error) {
    console.error("보관함 조회 에러:", error.message);
    res.status(500).json({ success: false, message: "보관함 목록을 가져오지 못했습니다." });
  }
});

app.post("/api/saved", async (req, res) => {
  const { title, region, date } = req.body;
  const userId = req.headers["user-id"];

  if (!supabase) {
    return res.status(500).json({ success: false, message: "Supabase 환경변수가 설정되지 않았습니다." });
  }
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
// 🗺️ 추천 및 이미지 API
// ==========================================================================
app.get("/api/recommendation", (req, res) => {
  const regions = ["서산", "부산", "제주도"];
  res.json({
    success: true,
    region: regions[Math.floor(Math.random() * regions.length)],
  });
});

app.get("/api/planner-photo", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(req.query.keyword)}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
    );
    res.json({
      success: true,
      imageUrl: `${response.data.urls.raw}&w=399&h=224&fit=crop`,
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ✅ Fix 5: module.exports 제거, app.listen 은 항상 마지막에
app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 작동 중입니다.`);
});