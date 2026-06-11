// js/map_main.js
import {
  fetchFestivals,
  fetchMyBookmarks,
  addBookmark,
  removeBookmark,
} from "./map_api.js";
import {
  initMap,
  renderMarkers,
  panToFestival,
  closeOverlay,
  searchPlaces,
  clearPlaceMarkers,
  panToPlace,
} from "./map_kakao.js";
import {
  renderList,
  setActiveCard,
  scrollToCard,
  renderSearchResults,
} from "./map_ui.js";

const state = {
  period: "ongoing",
  areaCode: "",
  category: "",
  dateFrom: "",
  dateTo: "",
};

let allFestivals = [];
let myBookmarks = new Set(); // 내 즐겨찾기 festival_id 목록

async function load() {
  showLoading(true);
  try {
    [allFestivals] = await Promise.all([
      fetchFestivals(state),
      loadBookmarks(),
    ]);

    const sorted = [
      ...allFestivals.filter((f) => myBookmarks.has(f.id)),
      ...allFestivals.filter((f) => !myBookmarks.has(f.id)),
    ];

    renderMarkers(sorted, onMarkerClick);
    renderList(sorted, onCardClick, myBookmarks, onBookmarkToggle);
  } catch (err) {
    console.error("축제 데이터 로드 실패:", err);
    showError();
  } finally {
    showLoading(false);
  }
}

async function loadBookmarks() {
  try {
    const ids = await fetchMyBookmarks();
    myBookmarks = new Set(ids);
  } catch {
    myBookmarks = new Set();
  }
}

function onMarkerClick(festival) {
  setActiveCard(festival.id);
  scrollToCard(festival.id);
  if (window.innerWidth <= 768) switchTab("list");
}

function onCardClick(festival) {
  panToFestival(festival);
  if (window.innerWidth <= 768) switchTab("map");
}

async function onBookmarkToggle(festivalId, btn) {
  const isBookmarked = myBookmarks.has(festivalId);

  if (isBookmarked) {
    const { error } = await removeBookmark(festivalId);
    if (!error) {
      myBookmarks.delete(festivalId);
      btn.textContent = "♡";
      btn.classList.remove("bookmarked");
    }
  } else {
    const { error } = await addBookmark(festivalId);
    if (error === "login_required") {
      alert("로그인 후 이용할 수 있습니다.");
      return;
    }
    if (!error) {
      myBookmarks.add(festivalId);
      btn.textContent = "♥";
      btn.classList.add("bookmarked");
    }
  }
}

// ===== 검색 =====
document.getElementById("map-search-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});
document
  .getElementById("map-search-btn")
  .addEventListener("click", handleSearch);

function handleSearch() {
  const keyword = document.getElementById("map-search-input").value.trim();
  if (!keyword) return;

  const lower = keyword.toLowerCase();
  const matchedFestivals = allFestivals.filter(
    (f) =>
      f.title.toLowerCase().includes(lower) ||
      (f.addr && f.addr.toLowerCase().includes(lower)),
  );

  searchPlaces(keyword, (places) => {
    renderSearchResults(
      matchedFestivals,
      places,
      keyword,
      (festival) => {
        panToFestival(festival);
        setActiveCard(festival.id);
        scrollToCard(festival.id);
        if (window.innerWidth <= 768) switchTab("map");
      },
      (place) => {
        panToPlace(place);
        if (window.innerWidth <= 768) switchTab("map");
      },
    );
  });
}

// ===== 필터 이벤트 =====
document.getElementById("filter-area").addEventListener("change", (e) => {
  state.areaCode = e.target.value;
  resetSearchUI();
  load();
});

document.getElementById("filter-period").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document
    .querySelectorAll("#filter-period .chip")
    .forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  state.period = chip.dataset.value;

  const dateRange = document.getElementById("filter-date-range");
  if (state.period === "custom") {
    dateRange.classList.remove("hidden");
  } else {
    dateRange.classList.add("hidden");
    state.dateFrom = "";
    state.dateTo = "";
    resetSearchUI();
    load();
  }
});

document.getElementById("filter-date-from").addEventListener("change", (e) => {
  state.dateFrom = e.target.value;
  if (state.dateFrom && state.dateTo) {
    resetSearchUI();
    load();
  }
});

document.getElementById("filter-date-to").addEventListener("change", (e) => {
  state.dateTo = e.target.value;
  if (state.dateFrom && state.dateTo) {
    resetSearchUI();
    load();
  }
});

document.getElementById("filter-category").addEventListener("change", (e) => {
  state.category = e.target.value;
  resetSearchUI();
  load();
});

// ===== 모바일 탭 =====
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  const main = document.querySelector(".main-content");
  const tabs = document.querySelectorAll(".tab-btn");
  main.classList.toggle("show-list", tab === "list");
  tabs.forEach((b) => {
    const isActive = b.dataset.tab === tab;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", isActive);
  });
}

function resetSearchUI() {
  clearPlaceMarkers();
  document.getElementById("search-result-panel").classList.add("hidden");
}

function showLoading(on) {
  document.getElementById("map-loading").classList.toggle("hidden", !on);
}

function showError() {
  const list = document.getElementById("festival-list");
  list.innerHTML = `
    <li style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">
      데이터를 불러오지 못했습니다.<br>잠시 후 다시 시도해주세요.
    </li>`;
}

(async () => {
  await initMap();
  await load();
})();
