// community-post.js
// Supabase posts 테이블 연동: 글 작성 / 조회 / 삭제 / 이미지 업로드
// 의존: community.js (window.supabaseClient), Supabase Storage bucket "post-images"

(function () {
  "use strict";

  // ============================================================
  // 상수
  // ============================================================
  const STORAGE_BUCKET = "post-images"; // Supabase Storage 버킷 이름
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  // ============================================================
  // Supabase 클라이언트 헬퍼
  // ============================================================
  function getClient() {
    const client = window.supabaseClient;
    if (!client) throw new Error("supabaseClient가 초기화되지 않았습니다.");
    return client;
  }

  // ============================================================
  // 이미지 업로드 (Supabase Storage)
  // ============================================================

  /**
   * 이미지 파일을 Storage에 업로드하고 공개 URL을 반환합니다.
   * @param {File} file
   * @param {string} userId
   * @returns {Promise<string|null>} 공개 URL 또는 null
   */
  async function uploadImage(file, userId) {
    if (!file) return null;

    // MIME 타입 검증
    if (!ALLOWED_MIME.includes(file.type)) {
      throw new Error("JPG, PNG, GIF, WEBP 형식의 이미지만 등록 가능합니다.");
    }

    // 크기 검증
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("이미지 파일은 5MB 이하만 등록 가능합니다.");
    }

    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;

    const client = getClient();
    const { error } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) throw new Error("이미지 업로드 실패: " + error.message);

    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  // ============================================================
  // 게시글 CRUD
  // ============================================================

  /**
   * posts 테이블에서 글 목록을 최신순으로 가져옵니다.
   * @param {string|null} category  필터링할 카테고리 (null 이면 전체)
   * @returns {Promise<Array>}
   */
  async function fetchPosts(category = null) {
    const client = getClient();
    let query = client
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (category && category !== "전체") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) throw new Error("게시글 불러오기 실패: " + error.message);
    return data || [];
  }

  /**
   * posts 테이블에 새 글을 삽입합니다.
   * @param {{ category:string, title:string, content:string, author:string, userId:string, imageFile:File|null }} params
   * @returns {Promise<object>} 삽입된 row
   */
  async function createPost({ category, title, content, author, userId, imageFile }) {
    // 이미지 먼저 업로드
    let imageUrl = null;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile, userId);
    }

    const client = getClient();
    const { data, error } = await client
      .from("posts")
      .insert({
        user_id: userId,
        category,
        title,
        content,
        author,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error) throw new Error("게시글 등록 실패: " + error.message);
    return data;
  }

  /**
   * posts 테이블에서 글을 삭제합니다 (RLS: 본인 글만 가능).
   * @param {string} postId  UUID
   * @returns {Promise<void>}
   */
  async function deletePost(postId) {
    const client = getClient();
    const { error } = await client.from("posts").delete().eq("id", postId);
    if (error) throw new Error("게시글 삭제 실패: " + error.message);
  }

  // ============================================================
  // UI 헬퍼
  // ============================================================

  /** XSS 방지용 HTML 이스케이프 */
  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text ?? "";
    return d.innerHTML;
  }

  /** 카테고리 → 뱃지 클래스 */
  function categoryClass(category) {
    return { "여행 리뷰": "review", "여행 꿀팁": "tip", "질문 하기": "question" }[category] ?? "";
  }

  /** 카테고리 → 기본 이미지 URL (이미지 없는 default 글용) */
  function defaultCategoryImage(category) {
    const map = {
      "여행 리뷰": "https://6a276ea0b82917fdef05cb59.imgix.net/image-1.webp?w=1200&h=800",
      "여행 꿀팁": "https://6a276ea0b82917fdef05cb59.imgix.net/yjp009-west-sea-7860536_1920.jpg?w=1920&h=1080",
    };
    return map[category] ?? null;
  }

  /** timestamp → "YYYY.MM.DD" */
  function formatDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  }

  /** 토스트 알림 표시 */
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
  }

  // ============================================================
  // 이미지 미리보기 (모달 내부)
  // ============================================================

  function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      showToast("⚠️ 이미지 파일은 5MB 이하만 등록 가능합니다.");
      event.target.value = "";
      return;
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      showToast("⚠️ JPG, PNG, GIF, WEBP 형식만 등록 가능합니다.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgEl = document.getElementById("imagePreview");
      const placeholder = document.getElementById("imagePlaceholder");
      const previewWrap = document.getElementById("imagePreviewWrap");
      if (imgEl) imgEl.src = e.target.result;
      if (placeholder) placeholder.style.display = "none";
      if (previewWrap) previewWrap.style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  function removeImage(event) {
    if (event) event.stopPropagation();
    const fileInput = document.getElementById("postImage");
    if (fileInput) fileInput.value = "";
    const imgEl = document.getElementById("imagePreview");
    if (imgEl) imgEl.src = "";
    const placeholder = document.getElementById("imagePlaceholder");
    if (placeholder) placeholder.style.display = "flex";
    const previewWrap = document.getElementById("imagePreviewWrap");
    if (previewWrap) previewWrap.style.display = "none";
  }

  // ============================================================
  // 모달 열기 / 닫기
  // ============================================================

  async function openWriteModal() {
    if (!window.supabaseClient) {
      showToast("⚠️ 로그인이 필요합니다.");
      setTimeout(() => { window.location.href = "login.html"; }, 1200);
      return;
    }
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session?.user) {
      showToast("⚠️ 로그인 후 글을 작성할 수 있습니다.");
      setTimeout(() => { window.location.href = "login.html"; }, 1200);
      return;
    }

    // 작성자 자동 입력
    const authorEl = document.getElementById("postAuthor");
    if (authorEl) {
      authorEl.value =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email.split("@")[0];
    }

    document.getElementById("writeModal").style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeWriteModal() {
    document.getElementById("writeModal").style.display = "none";
    document.body.style.overflow = "auto";
    document.getElementById("postTitle").value = "";
    document.getElementById("postContent").value = "";
    document.getElementById("postAuthor").value = "";
    document.getElementById("postCategory").selectedIndex = 0;
    removeImage();
  }

  // ============================================================
  // 게시글 등록 (submitPost)
  // ============================================================

  async function submitPost() {
    if (!window.supabaseClient) {
      showToast("⚠️ 로그인이 필요합니다.");
      return;
    }
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session?.user) {
      showToast("⚠️ 로그인 후 글을 작성할 수 있습니다.");
      return;
    }

    const category = document.getElementById("postCategory").value;
    const title = document.getElementById("postTitle").value.trim();
    const content = document.getElementById("postContent").value.trim();
    const author = document.getElementById("postAuthor").value.trim();
    const fileInput = document.getElementById("postImage");
    const imageFile = fileInput?.files?.[0] ?? null;

    // 유효성 검사
    if (!title) { showToast("⚠️ 제목을 입력해주세요."); return; }
    if (!content) { showToast("⚠️ 내용을 입력해주세요."); return; }

    // 버튼 비활성화 (중복 제출 방지)
    const submitBtn = document.querySelector('#writeModal .cta-button[onclick*="submitPost"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "등록 중...";
    }

    try {
      await createPost({
        category,
        title,
        content,
        author: author || session.user.email.split("@")[0],
        userId: session.user.id,
        imageFile,
      });

      closeWriteModal();
      await renderPosts(); // 목록 새로고침
      showToast("✅ 게시글이 등록되었습니다!");
    } catch (err) {
      console.error(err);
      showToast("❌ " + (err.message || "등록 중 오류가 발생했습니다."));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "등록하기";
      }
    }
  }

  // ============================================================
  // 게시글 삭제
  // ============================================================

  let _deleteTargetId = null;

  function requestDelete(postId) {
    _deleteTargetId = postId;
    document.getElementById("confirmModal").style.display = "flex";
  }

  function closeConfirm() {
    _deleteTargetId = null;
    document.getElementById("confirmModal").style.display = "none";
  }

  async function confirmDelete() {
    if (!_deleteTargetId) return;
    try {
      await deletePost(_deleteTargetId);
      closeConfirm();
      await renderPosts();
      showToast("🗑️ 게시글이 삭제되었습니다.");
    } catch (err) {
      console.error(err);
      showToast("❌ " + (err.message || "삭제 중 오류가 발생했습니다."));
    }
  }

  // ============================================================
  // 렌더링
  // ============================================================

  let _currentFilter = "전체";
  let _currentUserId = null;

  async function renderPosts() {
    const grid = document.getElementById("postGrid");
    if (!grid) return;

    grid.innerHTML = '<div class="empty-message">⏳ 데이터를 불러오는 중입니다...</div>';

    try {
      // 현재 유저 ID 갱신
      if (window.supabaseClient) {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        _currentUserId = session?.user?.id ?? null;
      }

      const posts = await fetchPosts(_currentFilter);

      if (posts.length === 0) {
        grid.innerHTML = '<div class="empty-message">📝 아직 게시글이 없습니다. 첫 번째 글을 작성해보세요!</div>';
        return;
      }

      grid.innerHTML = posts.map((post) => buildPostCard(post)).join("");

      // 댓글 작성자 필드 자동 입력
      if (_currentUserId && window.supabaseClient) {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
          const displayName =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email.split("@")[0];
          document.querySelectorAll('[id^="cAuthor-"]').forEach((el) => {
            el.value = displayName;
          });
        }
      }
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<div class="empty-message">⚠️ 게시글을 불러오지 못했습니다.</div>';
    }
  }

  function buildPostCard(post) {
    const canDelete = _currentUserId && post.user_id === _currentUserId;
    const imageUrl = post.image_url || defaultCategoryImage(post.category);
    const dateStr = formatDate(post.created_at);

    return `
      <article class="post-card" data-category="${escapeHtml(post.category)}">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="포스트 이미지" class="post-image" onerror="this.style.display='none'" />` : ""}
        <div class="post-content">
          <div class="post-meta">
            <span class="category-badge ${categoryClass(post.category)}">${escapeHtml(post.category)}</span>
          </div>
          <h3>${escapeHtml(post.title)}</h3>
          <p>${escapeHtml(post.content)}</p>
          <div class="post-meta" style="margin-top:15px;border-top:1px solid var(--bg-warm);padding-top:10px;">
            <span>작성자: ${escapeHtml(post.author)}</span>
            <span>${dateStr}</span>
          </div>
          ${canDelete ? `<button class="delete-btn" onclick="requestDelete('${post.id}')">🗑️ 삭제</button>` : ""}
        </div>
      </article>
    `;
  }

  // ============================================================
  // 필터링
  // ============================================================

  function filterPosts(category, btn) {
    _currentFilter = category;
    document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderPosts();
  }

  // ============================================================
  // 전역 노출 (HTML의 onclick에서 호출)
  // ============================================================
  window.openWriteModal  = openWriteModal;
  window.closeWriteModal = closeWriteModal;
  window.submitPost      = submitPost;
  window.previewImage    = previewImage;
  window.removeImage     = removeImage;
  window.requestDelete   = requestDelete;
  window.closeConfirm    = closeConfirm;
  window.confirmDelete   = confirmDelete;
  window.filterPosts     = filterPosts;
  window.renderPosts     = renderPosts;

  // ============================================================
  // 초기화
  // supabaseClient는 community.js의 initAuth()가 끝난 뒤에야 사용 가능.
  // 'supabase-ready' 커스텀 이벤트를 기다렸다가 renderPosts 실행.
  // 이미 준비된 경우(이벤트를 놓친 경우)를 위해 폴링 fallback도 포함.
  // ============================================================
  function initCommunityPost() {
    if (window.supabaseClient) {
      // 이미 준비된 경우 바로 실행
      renderPosts();
      return;
    }

    // supabase-ready 이벤트 대기
    window.addEventListener('supabase-ready', () => {
      renderPosts();
    }, { once: true });

    // 혹시 이벤트를 놓쳤을 때를 위한 fallback (최대 5초, 100ms 간격 폴링)
    let attempts = 0;
    const fallback = setInterval(() => {
      attempts++;
      if (window.supabaseClient) {
        clearInterval(fallback);
        renderPosts();
      } else if (attempts >= 50) {
        clearInterval(fallback);
        console.error('Supabase 초기화 타임아웃: community-post.js');
        const grid = document.getElementById("postGrid");
        if (grid) grid.innerHTML = '<div class="empty-message">⚠️ 서버 연결에 실패했습니다. 새로고침 해주세요.</div>';
      }
    }, 100);
  }

  document.addEventListener("DOMContentLoaded", initCommunityPost);
})();
