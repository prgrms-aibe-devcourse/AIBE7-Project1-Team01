// community.js
(function () {
  let supabaseClient = null;

  // 환경변수 로드: server.js가 제공하는 /config.js 를 통해 주입된 값 사용
  async function loadEnv() {
    // /config.js 가 window에 주입한 값 사용
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      return {
        SUPABASE_URL: window.SUPABASE_URL,
        SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY
      };
    }

    // /config.js 가 아직 로드되지 않았다면 동적으로 가져오기 시도
    try {
      const response = await fetch('/config.js');
      if (!response.ok) throw new Error('config.js 로드 실패');
      const script = await response.text();
      const fn = new Function(script);
      fn();
      if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        return {
          SUPABASE_URL: window.SUPABASE_URL,
          SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY
        };
      }
    } catch (e) {
      console.error('Supabase 설정을 로드할 수 없습니다. 서버(node server.js)를 통해 접속해주세요.', e);
    }

    throw new Error('Supabase 환경변수가 설정되지 않았습니다. /config.js를 확인하세요.');
  }

  // Initialize Auth & Supabase Client
  window.initAuth = async function () {
    const env = await loadEnv();

    if (supabaseClient) {
      await handleAuthState();
      return supabaseClient;
    }

    if (window.supabase) {
      supabaseClient = window.supabase.createClient(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
      );
      window.supabaseClient = supabaseClient;
      await handleAuthState();

      // supabaseClient 준비 완료를 다른 스크립트에 알림
      window.dispatchEvent(new CustomEvent('supabase-ready', { detail: { client: supabaseClient } }));
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
      // 로그아웃 버튼 이벤트 중복 방지 처리
      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn && !logoutBtn.dataset.listenerAttached) {
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await logout();
        });
        logoutBtn.dataset.listenerAttached = "true";
      }
      return;
    }

    // 기존 구조 fallback: #nav-guest/#nav-user 가 없는 페이지
    if (user) {
      navRight.innerHTML = `
        <a href="mypage.html" class="nav-icon-link">
          <img src="../icons/mypage-icon.png" alt="마이페이지" class="nav-mypage-img" />
        </a>
        <a href="#" id="logout-btn" class="nav-btn-outline">로그아웃</a>
      `;
      const logoutBtn = document.getElementById("logout-btn");
      // 기존 구조 fallback에서도 이벤트 중복 등록 방지
      if (logoutBtn && !logoutBtn.dataset.listenerAttached) {
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await logout();
        });
        logoutBtn.dataset.listenerAttached = "true";
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
      alert('로그아웃 되었습니다.');
      window.location.href = 'index.html';
    }
  }

  // Auto-run when DOM content has loaded
  document.addEventListener("DOMContentLoaded", () => {
    window.initAuth();
  });
})();
