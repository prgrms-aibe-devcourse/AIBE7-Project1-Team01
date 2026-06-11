// js/map_kakao.js

let map = null;
let clusterer = null;
let markers = [];
let currentOverlay = null;

export function initMap() {
  return new Promise((resolve) => {
    const container = document.getElementById('kakao-map');
    const options = {
      center: new kakao.maps.LatLng(36.2, 127.8),
      level: 12,
    };
    map = new kakao.maps.Map(container, options);

    clusterer = new kakao.maps.MarkerClusterer({
      map,
      averageCenter: true,
      minLevel: 8,
      disableClickZoom: false,
      styles: [
        {
          width: '46px', height: '46px',
          background: '#C17F3E', borderRadius: '50%',
          color: '#fff', textAlign: 'center',
          fontWeight: '600', fontSize: '14px',
          lineHeight: '46px',
          fontFamily: "'Pretendard', sans-serif",
          boxShadow: '0 2px 8px rgba(193,127,62,0.35)',
        },
        {
          width: '52px', height: '52px',
          background: '#A86B2E', borderRadius: '50%',
          color: '#fff', textAlign: 'center',
          fontWeight: '600', fontSize: '15px',
          lineHeight: '52px',
          fontFamily: "'Pretendard', sans-serif",
          boxShadow: '0 2px 8px rgba(168,107,46,0.4)',
        },
        {
          width: '58px', height: '58px',
          background: '#8C5922', borderRadius: '50%',
          color: '#fff', textAlign: 'center',
          fontWeight: '600', fontSize: '16px',
          lineHeight: '58px',
          fontFamily: "'Pretendard', sans-serif",
          boxShadow: '0 2px 8px rgba(140,89,34,0.45)',
        },
      ],
    });

    resolve(map);
  });
}

/**
 * 마커 전체 업데이트
 * @param {Array} festivals
 * @param {Function} onMarkerClick - (festival) => void
 */
export function renderMarkers(festivals, onMarkerClick) {
  clearMarkers();
  closeOverlay();

  const newMarkers = festivals
    .filter(f => f.lat && f.lng)
    .map(f => {
      const position = new kakao.maps.LatLng(f.lat, f.lng);
      const marker = new kakao.maps.Marker({
        position,
        title: f.title,
        image: makeMarkerImage(),
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        closeOverlay();
        showOverlay(f, position);
        onMarkerClick(f);
      });

      marker._festival = f;
      return marker;
    });

  markers = newMarkers;
  clusterer.addMarkers(markers);
}

function makeMarkerImage() {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill="#C17F3E"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>
  `)}`;
  return new kakao.maps.MarkerImage(src, new kakao.maps.Size(28, 36), {
    offset: new kakao.maps.Point(14, 36),
  });
}

export function clearMarkers() {
  clusterer.clear();
  markers = [];
}

export function closeOverlay() {
  if (currentOverlay) {
    currentOverlay.setMap(null);
    currentOverlay = null;
  }
}

function showOverlay(festival, position) {
  const tpl = document.getElementById('infowindow-tpl');
  const content = tpl.content.cloneNode(true);

  const wrap = content.querySelector('.iw-wrap');
  wrap.querySelector('.iw-title').textContent = festival.title;
  wrap.querySelector('.iw-date').textContent = `${festival.start_date} ~ ${festival.end_date}`;

  const link = wrap.querySelector('.iw-link');
  if (festival.detail_url) {
    link.href = festival.detail_url;
  } else {
    link.style.display = 'none';
  }

  // DOM에 임시 삽입해서 HTMLElement 추출
  const container = document.createElement('div');
  container.appendChild(content);

  container.querySelector('.iw-close').addEventListener('click', closeOverlay);

  const overlay = new kakao.maps.CustomOverlay({
    position,
    content: container,
    yAnchor: 1.45,
    zIndex: 5,
  });

  overlay.setMap(map);
  currentOverlay = overlay;
}

/** 특정 축제 위치로 지도 이동 + 마커 강조 */
export function panToFestival(festival) {
  if (!festival.lat || !festival.lng) return;
  const pos = new kakao.maps.LatLng(festival.lat, festival.lng);
  map.panTo(pos);
  closeOverlay();
  showOverlay(festival, pos);
}
