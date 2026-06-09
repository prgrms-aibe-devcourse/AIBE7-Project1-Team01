// auth.js
(function () {
  let supabaseClient = null;

  // Function to load and parse the .env file
  async function loadEnv() {
    try {
      const response = await fetch('.env');
      if (!response.ok) throw new Error('Failed to fetch .env');
      const text = await response.text();
      const env = {};
      text.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
          env[key] = value;
        }
      });
      return env;
    } catch (e) {
      console.warn('Using local fallback config for Supabase:', e);
      // Hardcoded fallback matching the .env variables
      return {
        SUPABASE_URL: "https://sojcpuqpgxwzbntddqky.supabase.co",
        SUPABASE_ANON_KEY: "sb_publishable_43B2szllehr5fAD5C72cgw_gLAON3Vs"
      };
    }
  }

  // Initialize Auth & Supabase Client
  window.initAuth = async function () {
    if (supabaseClient) return supabaseClient;
    
    const env = await loadEnv();
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
      window.supabaseClient = supabaseClient;
      await handleAuthState();
    } else {
      console.error('Supabase library is not loaded. Please include: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    }
    return supabaseClient;
  };

  // Handle page-specific UI rendering and authentication logic
  async function handleAuthState() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session ? session.user : null;
    updateNavigation(user);
    
    // Page-specific behaviors
    const pathname = window.location.pathname;
    if (pathname.includes('mypage.html')) {
      if (!user) {
        alert('로그인이 필요한 페이지입니다. 로그인 페이지로 이동합니다.');
        window.location.href = 'login.html';
      } else {
        // Update user email on mypage
        const emailEl = document.querySelector('.profile-info p');
        if (emailEl) {
          emailEl.textContent = user.email;
        }
        
        // Setup logout link in mypage's footer/account management section
        const logoutLinks = document.querySelectorAll('a');
        logoutLinks.forEach(link => {
          if (link.textContent.trim() === '로그아웃') {
            link.href = '#';
            link.addEventListener('click', async (e) => {
              e.preventDefault();
              await logout();
            });
          }
        });
      }
    }
  }

  // Dynamically update navbar options based on user log in state
  function updateNavigation(user) {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    if (user) {
      navRight.innerHTML = `
        <span class="nav-user-email" style="margin-right: 15px; font-size: 0.9rem; color: var(--text-light);">${user.email}님</span>
        <a href="#" id="logout-btn" class="nav-btn-outline" style="margin-right: 15px;">로그아웃</a>
        <a href="mypage.html" class="nav-icon-link">
          <img src="icons/mypage-icon.png" alt="마이페이지" class="nav-mypage-img" />
        </a>
      `;
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          await logout();
        });
      }
    } else {
      navRight.innerHTML = `
        <a href="login.html" class="nav-btn-outline">로그인</a>
        <a href="signup.html" class="nav-btn-outline">회원가입</a>
        <a href="mypage.html" class="nav-icon-link">
          <img src="icons/mypage-icon.png" alt="마이페이지" class="nav-mypage-img" />
        </a>
      `;
    }
  }

  // Handle Logout flow
  async function logout() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
      alert('로그아웃 되었습니다.');
      window.location.href = 'main.html';
    }
  }

  // Auto-run when DOM content has loaded
  document.addEventListener('DOMContentLoaded', () => {
    window.initAuth();
  });
})();
