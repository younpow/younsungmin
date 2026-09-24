# YOUN SUNGMIN 콘텐츠 관리

## 실행 및 미리보기

Node.js 22.13 이상을 설치하고 저장소에서 터미널을 엽니다.

- 최초 설치: `npm ci`
- 한 번에 사진과 PDF 준비, 공개 설정, 빌드 및 검증: `npm run prepare:project`
- 미리보기: `npm run dev` → http://localhost:4321
- 공개 전 타입·린트·빌드·경로 검사: `npm test`
- 빌드 결과 미리보기: `npm run preview`

OUR TIME — 2026 SPRING과 2026 SUMMER는 공개 설정되었습니다. SPRING은 사진 4장, SUMMER는 사진 14장을 사용합니다. DISTANCE와 ORIGIN은 자료가 준비되기 전까지 비공개입니다.

## 자동 처리와 다음 시즌 준비

이번 작업에 사용한 자료 경로는 로컬 전용 **local-originals/import.json**에 저장되어 있습니다. 자료를 갱신한 뒤 `npm run prepare:project` 한 번으로 숫자 사진만 ZIP에서 가져오기, 웹 이미지와 별도 홈 대표사진 생성, PDF 웹용 변환과 페이지별 화질·본문 검증, 공개 설정, 타입 검사, 빌드와 테스트를 실행합니다. PyMuPDF와 Pillow가 필요합니다. 다른 컴퓨터에서는 `python -m pip install -r scripts/requirements-content.txt`를 먼저 실행하고 import.json의 파일 경로를 수정하세요.

새 season을 준비할 때는 **scripts/content-import.template.json**을 복사해 **local-originals/import.json**으로 저장하고 ZIP, PDF, 대표사진 파일 경로, 프로젝트 식별자와 사진 장수를 지정한 뒤 위 명령을 실행합니다. 원본은 로컬 전용 폴더에 보관됩니다.

## 2026 SUMMER 사진 14장 넣기

1. 원본은 **local-originals/our-time/2026-summer/**에 넣습니다. 책의 확정 순서대로 **01.jpg ~ 14.jpg**로 이름을 지정합니다. PNG/TIFF/WebP 입력도 지원합니다.
2. `npm run prepare:images -- our-time/2026-summer` 실행.
3. 웹용 사진이 **public/media/work/our-time/2026-summer/01.jpg ~ 14.jpg**에 생성됩니다. responsive/에는 작은 WebP가 생성됩니다.
4. 새 작품 meta.json에서 `published`를 `true`로 바꾸고 `npm test`를 실행합니다. 이미 공개된 2026 SUMMER에는 다시 적용하지 않아도 됩니다.

변환은 자동 회전, 긴 변 최대 2000px, EXIF/XMP/IPTC 제거, JPEG 압축을 수행합니다. 원본은 수정하지 않습니다. local-originals/는 Git에서 제외됩니다. 원본을 public에 복사하거나 강제 git add 하지 마세요. 과거 Git 이력에 올린 원본은 .gitignore로 제거되지 않습니다.

같은 이름의 출력은 덮어씁니다. 삭제한 사진의 이전 출력은 자동 삭제하지 않으므로 직접 정리하세요. 공개 작품에 14장이 없거나 2000px 초과/메타데이터 포함 사진이 있으면 빌드가 실패합니다.

## 2026 SPRING 사진 4장

원본은 **local-originals/our-time/2026-spring/01.jpg ~ 04.jpg**에 보관합니다. 사진 순서는 1.jpg, 2.jpg, 3.jpg, 4.jpg를 각각 01.jpg, 02.jpg, 03.jpg, 04.jpg로 복사한 순서입니다. `npm run prepare:images -- our-time/2026-spring`으로 웹용 JPEG와 responsive WebP를 생성합니다. 공개 페이지는 **/work/our-time/2026-spring/**입니다. SPRING에는 아티스트 북이 없으므로 `book`은 빈 문자열, `bookReviewed`는 false로 유지합니다.

## 사진 순서와 alt

숫자 기준으로 01, 02, 03… 정렬합니다. 동일 번호가 둘이면 오류입니다. OUR TIME은 책의 확정 순서를 그대로 유지하세요. 이름을 변경한 뒤 이전 출력 사진을 정리하고 변환을 다시 실행합니다.
meta.json의 alt에 `"01.jpg": "실제 사진을 설명하는 문장"` 형식으로 접근성 설명을 넣습니다. 미입력 시 작품명과 번호로 중립적인 설명을 사용합니다. 화면에는 캡션이 없습니다.

## Artist Statement 수정

**src/content/work/our-time/2026-summer/statement.en.md**와 **statement.ko.md**를 수정합니다. 빈 줄로 문단을 나눕니다. 안전한 일반 문단으로 표시하므로 Markdown 장식 문법은 사용하지 않습니다.

## 홈 대표사진 변경

**src/config/site.json**의 heroProject와 heroImage를 수정합니다.

```json
"heroProject": "our-time/2026-summer",
"heroImage": "05.jpg"
```

작품 목록과 작품 OG 대표사진은 해당 meta.json의 hero입니다. 실제 파일명과 일치해야 합니다. 홈에 지정한 작품이 비공개이면 간단한 작가 소개를 표시합니다.

## 공개 / 비공개

meta.json의 `published:true` / `published:false`로 제어합니다. 비공개 작품의 페이지, 목록, sitemap과 해당 media 파일은 배포 빌드에서 제외합니다. 개발 서버는 public 파일에 접근 가능하므로 외부에 공개하지 마세요. 공개 저장소의 Git 이력이나 과거 배포 캐시까지 회수하는 기능은 아닙니다.

DISTANCE와 ORIGIN은 실제 사진과 두 언어 statement가 생겼을 때만 공개합니다. 없는 이력이나 작업 설명을 임의로 넣지 마세요.

## 새 OUR TIME 계절

1. **src/content/work/our-time/2026-summer/**를 **src/content/work/our-time/2027-spring/**처럼 복사합니다.
2. meta.json을 수정합니다: slug = our-time/2027-spring, chapter = 2027 SPRING, year = 2027, imageDirectory = /media/work/our-time/2027-spring.
3. series는 OUR TIME으로 유지합니다. expectedImages는 실제 장수, order는 목록 순서(작을수록 먼저), published는 우선 false로 둡니다.
4. 두 statement 파일을 새 내용으로 수정합니다.
5. 원본을 **local-originals/our-time/2027-spring/**에 넣고 `npm run prepare:images -- our-time/2027-spring` 실행.
6. 책이 없으면 book은 빈 문자열, bookReviewed는 false로 둡니다. 준비되면 published:true → npm test.
   컴포넌트는 수정하지 않아도 새 페이지와 목록이 생성됩니다.

## PDF 넣기 / 교체하기

정확한 경로: **public/media/books/our-time-2026-summer.pdf**.
웹용 저해상도 PDF를 사용하고 개인 메타데이터를 제거하세요. **이미지 변환 스크립트는 PDF 내부 사진을 변환하지 않습니다.**
직접 해상도·메타데이터·순서를 확인한 후 meta.json의 **bookReviewed:true**로 설정합니다. false이면 책 링크와 배포 PDF를 제외합니다. 이 값은 자동 보안 검사를 뜻하지 않습니다. 교체할 때마다 재검토하세요.

PDF 한 페이지가 실제 책 한 페이지여야 합니다. 첫 페이지는 표지입니다. 이미 양면으로 합쳐진 PDF는 단일 페이지로 다시 내보내세요. 빈 페이지도 유지합니다.

- Desktop: 표지 1 / 2–3 / 4–5…
- Mobile: 1 / 2 / 3…
- 화살표 버튼, 키보드, 스와이프 지원
- 렌더 실패 시 PDF를 새 탭에서 여는 링크 제공

PDF 자체는 열거나 저장할 수 있습니다. 우클릭·드래그 억제도 DRM이 아닙니다.

## About / CV / 연락처

**src/content/about.json**의 biography.en과 biography.ko를 수정합니다. cv 배열에는 실제 이력이 있을 때만 아래 구조를 추가합니다.

```json
{
  "title": "Exhibitions",
  "entries": [
    { "year": "실제 연도", "en": "확인된 영문 이력", "ko": "확인된 국문 이력" }
  ]
}
```

Awards / Grants와 Publications / Artist Books도 같은 구조입니다. 빈 그룹은 노출하지 않습니다. 예시 문구는 실제 이력으로 공개하지 마세요.
연락처는 **src/config/site.json**의 email입니다.

## GitHub Pages 배포

1. 변경사항을 검토하고 GitHub main 브랜치에 반영합니다. 현재 작업은 로컬이며 push하지 않았습니다.
2. Settings → Pages → Source를 **GitHub Actions**로 선택합니다.
3. main에 push하거나 Actions의 GitHub Pages workflow를 수동 실행합니다. 기본 브랜치가 main이 아니면 .github/workflows/pages.yml의 branches를 수정합니다.
4. Pages의 Custom domain을 **younsungmin.com**으로 확인하고 해당 저장소의 GitHub Pages DNS와 HTTPS를 설정합니다. 기존 DNS를 먼저 확인하세요.
5. workflow는 검사 후 dist만 배포합니다. public/CNAME으로 도메인을 유지합니다.

기존 루트 CNAME, .openai/hosting.json 및 Cloudflare 초기 코드/설정은 보존되어 있습니다. 새 Astro 배포에는 사용되지 않습니다.
실제 사진의 순서·비율·밝기와 PDF의 빈 페이지는 자료를 넣은 뒤 작가가 최종 확인하세요.
