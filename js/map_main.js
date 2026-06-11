// js/map_main.js
import { fetchFestivals } from "./map_api.js";
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
};

let allFestivals = [];

async function load() {
  showLoading(true);
  try {
    allFestivals = await fetchFestivals(state);
    renderMarkers(allFestivals, onMarkerClick);
    renderList(allFestivals, onCardClick);
  } catch (err) {
    console.error("축제 데이터 로드 실패:", err);
    showError();
  } finally {
    showLoading(false);
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

  // 1. 축제 검색 (로컬 필터링)
  const lower = keyword.toLowerCase();
  const matchedFestivals = allFestivals.filter(
    (f) =>
      f.title.toLowerCase().includes(lower) ||
      (f.addr && f.addr.toLowerCase().includes(lower)),
  );

  // 2. 장소 검색 (카카오 API)
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
  clearPlaceMarkers();
  document.getElementById("search-result-panel").classList.add("hidden");
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
  clearPlaceMarkers();
  document.getElementById("search-result-panel").classList.add("hidden");
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

// ===== 유틸 =====
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

// ===== 초기화 =====
(async () => {
  await initMap();
  await load();
})();
