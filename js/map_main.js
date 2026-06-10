// js/map_main.js
import { fetchFestivals } from './map_api.js';
import { initMap, renderMarkers, panToFestival, closeOverlay } from './map_kakao.js';
import { renderList, setActiveCard, scrollToCard } from './map_ui.js';

// 현재 필터 상태
const state = {
  period: 'ongoing',
  areaCode: '',
};

async function load() {
  showLoading(true);
  try {
    const festivals = await fetchFestivals(state);
    renderMarkers(festivals, onMarkerClick);
    renderList(festivals, onCardClick);
  } catch (err) {
    console.error('축제 데이터 로드 실패:', err);
    showError();
  } finally {
    showLoading(false);
  }
}

function onMarkerClick(festival) {
  setActiveCard(festival.id);
  scrollToCard(festival.id);
  // 모바일: 리스트 탭으로 전환
  if (window.innerWidth <= 768) switchTab('list');
}

function onCardClick(festival) {
  panToFestival(festival);
  // 모바일: 지도 탭으로 전환
  if (window.innerWidth <= 768) switchTab('map');
}

// ===== 필터 이벤트 =====
document.getElementById('filter-area').addEventListener('change', e => {
  state.areaCode = e.target.value;
  load();
});

document.getElementById('filter-period').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#filter-period .chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  state.period = chip.dataset.value;
  load();
});

// ===== 모바일 탭 =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  const main = document.querySelector('.main-content');
  const tabs = document.querySelectorAll('.tab-btn');
  main.classList.toggle('show-list', tab === 'list');
  tabs.forEach(b => {
    const isActive = b.dataset.tab === tab;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive);
  });
}

// ===== 유틸 =====
function showLoading(on) {
  document.getElementById('map-loading').classList.toggle('hidden', !on);
}

function showError() {
  const list = document.getElementById('festival-list');
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
