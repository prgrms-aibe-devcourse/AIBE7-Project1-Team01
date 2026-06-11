const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// 환경 변수 로드 확인
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌ 오류: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 .env 파일에 설정되지 않았습니다.",
  );
  console.log("현재 로드된 URL:", process.env.SUPABASE_URL ? "있음" : "없음");
  process.exit(1); // 서버 실행 중단
}

// 관리자 권한 Supabase 클라이언트 (회원 삭제용)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

app.use(express.json());

// HTML에서 참조하는 /config.js 경로에 환경 변수 주입
app.get("/config.js", (req, res) => {
  res.type("application/javascript");
  res.send(`
    window.SUPABASE_URL = "${process.env.SUPABASE_URL || ""}";
    window.SUPABASE_ANON_KEY = "${process.env.SUPABASE_ANON_KEY || ""}";
    window.KAKAO_MAP_KEY = "${process.env.KAKAO_MAP_KEY || ""}";
  `);
});

// 회원 탈퇴 API: 유저 정보 및 작성 게시글 전체 삭제
app.delete("/api/delete-account", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "인증이 필요합니다." });

  const token = authHeader.split(" ")[1];

  try {
    // 1. 토큰으로 유저 확인 (보안 검사)
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("유효하지 않은 토큰입니다.");

    const userId = user.id;

    // 2. 유저가 작성한 게시글 삭제 (posts 테이블)
    const { error: postError } = await supabaseAdmin
      .from("posts")
      .delete()
      .eq("user_id", userId);

    if (postError) console.error("게시글 삭제 중 오류:", postError);

    // 3. Auth 유저 삭제
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    res.json({ message: "계정 및 모든 데이터가 성공적으로 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 정적 파일 서비스 (현재 폴더의 모든 파일 서빙)
app.use(express.static(__dirname));

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 시작되었습니다: http://localhost:${PORT}`);
  console.log(`메인 화면 주소: http://localhost:${PORT}/html/index.html`);
});
