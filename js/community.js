// community.js
(function () {
  let supabaseClient = null;

  // 환경변수 로드 우선순위:
  // 1) server.js가 제공하는 /config.js (window.SUPABASE_URL 등)
  // 2) .env 파일 직접 fetch (로컬 개발 환경)
  // 3) 하드코딩 fallback
  async function loadEnv() {
    // 1) server.js /config.js 가 window에 이미 주입한 경우
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      return {
        SUPABASE_URL: window.SUPABASE_URL,
        SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY,
      };
    }

    // 2) .env 파일 fetch 시도 (로컬 개발 전용)
    try {
      const response = await fetch(".env");
      if (!response.ok) throw new Error("Failed to fetch .env");
      const text = await response.text();
      const env = {};
      text.split("\n").forEach((line) => {
        const parts = line.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts
            .slice(1)
            .join("=")
            .trim()
            .replace(/^['"]|['"]$/g, "");
          env[key] = value;
        }
      });
      if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) return env;
      throw new Error(".env에 필요한 키가 없습니다.");
    } catch (e) {
      // 3) 하드코딩 fallback
      console.warn("Using local fallback config for Supabase:", e);
      return {
        SUPABASE_URL: "https://sojcpuqpgxwzbntddqky.supabase.co",
        SUPABASE_ANON_KEY: "sb_publishable_43B2szllehr5fAD5C72cgw_gLAON3Vs",
      };
    }
  }

  // Initialize Auth & Supabase Client
  window.initAuth = async function () {
    if (supabaseClient) return supabaseClient;

    const env = await loadEnv();
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
      );
      window.supabaseClient = supabaseClient;
      await handleAuthState();

      // supabaseClient 준비 완료를 다른 스크립트에 알림
      window.dispatchEvent(
        new CustomEvent("supabase-ready", {
          detail: { client: supabaseClient },
        }),
      );
    } else {
      console.error(
        'Supabase library is not loaded. Please include: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
      );
    }
    return supabaseClient;
  };

  // Handle page-specific UI rendering and authentication logic
  async function handleAuthState() {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    const user = session ? session.user : null;
    updateNavigation(user);

    // Page-specific behaviors
    const pathname = window.location.pathname;
    if (pathname.includes("mypage.html")) {
      if (!user) {
        alert("로그인이 필요한 페이지입니다. 로그인 페이지로 이동합니다.");
        window.location.href = "login.html";
      } else {
        // mypage.html의 스크립트에 유저 정보 전달
        window.dispatchEvent(
          new CustomEvent("mypage-ready", { detail: { user } }),
        );
      }
    }
  }

  // Dynamically update navbar options based on user log in state
  function updateNavigation(user) {
    const navRight = document.querySelector(".nav-right");
    if (!navRight) return;

    // 새 구조: #nav-guest / #nav-user 가 있는 페이지
    const guestNav = document.getElementById("nav-guest");
    const userNav = document.getElementById("nav-user");

    if (guestNav && userNav) {
      if (user) {
        guestNav.style.display = "none";
        userNav.style.display = "flex";
        userNav.style.alignItems = "center";
        userNav.style.gap = "15px";
        // 이메일 대신 마이페이지 로고만 보이도록 이메일 텍스트 숨김
        const emailDisplay = document.getElementById("user-email-display");
        if (emailDisplay) emailDisplay.style.display = "none";
      } else {
        guestNav.style.display = "flex";
        guestNav.style.alignItems = "center";
        guestNav.style.gap = "15px";
        userNav.style.display = "none";
      }
      // 로그아웃 버튼 이벤트 연결
      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await logout();
        });
      }
      return;
    }

    // 기존 구조 fallback: #nav-guest/#nav-user 가 없는 페이지
    if (user) {
      navRight.innerHTML = `
        <a href="mypage.html" class="nav-icon-link">
          <img src="icons/mypage-icon.png" alt="마이페이지" class="nav-mypage-img" />
        </a>
        <a href="#" id="logout-btn" class="nav-btn-outline">로그아웃</a>
      `;
      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await logout();
        });
      }
    } else {
      navRight.innerHTML = `
        <a href="login.html" class="nav-btn-outline">로그인</a>
        <a href="signup.html" class="nav-btn-outline">회원가입</a>
      `;
    }
  }

  // Handle Logout flow
  async function logout() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
      alert("로그아웃 되었습니다.");
      window.location.href = "index.html";
    }
  }

  // Auto-run when DOM content has loaded
  document.addEventListener("DOMContentLoaded", () => {
    window.initAuth();
  });
})();
