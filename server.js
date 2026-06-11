require("dotenv").config();

const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = process.env.PORT || 3000;
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseUrl = process.env.SUPABASE_URL || "";

// 관리자 권한 Supabase 클라이언트 (회원 삭제용)
const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

const htmlDir = path.join(__dirname, "html");
const cssDir = path.join(__dirname, "css");
const jsDir = path.join(__dirname, "js");
const iconsDir = path.join(__dirname, "icons");
const assetDir = path.join(__dirname, "asset");

app.get("/config.js", (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  const kakaoMapKey = process.env.KAKAO_MAP_KEY || "";

  res.type("application/javascript").send(
    `window.SUPABASE_URL=${JSON.stringify(supabaseUrl)};window.SUPABASE_ANON_KEY=${JSON.stringify(
      supabaseAnonKey
    )};window.KAKAO_MAP_KEY=${JSON.stringify(kakaoMapKey)};`
  );
});

app.use(express.static(htmlDir));
app.use("/css", express.static(cssDir));
app.use("/js", express.static(jsDir));
app.use("/icons", express.static(iconsDir));
app.use("/asset", express.static(assetDir));
app.use(express.json());

// ===== Motipe_bot 통합 마운트 =====
// 별도 포트(3001) 대신 같은 서버의 /bot 경로로 서빙한다.
// 봇의 정적 파일(public/index.html 등) → /bot/
// 봇의 API(/api/chat 등)             → /bot/api/*
// app.js의 fetch는 상대경로(api/...)라 /bot/ 기준으로 정확히 해석된다.
const motipeBotApp = require("./Motipe_bot/server.js");
app.use("/bot", motipeBotApp);

app.get("/", (req, res) => {
  res.sendFile(path.join(htmlDir, "main.html"));
});

async function getFestivalData(region, date) {
  // 축제 API는 나중에 붙일 수 있도록 분리해 둔 자리입니다.
  return {
    items: [],
    note: "축제 데이터 API 연동 준비 중입니다.",
    region: region || "",
    date: date || "",
  };
}

function buildTravelPrompt(userMessage, festivalData) {
  return `
너는 한국 국내 여행 추천 챗봇이다.
사용자의 취향, 출발지, 여행 날짜, 분위기, 동행자, 이동 거리 선호를 바탕으로 국내 여행 지역을 추천한다.
가능하면 축제나 지역 행사도 함께 추천한다.
단, 실제 축제 데이터 API가 아직 연결되어 있지 않다면 축제명은 확정적으로 지어내지 말고,
"축제 일정은 공식 관광 사이트 또는 공공데이터 API 연동 후 확인이 필요합니다"라고 안내한다.
답변은 친절하고 짧게 하되, 추천 이유를 함께 설명한다.
사용자가 조건을 충분히 말하지 않았다면 바로 단정하지 말고 추가 질문을 해도 된다.

현재 확보된 축제 데이터:
${JSON.stringify(festivalData, null, 2)}

사용자 메시지:
${userMessage}

출력 형식:
{
  "reply": "AI가 생성한 여행 추천 답변"
}
`.trim();
}

async function callAITravelRecommendation(prompt) {
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`Gemini API 요청 실패: ${response.status} ${bodyText}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }

  const parsed = JSON.parse(text);
  return parsed.reply || "";
}

app.post("/api/travel-chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ message: "여행 취향을 입력해 주세요." });
    }

    const festivalData = await getFestivalData("", "");
    const prompt = buildTravelPrompt(message, festivalData);
    const reply = await callAITravelRecommendation(prompt);

    return res.json({ reply });
  } catch (error) {
    console.error("travel-chat error:", error);
    return res.status(500).json({
      message:
        error.message === "GEMINI_API_KEY가 설정되지 않았습니다."
          ? "AI API 키가 설정되지 않았습니다."
          : "추천을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    });
  }
});

// ===== 회원탈퇴 엔드포인트 =====
app.delete("/api/delete-account", async (req, res) => {
  try {
    // 1) Authorization 헤더에서 액세스 토큰 추출
    const authHeader = req.headers["authorization"] || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!accessToken) {
      return res.status(401).json({ message: "인증 토큰이 없습니다. 다시 로그인해주세요." });
    }

    // 2) Service Role Key 및 Supabase Admin 클라이언트 확인
    if (!supabaseAdmin) {
      console.error("SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_URL 환경변수가 설정되지 않았습니다.");
      return res.status(500).json({ message: "서버 설정 오류: 관리자에게 문의하세요." });
    }

    // 3) 액세스 토큰으로 현재 유저 정보 조회 (본인 확인)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return res.status(401).json({ message: "유효하지 않은 세션입니다. 다시 로그인해주세요." });
    }

    const userId = user.id;

    // 4) 유저가 작성한 게시글 삭제 (posts 테이블)
    const { error: postError } = await supabaseAdmin
      .from("posts")
      .delete()
      .eq("user_id", userId);

    if (postError) {
      console.error("게시글 삭제 중 오류:", postError);
    }

    // 5) Admin API로 유저 삭제
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Supabase 유저 삭제 실패:", deleteError);
      return res.status(500).json({ message: "회원탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요." });
    }

    console.log(`회원탈퇴 완료: userId=${userId}`);
    return res.json({ message: "계정 및 모든 데이터가 성공적으로 삭제되었습니다." });

  } catch (error) {
    console.error("delete-account error:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
  }
});

app.listen(port, () => {
  console.log(`MOTIPE server listening on port ${port}`);
});