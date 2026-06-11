// js/map_sync.js
// 실행: node js/map_sync.js

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TOUR_API_KEY = process.env.TOUR_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BASE_URL = "https://apis.data.go.kr/B551011/KorService1/searchFestival1";

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseFestival(item) {
  return {
    content_id: String(item.contentid),
    title: item.title || "",
    start_date: item.eventstartdate
      ? `${item.eventstartdate.slice(0, 4)}-${item.eventstartdate.slice(4, 6)}-${item.eventstartdate.slice(6, 8)}`
      : null,
    end_date: item.eventenddate
      ? `${item.eventenddate.slice(0, 4)}-${item.eventenddate.slice(4, 6)}-${item.eventenddate.slice(6, 8)}`
      : null,
    addr: item.addr1 || "",
    lat: item.mapy ? parseFloat(item.mapy) : null,
    lng: item.mapx ? parseFloat(item.mapx) : null,
    image_url: item.firstimage || item.firstimage2 || null,
    detail_url: item.contentid
      ? `https://www.visitkorea.or.kr/detail/ms_detail.do?cotid=${item.contentid}`
      : null,
    area_code: item.areacode ? String(item.areacode) : null,
    synced_at: new Date().toISOString(),
  };
}

async function fetchAllFestivals() {
  const today = new Date();
  const eventStartDate = formatDate(today);
  const future = new Date(today);
  future.setMonth(future.getMonth() + 3);
  const eventEndDate = formatDate(future);

  let page = 1;
  const pageSize = 100;
  let total = Infinity;
  const results = [];

  while (results.length < total) {
    const params = new URLSearchParams({
      serviceKey: TOUR_API_KEY,
      numOfRows: pageSize,
      pageNo: page,
      MobileOS: "ETC",
      MobileApp: "Motipe",
      _type: "json",
      listYN: "Y",
      arrange: "A",
      eventStartDate,
      eventEndDate,
    });

    const res = await fetch(`${BASE_URL}?${params}`);
    const text = await res.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("TourAPI 응답 파싱 실패. 응답 내용:", text.slice(0, 300));
      break;
    }

    const body = json?.response?.body;
    if (!body) {
      console.error("응답 body 없음:", JSON.stringify(json).slice(0, 300));
      break;
    }

    total = body.totalCount;
    const items = body.items?.item;
    if (!items) {
      console.log("데이터 없음 (items 비어있음)");
      break;
    }

    const list = Array.isArray(items) ? items : [items];
    results.push(...list);
    console.log(`페이지 ${page} 완료 (${results.length}/${total})`);

    if (results.length >= total) break;
    page++;
    await sleep(200);
  }

  return results;
}

async function sync() {
  console.log("=== TourAPI → Supabase 동기화 시작 ===");

  const raw = await fetchAllFestivals();
  console.log(`TourAPI에서 ${raw.length}개 수집 완료`);

  const festivals = raw
    .map(parseFestival)
    .filter((f) => f.start_date && f.end_date && f.lat && f.lng);

  console.log(`유효한 데이터 ${festivals.length}개 (좌표 + 날짜 있는 것만)`);

  const chunkSize = 100;
  let upserted = 0;
  for (let i = 0; i < festivals.length; i += chunkSize) {
    const chunk = festivals.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("festivals")
      .upsert(chunk, { onConflict: "content_id" });

    if (error) {
      console.error(
        `청크 ${Math.floor(i / chunkSize) + 1} upsert 실패:`,
        error.message,
      );
    } else {
      upserted += chunk.length;
    }
  }

  // 한 달 이상 지난 종료 축제 삭제
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const { error: delError } = await supabase
    .from("festivals")
    .delete()
    .lt("end_date", cutoffStr);

  if (delError) console.error("오래된 데이터 삭제 실패:", delError.message);
  else console.log(`종료된 과거 축제 정리 완료 (${cutoffStr} 이전)`);

  console.log(`=== 동기화 완료: ${upserted}개 upsert ===`);
}

sync().catch((err) => {
  console.error("동기화 오류:", err);
  process.exit(1);
});
