# MOTIPE - 지역 축제 기반 AI 여행 추천 플랫폼

## 프로젝트 소개

사용자의 성향, 여행 일정, 선호하는 축제 테마를 분석해 개인에게 최적화된 지역 축제 및 연계 여행 일정을 추천하는 AI 기반 여행 플랫폼입니다.

기존에 각종 포털사이트를 이용하여, 지역 축제의 정보를 검색하던 불편한 방식 대신에, AI를 활용하여 지역 축제의 정보를 한 눈에 알 수 있고, 여행을 더 쉽고 빠르게 계획 할 수 있도록 도와주는 서비스입니다.

## MOTIPE 서비스 범위

MOTIPE는 대한민국 국내의 지역 축제만 지원합니다. 국내 축제 및 관광지 정보는 한국관광공사 TourAPI 4.0의 축제/행사 데이터를 활용하는 것을 우선으로 글로벌 서비스 진행 계획은 아직 없습니다.

## 기술 스택

### Frontend

- HTML5
- CSS3
- JavaScript ES6+

### Backend

- Node.js
- Express.js

### Database

- Supabase

### Deployment

- Render

### AI 및 외부 API

- OpenAI API Platform
- Google Gemini 또는 Groq 등 대체 가능한 LLM API
- KAKAO Maps API (또는 국내 지도 API)
- VilageFcstInfoService_2.0 API (축제 기간 날씨 정보 조회용)
- 한국관광공사 TourAPI 4.0 (지역 축제 및 관광 정보)
- Unsplash Developers API (랜덤 이미지 생성 API)

AI Provider는 아직 확정되지 않았으며, 교체 가능한 서비스 구조로 구현합니다.

## 주요 기능

### Flow A. 회원가입 및 사용자 축제 성향 진단

1. 아이디, 비밀번호, 닉네임 등 최소 정보로 계정을 생성합니다.
2. 선호하는 축제 활동 스타일을 선택합니다.
   - 다양한 프로그램과 액티비티에 참여하는 '활기찬 체험형'
   - 조용히 푸드트럭 음식을 맛보고 공연을 관람하는 '힐링/감상형'
3. 축제 인파(혼잡도) 민감도를 선택합니다.
   - 북적북적한 축제 분위기 자체를 즐기는 '축제 마니아'
   - 여유롭고 한적하게 숨은 지역 명소를 즐기는 '로컬 탐방러'
4. 설문 결과에 따라 사용자 성향 맞춤 칭호를 부여하고 메인 대시보드로 이동합니다.

### Flow B. 축제 연계 여행 일정 생성

1. 여행 예정 월(또는 상세 일정), 선호 지역, 동반자 유형을 입력합니다.
2. 비주얼 축제 테마 키워드 칩을 렌더링합니다.
   - 예: `#먹거리축제`, `#불꽃놀이`, `#전통문화`, `#뮤직페스티벌`, `#가족과함께`, `#인생샷`, `#자연/꽃`, `#야경명소`
3. 테마 키워드는 최대 3개까지만 선택할 수 있습니다.
4. 4번째 키워드 선택 시 "최대 3개까지만 선택 가능합니다" 툴팁을 표시하고 선택을 무효화합니다.
5. 최소 1개 이상의 키워드가 선택되면 `내 맞춤 축제 일정 보기` 버튼을 활성화합니다.

## AI 추천 알고리즘

추천 점수는 아래 기준으로 계산합니다.

추천 점수 = 축제 테마 적합도 50% + 일정&날씨 적합도 20% + 이동 거리/동선 적합도 15% + 동행자 적합도 15%

일정 생성 흐름은 아래 순서를 따릅니다.

지역 축제 데이터 조회 -> 주변 관광지/맛집 조회 -> 이동시간 계산 -> 동선 정렬 -> 마이페이지 저장 및 수정

AI 환각(Hallucination)을 줄이기 위해 실제 개최되는 축제 데이터는 TourAPI의 행사/축제 데이터를 우선 조회하고, AI에는 실제 축제 일정·위치 정보와 사용자 조건을 함께 전달합니다.

## 팀원 역할

| 역할       | 담당 업무                                                             |
| :--------- | :-------------------------------------------------------------------- |
| 기획       | 사용자 플로우, 요구사항 정의, 축제 매칭을 위한 AI 프롬프트 방향 정의  |
| 프론트엔드 | 회원가입/성향 설문 UI, 축제 추천 및 일정 생성 UI, 키워드 칩 선택 로직 |
| 백엔드     | Express API 설계, Supabase 연동, 외부 축제 및 관광 API 통합           |
| 인프라     | Render 배포, 환경 변수 관리, 라이브 서비스 모니터링                   |

## 실행 방법

아직 프로젝트 초기 단계이며, 서버 코드와 `package.json` 생성 후 아래 명령으로 실행합니다.

npm install
npm start

## 환경 변수

민감 정보는 `.env` 파일 또는 Render Environment Variables에서 관리합니다.

PORT=3000
SUPABASE_URL=
SUPABASE_ANON_KEY=
AI_PROVIDER=
AI_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
KAKAO_MAPS_API_KEY=
WEATHER_API_KEY=
TOURAPI_KEY=
UNSPLASH_ACCESS_KEY=

`.env` 파일은 GitHub에 올리지 않습니다.
`.env.sample` 파일에 각 API의 키값을 `****`로 표기해서 올립니다.

## Documentation

### Architecture

- [DB Schema](docs/architecture/DB_SCHEMA.md)
- [API Specification](docs/architecture/API_SPEC.md)

### Design

- [Design System](docs/design/DESIGN_SYSTEM.md)
- [Page Specification](docs/design/PAGE_SPEC.md)

### Project Management

- [WBS](docs/management/WBS.md)

MVP 단계에서는 `users`, `user_preferences`, `festivals`, `trips`, `itineraries` 5개 핵심 테이블을 기준으로 구현합니다. 자세한 구조와 관계는 [DB Schema](docs/architecture/DB_SCHEMA.md)를 참고합니다.

## 트러블 슈팅

| 문제                        | 원인                                    | 해결 방법                                       |
| :-------------------------- | :-------------------------------------- | :---------------------------------------------- |
| 외부 API 호출 실패          | API Key 누락 또는 환경 변수 오타        | `.env`와 Render Environment Variables 값을 확인 |
| AI가 가상의 축제를 추천     | 실제 축제 데이터 없이 AI 단독 응답 사용 | TourAPI 축제/행사 조회 결과를 프롬프트에 주입   |
| 테마 키워드 4개 이상 선택됨 | 프론트엔드 선택 제한 로직 누락          | Vanilla JS에서 선택 개수 검증 및 툴팁 표시      |

## 배포 주소

추후 Render 배포 완료 후 서비스 URL을 기재합니다.
