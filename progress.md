# 보이스 인박스 프로젝트 진행 상황

> 최종 업데이트: 2026-04-06

## 목표
음성/텍스트 메모 → AI 자동 분류 → Notion 저장

## 아키텍처
```
[브라우저] voice-inbox.html
    ↓ fetch
[백엔드] Supabase Edge Function (voice-inbox, v4)
    ├── /classify → MiniMax M2.7 AI 분류
    └── /notion   → Notion API 저장
```

## 핵심 정보
- **Supabase Project ID**: chnqtrmlglqdmzqwsazm
- **Edge Function URL**: https://chnqtrmlglqdmzqwsazm.supabase.co/functions/v1/voice-inbox
- **Edge Function 버전**: v4 (MiniMax M2.7 연동, JWT 비활성화)
- **AI 모델**: MiniMax M2.7 (API key 코드 내장)
- **Notion DB ID**: 337f3e715c448015b711cdb3e15b3416
- **Notion 컬럼**: 제목 / 분류 / 내용 / 날짜 / 상태
- **GitHub**: SunQthecodemaker/dental-ai-coder (main 브랜치)
- **Cloudflare Worker**: https://voice-inbox.sunq818.workers.dev (구버전, 폐기 예정)

## 완료된 작업

### Step 1. Supabase Edge Function 동작 검증 ✅
- /classify 엔드포인트: MiniMax M2.7 AI 분류 정상 작동 확인
  - 쇼핑, 일정, 연락 등 모든 카테고리 정확 분류
  - 한글 제목/요약 자동 생성
  - AI 실패 시 키워드 기반 fallback 포함
- /notion 엔드포인트: Notion 저장 정상 작동 확인
- Edge Function을 Claude → MiniMax M2.7로 교체 배포 (v1→v4)

### 환경 세팅 ✅
- Scoop 패키지 매니저 설치
- Supabase CLI v2.84.2 설치 (scoop)
- git safe.directory 설정 완료

## 남은 작업 (순서대로)

### Step 2. 백엔드 통일 (Supabase로) ✅
- [x] voice-inbox.html의 API_BASE를 Supabase URL로 변경
- [x] API 경로 수정 (/api/classify → /classify, /api/notion → /notion)
- [x] 불필요 파일 정리 (package.json, public/ 삭제)

### Step 3. GitHub Pages 활성화 ✅
- [x] 레포를 public으로 변경
- [x] GitHub Pages 설정 (main 브랜치, / root)
- [x] 사이트 URL: https://sunqthecodemaker.github.io/dental-ai-coder/voice-inbox.html

### Step 4. 정리 (선택)
- [ ] Cloudflare Worker 백업 또는 삭제 결정
- [ ] worker.js 코드가 레포에 없음 (Cloudflare에만 수동 배포됨)

## 참고 사항
- Windows curl에서 한글 직접 전송 시 인코딩 깨짐 → 브라우저 fetch는 정상
- Edge Function 프롬프트는 영어로 작성 (인코딩 안정성), 응답은 한국어
- MiniMax API URL: https://api.minimaxi.chat/v1/text/chatcompletion_v2
