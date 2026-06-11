// js/map_kakao.js

let map = null;
let clusterer = null;
let markers = [];
let currentOverlay = null;
let placeMarkers = [];

export function initMap() {
  return new Promise((resolve) => {
    const container = document.getElementById("kakao-map");
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
          width: "46px",
          height: "46px",
          background: "#C17F3E",
          borderRadius: "50%",
          color: "#fff",
          textAlign: "center",
          fontWeight: "600",
          fontSize: "14px",
          lineHeight: "46px",
          fontFamily: "'Pretendard', sans-serif",
          boxShadow: "0 2px 8px rgba(193,127,62,0.35)",
        },
        {
          width: "52px",
          height: "52px",
          background: "#A86B2E",
          borderRadius: "50%",
          color: "#fff",
          textAlign: "center",
          fontWeight: "600",
          fontSize: "15px",
          lineHeight: "52px",
          fontFamily: "'Pretendard', sans-serif",
          boxShadow: "0 2px 8px rgba(168,107,46,0.4)",
        },
        {
          width: "58px",
          height: "58px",
          background: "#8C5922",
          borderRadius: "50%",
          color: "#fff",
          textAlign: "center",
          fontWeight: "600",
          fontSize: "16px",
          lineHeight: "58px",
          fontFamily: "'Pretendard', sans-serif",
          boxShadow: "0 2px 8px rgba(140,89,34,0.45)",
        },
      ],
    });

    resolve(map);
  });
}

export function renderMarkers(festivals, onMarkerClick) {
  clearMarkers();
  closeOverlay();

  const newMarkers = festivals
    .filter((f) => f.lat && f.lng)
    .map((f) => {
      const position = new kakao.maps.LatLng(f.lat, f.lng);
      const marker = new kakao.maps.Marker({
        position,
        title: f.title,
        image: makeMarkerImage(),
      });

      kakao.maps.event.addListener(marker, "click", () => {
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

function makePlaceMarkerImage() {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill="#4A90D9"/>
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

export function clearPlaceMarkers() {
  placeMarkers.forEach((m) => m.setMap(null));
  placeMarkers = [];
}

export function closeOverlay() {
  if (currentOverlay) {
    currentOverlay.setMap(null);
    currentOverlay = null;
  }
}

function showOverlay(festival, position) {
  const tpl = document.getElementById("infowindow-tpl");
  const content = tpl.content.cloneNode(true);

  const wrap = content.querySelector(".iw-wrap");

  // 사진 있으면 이미지 추가
  if (festival.image_url) {
    const img = document.createElement("img");
    img.src = festival.image_url;
    img.alt = festival.title;
    img.className = "iw-image";
    wrap.insertBefore(img, wrap.firstChild);
  }

  wrap.querySelector(".iw-title").textContent = festival.title;
  wrap.querySelector(".iw-date").textContent =
    `${festival.start_date} ~ ${festival.end_date}`;

  const container = document.createElement("div");
  container.appendChild(content);
  container.querySelector(".iw-close").addEventListener("click", closeOverlay);

  const overlay = new kakao.maps.CustomOverlay({
    position,
    content: container,
    yAnchor: 1.45,
    zIndex: 5,
  });

  overlay.setMap(map);
  currentOverlay = overlay;
}

export function panToFestival(festival) {
  if (!festival.lat || !festival.lng) return;
  const pos = new kakao.maps.LatLng(festival.lat, festival.lng);
  map.panTo(pos);
  closeOverlay();
  showOverlay(festival, pos);
}

export function searchPlaces(keyword, onResults) {
  clearPlaceMarkers();
  closeOverlay();

  const ps = new kakao.maps.services.Places();
  ps.keywordSearch(keyword, (data, status) => {
    if (status !== kakao.maps.services.Status.OK) {
      onResults([]);
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();

    const newMarkers = data.map((place) => {
      const position = new kakao.maps.LatLng(place.y, place.x);
      const marker = new kakao.maps.Marker({
        position,
        title: place.place_name,
        image: makePlaceMarkerImage(),
        map,
      });

      kakao.maps.event.addListener(marker, "click", () => {
        closeOverlay();
        showPlaceOverlay(place, position);
      });

      bounds.extend(position);
      return marker;
    });

    placeMarkers = newMarkers;
    map.setBounds(bounds);
    onResults(data);
  });
}

function showPlaceOverlay(place, position) {
  const container = document.createElement("div");
  container.className = "iw-wrap";
  container.innerHTML = `
    <button class="iw-close" aria-label="닫기">✕</button>
    <p class="iw-title">${place.place_name}</p>
    <p class="iw-date" style="margin-bottom:4px">${place.category_name}</p>
    <p class="iw-date">${place.address_name}</p>
    ${place.place_url ? `<a class="iw-link" href="${place.place_url}" target="_blank" rel="noopener">카카오맵에서 보기 →</a>` : ""}
  `;

  const wrap = document.createElement("div");
  wrap.appendChild(container);
  wrap.querySelector(".iw-close").addEventListener("click", closeOverlay);

  const overlay = new kakao.maps.CustomOverlay({
    position,
    content: wrap,
    yAnchor: 1.45,
    zIndex: 5,
  });

  overlay.setMap(map);
  currentOverlay = overlay;
}

export function panToPlace(place) {
  const pos = new kakao.maps.LatLng(place.y, place.x);
  map.panTo(pos);
  closeOverlay();
  showPlaceOverlay(place, pos);
}
