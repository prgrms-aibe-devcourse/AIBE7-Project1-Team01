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
  period: "all",
  areaCode: "",
  category: "",
  dateFrom: "",
  dateTo: "",
};

let allFestivals = [];
let myBookmarks = new Set();

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

// ===== 거리 계산 (Haversine 공식, 단위: km) =====
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

        // 선택한 장소 반경 20km 이내 축제 필터링
        const nearby = allFestivals.filter((f) => {
          if (!f.lat || !f.lng) return false;
          return (
            getDistance(
              parseFloat(place.y),
              parseFloat(place.x),
              f.lat,
              f.lng,
            ) <= 20
          );
        });

        // 리스트 상단에 "주변 축제" 표시
        updateListSubtitle(
          `📍 ${place.place_name} 주변 축제 (${nearby.length}개)`,
        );
        renderList(nearby, onCardClick, myBookmarks, onBookmarkToggle);

        if (window.innerWidth <= 768) switchTab("map");
      },
    );
  });
}

// 필터 뱃지 업데이트 함수 추가
function updateFilterBadge() {
  const btn = document.getElementById("map-filter-btn");
  let count = 0;
  if (state.areaCode) count++;
  if (state.period !== "all") count++;

  if (count > 0) {
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="4" y1="6" x2="20" y2="6"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
        <line x1="11" y1="18" x2="13" y2="18"/>
      </svg>
      필터 <span class="filter-badge">${count}</span>`;
  } else {
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="4" y1="6" x2="20" y2="6"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
        <line x1="11" y1="18" x2="13" y2="18"/>
      </svg>
      필터`;
  }
}

function updateListSubtitle(text) {
  const el = document.getElementById("list-subtitle");
  if (el) el.textContent = text;
}

// ===== 필터 버튼 토글 =====
document.getElementById("map-filter-btn").addEventListener("click", () => {
  const panel = document.getElementById("map-filter-panel");
  const btn = document.getElementById("map-filter-btn");
  const isHidden = panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !isHidden);
  btn.classList.toggle("active", isHidden);
});

// ===== 필터 이벤트 =====
document.getElementById("filter-area").addEventListener("change", (e) => {
  state.areaCode = e.target.value;
  resetSearchUI();
  load();
  updateFilterBadge();
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
    updateFilterBadge();
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
