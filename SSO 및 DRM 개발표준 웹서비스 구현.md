# SSO 및 DRM 개발표준 웹서비스 구현
> 최종 업데이트: 2026-04-10 | 버전: v2026.04.10.01

---

## 1. 프로젝트 개요

### 1.1 목적
AICP(AI Cost Planner) — 전기 버전은 건축 전기 견적 업무를 AI로 자동화하는 웹 애플리케이션입니다.
- 공사/연단가 계약 품목을 표준 DB 코드로 **AI 자동 분류**
- 실행내역서에 DB 단가를 **자동 매칭(Fill-UP)**
- 견적 DB를 실적 기반으로 **자동 업데이트**
- 물가지수 PDF에서 **AI 표 데이터 추출**

### 1.2 기술 스택
| 구분 | 기술 |
|------|------|
| 프론트엔드 | Next.js 15.2.4 (App Router), TypeScript, React 19 |
| 백엔드 | FastAPI (Python 3.11), uvicorn |
| DB | Azure SQL Database (DEV/PRD) |
| AI | Azure OpenAI (GPT-4.1-mini, GPT-5.4-mini) |
| 인프라 | Docker Compose (nginx + DRM proxy), Linux (Rocky 8) |
| 인증 | POSCO SSO (SWP-SSO), TCM 토큰 |
| 파일관리 | DFS (DRM File Server) + DRM 암/복호화 |

### 1.3 아키텍처
```
[사용자 브라우저]
       |
       | HTTPS (443)
       v
┌─── Docker Compose ──────────────────────────────────────────┐
│                                                             │
│  [nginx :80/:443]  리버스 프록시                            │
│       |-- /aicp_elec/*         --> host:3010 (Next.js)           │
│       |-- /aicp_elec-api/*     --> host:8010 (FastAPI)           │
│       |-- /api/auth/sso/* --> host:3010 (Next.js)           │
│       |-- /proxy/*  ──┐                                     │
│                       v                                     │
│  [DRM Proxy :3000]  (소스: 별도 레포 ai_service_drm)        │
│       |-- /proxy/dev/*  --> dfs-dev.poscoenc.com            │
│       |-- /proxy/prod/* --> dfs.poscoenc.com                │
│       * /data2/axi 볼륨 마운트 (DFS 파일 저장/읽기)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
       |                    |
[Next.js :3010]      [FastAPI :8010]         [/data2/axi/]
 호스트 직접 실행      호스트 직접 실행        DFS 공유 볼륨
       |                    |
 [SSO 서버]          [Azure SQL DB]
 swpsso.posco.net     DEV / PRD
       |
 [TCM 서버]
 tcm-dev.poscoenc.com
```

> 모든 개발계 웹서비스는 `axyard.poscoenc.com` 아래 path 기반으로 분기됩니다 (1.4 참조).

### 1.4 도메인 / 경로 표준 (인프라 협의 사항)

개발계 웹서비스는 인프라 팀과 협의하여 **다음 2개 도메인만** 사용합니다.
신규 도메인은 추가로 생성하지 않으며, 모든 신규 시스템은 같은 도메인 아래 **path 기반**으로 분기합니다.

| 도메인 | 용도 | IP | DNS |
|--------|------|----|-----|
| `axyard.poscoenc.com` | 개발계 서버 | `172.22.64.69` | 내부 DNS 등록 완료 |
| `axbuilt.poscoenc.com` | 가동계(운영) 서버 | `172.22.64.82` | 내부 DNS 등록 완료 |

> **시스템 이름**: AX추진반 AI서비스 운영계 / 개발계
> 두 도메인 모두 인프라팀에 사전 등록 요청 완료된 상태이며, 추가 도메인 신청 없이 path 기반으로 신규 시스템을 분기합니다.

**경로 규칙 — 신규 시스템도 동일 패턴**

현재 AICP 전기는 `https://axyard.poscoenc.com/aicp_elec/` 로 서비스되고 있으며,
새 시스템을 추가할 때도 같은 도메인 아래 path만 다르게 붙입니다.

```
https://axyard.poscoenc.com/aicp_elec/      ← AICP 전기 (본 시스템)
https://axyard.poscoenc.com/aicp_arch/      ← AICP 건축 (예시)
https://axyard.poscoenc.com/aicp_civil/     ← AICP 토목 (예시)
https://axyard.poscoenc.com/<시스템명>/      ← 모든 신규 시스템
```

**신규 시스템 추가 절차**
1. nginx.conf에 `location /<시스템명> { proxy_pass http://host.docker.internal:<포트>; }` 한 줄 추가
2. Next.js `next.config.ts`의 `basePath: "/<시스템명>"` 설정
3. SSO 콜백 URL을 `https://axyard.poscoenc.com/<시스템명>/api/auth/sso/callback` 으로 등록 요청
4. 새 도메인을 만들 필요 **없음** — 인프라 추가 요청 불필요 (DNS는 위 2개로 고정)

---

## 2. 프로젝트 구조

```
ai_autounitcost_elec_26_nextjs/
├── backend/                    # FastAPI 백엔드
│   ├── main.py                 # 진입점 (라우터 등록)
│   ├── requirements.txt        # Python 패키지
│   ├── Dockerfile
│   ├── routers/
│   │   ├── unit_price.py       # 개별단가 DB
│   │   ├── reference.py        # 레퍼런스
│   │   ├── const_contract.py   # 공사용역 계약
│   │   ├── year_contract.py    # 연단가 계약
│   │   ├── execution.py        # 실행내역서 Fill-UP
│   │   ├── auto_update.py      # 견적DB 자동 업데이트
│   │   └── price_index.py      # 물가지수 추출
│   └── dfs/
│       ├── reader.py           # DFS 볼륨 파일 읽기
│       └── models.py           # FileItem 모델
│
├── frontend/                   # Next.js 14 프론트엔드
│   ├── src/
│   │   ├── app/
│   │   │   ├── (main)/         # 메인 레이아웃 그룹
│   │   │   │   ├── home/
│   │   │   │   ├── unit-price/
│   │   │   │   ├── reference/
│   │   │   │   ├── const-contract/
│   │   │   │   ├── year-contract/
│   │   │   │   ├── execution/
│   │   │   │   ├── auto-update/
│   │   │   │   └── price-index/
│   │   │   └── api/auth/sso/   # SSO API 라우트
│   │   ├── components/layout/
│   │   │   └── Sidebar.tsx
│   │   ├── lib/
│   │   │   ├── api.ts          # API 유틸 (GET/POST/download/uploadForm)
│   │   │   └── auth.ts         # SSO 토큰 검증
│   │   └── middleware.ts       # SSO 인증 미들웨어
│   ├── package.json
│   └── Dockerfile
│
├── modules/                    # Python AI 모듈 (소문자)
│   ├── _4_ConstructionContract/
│   ├── _5_YearContract/
│   ├── _6_Execution/
│   └── _7_AutoUpdate/
│
├── jobs/                       # AI 분류 Job 결과 (pkl 파일)
├── reference/                  # 기준파일.xlsx
├── utils/                      # 공통 유틸리티
│
├── azure_db_manager.py         # Azure SQL 연결/쿼리
├── column_mapper.py            # 컬럼 매핑 사전
├── data_processor.py           # 엑셀 처리
│
├── docker-compose.yml          # nginx + DRM proxy
├── nginx.conf                  # nginx 설정
├── .env                        # 환경변수
└── .gitignore
```

### 네이밍 컨벤션
- 폴더: **소문자** (modules, jobs, reference, utils)
- Python 파일: **스네이크케이스** (azure_db_manager.py)
- 프론트엔드: **케밥케이스** (const-contract, auto-update)
- UI: **이모지 미사용**

---

## 3. 환경 설정

### 3.1 .env
```env
# Azure OpenAI (AI 분류용)
AZURE_OPENAI_API_KEY=********
AZURE_OPENAI_ENDPOINT=https://enc-dev-mkc-****.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=AI_AutoUnitCost_gpt-4.1-mini
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# Azure OpenAI Vision (물가지수 추출용)
AZURE_OPENAI_VISION_API_KEY=********
AZURE_OPENAI_VISION_ENDPOINT=https://enc-dev-meu2-****.openai.azure.com/
AZURE_OPENAI_VISION_DEPLOYMENT_NAME=AI_AutoUnitCost_gpt-5.4-mini
AZURE_OPENAI_VISION_API_VERSION=2024-12-01-preview

# Azure SQL (PRD)
AZURE_PRD_SERVER=enc-prd-****.database.windows.net
AZURE_PRD_DB=enc-prd-****
AZURE_PRD_USER=****
AZURE_PRD_PASSWORD=****

# Azure SQL (DEV)
AZURE_DEV_SERVER=enc-dev-****.database.windows.net
AZURE_DEV_DB=enc-dev-****
AZURE_DEV_USER=****
AZURE_DEV_PASSWORD=****

APP_PASSWORD=****
```

### 3.2 주요 패키지
**Python (backend/requirements.txt)**
```
fastapi, uvicorn[standard], python-multipart, pydantic
pandas, openpyxl, numpy, scipy, scikit-learn
rapidfuzz, python-dotenv, pyodbc, requests
PyMuPDF, openai
```

**Node.js (frontend/package.json)**
```
next@14, react@18, typescript
```

---

## 4. 서버 구성 및 배포

> **중요 — 인프라 재구성(2026-04-08)**
> nginx와 DRM Proxy는 본 프로젝트에서 분리되어 **공용 인프라**로 이관되었습니다.
> - nginx: `~/infra/nginx/nginx.conf` + `~/infra/docker-compose.yml` (컨테이너명 `axyard-nginx`)
> - DRM Proxy: `~/ai_service_drm/docker-compose.yml` (컨테이너명 `drm-proxy`)
> - 두 컨테이너는 공용 도커 네트워크 `axyard-net` 으로 통신합니다.
> - 본 프로젝트의 `docker-compose.yml` / `nginx.conf` 는 제거되었습니다.

### 4.1 공용 인프라 구성 (참고)
elec 프로젝트는 인프라 컨테이너를 직접 관리하지 않지만, 운영 시 참고를 위해 공용 구성 개요를 남깁니다.

```yaml
# ~/infra/docker-compose.yml (요약)
services:
  nginx:
    image: nginx:alpine
    container_name: axyard-nginx
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - /home/pewsop/ssl/STAR.poscoenc.com_crt.pem:/etc/nginx/ssl/nginx.crt:ro
      - /home/pewsop/ssl/STAR.poscoenc.com_key.pem:/etc/nginx/ssl/nginx.key:ro
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks: [axyard-net]

networks:
  axyard-net:
    external: true

# ~/ai_service_drm/docker-compose.yml (요약)
services:
  drm-proxy:
    build: .
    container_name: drm-proxy
    restart: unless-stopped
    volumes:
      - /data2/axi:/data2/axi    # DFS 볼륨 (필수)
    networks: [axyard-net]

networks:
  axyard-net:
    external: true
```

### 4.2 nginx 주요 설정 (elec 부분만 발췌)
`~/infra/nginx/nginx.conf` 안에는 elec 외에도 arc 등 다른 시스템 블록이 함께 들어있습니다. 아래는 elec 관련 블록입니다.

```nginx
# FastAPI 백엔드
location /aicp_elec-api/ {
    rewrite ^/aicp_elec-api/(.*)$ /$1 break;
    proxy_pass http://host.docker.internal:8010;
    proxy_read_timeout 600s;       # 긴 처리 대응
    proxy_buffering off;           # SSE 스트리밍용
}

# Next.js 프론트엔드
location /aicp_elec {
    proxy_pass http://host.docker.internal:3010;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";  # WebSocket (HMR)
}

# DRM 프록시 (공용)
location /proxy/ {
    proxy_pass http://drm-proxy:3000;   # 컨테이너명 기반, axyard-net 으로 통신
}

# SSO 콜백 (nginx → Next.js로 rewrite)
location ~ ^/api/auth/sso/(.*)$ {
    rewrite ^/api/auth/sso/(.*)$ /aicp_elec/api/auth/sso/$1 break;
    proxy_pass http://host.docker.internal:3010;
}
```

### 4.3 서버 실행 명령어

> **로그 파일 명명 규칙 (공용 서버 공유)**
> 한 서버에 여러 시스템(elec, arc, ...)이 떠 있으므로 로그 파일 이름에 시스템 식별자를 반드시 붙입니다.
> - `~/logs/backend_elec.log` — elec 백엔드 (uvicorn 8010)
> - `~/logs/frontend_elec.log` — elec 프론트엔드 (next start 3010)
> - `~/logs/backend_arc.log` / `~/logs/frontend_arc.log` — arc 쪽 (별도 관리)
>
> `backend.log` 같은 일반 이름은 사용 금지 — 여러 시스템이 같은 파일을 덮어써서 디버깅이 꼬입니다.

> **백그라운드 실행 표준 패턴 — `setsid nohup ... < /dev/null &`**
>
> 단순 `nohup ... &` 만 쓰면 SSH 세션 종료 시 `npm exec` 같은 자식 프로세스 트리가 SIGHUP 전파로 같이 죽는 사례가 확인되었습니다. 특히 Next.js (`npx next start`)에서 빈번하게 발생합니다.
>
> **반드시 다음 4요소를 모두 사용**:
> ```bash
> setsid nohup <명령어> < /dev/null > ~/logs/<이름>.log 2>&1 &
> ```
>
> | 요소 | 역할 |
> |------|------|
> | `setsid` | 새 세션 분리 → 컨트롤링 터미널 hangup 차단 (가장 중요) |
> | `nohup` | 보조 — SIGHUP 무시 |
> | `< /dev/null` | stdin 분리 — EOF 종료 방지 |
> | `> log 2>&1` | stdout/stderr 파일로 |
>
> **검증**: 띄운 직후 `ps -o pid,ppid,cmd -p $(pgrep -f <패턴>)` 로 **PPID가 `1` (init/systemd)** 인지 확인. PPID가 본인 쉘이면 setsid가 빠진 것 → SSH 종료 시 죽습니다.

**백엔드 (FastAPI) — pyenv Python 3.11**
```bash
# pyenv local 3.11.9 가 프로젝트 디렉토리에 설정되어 있음
cd /home/pewsop/ai_autounitcost_elec_26_nextjs/backend
setsid nohup uvicorn main:app --host 0.0.0.0 --port 8010 \
  < /dev/null > ~/logs/backend_elec.log 2>&1 &

# (옵션) --reload 모드: 코드 변경 시 자동 재시작
setsid nohup uvicorn main:app --host 0.0.0.0 --port 8010 --reload \
  --reload-dir /home/pewsop/ai_autounitcost_elec_26_nextjs/backend \
  --reload-dir /home/pewsop/ai_autounitcost_elec_26_nextjs/modules \
  < /dev/null > ~/logs/backend_elec.log 2>&1 &
```

> Python 3.6.8(시스템 기본)은 FastAPI 미지원이므로 반드시 pyenv 3.11 사용. `cd` 후 `python3 --version` 으로 3.11.9가 떠야 정상.

**프론트엔드 (Next.js)**
```bash
cd /home/pewsop/ai_autounitcost_elec_26_nextjs/frontend
setsid nohup npx next start -p 3010 \
  < /dev/null > ~/logs/frontend_elec.log 2>&1 &
```

**Docker (공용 인프라 — nginx / DRM proxy)**
```bash
# 공용 네트워크 (최초 1회)
docker network create axyard-net 2>/dev/null || true

# DRM Proxy
cd ~/ai_service_drm
docker compose up -d

# nginx
cd ~/infra
docker compose up -d

# 상태 확인
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### 4.4 배포 절차

서버에는 `~/watch_and_pull.sh`가 백그라운드로 돌면서 **10초마다 자동으로 git pull**을 수행합니다 (4.4.1 참조). 따라서 로컬에서 push만 하면 코드는 자동으로 서버에 들어오지만, **서비스 재시작이 자동인지 수동인지는 변경 영역에 따라 다릅니다.**

#### 변경 영역별 반영 방식

| 변경 영역 | 자동 반영 여부 | 추가 조치 |
|-----------|----------------|----------|
| 백엔드 Python 코드 (`backend/`, `modules/`) | `--reload` 모드일 때만 자동 | `--reload` 미사용 시 uvicorn 재시작 |
| 프론트 Next.js 코드 (`frontend/`) | 자동 안 됨 | `npm run build` 후 Next.js 재시작 (production 모드) |
| nginx 설정 (`~/infra/nginx/nginx.conf`) | 자동 안 됨 | `docker exec axyard-nginx nginx -s reload` |
| DRM 프록시 (`~/ai_service_drm/`) | 자동 안 됨 | `cd ~/ai_service_drm && docker compose up -d --build` |
| 가이드/문서 (`*.md`, `*.docx`) | 자동 | 없음 |

#### 4.4.1 자동 배포 (코드만 바뀌고 백엔드가 --reload 모드일 때)
조건: **백엔드가 `--reload` 옵션으로 떠 있고 + 백엔드 Python 코드만 수정**
```bash
# 로컬에서 push 만 하면 끝
git push
# 서버: watch_and_pull.sh → 10초 안에 git pull
#       uvicorn --reload → modules/, backend/ 변경 자동 감지 후 재기동
```
- 프론트엔드를 동시에 수정한 경우엔 자동 배포 대상이 아님 (4.4.2 참조)
- `--reload` 없이 떠 있으면 자동 적용 안 됨 → 4.4.2로 처리

#### 4.4.2 수동 배포 (프론트 변경 / 백엔드 --reload 미사용 / 설정 변경)
```bash
# 1. 서버 접속
ssh pewsop@<서버>
cd /home/pewsop/ai_autounitcost_elec_26_nextjs

# 2. (선택) 즉시 pull — watch_and_pull.sh를 기다리기 싫을 때
git pull

# 3-A. 백엔드만 재시작 (Python 코드 변경)
pkill -f "uvicorn main:app"
cd backend
setsid nohup uvicorn main:app --host 0.0.0.0 --port 8010 \
  < /dev/null > ~/logs/backend_elec.log 2>&1 &

# 3-B. 프론트엔드 재배포 (Next.js 코드 변경)
cd /home/pewsop/ai_autounitcost_elec_26_nextjs/frontend
npm run build
# 기존 next start 종료 후 재시작
pkill -f "next start"
setsid nohup npx next start -p 3010 < /dev/null > ~/logs/frontend_elec.log 2>&1 &

# 3-C. nginx 설정 변경 시 (공용 인프라)
vi ~/infra/nginx/nginx.conf
docker exec axyard-nginx nginx -t        # 문법 검증
docker exec axyard-nginx nginx -s reload # 무중단 reload
# 또는
cd ~/infra && docker compose restart nginx

# 3-D. DRM 프록시 변경 시 (공용 인프라)
cd ~/ai_service_drm
git pull
docker compose up -d --build
```

> **주의**: 프론트엔드는 production 모드(`next start`)로 떠 있으므로 코드 변경 시 **반드시 `npm run build` 후 재시작** 해야 합니다. 빌드 없이 코드만 바꾸면 반영되지 않습니다.

#### 4.4.3 캐시 관련
- `git pull` 시 post-merge hook이 `__pycache__`를 자동 삭제하도록 설정되어 있습니다.
- 수동 삭제가 필요할 때:
  ```bash
  find /home/pewsop/ai_autounitcost_elec_26_nextjs -name "__pycache__" -exec rm -rf {} + 2>/dev/null
  ```

#### 자동 배포 (watch_and_pull.sh)
서버에는 백그라운드로 git pull을 주기적으로 도는 스크립트가 등록되어 있습니다.

```bash
# ~/watch_and_pull.sh
#!/bin/bash
while true; do
    sleep 10
    cd ~/ai_autounitcost_elec_26_nextjs
    git pull --quiet
done
```

```bash
# 실행 확인
ps aux | grep watch_and_pull
# pewsop  338179 ... /bin/bash /home/pewsop/watch_and_pull.sh

# 다시 시작
nohup ~/watch_and_pull.sh > ~/logs/watch_and_pull.log 2>&1 &
```

> 로컬에서 push 하면 약 10초 안에 서버에 반영됩니다. **단, 백엔드/프론트 재시작은 별도** — 코드 변경 후엔 uvicorn `--reload` 또는 수동 재시작 필요.

### 4.5 DRM 프록시 별도 레포 (ai_service_drm)

DRM 프록시는 **독립된 Git 레포**로 관리됩니다. 다른 프로젝트에서도 재사용할 수 있도록 분리되어 있습니다.

**레포 정보:**
```
git@172.22.32.41:poscoenc_ai/ai_service_drm.git

ai_service_drm/
├── Dockerfile         # Python 3.11-slim 기반
├── proxy-server.py    # DFS 프록시 서버 (포트 3000)
└── README.md          # 사용법 문서
```

**proxy-server.py 동작 원리:**
- HTTP 서버가 3000 포트에서 실행
- `/proxy/dev/*` 요청 → `https://dfs-dev.poscoenc.com`으로 전달 (개발계)
- `/proxy/prod/*` 요청 → `https://dfs.poscoenc.com`으로 전달 (운영계)
- 요청 헤더/바디를 그대로 전달하고, DFS 서버 응답을 그대로 반환

**다른 프로젝트에서 사용하는 방법:**

1. 프로젝트와 같은 레벨에 clone:
```bash
cd /home/pewsop
git clone git@172.22.32.41:poscoenc_ai/ai_service_drm.git
```

2. docker-compose.yml에서 참조:
```yaml
services:
  drm-proxy:
    build:
      context: ../ai_service_drm   # 같은 레벨의 별도 레포
    restart: unless-stopped
    volumes:
      - /data2/axi:/data2/axi     # DFS 볼륨 마운트 (필수!)
    expose:
      - "3000"
```

3. nginx에서 프록시 경로 추가:
```nginx
location /proxy/ {
    proxy_pass http://drm-proxy:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

4. 프론트엔드에서 DRM 업로드/다운로드 호출:
```typescript
// 업로드 (DRM 복호화)
fetch("/proxy/dev/pecUpFm/fileUpload", { method: "POST", body: formData })

// 다운로드 (DRM 암호화)
fetch(`/proxy/dev/pecFm/fileCompressDownload?CD_DOWNLOAD_FILE_INFO=${param}`)
```

**DRM 프록시 관리 명령어:** (공용 인프라 — `~/ai_service_drm/` 자체 compose 에서 관리)
```bash
# 재빌드 (코드 변경 시)
cd ~/ai_service_drm && git pull
docker compose up -d --build

# 로그 확인
docker compose logs drm-proxy --tail 20

# 상태 확인
docker compose ps
```

**주의사항:**
- DFS 볼륨(`/data2/axi`)이 반드시 Docker에 마운트되어야 함
- DFS 저장 경로(SAVE_PATH)의 디렉토리 소유자가 `tcmsdr`여야 DRM 프록시가 쓸 수 있음
- 새 SAVE_PATH 디렉토리 생성 시: `mkdir -p /data2/axi/elec/{새경로} && chmod 775 /data2/axi/elec/{새경로}`

---

### 4.6 운영 모니터링 + Watchdog (사망 방지)

#### 배경 — 왜 필요한가
운영 중 다음과 같은 사망 사례가 반복적으로 발생했습니다.

- 백엔드(FastAPI)는 살아있는데 **프론트(Next.js `npx next start`)만 죽어 502 발생**
- SSH 세션을 닫고 다음날 들어와 보면 호스트 프로세스 일부가 사라져 있음
- 단순 `nohup` 만으로는 막히지 않는 패턴 존재

원인 분석 결과:
- `npx next start`는 내부적으로 `npm exec` → `next-server` 식 다중 자식 트리를 만듦
- SSH 세션 종료 시 컨트롤링 터미널이 사라지며 **프로세스 그룹 전체에 SIGHUP** 이 전송됨
- `nohup`은 첫 프로세스(`npm exec`)에만 SIGHUP 무시 플래그를 걸어주고, **자식인 `next-server` 까지 자동 전파되지 않음**
- 결과적으로 `next-server`가 죽고 `npm exec`도 EOF로 같이 종료

**해결 원칙 두 가지**:
1. **`setsid`로 새 세션 분리** — 컨트롤링 터미널 자체를 만들지 않으므로 SIGHUP 발생 경로 차단
2. **Watchdog으로 자가 복구** — 그럼에도 죽는 경우를 대비한 자동 재기동 + Teams 알림

#### 4.6.1 백그라운드 실행 표준 (재요약)
```bash
setsid nohup <명령어> < /dev/null > ~/logs/<이름>.log 2>&1 &
```

검증: `ps -o pid,ppid,cmd -p $(pgrep -f <패턴>)` 의 PPID가 **1 (init/systemd)** 이어야 정상.

#### 4.6.2 두 시스템의 역할 분리

| 시스템 | 역할 | 위치 |
|--------|------|------|
| **모니터링 데몬** (`/opt/server-monitor/monitor.py`) | 디스크/메모리/Docker/포트 이상 감지 → Teams 알림 | systemd 서비스 (`server-monitor.service`) |
| **Watchdog** (`~/watchdog_services.sh`) | 서비스 다운 즉시 감지 → 자동 재기동 + Teams 알림 | setsid nohup 백그라운드 |

두 시스템은 **체크 주기 60초로 같지만 트리거 조건이 다릅니다.**
- 모니터링: 자원 임계값 + 컨테이너 변경 + 포트 2회 연속 실패
- Watchdog: 포트 1회 실패 → 즉시 재기동 + 알림 + 30초 후 복구 알림

Watchdog이 죽은 서비스를 1분 안에 살려놓으므로 사용자 입장에서는 다운타임이 최소화되고, Teams에는 다운/복구 한 쌍의 알림이 도착합니다.

#### 4.6.3 모니터링 데몬 감시 항목

| 항목 | 임계 |
|------|------|
| 디스크 사용률 | 80% 경고 / 90% 위험 |
| 메모리 사용률 | 80% 경고 / 90% 위험 |
| Docker 이미지 누적 | 50GB 초과 경고 |
| Docker 컨테이너 변경 | 신규/종료 즉시 감지 (GitLab Runner·랜덤 이름 컨테이너 제외) |
| 호스트 서비스 포트 | 2회 연속 실패 시 알림 |

#### 4.6.4 Watchdog 감시 포트 (서비스 5종)

| 포트 | 서비스 | 종류 | 체크 방식 |
|------|--------|------|----------|
| 3010 | elec-frontend | Next.js | TCP LISTEN |
| 8010 | elec-backend | FastAPI | HTTP `/health` |
| 3011 | arc-frontend | Next.js | TCP LISTEN |
| 8011 | arc-backend | FastAPI | TCP LISTEN |
| 8001 | jinja2 | FastAPI + Jinja2 | TCP LISTEN |

> 신규 서비스 추가 시 양쪽(`monitor.py`, `watchdog_services.sh`) **모두에 등록**해야 합니다. 한쪽만 등록하면 알림 또는 재기동 중 하나가 누락됩니다.

#### 4.6.5 Watchdog 동작 흐름

```
60초 주기로 LISTEN 점검
   │
   ▼ (포트 사라짐 감지)
[부검 로그 기록]
   • 시각, 메모리, 디스크
   • 최근 dmesg (OOM 등)
   • 최근 SSH 세션 종료 기록
   │
   ▼
[Teams 알림 — 다운]
   curl POST $WEBHOOK
   "[위험] 서비스 다운: <이름> (포트) → 자동 재기동 시도"
   │
   ▼
[자동 재기동]
   setsid nohup <명령어> ...
   │
   ▼ (30초 대기)
[복구 확인]
   ss -tln | grep :PORT
   │
   ▼
[Teams 알림 — 복구]
   "[복구] 서비스 정상화: <이름> (포트)"
```

#### 4.6.6 Watchdog 실행/관리 명령

```bash
# 시작 (반드시 setsid)
setsid nohup bash ~/watchdog_services.sh \
  < /dev/null >> ~/logs/watchdog_runner.log 2>&1 &

# 상태 확인 (PPID=1 이어야 정상)
ps -o pid,ppid,cmd -p $(pgrep -f watchdog_services.sh)

# 로그 확인
tail -50 ~/logs/watchdog.log

# 중지
pkill -f watchdog_services.sh

# 동작 테스트 (jinja2 강제 종료 → 1분 내 재기동 확인)
kill $(pgrep -f "uvicorn main:app.*8001")
sleep 70
ss -tlnp 2>/dev/null | grep 8001
tail -30 ~/logs/watchdog.log
```

#### 4.6.7 신규 서비스 추가 시 체크리스트

1. `~/watchdog_services.sh` 의 `SERVICES` 와 `NAMES` 딕셔너리에 포트 추가
2. `/opt/server-monitor/monitor.py` 의 `service_ports` 딕셔너리에 포트 추가
3. 모니터링 데몬 재시작: `sudo systemctl restart server-monitor`
4. Watchdog 재시작:
   ```bash
   pkill -f watchdog_services.sh
   setsid nohup bash ~/watchdog_services.sh < /dev/null >> ~/logs/watchdog_runner.log 2>&1 &
   ```
5. 강제 다운 → 1분 내 재기동 + Teams 알림 도착 검증

---

## 5. SSO 인증 (상세)

### 5.1 전체 흐름
```
1. 사용자 → https://axyard.poscoenc.com/aicp_elec/home 접근
2. [middleware.ts] AXI-SSO-TOKEN 쿠키 확인
3. 쿠키 없음 → SSO 로그인 페이지로 리다이렉트
   (returnTo를 AXI-RETURN-TO 쿠키에 저장)
4. 사용자가 SSO 로그인 완료
5. SSO 서버 → POST /api/auth/sso/callback (ssoToken 전달)
6. [callback/route.ts]
   a. validateSsoToken(ssoToken) → SSO 서버에 검증 요청
   b. getTcmToken(empId) → TCM 토큰 발급
   c. 쿠키 4개 설정 (AXI-SSO-TOKEN, AXI-TCM-TOKEN, AXI-USER-ID, AXI-USER-NAME)
   d. AXI-RETURN-TO 경로로 리다이렉트
7. 이후 요청마다 middleware에서 AXI-SSO-TOKEN 확인
```

### 5.2 middleware.ts
```typescript
// SSO 쿠키 없으면 SSO 로그인으로 리다이렉트
const token = req.cookies.get("AXI-SSO-TOKEN")?.value;
if (!token) {
  const loginUrl = `${SSO_REDIRECT}?redir_url=${encodeURIComponent(CALLBACK_URL)}`;
  const res = NextResponse.redirect(loginUrl);
  res.cookies.set("AXI-RETURN-TO", returnTo, { path: "/", maxAge: 300 });
  return res;
}
```

### 5.3 쿠키 구조
| 쿠키명 | 용도 | httpOnly | maxAge |
|--------|------|----------|--------|
| AXI-SSO-TOKEN | SSO 세션 토큰 (인증 확인용) | true | 24시간 |
| AXI-TCM-TOKEN | TCM 토큰 (DRM 다운로드용) | false | 180일 |
| AXI-USER-ID | 직번 (empId) | false | 24시간 |
| AXI-USER-NAME | 영문이름 | false | 24시간 |

### 5.4 /api/auth/me
```typescript
// 사이드바에서 사용자 정보 조회
const token = req.cookies.get("AXI-SSO-TOKEN")?.value;
const user = await validateSsoToken(token);
if (!user) {
  // 만료 → 쿠키 삭제 → 401
  res.cookies.delete("AXI-SSO-TOKEN");
  return NextResponse.json(null, { status: 401 });
}
return NextResponse.json(user);
// → { loginId, empId, deptName, englishName, email, ... }
```

### 5.5 세션 만료 처리
```typescript
// Sidebar.tsx에서 401 감지 시 reauth
fetch("/aicp_elec/api/auth/me").then((r) => {
  if (r.status === 401) {
    window.location.href = `/aicp_elec/api/auth/sso/reauth?returnTo=${returnTo}`;
  }
});
```

### 5.6 SSO 우회 (개발/테스트 모드)

아직 SSO 연동이 안 됐거나, 신규 기능을 만들면서 SSO 없이 빠르게 개발하고 싶을 때 사용하는 표준 패턴입니다.

#### 권장 패턴: 미들웨어에서 우회 + 테스트 쿠키 자동 주입

`frontend/src/middleware.ts`에 `DEV_BYPASS` 분기를 두고, **켜져 있을 때 SSO 검증을 건너뛰면서 동시에 테스트용 쿠키를 자동으로 응답에 심어줍니다.** 이렇게 하면 브라우저가 한 번이라도 페이지를 열면 쿠키가 자동 세팅되고, 이후 모든 요청(프론트/백엔드 모두)이 정상 통과합니다.

```typescript
// frontend/src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

// 개발 우회 모드에서 사용할 가짜 사용자
const DEV_USER = {
  ssoToken: "dev-bypass-token",
  tcmToken: "dev-bypass-tcm",
  userId: "162264",          // admins.json에 등록된 직번
  userName: "테스트사용자",
};

export function middleware(req: NextRequest) {
  if (DEV_BYPASS) {
    const res = NextResponse.next();
    // 쿠키가 없을 때만 자동 주입 (이미 있으면 유지)
    if (!req.cookies.get("AXI-USER-ID")) {
      const opts = { path: "/", maxAge: 60 * 60 * 24 };
      res.cookies.set("AXI-SSO-TOKEN", DEV_USER.ssoToken, opts);
      res.cookies.set("AXI-TCM-TOKEN", DEV_USER.tcmToken, opts);
      res.cookies.set("AXI-USER-ID",   DEV_USER.userId,   opts);
      res.cookies.set("AXI-USER-NAME", DEV_USER.userName, opts);
    }
    return res;
  }

  // 실제 SSO 검증 로직 ...
}
```

실행:
```bash
# 개발 환경
NEXT_PUBLIC_DEV_BYPASS=true npm run dev

# 또는 frontend/.env.local 에 한 줄
NEXT_PUBLIC_DEV_BYPASS=true
```

이렇게 하면 **브라우저에 쿠키를 수동으로 박을 필요 없이** 페이지에 들어가는 순간 자동으로 쿠키가 심어지고, 백엔드 권한 체크(`AXI-USER-ID`)도 그대로 통과합니다.

#### 가짜 값 vs 실제 값 — 어느 토큰까지 진짜로 넣어야 하나?

위의 `DEV_USER` 값들이 다 진짜여야 하는 건 아닙니다. 각 쿠키의 검증 위치에 따라 다릅니다:

| 쿠키 | 가짜 값으로 OK? | 검증 위치 / 비고 |
|------|----------------|----------------|
| `AXI-USER-ID` | OK (단, **admins.json 또는 allowed_users.json에 있는 직번이어야** 권한 통과) | 백엔드가 `request.cookies.get("AXI-USER-ID")`로 단순 비교만 함. 외부 검증 없음 |
| `AXI-USER-NAME` | OK (어떤 문자열이든 가능) | 표시용. 검증 안 함 |
| `AXI-SSO-TOKEN` | 조건부 OK | 미들웨어는 `DEV_BYPASS=true`일 때 검증을 건너뛰지만, `/api/auth/me`(사이드바 사용자 정보 조회)는 `validateSsoToken()`이 SSO 서버에 묻습니다. 가짜면 401 → 사이드바 사용자 정보가 안 뜸. 무시 가능하면 그대로, 정 거슬리면 `/api/auth/me`도 `DEV_BYPASS` 분기 추가 |
| `AXI-TCM-TOKEN` | DRM 안 쓸 때만 OK | DFS 서버(`/proxy/...`)는 실제 TCM 토큰을 검증함. 가짜면 401/403. **DRM 업/다운로드 기능을 실제로 호출하려면 진짜 토큰 필요** |

#### 진짜 토큰 받는 법 (DRM 테스트가 필요할 때)
1. 운영 환경(`https://axyard.poscoenc.com/aicp_elec/`)에 **본인 SSO 계정으로 1회 정상 로그인**
2. 브라우저 개발자도구(F12) → **Application → Cookies → `https://axyard.poscoenc.com`**
3. `AXI-TCM-TOKEN`의 Value를 복사
4. 로컬 개발 환경의 `frontend/.env.local`에 보관:
   ```env
   NEXT_PUBLIC_DEV_BYPASS=true
   NEXT_PUBLIC_DEV_TCM_TOKEN=<복사한 진짜 토큰>
   ```
5. `middleware.ts`에서 환경변수로 받아 사용:
   ```typescript
   const DEV_USER = {
     ssoToken: "dev-bypass-token",      // 가짜 OK
     tcmToken: process.env.NEXT_PUBLIC_DEV_TCM_TOKEN || "dev-bypass-tcm",
     userId:   "162264",                 // admins.json에 있는 본인 직번
     userName: "테스트사용자",
   };
   ```

> TCM 토큰은 만료 기간이 180일이라 한 번 받아두면 한참 씁니다. 만료되면 위 절차를 다시 반복.

> **주의**: `NEXT_PUBLIC_DEV_BYPASS`와 `NEXT_PUBLIC_DEV_TCM_TOKEN`은 절대 운영 빌드에 들어가면 안 됩니다. `.env.local`은 `.gitignore`에 포함되어 있으므로 commit되지 않지만, CI/배포 환경에서 환경변수가 잘못 설정되지 않도록 주의해야 합니다.

#### 백엔드만 단독 테스트 (curl)
프론트엔드 없이 백엔드 API만 검증할 때는 `Cookie` 헤더로 직접 user_id를 넘기면 됩니다:
```bash
curl -H "Cookie: AXI-USER-ID=162264" http://localhost:8010/api/admin/check
```

---

### 5.7 다른 프로젝트에 SSO 적용하기
1. `frontend/src/lib/auth.ts` 복사 (validateSsoToken)
2. `frontend/src/middleware.ts` 복사 (SSO_REDIRECT, CALLBACK_URL 수정)
3. `frontend/src/app/api/auth/sso/callback/route.ts` 복사
4. `frontend/src/app/api/auth/me/route.ts` 복사
5. nginx에 `/api/auth/sso/*` → Next.js rewrite 추가
6. SSO 시스템에 콜백 URL 등록 요청
   - **반드시 `axyard.poscoenc.com` 또는 `axbuilt.poscoenc.com` 하위 path로 등록**
     (인프라 협의: 개발계 도메인 추가 신청 불필요, path 기반 분기 사용)
   - 등록 형식: `https://axyard.poscoenc.com/<시스템명>/api/auth/sso/callback`
   - 자세한 도메인 표준은 [1.4 도메인 / 경로 표준](#14-도메인--경로-표준-인프라-협의-사항) 참조

---

## 6. DRM 암/복호화 (상세)

### 6.1 DFS 개요
DFS(DRM File Server)는 POSCO E&C 사내 DRM 파일 관리 서버입니다.
- **업로드**: 파일을 DFS에 저장 + DRM 복호화
- **다운로드**: DFS에서 파일 조회 + DRM 암호화

### 6.2 DRM 프록시
```python
# proxy-server.py — nginx 뒤에서 DFS 서버로 요청 중계
# /proxy/dev/*  → https://dfs-dev.poscoenc.com
# /proxy/prod/* → https://dfs.poscoenc.com
```

### 6.3 파일 업로드 (DRM 복호화) 흐름
```
[브라우저]
  1. FormData 구성
     - CU_FILE: 파일 바이너리
     - SYS_CD: "AXI"
     - SAVE_PATH: "/elec/unitprice"  (DFS 저장 경로)
     - accessToken: AXI-TCM-TOKEN 쿠키값

  2. POST /proxy/dev/pecUpFm/fileUpload
     ↓
[DRM Proxy (Docker)]
  3. DFS 서버로 그대로 전달
     ↓
[DFS 서버 (dfs-dev.poscoenc.com)]
  4. DRM 복호화 + 파일 저장
  5. 응답: { resultStatus: "Success", fileItem: { fullPath, fileName, fileSize, ... } }
     ↓
[브라우저]
  6. fileItem을 백엔드로 전달
     ↓
[FastAPI 백엔드]
  7. DFS 볼륨(/data2/axi + fullPath)에서 파일 읽기
```

**프론트 업로드 코드 예시:**
```typescript
const token = getCookie("AXI-TCM-TOKEN");
const drmFd = new FormData();
drmFd.append("CU_FILE", file);
drmFd.append("SYS_CD", "AXI");
drmFd.append("SAVE_PATH", "/elec/unitprice");
drmFd.append("accessToken", token);

const drmRes = await fetch("/proxy/dev/pecUpFm/fileUpload", {
  method: "POST", body: drmFd, credentials: "include"
});
const drmResult = await drmRes.json();
if (drmResult.resultStatus === "Success") {
  const fileItem = drmResult.fileItem;
  // fileItem을 백엔드로 전송
}
```

### 6.4 파일 다운로드 (DRM 암호화) 흐름
```
[FastAPI 백엔드]
  1. 결과 파일을 DFS 볼륨에 저장
     save_path = /data2/axi/elec/execution/{filename}
  2. fileItem JSON 반환
     { fileName, realFileName, fullPath, fileSize }
     ↓
[브라우저 - api.download()]
  3. 백엔드에서 fileItem 받기
  4. CD_DOWNLOAD_FILE_INFO 구성 (fileItem + AXI-TCM-TOKEN)
  5. GET /proxy/dev/pecFm/fileCompressDownload?CD_DOWNLOAD_FILE_INFO=...
     ↓
[DRM Proxy → DFS 서버]
  6. DRM 암호화 적용 + 파일 반환
     ↓
[브라우저]
  7. Blob → URL.createObjectURL → a.click() 다운로드
```

**api.ts download 함수:**
```typescript
download: async (path: string, filename: string) => {
  const tcmToken = getCookie("AXI-TCM-TOKEN");
  const res = await fetch(`${BACKEND_URL}${path}`, { credentials: "include" });
  const { fileItem: fi } = await res.json();

  const dlParam = encodeURIComponent(JSON.stringify([{
    systemCode: "AXI", fileId: "", fileName: fi.fileName,
    realFileName: fi.realFileName, fileSize: fi.fileSize,
    savePath: "", fullPath: fi.fullPath,
    accessToken: tcmToken, status: "COMPLETION",
    userInfo: "", aclCode: "", oEtc3: "", oEtc4: "", oEtc5: "", etcParam: "",
  }]));

  const dlRes = await fetch(
    `/proxy/dev/pecFm/fileCompressDownload?CD_DOWNLOAD_FILE_INFO=${dlParam}`,
    { credentials: "include" }
  );
  const blob = await dlRes.blob();
  // blob → 다운로드
}
```

### 6.5 DFS 볼륨 구조 (표준 규칙)

모든 메뉴는 `axyard/aicp/elec/{메뉴}/{upload|download}` 형태의 표준 경로를 사용합니다.

```
/data2/axi/                                       # DFS 마운트 포인트 (DFS_LOCAL_ROOT)
└── axyard/aicp/elec/
    ├── unit-price/
    │   ├── upload/                                # 개별단가 업로드 원본
    │   └── download/                              # 다운로드 사본
    ├── reference/
    │   └── download/                              # 기준파일 다운로드
    ├── const-contract/
    │   ├── upload/                                # 공사계약 업로드
    │   └── download/                              # 분류 결과 다운로드
    ├── year-contract/
    │   ├── upload/
    │   └── download/
    ├── execution/
    │   ├── upload/                                # 실행내역서 업로드
    │   └── download/                              # Fill-UP 결과
    ├── auto-update/
    │   └── download/                              # 자동 업데이트 결과
    └── price-index/
        ├── upload/                                # 물가지수 PDF
        └── download/                              # 추출 결과 엑셀
```

### 6.6 폴더 생성 규칙 (표준 패턴)

라우터에서 DFS 볼륨에 폴더를 만들 때는 반드시 다음 패턴을 따릅니다:

```python
# 1) 환경변수에서 루트 경로 읽기
DFS_LOCAL_ROOT = os.getenv("DFS_LOCAL_ROOT", "/data2/axi")

# 2) 표준 경로 조립 (axyard/aicp/elec/{메뉴}/{action})
dfs_dir = os.path.join(
    DFS_LOCAL_ROOT, "axyard", "aicp", "elec",
    "<메뉴>", "<upload|download>"
)

# 3) 디렉토리 자동 생성 (존재 시 무시)
os.makedirs(dfs_dir, exist_ok=True)

# 4) 파일 저장
save_path = os.path.join(dfs_dir, filename)
with open(save_path, "wb") as f:
    f.write(data)

# 5) DFS fileItem 응답 반환 (fullPath는 절대경로 - DFS_LOCAL_ROOT)
return {
    "fileItem": {
        "fileName": filename,
        "realFileName": filename,
        "fullPath": f"/axyard/aicp/elec/<메뉴>/<action>/{filename}",
        "fileSize": os.path.getsize(save_path),
    }
}
```

### 6.7 SAVE_PATH 주의사항
- 디렉토리 소유자가 `tcmsdr`여야 DRM 프록시가 쓸 수 있음
- 새 경로 추가 시 **별도 DFS 서버 등록 요청 없이** 서버에서 아래 명령어만 실행하면 됨:
  ```bash
  mkdir -p /data2/axi/axyard/aicp/elec/{메뉴}/{upload,upload_failed,download}
  sudo chown -R tcmsdr:tcmsdr /data2/axi/axyard/aicp/elec/{메뉴}
  sudo chmod -R 775 /data2/axi/axyard/aicp/elec/{메뉴}
  ```

### 6.8 DFS 파일 보존 정책 (보안 + 디스크)

DFS 볼륨에 평문 파일이 무한 누적되는 것을 막기 위해 다음 정책을 적용합니다.

| 폴더 | 보관 기간 | 처리 방식 |
|------|----------|----------|
| `upload/` | 1일 | 라우터가 처리 성공/실패 후 정리. 잔재 파일은 `cleanup_dfs.sh` 가 24h 후 삭제 |
| `upload_failed/` | 14일 | 라우터가 실패 시 자동 격리. 디버깅 후 14일 지나면 자동 삭제 |
| `download/` | 7일 | 사용자 재다운로드 가능 기간. 7일 후 자동 삭제 |
| `Input/price_index_tmp/` | 1일 | 물가지수 PNG 임시 파일 |

#### 라우터 표준 패턴 — 실패 시 격리
```python
from dfs import read_file as dfs_read_file, mark_as_failed

try:
    content = dfs_read_file(fi.fullPath)
    # ... 처리 ...
except HTTPException:
    try: mark_as_failed(fi.fullPath)   # upload/ → upload_failed/
    except Exception: pass
    raise
except Exception:
    try: mark_as_failed(fi.fullPath)
    except Exception: pass
    raise HTTPException(400, "파일을 처리할 수 없습니다.")
```

`mark_as_failed()` 는 `backend/dfs/cleanup.py` 에 정의되어 있으며, 같은 메뉴의 `upload_failed/` 폴더로 원자적으로 이동시킵니다. (path traversal 방어 포함)

#### TTL 정리 스크립트 운영
`scripts/cleanup_dfs.sh` 를 백그라운드로 띄워두면 24시간마다 위 정책으로 자동 정리합니다.

```bash
# 최초 실행
setsid nohup bash ~/ai_autounitcost_elec_26_nextjs/scripts/cleanup_dfs.sh \
  < /dev/null > ~/logs/cleanup_dfs.log 2>&1 &

# 상태 확인 (PPID=1)
ps -o pid,ppid,cmd -p $(pgrep -f cleanup_dfs.sh)

# 정리 로그 확인
tail -30 ~/logs/cleanup_dfs.log
```

> 보관 기간을 변경하려면 `cleanup_dfs.sh` 상단의 `UPLOAD_TTL`, `FAILED_TTL`, `DOWNLOAD_TTL`, `TMP_TTL` 값만 수정 후 재기동.

### 6.8 메뉴별 DRM 적용 현황
| 메뉴 | 업로드 (복호화) | 다운로드 (암호화) |
|------|:---:|:---:|
| 개별단가 DB 수정/등록 | O | O |
| 공사용역 계약 DB저장 | O | - |
| 공사용역 결과/분류완료 | - | O |
| 연단가 계약 DB저장 | O | - |
| 선/본 실행내역서 Fill-UP | O | O |
| 레퍼런스 | - | O |
| 견적DB 자동 업데이트 | - | O |
| 물가지수 추출 | O | O |

---

## 7. 백엔드 API 패턴

### 7.1 라우터 등록
```python
# backend/main.py
from routers import unit_price, reference, const_contract, year_contract, execution, auto_update, price_index

app.include_router(unit_price.router, prefix="/api/unit-price")
app.include_router(execution.router, prefix="/api/execution")
# ...
```

### 7.2 비동기 작업 패턴 (BackgroundTasks + SSE)
```python
# 1. POST로 작업 시작 → job_id 반환
@router.post("/generate")
def start_generate(req: Request, background_tasks: BackgroundTasks):
    job_id = datetime.now().strftime("%Y%m%d%H%M%S") + "_" + os.urandom(3).hex()
    _jobs[job_id] = {"status": "RUNNING", "progress": 0, ...}
    background_tasks.add_task(_run_generate, job_id, ...)
    return {"job_id": job_id}

# 2. 백그라운드에서 처리 + 상태 업데이트
def _run_generate(job_id, ...):
    _jobs[job_id]["progress"] = 50
    _jobs[job_id]["status"] = "DONE"

# 3. SSE로 진행 상황 스트리밍
@router.get("/jobs/{job_id}/stream")
async def stream_job(job_id: str):
    async def event_gen():
        while True:
            j = _jobs[job_id]
            yield f"data: {json.dumps(j)}\n\n"
            if j["status"] in ("DONE", "FAILED"):
                break
            await asyncio.sleep(1)
    return StreamingResponse(event_gen(), media_type="text/event-stream")
```

### 7.3 DFS 파일 읽기
```python
# backend/dfs/reader.py
DFS_LOCAL_ROOT = os.getenv("DFS_LOCAL_ROOT", "/data2/axi")

def read_file(full_path: str) -> bytes:
    local = os.path.join(DFS_LOCAL_ROOT, full_path.lstrip("/"))
    with open(local, "rb") as f:
        return f.read()
```

---

## 8. 프론트엔드 패턴

### 8.1 페이지 구조
```
(main)/execution/
  page.tsx          # 탭 구성
  _components/
    ExecutionTab.tsx     # 선실행
    MainExecutionTab.tsx # 본실행
```

### 8.2 TimelineStep 컴포넌트
```typescript
function TimelineStep({ num, title, status, last, children }) {
  // status: "pending" | "active" | "done" | "error"
  const badgeColor = { pending: "#d1d5db", active: "#FF6B35", done: "#22c55e", error: "#ef4444" };
  return (
    <div style={{ display: "flex", gap: "14px" }}>
      <div>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: badgeColor[status] }}>
          {status === "done" ? "✓" : num}
        </div>
        {!last && <div style={{ width: 1, flex: 1, background: "#e5e7eb" }} />}
      </div>
      <div>{title}{status !== "pending" && children}</div>
    </div>
  );
}
```

### 8.3 SSE 연결
```typescript
const es = new EventSource(`${BACKEND_URL}/api/execution/jobs/${jobId}/stream`);
es.onmessage = (ev) => {
  const d = JSON.parse(ev.data);
  setProgress(d.progress);
  if (d.status === "DONE") { setResult(d); es.close(); }
  if (d.status === "FAILED") { setError(d.error); es.close(); }
};
```

### 8.4 처리중 페이지 새로고침 복원 (localStorage + SSE 재연결)

비동기 Job(분류/Fill-UP/추출 등)이 진행 중일 때 사용자가 페이지를 새로고침하거나 다시 들어와도 **그 화면에서 다시 이어서 보이도록** 모든 메뉴에 동일 패턴을 적용했습니다.

**localStorage 키 명명 규칙:** `<menu>_<action>_lastJob`

| 페이지 | LS_KEY | 비고 |
|--------|--------|------|
| 공사용역 계약 | `constContract_lastJob` | jobId 저장 |
| 연단가 계약 | `yearContract_lastJob` | jobId 저장 |
| 실행내역서(선실행) | `execution_pre_lastJob` | jobId 저장 |
| 실행내역서(본실행) | `execution_main_lastJob` | jobId 저장 |
| 견적DB 자동 업데이트 | `autoUpdate_lastJob` | jobId 저장 |
| 물가지수 추출 | `priceIndex_lastJob` | jobId 저장 |

**저장 시점**: 백엔드에서 `job_id` 받자마자 저장
```typescript
localStorage.setItem(LS_KEY, JSON.stringify({ jobId: data.job_id }));
```

**복원 패턴** (모든 페이지 공통):
```typescript
useEffect(() => {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return;
    const { jobId } = JSON.parse(saved);
    if (!jobId) return;

    // SSE 재연결로 진행 상태 이어받기
    const es = new EventSource(`${BACKEND_URL}/api/<menu>/jobs/${jobId}/stream`);
    es.onmessage = (ev) => {
      const j = JSON.parse(ev.data);
      setJob(j);
      if (j.status === "COMPLETED" || j.status === "DONE") {
        setStep("done"); es.close();
      }
      if (j.status === "FAILED") {
        setError(j.error); es.close();
      }
    };
    es.onerror = () => {
      es.close();
      localStorage.removeItem(LS_KEY);  // 만료된 jobId 정리
      setStep("idle");
    };
  } catch {
    localStorage.removeItem(LS_KEY);
  }
}, []);
```

**완료/실패 후 정리**: 사용자가 "새로 시작" 버튼 클릭 시 또는 결과 다운로드 후 `localStorage.removeItem(LS_KEY)` 호출.

---

## 9. 메뉴별 기능

| 메뉴 | 경로 | 백엔드 라우터 | 주요 기능 |
|------|------|-------------|----------|
| 개별단가 DB | /unit-price | unit_price.py | 조회, 수정/등록(DRM), 기준일 삭제 |
| 레퍼런스 | /reference | reference.py | 기준파일 조회/다운로드 |
| 공사용역 계약 | /const-contract | const_contract.py | AI 분류, 결과 조회, DB 저장, 분류완료 조회 |
| 연단가 계약 | /year-contract | year_contract.py | AI 분류, DB 저장 |
| 실행내역서 | /execution | execution.py | 선실행/본실행 Fill-UP, 요율 설정 |
| 견적DB 업데이트 | /auto-update | auto_update.py | AI 보정단가 생성, DB 업데이트, 이력 조회 |
| 물가지수 추출 | /price-index | price_index.py | PDF 업로드, AI Vision 추출, 편집, 엑셀 다운로드 |

---

## 10. 트러블슈팅

### 10.1 서버 재시작
```bash
# 백엔드
pkill -f uvicorn
source /data/DATA_DIR/code-envs/python/py39_rag/bin/activate
cd /home/pewsop/ai_autounitcost_elec_26_nextjs/backend
nohup uvicorn main:app --host 0.0.0.0 --port 8010 --reload \
  --reload-dir ../backend --reload-dir ../modules > ~/logs/backend_elec.log 2>&1 &

# Docker
cd /home/pewsop/ai_autounitcost_elec_26_nextjs
docker compose down && docker compose up -d
```

### 10.2 __pycache__ 캐시 문제
```bash
# git pull 시 post-merge hook이 자동 삭제
# 수동 삭제:
find /home/pewsop/ai_autounitcost_elec_26_nextjs -name "__pycache__" -exec rm -rf {} + 2>/dev/null
```

### 10.3 DRM 업로드 500 에러
- **원인**: DFS 저장 경로의 디렉토리 권한 문제
- **확인**: `ls -la /data2/axi/elec/` → 소유자가 `tcmsdr`인지 확인
- **해결**: `chmod 777 /data2/axi/elec/{경로}` 또는 `chown tcmsdr:tcmsdr`

### 10.4 Gateway Timeout
- **원인**: nginx `proxy_read_timeout` 초과 (기본 600s)
- **확인**: 처리 시간이 10분 이상인 작업
- **해결**: nginx.conf에서 `proxy_read_timeout` 증가

### 10.5 openpyxl 외부참조 수식 오류
- **증상**: Excel 열 때 "제거된 레코드" 경고
- **원인**: `[1]` 외부참조가 있는 워크북을 openpyxl이 저장 시 깨짐
- **해결**: `_remove_drawings_from_wb_bytes` 함수로 드로잉 제거 시 핵심 파일 보존

### 10.6 Azure OpenAI 연결 오류
- **DNS 오류**: 서버에서 `nslookup {endpoint}` 확인
- **max_tokens 오류**: GPT-5.4-mini는 `max_completion_tokens` 사용
- **인증 오류**: API 키와 엔드포인트 리소스 일치 확인

### 10.7 ValueError: Out of range float values are not JSON compliant
- **원인**: pandas DataFrame의 `NaN`/`Inf`가 그대로 JSON 직렬화될 때 발생
- **해결**: `to_dict(orient="records")` 전에 반드시 object dtype으로 변환하고 None 치환
  ```python
  df = df.astype(object).where(df.notna(), None)
  ```
  > `df.where(df.notna(), None)`만 쓰면 numeric dtype 컬럼은 None을 다시 NaN으로 되돌리므로 **`astype(object)` 먼저** 호출 필수.
- **사례**: `/api/reference?page=1` 500 에러 → reference.py에서 위 패턴으로 수정 (커밋 3818b7b)

### 10.8 502 Bad Gateway — Next.js 프론트 사망 (`npx next start` 자동 종료)
- **증상**: SSH 세션 종료 후 한 시간~하룻밤 사이 next-server가 사라지고 nginx에 `connect() failed (111: Connection refused)` + 502 응답
- **원인**: `nohup ... &` 만 사용한 경우 SSH 종료 시 컨트롤링 터미널 hangup → `npm exec` 자식 프로세스(`next-server`)에 SIGHUP/SIGTERM 전파됨. uvicorn은 단일 프로세스라 영향이 적지만 `npx`는 다단 트리라 자식까지 죽음.
- **해결**: 모든 백그라운드 실행에 **`setsid` 추가 + `< /dev/null` 로 stdin 분리**
  ```bash
  setsid nohup npx next start -p 3010 \
    < /dev/null > ~/logs/frontend_elec.log 2>&1 &
  ```
- **검증**: `ps -o pid,ppid,cmd -p $(pgrep -f next-server)` 의 PPID가 **1 (init)** 이어야 정상. 본인 쉘 PID면 setsid가 누락된 것
- **방어층**: 4.6 Watchdog이 60초 주기로 감시·자동 재기동·Teams 알림으로 추가 보호

### 10.9 git pull 후 반영 안 될 때
```bash
# 1. __pycache__ 삭제
find . -name "__pycache__" -exec rm -rf {} + 2>/dev/null
# 2. uvicorn --reload가 modules/ 감시하는지 확인
# 3. 최후 수단: uvicorn 재시작
```

---

## 11. 보안 강화 표준

본 시스템에 적용된 보안 강화 사항입니다. **신규 메뉴 작성 시 반드시 동일 패턴을 따라야 합니다.**

### 11.1 Path Traversal 방어 — DRM 파일 읽기

**문제**: 외부에서 받은 `fileItem.fullPath` 를 검증 없이 `open()` 에 전달하면 `..` 등으로 DFS 루트 밖 임의 파일 접근 가능 (CWE-22/23/36/73).

**해결**: 모든 DFS 파일 읽기는 **반드시** `dfs.read_file()` 을 통해서만 수행. 라우터에서 `open()` 직접 호출 금지.

```python
# ✓ 올바른 사용
from dfs import read_file as dfs_read_file
content = dfs_read_file(fi.fullPath)

# ✗ 금지 — open() 직접 호출
local = os.path.join("/data2/axi", full_path.lstrip("/"))
with open(local, "rb") as f: ...
```

`backend/dfs/reader.py:get_local_path()` 에서 `realpath()` 정규화 후 DFS 루트 하위인지 검증하므로, 위 함수만 사용하면 자동으로 보호됩니다.

### 11.2 SQL 인젝션 방어 — 파라미터 바인딩 강제

**문제**: 사용자 입력을 f-string 으로 SQL 쿼리에 직접 끼워 넣으면 `' OR '1'='1` 같은 입력으로 쿼리 변조 가능.

**해결**: 모든 사용자 입력은 **반드시 파라미터 바인딩(`?`)** 으로 전달.

```python
# ✓ 올바른 사용 — execute_non_query(query, params)
query = f"UPDATE {TABLE_NAME} SET {col} = ?, UPD_DTM = ? WHERE STD_ITEM_CODE = ?"
db.execute_non_query(query, (body.value, now, body.std_item_code))

# ✗ 금지 — f-string 으로 사용자 입력 삽입
db.execute_non_query(f"UPDATE ... SET {col} = '{body.value}' WHERE CODE = '{code}'")
```

- 컬럼명(`col`)과 테이블명은 **코드 내 화이트리스트/상수**만 사용 (사용자 입력 금지).
- 형식 검증이 가능한 입력(예: 날짜)은 `re.fullmatch()` 로 추가 검증.

### 11.3 시스템 정보 노출 차단

**문제**: 예외 발생 시 `traceback.print_exc()` 로 호출 스택을 출력하거나 `str(e)` 를 사용자 응답에 포함하면 내부 파일 경로·라이브러리 버전·DB 스키마 등이 노출 (CWE-497).

**해결**: 모든 라우터 예외 처리는 다음 패턴.

```python
import logging
logger = logging.getLogger(__name__)

try:
    # ... 처리 ...
except HTTPException:
    raise   # 의도된 예외는 그대로
except Exception:
    logger.exception("작업 실패 (job_id=%s)", job_id)   # 서버 로그에만 상세
    raise HTTPException(500, "처리 중 오류가 발생했습니다.")  # 사용자에겐 일반 메시지
```

- `traceback.print_exc()` 사용 금지
- `detail=str(e)` 또는 f-string 으로 예외 메시지 노출 금지

### 11.4 DFS 파일 보존 정책 (실패 격리 + TTL)

자세한 내용은 [6.8 DFS 파일 보존 정책](#68-dfs-파일-보존-정책-보안--디스크) 참조.

핵심 원칙:
- 처리 실패 시 `mark_as_failed()` 호출로 즉시 `upload_failed/` 격리
- `cleanup_dfs.sh` 가 24h 주기로 정책 기반 자동 삭제
- 평문 파일이 DFS 볼륨에 무한 누적되는 것 차단

### 11.5 입력 폼 / XSS / CSRF

| 항목 | 적용 |
|------|------|
| **XSS** | React JSX 자동 이스케이프로 구조적 방어 (`dangerouslySetInnerHTML` 사용 금지) |
| **빈 catch 블록** | 모든 `try/catch` 에 최소 `console.warn(e)` 로깅 (silent 실패 방지) |
| **비밀번호 자동완성** | 모든 `<input type="password">` 에 `autoComplete="new-password"` 명시 |
| **CSRF** | 사내망 한정으로 위험도 낮음. 향후 표준화 시 SameSite 쿠키 + CSRF 토큰 도입 검토 |

### 11.6 신규 메뉴 보안 체크리스트

새 메뉴를 추가할 때 PR 머지 전 다음 항목을 확인합니다.

- [ ] DFS 파일 읽기는 `dfs_read_file()` 만 사용 (직접 `open()` 금지)
- [ ] 모든 SQL 쿼리에 사용자 입력은 `?` 파라미터 바인딩으로만 전달
- [ ] 컬럼명/테이블명에 사용자 입력 직접 사용 안 함 (화이트리스트만)
- [ ] 모든 예외에 `logger.exception()` + 일반화된 사용자 메시지 사용
- [ ] `traceback.print_exc()` / `detail=str(e)` 사용 안 함
- [ ] 처리 실패 시 `mark_as_failed(fullPath)` 호출
- [ ] `<input type="password">` 에 `autoComplete="new-password"`
- [ ] `try/catch` 블록에 빈 catch 없음 (최소 `console.warn(e)`)

---

## 12. 새 메뉴 추가 가이드

### Step 1: 백엔드 라우터 생성
```python
# backend/routers/new_feature.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/data")
def get_data():
    return {"items": []}
```

### Step 2: main.py에 등록
```python
from routers import ..., new_feature
app.include_router(new_feature.router, prefix="/api/new-feature", tags=["새 기능"])
```

### Step 3: 프론트 페이지 생성
```bash
mkdir -p frontend/src/app/(main)/new-feature/_components
```

### Step 4: page.tsx 작성
```typescript
// frontend/src/app/(main)/new-feature/page.tsx
"use client";
export default function NewFeaturePage() {
  return (
    <div>
      <div style={{ borderLeft: "4px solid #FF6B35", paddingLeft: "14px" }}>
        <p style={{ fontSize: "13px", color: "#9ba3b8" }}>설명</p>
        <h2 style={{ fontSize: "24px", fontWeight: 700 }}>새 기능</h2>
      </div>
      {/* 탭 또는 컴포넌트 */}
    </div>
  );
}
```

### Step 5: 사이드바 추가
```typescript
// Sidebar.tsx MENU_GROUPS에 추가
{ href: "/new-feature", label: "새 기능", icon: "N" }
```

### Step 6: DRM 필요 시
- **업로드**: ExecutionTab.tsx의 DRM 업로드 패턴 복사
- **다운로드**: 백엔드에서 fileItem 반환 + 프론트에서 `api.download()` 사용

---

## 12. 권한 관리 표준

### 12.1 권한 모델
사용자는 3등급으로 분류됩니다:

| 등급 | 위치 | 권한 |
|------|------|------|
| **관리자** | `logs/admins.json` | 모든 메뉴 접근 + 관리자 페이지 + 사용자/관리자 추가/삭제 |
| **허용 사용자** | `logs/allowed_users.json` | 일반 메뉴 접근 (관리자 페이지 제외) |
| **미등록** | — | 접근 차단 (모든 페이지) |

> 관리자는 자동으로 허용 사용자를 포함합니다. `allowed_users.json`에 따로 추가할 필요 없음.

### 12.2 파일 구조
```json
// logs/admins.json
[
  "162264",
  "152356",
  "162872"
]

// logs/allowed_users.json
[
  "162264",
  "152356",
  "133282",
  ...
]
```

### 12.3 권한 함수 (backend/routers/admin_log.py)
```python
def is_admin(request: Request) -> bool:
    user_id = request.cookies.get("AXI-USER-ID", "")
    return user_id in _load_admins()

def is_allowed_user(request: Request) -> bool:
    """관리자이거나 허용 사용자 목록에 있으면 True"""
    user_id = request.cookies.get("AXI-USER-ID", "")
    if not user_id:
        return False
    if user_id in _load_admins():
        return True
    if user_id in _load_users():
        return True
    return False

def _require_admin(request: Request):
    if not is_admin(request):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
```

### 12.4 권한 체크 적용 방법

**백엔드 (관리자 전용 엔드포인트):**
```python
@router.get("/visitors")
def get_visitors(request: Request):
    _require_admin(request)  # 관리자가 아니면 403
    ...
```

**프론트엔드 (페이지/메뉴 노출 제어):**
```typescript
// (main)/layout.tsx — 모든 메인 페이지 진입 시
const res = await fetch("/aicp_elec-api/api/admin/check");
const { is_admin, is_allowed } = await res.json();
if (!is_allowed) {
  // "접근 권한이 없습니다" 화면 표시
}

// Sidebar.tsx — 관리 메뉴는 관리자만 표시
{is_admin && <SidebarItem href="/admin" label="관리자" />}
```

### 12.5 권한 추가/삭제
관리자 페이지(`/admin`)에서 UI로 추가/삭제하거나, 직접 JSON 파일을 수정합니다. 파일 변경 시 **백엔드 재시작 불필요** (요청마다 다시 읽음).

```bash
# 직접 수정
nano /home/pewsop/ai_autounitcost_elec_26_nextjs/logs/allowed_users.json
```

### 12.6 파일명 주의 (실수 사례)
`allowed_users.json`을 **`allowd_users.json`**(e 누락)으로 잘못 생성하면 코드가 못 읽고 빈 배열로 처리되어 관리자만 접근 가능한 상태가 됩니다. 파일명 정확히 확인할 것.

---

## 13. 로깅 시스템 (방문자 / 액션 / 파일)

### 13.1 로그 종류
| 로그 | 위치 | 트리거 | 함수 |
|------|------|--------|------|
| **방문자 로그** | `logs/visitors/{YYYY-MM-DD}.json` | 모든 HTTP 요청 (FastAPI 미들웨어) | `log_visitor()` |
| **실행 로그** | `logs/actions/{YYYY-MM-DD}.json` | 각 라우터에서 명시적 호출 | `log_action()` |
| **파일 로그** | `logs/file_actions/{menu}.json` | DRM 업로드/다운로드 시 | `log_file_action()` |

### 13.2 방문자 로그 — 일 1회 중복 방지
`backend/main.py`의 `visitor_middleware`가 모든 요청에서 호출하지만, 같은 직번이 같은 날 이미 기록되어 있으면 **추가 기록을 스킵**합니다.

```python
# admin_log.py:log_visitor()
logs = json.load(f) if os.path.exists(log_path) else []

# 같은 user_id가 오늘 이미 기록됐으면 스킵
if any(l.get("user_id") == user_id for l in logs):
    return

logs.append(entry)
```

이렇게 해서 일별 방문자 수가 정확히 "사용자 수"로 집계됩니다. (한 사람이 100번 호출해도 1건만 기록)

### 13.3 실행 로그 (log_action)
각 라우터의 핵심 작업에서 호출:

```python
from routers.admin_log import log_action

@router.post("/start-classify")
def start_classify(body: ClassifyBody, request: Request):
    # ... 작업 시작 ...
    try:
        log_action(
            "const-contract", "ai-classify",
            detail=f"{body.ctrt_no}",
            request=request,
        )
    except Exception:
        pass  # 로그 실패는 본 기능에 영향 없도록
    return {"job_id": job_id}
```

> Python 3.6 호환을 위해 `try/except`를 한 줄이 아닌 **여러 줄 문법**으로 작성 (커밋 d0c8941 참조).

**호출되는 라우터:**
- `const_contract.py` — `ai-classify`, `download`, `db-save`
- `year_contract.py` — `ai-classify`, `download`, `db-save`
- `execution.py` — `pre-execution`, `main-execution`, `download`
- `auto_update.py` — `generate`, `db-update`
- `price_index.py` — `extract`, `download`

### 13.4 파일 로그 (log_file_action)
DRM 업/다운로드 시 자동 호출:

```python
from routers.file_logger import log_file_action

# 업로드
log_file_action(dfs_dir, filename, "upload", request=request, size=file_size)

# 다운로드
log_file_action(dfs_dir, filename, "download", request=request, size=file_size)
```

`dfs_dir`에서 메뉴명을 자동 추출해 `logs/file_actions/{menu}.json`에 누적 저장합니다.

### 13.5 관리자 페이지에서 조회
- `/admin` → 일별 방문자 / 액션 / 파일 업다운 통계
- API: `/api/admin/visitors`, `/api/admin/actions`, `/api/admin/file-actions`, `/api/admin/summary`
- 모두 `_require_admin()` 보호

---

## 14. 유틸 표준

### 14.1 utils/logger.py — 세션ID 기반 로거
AI 분류 워커 등에서 작업 단위로 로그를 추적하기 위해 세션 컨텍스트가 포함된 로거를 제공합니다.

```python
from utils.logger import setup_logger, set_log_context

# 작업 시작 시 세션 ID 설정
set_log_context(session_id=job_id)

logger = setup_logger("const-contract")
logger.info("AI 분류 시작")
# → 2026-04-07 09:12:34 INFO: AI 분류 시작 | 세션: 20260407091234_abc
```

- 로그 파일: `Log/{YYYY-MM-DD}.log` (일별 자동 분리)
- 포매터: `'%(asctime)s %(levelname)s: %(message)s | 세션: %(session_id)s'`

### 14.2 backend/routers/file_logger.py — 파일 액션 공통 로거
DRM 업/다운로드 이력 기록 표준 모듈. 모든 라우터가 같은 함수를 import해서 사용:
```python
try:
    from routers.file_logger import log_file_action
except ImportError:
    from file_logger import log_file_action  # 모듈 경로 폴백
```

### 14.3 azure_db_manager.py — DB 환경 분기
- `set_env("PRD" | "DEV")` 호출 시 내부 `_db` 인스턴스를 해당 환경으로 교체
- `get_db()`로 현재 활성 인스턴스 조회
- 디버그 print 모두 제거 (커밋 ce538ed) → 로그가 깔끔해짐

```python
from azure_db_manager import set_env, get_db
set_env("PRD")
df = get_db().query("SELECT TOP 10 * FROM ...")
```

### 14.4 column_mapper.py / data_processor.py
- `column_mapper.py`: 엑셀 시트의 다양한 컬럼명을 표준 키로 매핑하는 사전 + 함수
- `data_processor.py`: 엑셀 전처리(공백 제거, 단위 정규화, 빈 행 제거 등) 공통 함수

### 14.5 표준화된 작업 시작 패턴 (라우터)
```python
@router.post("/start")
def start(body: StartBody, request: Request, background_tasks: BackgroundTasks):
    # 1) 권한 체크
    if not is_allowed_user(request):
        raise HTTPException(403, "접근 권한이 없습니다.")

    # 2) job_id 생성 (시간 + 랜덤 hex)
    job_id = datetime.now().strftime("%Y%m%d%H%M%S") + "_" + os.urandom(3).hex()

    # 3) Job 등록 + 백그라운드 실행
    _jobs[job_id] = {"status": "RUNNING", "progress": 0}
    background_tasks.add_task(_run, job_id, body)

    # 4) 액션 로그
    try:
        log_action("<menu>", "<action>", detail=str(body), request=request)
    except Exception:
        pass

    return {"job_id": job_id}
```

---

## 서버 명령어 치트시트

```bash
# 로그 확인
tail -50 ~/logs/backend_elec.log
tail -50 ~/logs/frontend_elec.log
docker logs axyard-nginx --tail 20
docker logs drm-proxy --tail 20

# 상태 확인
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -s http://localhost:8010/health

# 코드 배포
cd ~/ai_autounitcost_elec_26_nextjs && git pull

# nginx 리로드 (무중단)
docker exec axyard-nginx nginx -t
docker exec axyard-nginx nginx -s reload

# DRM 프록시 재빌드
cd ~/ai_service_drm && git pull && docker compose up -d --build
```
