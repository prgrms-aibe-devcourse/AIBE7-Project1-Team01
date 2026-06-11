require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseUrl = process.env.SUPABASE_URL || "";

const htmlDir = path.join(__dirname, "html");
const cssDir = path.join(__dirname, "css");
const jsDir = path.join(__dirname, "js");
const iconsDir = path.join(__dirname, "icons");
const assetDir = path.join(__dirname, "asset");

app.get("/config.js", (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  res.type("application/javascript").send(
    `window.SUPABASE_URL=${JSON.stringify(supabaseUrl)};window.SUPABASE_ANON_KEY=${JSON.stringify(
      supabaseAnonKey
    )};`
  );
});

app.use(express.static(htmlDir));
app.use("/css", express.static(cssDir));
app.use("/js", express.static(jsDir));
app.use("/icons", express.static(iconsDir));
app.use("/asset", express.static(assetDir));
app.use(express.json());

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

    // 2) Service Role Key 확인
    if (!supabaseServiceRoleKey || !supabaseUrl) {
      console.error("SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_URL 환경변수가 설정되지 않았습니다.");
      return res.status(500).json({ message: "서버 설정 오류: 관리자에게 문의하세요." });
    }

    // 3) 액세스 토큰으로 현재 유저 정보 조회 (본인 확인)
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "apikey": supabaseServiceRoleKey,
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!userRes.ok) {
      return res.status(401).json({ message: "유효하지 않은 세션입니다. 다시 로그인해주세요." });
    }

    const userData = await userRes.json();
    const userId = userData?.id;

    if (!userId) {
      return res.status(400).json({ message: "유저 정보를 확인할 수 없습니다." });
    }

    // 4) Admin API로 유저 삭제
    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        "apikey": supabaseServiceRoleKey,
        "Authorization": `Bearer ${supabaseServiceRoleKey}`,
      },
    });

    if (!deleteRes.ok) {
      const errBody = await deleteRes.text().catch(() => "");
      console.error("Supabase 유저 삭제 실패:", deleteRes.status, errBody);
      return res.status(500).json({ message: "회원탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요." });
    }

    console.log(`회원탈퇴 완료: userId=${userId}`);
    return res.json({ message: "회원탈퇴가 완료되었습니다." });

  } catch (error) {
    console.error("delete-account error:", error);
    return res.status(500).json({ message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
  }
});

app.listen(port, () => {
  console.log(`MOTIPE server listening on port ${port}`);
});
