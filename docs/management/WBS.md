# WBS (Work Breakdown Structure) - MOTIPE Project

## Overview
This WBS outlines the work scope for the MOTIPE (Korea-only local festival travel recommendation platform) development project. The schedule spans from 2026-06-08 to 2026-06-11 for Phase 1 (Initial Setup & Core Features).

---

## Phase 1: Project Initialization & Setup (2026-06-08 ~ 2026-06-10)

### 1. Project Preparation
| WBS ID | 중분류 | 작업 내용 | 관련 요구사항 | 담당자 | 예상 일정 |
|--------|--------|----------|-------------|--------|----------|
| 1.1 | 요구사항 검토 | 프로젝트 주제와 핵심 기능 범위를 검토하고 WBS 기준으로 작업 항목을 정리한다. | 전체 | 공통 | 2026-06-08 |
| 1.2 | GitHub 저장소 확인 | 팀 GitHub 저장소를 확인하고 main 및 개인 브랜치 구조를 파악한다. | 전체 | 공통 | 2026-06-08 |
| 1.3 | 브랜치 구조 확인 | sangjin, jungmin, woonsung, feature/community_yeunah 등 팀원별 브랜치를 확인한다. | 전체 | 공통 | 2026-06-08 |
| 1.4 | 개발 환경 세팅 | Node.js, Express, 정적 파일 경로, .env, Supabase, API Key 사용 구조를 초기 세팅한다. | 전체 | 공통 | 2026-06-08 |
| 1.5 | 폴더 구조 정리 | html, css, js, icons, asset 등 정적 리소스 폴더 구조를 정리한다. | 전체 | 공통 | 2026-06-08 |
| 1.6 | 실행 환경 확인 | npm start로 Express 서버를 실행하고 localhost 접속 여부를 확인한다. | 전체 | 공통 | 2026-06-08 |
| 1.7 | Git 작업 방식 정리 | clone, fetch, branch, switch, pull, push, PR 사용 흐름을 정리한다. | 전체 | 공통 | 2026-06-08 |

### 2. Authentication & User Management
| WBS ID | 중분류 | 작업 내용 | 관련 요구사항 | 담당자 | 예상 일정 |
|--------|--------|----------|-------------|--------|----------|
| 2.1 | 로그인 화면 구현 | 사용자가 이메일과 비밀번호를 입력할 수 있는 로그인 화면 UI를 구현한다. | REQ-003, REQ-004 | 정태현 | 2026-06-09 |
| 2.2 | 회원가입 화면 구현 | 사용자가 이름, 이메일, 비밀번호, 비밀번호 확인 값을 입력할 수 있는 회원가입 화면 UI를 구현한다. | REQ-001, REQ-002 | 정태현 | 2026-06-09 |
| 2.3 | Supabase 클라이언트 연결 | 프론트엔드에서 Supabase 클라이언트를 사용할 수 있도록 설정 파일과 클라이언트 초기화 코드를 구성한다. | REQ-001~REQ-004 | 정태현 | 2026-06-09 |
| 2.4 | 일반 회원가입 구현 | 사용자가 이메일과 비밀번호를 이용하여 Supabase Auth에 회원가입할 수 있도록 구현한다. | REQ-001 | 정태현 | 2026-06-09 |
| 2.5 | 일반 로그인 구현 | 사용자가 가입한 이메일과 비밀번호로 로그인할 수 있도록 구현한다. | REQ-003 | 정태현 | 2026-06-09 |
| 2.6 | 로그인 토큰 저장 | 로그인 성공 시 세션 또는 토큰 정보를 브라우저 저장소에 저장하는 흐름을 구현한다. | REQ-003 | 정태현 | 2026-06-09 |
| 2.7 | 로그아웃 구현 | 로그인한 사용자가 서비스에서 로그아웃할 수 있도록 구현한다. | REQ-005 | 정태현 | 2026-06-09 |
| 2.8 | 입력값 유효성 검사 | 회원가입/로그인 시 이메일, 비밀번호, 비밀번호 확인 값의 유효성을 검사한다. | REQ-029, REQ-030 | 정태현 | 2026-06-09 |
| 2.9 | 인증 예외처리 | 로그인 실패, 회원가입 실패, 중복 이메일 등 오류 상황에 대한 메시지를 처리한다. | REQ-006, REQ-029 | 정태현 | 2026-06-09 |

### 3. Server & Environment Setup
| WBS ID | 중분류 | 작업 내용 | 관련 요구사항 | 담당자 | 예상 일정 |
|--------|--------|----------|-------------|--------|----------|
| 3.1 | Express 서버 구성 | Node.js Express 서버를 구성하고 정적 HTML, CSS, JS 파일을 제공한다. | 전체 | 공통 | 2026-06-10 |
| 3.2 | 정적 파일 라우팅 | /html, /css, /js, /icons, /asset 경로로 정적 파일을 불러올 수 있도록 설정한다. | 전체 | 공통 | 2026-06-10 |
| 3.3 | 기본 페이지 라우팅 | / 접속 시 메인 페이지가 열리도록 라우팅을 구성한다. | 전체 | 공통 | 2026-06-10 |
| 3.4 | 환경변수 로드 | .env 파일에서 Supabase URL, Anon Key, Service Role Key, API Key 등을 로드한다. | 전체 | 공통 | 2026-06-10 |
| 3.5 | /config.js 구현 | 클라이언트에서 필요한 Supabase 설정값을 안전하게 전달하기 위한 /config.js 라우트를 구현한다. | REQ-001~REQ-004 | 정태현 | 2026-06-10 |
| 3.6 | Supabase Admin 클라이언트 구성 | 회원 삭제 등 관리자 권한이 필요한 기능을 위해 Service Role Key 기반 Supabase Admin 클라이언트를 구성한다. | REQ-007 | 정태현 | 2026-06-10 |
| 3.7 | 서버 오류 처리 | 모듈 누락, 환경변수 누락, 포트 실행 오류 등 서버 실행 중 발생하는 문제를 확인하고 수정한다. | 전체 | 공통 | 2026-06-10 |

### 4. Database Design & Setup
| WBS ID | 중분류 | 작업 내용 | 관련 요구사항 | 담당자 | 예상 일정 |
|--------|--------|----------|-------------|--------|----------|
| 4.1 | 사용자 테이블 설계 | Supabase Auth 사용자와 연결되는 public.users 테이블 구조를 검토한다. | REQ-001~REQ-006 | 정태현 | 2026-06-10 |
| 4.2 | Auth와 Users 연결 | auth.users의 사용자 ID를 public.users.id와 연결하는 구조를 설계한다. | REQ-001~REQ-006 | 정태현 | 2026-06-10 |
| 4.3 | 회원가입 후 사용자 저장 | 회원가입 완료 후 사용자 이메일, 닉네임, 생성일 등을 public.users에 저장하는 방식을 검토한다. | REQ-001 | 정태현 | 2026-06-10 |
| 4.4 | 중복 이메일 처리 | 이미 등록된 이메일로 회원가입하는 경우 예외처리 방식을 검토한다. | REQ-006 | 정태현 | 2026-06-10 |
| 4.5 | RLS 정책 검토 | Supabase 테이블 접근 권한과 Insert/Select 정책 필요 여부를 검토한다. | REQ-001~REQ-006 | 정태현 | 2026-06-10 |
| 4.6 | 회원탈퇴 데이터 처리 | 회원탈퇴 시 Auth 계정과 사용자 테이블 데이터를 어떻게 처리할지 검토한다. | REQ-007 | 정태현 | 2026-06-10 |

---

## Phase 2: Core Features Development (2026-06-11)

### 5. Main Page & AI Integration
| WBS ID | 중분류 | 작업 내용 | 관련 요구사항 | 담당자 | 예상 일정 |
|--------|--------|----------|-------------|--------|----------|
| 5.1 | 메인 페이지 구조 확인 | 메인 페이지에서 여행지 추천 기능과 AI 챗봇이 들어갈 위치를 검토한다. | REQ-010~REQ-020 | 공통 | 2026-06-11 |
| 5.2 | AI 챗봇 UI 설계 | 메인 화면 우측에 열고 닫을 수 있는 챗봇 토글 UI 구조를 설계한다. | REQ-010 | 공통 | 2026-06-11 |
| 5.3 | AI API 연동 구조 검토 | Gemini/OpenAI/Groq 등 LLM API를 서버에서 호출하는 방식을 검토한다. | REQ-011 | 공통 | 2026-06-11 |
| 5.4 | 여행지 추천 프롬프트 설계 | 사용자의 여행 선호도를 입력받아 지역, 축제, 장소를 추천하는 프롬프트 구조를 설계한다. | REQ-011~REQ-014 | 공통 | 2026-06-11 |
| 5.5 | 챗봇 서버 API 구현 | 프론트엔드 입력을 서버로 보내고 AI 응답을 받아 화면에 출력하는 API 흐름을 구현한다. | REQ-011~REQ-014 | 공통 | 2026-06-11 |
| 5.6 | 챗봇 예외처리 | API Key 누락, 응답 실패, 서버 오류 발생 시 사용자에게 안내 메시지를 출력한다. | REQ-029 | 공통 | 2026-06-11 |

### 6. Maps & Location Features
| WBS ID | 중분류 | 작업 내용 | 관련 요구사항 | 담당자 | 예상 일정 |
|--------|--------|----------|-------------|--------|----------|
| 6.1 | 카카오 지도 SDK 검토 | 카카오 지도 SDK 사용 방식과 JavaScript Key 설정 방식을 확인한다. | REQ-015~REQ-018 | 공통 | 2026-06-11 |
| 6.2 | 장소 추천 화면 검토 | 추천 장소를 지도 또는 카드 형태로 보여주는 화면 흐름을 검토한다. | REQ-015~REQ-018 | 공통 | 2026-06-11 |
| 6.3 | 지도 오류 확인 | 지도 SDK 로딩 오류, API Key 문제, 도메인 설정 문제 등을 확인한다. | REQ-029 | 공통 | 2026-06-11 |
| 6.4 | 외부 API 연동 검토 | TourAPI, 날씨 API, 이미지 API 등 외부 API 사용 가능성을 검토한다. | REQ-015~REQ-020 | 공통 | 2026-06-11 |

### 7. User Profile & Account Management
| WBS ID | 중분류 | 작업 내용 | 관련 요구사항 | 담당자 | 예상 일정 |
|--------|--------|----------|-------------|--------|----------|
| 7.1 | 마이페이지 화면 구현 | 사용자의 프로필 정보를 확인할 수 있는 마이페이지 화면 구조를 구현한다. | REQ-021~REQ-024 | 정태현 | 2026-06-11 |
| 7.2 | 사용자 정보 조회 | 로그인한 사용자의 이메일, 닉네임 등 기본 정보를 조회하는 흐름을 구현한다. | REQ-021 | 정태현 | 2026-06-11 |
| 7.3 | 회원탈퇴 버튼 구현 | 사용자가 계정을 삭제할 수 있는 회원탈퇴 버튼 UI를 구현한다. | REQ-007 | 정태현 | 2026-06-11 |
| 7.4 | 회원탈퇴 API 연결 | 서버의 관리자 권한 API를 통해 Supabase Auth 사용자를 삭제하는 흐름을 검토한다. | REQ-007 | 정태현 | 2026-06-11 |

### 8. Collaboration & Documentation
| WBS ID | 중분류 | 작업 내용 | 관련 요구사항 | 담당자 | 예상 일정 |
|--------|--------|----------|-------------|--------|----------|
| 8.1 | 개인 브랜치 작업 | 개인 담당 기능을 각자 브랜치에서 작업하고 main과 분리하여 관리한다. | 전체 | 공통 | 2026-06-11 |
| 8.2 | 브랜치 최신화 | 원격 저장소의 변경사항을 fetch/pull 하여 로컬 작업 브랜치를 최신 상태로 유지한다. | 전체 | 공통 | 2026-06-11 |
| 8.3 | 충돌 가능성 확인 | 폴더 구조 변경, 파일 이동, 공통 파일 수정으로 인한 충돌 가능성을 확인한다. | 전체 | 공통 | 2026-06-11 |
| 8.4 | Pull Request 준비 | 개인 브랜치 작업 내용을 main에 합치기 위한 PR 생성 방식을 정리한다. | 전체 | 공통 | 2026-06-11 |
| 8.5 | 작업 내역 정리 | 6월 8일부터 6월 11일까지 진행한 작업을 WBS와 요구사항 기준으로 문서화한다. | 전체 | 공통 | 2026-06-11 |

---

## Key Metrics & Dependencies

### Critical Dependencies
- **Supabase Setup**: Must complete before authentication features can be tested
- **Environment Variables**: Must be configured before server deployment
- **Database Schema**: Must align with MVP scope (users, user_preferences, festivals, trips, itineraries)
- **API Keys**: All external API keys (OpenAI, Gemini, Groq, KAKAO Maps, TourAPI, Unsplash) must be obtained

### Success Criteria
- Express server runs without errors on `npm start`
- All team members can successfully authenticate locally
- Main page displays and basic navigation works
- Database connections are functional
- External API integrations are tested
- Git workflow is established and documented
- All documentation is up-to-date with code implementation

### Risk Factors
1. **Environment Variable Management**: Misconfigurations can block entire team
   - *Mitigation*: Use `.env.example` template and document all required keys
2. **Database Schema Conflicts**: Multiple team members editing schema simultaneously
   - *Mitigation*: Freeze schema during initial setup, assign single owner
3. **API Rate Limits**: External APIs may have rate limiting
   - *Mitigation*: Use test keys and document rate limit handling
4. **Branch Merge Conflicts**: Concurrent work on shared files
   - *Mitigation*: Define clear file ownership and Git workflow in advance

---

## Documentation & Reference

All documentation should be kept in sync with implementation:
- `docs/architecture/DB_SCHEMA.md` - Database structure and relationships
- `docs/architecture/API_SPEC.md` - Backend API endpoints
- `docs/design/DESIGN_SYSTEM.md` - UI/UX design guidelines
- `docs/design/PAGE_SPEC.md` - Page-by-page specifications
- `docs/management/WBS.md` - This file (Work Breakdown Structure)

For detailed project guidelines, see:
- `AGENTS.md` - Project overview and working rules
- `DESIGN.md` - Design system and brand guidelines

---

**Last Updated**: 2026-06-11  
**Status**: Phase 1 Complete, Phase 2 In Progress
