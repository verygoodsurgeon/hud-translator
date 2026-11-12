# HUD 번역 자막 (hud-translator)

휴대폰 마이크로 들은 말을 실시간으로 받아쓰고 번역해, 휴대폰 화면에 **스마트 글라스 화면처럼** 띄워 주는 웹앱(PWA). 글라스 기기 없이 동작한다.

- 언어: 한국어 · 영어 · 일본어 · 중국어(보통화)
- 모드: 번역(한 방향) · 대화(양방향, 화면 위쪽은 상대방용으로 뒤집힘) · 받아쓰기
- 엔진: Soniox 실시간(권장, 키 필요) · 브라우저 내장(무료 받아쓰기 + Claude 번역) · 데모
- 정확도: Claude 2단계 정밀 번역, 용어집
- 모든 기능은 설정에서 켜고 끌 수 있음

## 문서
| 파일 | 내용 |
|---|---|
| [PROGRESS.md](PROGRESS.md) | 진행 상태와 다음 할 일 (**이어받을 때 먼저**) |
| [CLAUDE.md](CLAUDE.md) | 작업 규칙 |
| [docs/01_research.md](docs/01_research.md) | Even Realities 기능·사용자 반응·엔진 조사 |
| [docs/02_requirements.md](docs/02_requirements.md) | 기능 목록(F1–F16), 설정 항목, 성능 목표 |
| [docs/03_architecture.md](docs/03_architecture.md) | 구조, 데이터 흐름, 타입 |
| [docs/04_ui_spec.md](docs/04_ui_spec.md) | 화면 설계 |
| [docs/05_engines.md](docs/05_engines.md) | Soniox/Web Speech/Claude 연동 세부 |
| [docs/06_test_plan.md](docs/06_test_plan.md) | 시험 계획·실측 기록표 |

## 실행
```
npm install
npm run dev     # http://localhost:5173
```
휴대폰에서 마이크를 쓰려면 HTTPS 주소로 배포해야 한다(PROGRESS.md T1).
