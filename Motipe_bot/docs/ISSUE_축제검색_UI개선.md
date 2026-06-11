# [개선] 축제 검색 정확도 향상 · 보관함 저장 버그 수정 · MOTIPE AI UI 리디자인

## 개요
대화형 축제 추천 챗봇(MOTIPE AI)에서 발생한 검색 정확도 문제와 보관함 저장 오류를 수정하고,
전체 UI를 여행/축제 테마로 리디자인했습니다.

관련 커밋: `a4ceca4` (브랜치: `woonsung`)

---

## 1. 수정된 부분

### 1-1. 축제 상세 정보 출력 형식 개선
- 축제 상세 정보를 ASCII 박스 카드(`┌─┐`) 형태로 출력하도록 변경
- 축제이름 / 개최날짜 / 요금 / 주소 / 연락처를 하나의 카드 단위로 묶음
- 카드 오른쪽 테두리를 제거하고 왼쪽 `│`만 사용해 한글 글자 폭으로 인한 정렬 깨짐 방지
- 축제마다 빈 줄 2개의 여백을 두어 카드 간 구분 강화
- assistant 메시지에 monospace 폰트를 적용해 박스 선 정렬 보장

### 1-2. 축제 검색 정확도 개선
- `buildSearchKeywords()` 추가: 사용자 문장에서 불용어(축제/알려줘/추천 등) 제거 후 핵심 키워드만 추출
- 지역명 우선 검색 + 키워드 후보 순차 시도 로직 추가
- "먹거리 → 음식" 등 동의어 보강
- 지역명·키워드가 모두 실패하면 인기 지역(서울/부산/제주/대구/인천)으로 기본 검색하는 폴백 추가

### 1-3. AI 가짜 정보 생성 방지
- GROQ 시스템 프롬프트 강화: 공공데이터에 없는 축제/날짜/연락처를 지어내지 못하도록 규칙 추가
- 데이터가 없으면 "정확한 정보를 찾지 못했습니다"로만 답변하도록 제한
- 폴백 검색 시 "인기 지역 축제를 대신 안내합니다" 맥락을 AI에 전달

### 1-4. 보관함(saved_destinations) 기능 정상화
- 프론트에 `getUserId()` 추가: 브라우저별 고정 게스트 ID를 localStorage에 발급·재사용
- 저장/조회/삭제 요청에 `user-id` 헤더 전달
- 서버: `GET /api/saved`를 더미 데이터 대신 실제 Supabase 조회 + 본인 user_id 필터링으로 변경
- 서버: `DELETE`에 user_id 조건 추가, `POST`에 user-id 누락 가드 추가

### 1-5. UI 리디자인 (여행/축제 테마)
- 배경: 석양→노을→황혼 풀스크린 그라데이션
- 헤더: "Motipe AI 챗봇" → 고급 브랜드 디자인 **MOTIPE AI** (Playfair Display, 골드 그라데이션, ✦ 로고)
- 채팅 말풍선·입력창·버튼·대시보드 카드를 골드/노을 포인트 테마로 통일

---

## 2. 트러블슈팅 기록

| 증상 | 원인 | 해결 |
|------|------|------|
| 축제 박스가 출력되지 않고 AI가 가짜 축제를 나열 | 공공데이터 API에 문장 전체를 keyword로 넘겨 항상 0건 반환 → 박스 코드 미실행, AI가 빈 데이터를 메우려 정보 생성 | 키워드 정제·폴백 검색 추가, AI 프롬프트로 생성 차단 |
| `Could not find the 'date' column ... in the schema cache` | `saved_destinations` 테이블에 `date` 컬럼 없음 | `ALTER TABLE saved_destinations ADD COLUMN date text;` |
| `Could not find the 'region' column ...` | 테이블에 `region` 컬럼 없음 | `ALTER TABLE saved_destinations ADD COLUMN region text;` |
| `new row violates row-level security policy` | RLS 활성 상태인데 insert 허용 정책 없음 | anon 역할 insert/select/delete 허용 정책 추가 |
| `null value in column "user_id" violates not-null constraint` | 프론트가 `user-id` 헤더를 전송하지 않아 null insert | 게스트 ID 발급 후 헤더 전달, 서버 가드 추가 |

### 적용한 Supabase SQL
```sql
ALTER TABLE saved_destinations ADD COLUMN date text;
ALTER TABLE saved_destinations ADD COLUMN region text;

ALTER TABLE saved_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert_saved" ON saved_destinations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_saved" ON saved_destinations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_delete_saved" ON saved_destinations FOR DELETE TO anon USING (true);
```

---

## 3. 남은 과제 (후속 논의)
- 현재 RLS 정책이 `USING (true)`라 DB 레벨에서 모든 행 접근 가능 — 서버 코드에서만 user_id로 격리 중.
  실서비스 전환 시 Supabase 표준 로그인(`auth.uid()`) 기반 정책으로 강화 필요
- 추천 여행지 사진 카드의 이미지 로딩 프론트 스크립트 미구현 (현재 "불러오는 중" 상태 고정)
- 지역명이 없는 검색(예: "먹거리 축제")의 매칭률 추가 개선 여지
