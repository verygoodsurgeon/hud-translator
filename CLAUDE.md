# 이 저장소에서 일하는 AI/개발자에게

1. **PROGRESS.md를 먼저 읽고**, 맨 위의 할 일 중 [ ] 하나를 골라 작업한다. 끝나면 [x]로 바꾸고 "현재 상태 요약"과 마지막 갱신 날짜를 고친다.
2. 설계는 docs/에 있다. 코드와 문서가 어긋나면 코드를 기준으로 문서를 고친다.
   - 기능 목록·설정 키: docs/02_requirements.md (코드 원천: src/settings/schema.ts)
   - 구조·타입: docs/03_architecture.md (코드 원천: src/types.ts)
   - 엔진 프로토콜: docs/05_engines.md
3. 규칙
   - core/*는 React·브라우저 API 금지(순수 함수) + 단위 테스트(`*.test.ts`) 추가.
   - 새 기능 = settings/schema.ts에 토글 먼저(기본 OFF) → SettingsPanel에 노출 → 구현.
   - 새 엔진 = Engine 인터페이스 구현 + engines/index.ts 등록. UI 수정 불필요하게.
   - API 키·대화 내용을 console에 출력하지 말 것.
   - Claude 모델 ID는 `claude-opus-5-5`(기본), `claude-haiku-5-5`(빠름). temperature 등 샘플링 파라미터 보내지 말 것.
   - 확인 못 한 외부 API 형식은 추측으로 확정하지 말고 문서에 ❓로 남긴다.
4. 확인 명령
   ```
   npm install
   npm test          # 단위 테스트
   npm run build     # 타입체크 + 빌드
   npm run e2e       # Playwright(데모 엔진). 이 환경은 /opt/pw-browsers/chromium 사용, playwright install 금지
   npm run dev       # 개발 서버 (휴대폰 마이크는 HTTPS 필요)
   ```
5. 사용자(외상외과 교수)에게 보고할 때: 한국어, 결론 먼저, 확인 안 된 것은 "확인 필요".
