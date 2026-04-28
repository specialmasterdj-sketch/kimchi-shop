# 김치 마트 쇼핑 앱 결제 통합 매뉴얼

**작성일:** 2026-04-27
**대상 사이트:** `https://specialmasterdj-sketch.github.io/kimchi-shop/`
**결제 PG:** Authorize.net (Visa 자회사)
**1차 도입 매장:** Hollywood (3번 매장, 2420 N Dixie Hwy, Hollywood, FL 33020)
**현재 상태:** ✅ Sandbox 끝-끝 검증 완료 / ⏳ 운영 키 대기

---

## 0. 한 장 요약

```
[고객 브라우저: kimchi-shop]
   ↓ ① 카드 정보 입력 (4111 1111 1111 1111 / 12/30 / 123)
   ↓
[Authorize.net Accept.js 라이브러리]
   ↓ ② 카드 → 일회용 nonce 토큰 발급 (브라우저에서 직접)
   ↓
[Cloudflare Worker: kimchi-pay.specialmasterdj.workers.dev]
   ↓ ③ Transaction Key를 안전히 보관, charge API 호출
   ↓
[Authorize.net Sandbox 또는 운영 API]
   ↓ ④ 카드 승인 + Captured (운영이면 정산까지)
   ↓
[고객 화면: Order Placed! + Transaction ID]
```

**핵심 보안 원칙:**
- `API Login ID` + `Public Client Key` = 브라우저 코드에 둬도 OK
- `Transaction Key` = **절대 브라우저/GitHub에 노출 X**, Cloudflare Worker 환경변수에만

---

## 1. 사전 준비 (가입한 서비스 3개)

### 1-1. Authorize.net Sandbox
- **가입 URL**: `https://developer.authorize.net/hello-world/sandbox.html`
- **목적**: 무료 테스트 환경. 실거래 없이 모든 API 테스트 가능
- **로그인 URL**: `https://sandbox.authorize.net` (또는 `demo.authorize.net`)
- **Sandbox 키**:
  - API Login ID: `9bAG37FQf4`
  - Transaction Key: `6m8rdvFu78434RXJ` (절대 노출 금지지만 sandbox라 실거래 X)
  - Public Client Key: `3surx8G5S4nDr85mSakaUYE8LQn8xgb5pHtH6RY6n373ZGBKw3j5Gq4gE6aMaTKE`

### 1-2. Cloudflare (백엔드 호스팅)
- **가입 URL**: `https://workers.cloudflare.com`
- **목적**: 서버리스 함수로 charge 처리 (Transaction Key 안전 보관)
- **무료 한도**: 월 10만 요청 (커피 한 잔 매출도 안 됨, 충분)
- **계정**: `specialmasterdj@gmail.com` (Google 로그인)
- **Worker URL**: `https://kimchi-pay.specialmasterdj.workers.dev`
- **Account ID**: `5fcd8bf90256e69914cb6dfa71436674`

### 1-3. GitHub Pages (frontend 호스팅)
- 기존 사용 중: `https://specialmasterdj-sketch.github.io/kimchi-shop/`
- HTTPS 자동 제공 (Authorize.net Accept.js는 HTTPS 강제)

---

## 2. 단계별 통합 절차 (Sandbox 기준 — 이미 완료된 작업)

### Step 1. Authorize.net Sandbox 가입 + 키 발급

1. `https://developer.authorize.net/hello-world/sandbox.html` 접속
2. 가입 양식 작성 (이름, 이메일, 가짜 사업체 정보)
3. Sandbox 활성화 이메일 수신 → 링크 클릭 → 활성화
4. 환영 이메일에 자동 발급된 2개 키 포함:
   - **API Login ID** (계정 식별자)
   - **Transaction Key** (server-only, 16자)

5. Public Client Key는 별도 발급 필요:
   - `demo.authorize.net` 로그인
   - 좌측 메뉴: **Account → Settings → API Credentials & Keys**
   - 페이지 하단 **"New Public Client Key"** 버튼 클릭
   - 키 발급 (60+ 자), `COPY PUBLIC CLIENT KEY` 버튼으로 복사

### Step 2. Cloudflare Workers 가입 + Worker 생성

1. `https://workers.cloudflare.com` 접속 → Sign Up
2. Google 계정으로 가입 (Plan 선택은 Skip 또는 Free)
3. 대시보드에서 좌측 **Compute → Workers & Pages** 진입
4. 우측 상단 **"Create application"** 클릭
5. 화면 가운데 **"Start with Hello World!"** 클릭
6. Worker 이름: **`kimchi-pay`** 입력
7. **Deploy** 클릭 → 자동으로 `https://kimchi-pay.specialmasterdj.workers.dev` 배포

### Step 3. Worker 코드 교체 (charge endpoint)

1. Worker 메인 화면에서 우측 상단 **"Edit code"** 클릭
2. 인라인 에디터 열림 → Hello World 코드 보임
3. `Ctrl+A` → `Delete` (전체 삭제)
4. 아래 코드 전체 붙여넣기:

```javascript
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, request);
    }

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: 'Invalid JSON' }, 400, request); }

    const { nonce, dataDescriptor, amount, customer = {} } = body;
    if (!nonce || !dataDescriptor || !amount) {
      return json({ error: 'Missing nonce/dataDescriptor/amount' }, 400, request);
    }

    const anetEnv = env.ANET_ENV || 'sandbox';
    const apiUrl = anetEnv === 'production'
      ? 'https://api.authorize.net/xml/v1/request.api'
      : 'https://apitest.authorize.net/xml/v1/request.api';

    const refId = 'KM-' + Date.now().toString(36).toUpperCase();
    const nameParts = (customer.name || '').trim().split(/\s+/);

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: env.ANET_API_LOGIN_ID,
          transactionKey: env.ANET_TRANSACTION_KEY
        },
        refId,
        transactionRequest: {
          transactionType: 'authCaptureTransaction',
          amount: String(amount),
          payment: { opaqueData: { dataDescriptor, dataValue: nonce } },
          order: { invoiceNumber: refId, description: 'Kimchi Mart Order' },
          customer: { email: customer.email || '' },
          billTo: {
            firstName: nameParts[0] || 'Customer',
            lastName: nameParts.slice(1).join(' ') || '-',
            address: customer.address || '',
            city: customer.city || '',
            state: customer.state || 'FL',
            zip: customer.zip || '',
            country: 'USA'
          }
        }
      }
    };

    let anetResp;
    try {
      const r = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await r.text();
      anetResp = JSON.parse(text.replace(/^﻿/, ''));
    } catch (e) {
      return json({ error: 'Authorize.net request failed', detail: e.message }, 502, request);
    }

    const tr = anetResp.transactionResponse;
    const msgs = anetResp.messages;

    if (msgs?.resultCode === 'Ok' && tr?.responseCode === '1') {
      return json({
        success: true,
        transactionId: tr.transId,
        authCode: tr.authCode,
        last4: tr.accountNumber,
        refId
      }, 200, request);
    }

    const errMsg = tr?.errors?.[0]?.errorText
      || msgs?.message?.[0]?.text
      || 'Charge declined';
    return json({ success: false, error: errMsg, refId }, 200, request);
  }
};

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) }
  });
}
```

5. 우측 상단 **Deploy** 클릭

### Step 4. Worker 환경변수 등록 (가장 중요)

1. Worker 메인 → **Settings** 탭 클릭
2. **Variables and Secrets** 섹션 → **+ Add** 클릭
3. 변수 3개 추가:

| Type | 변수명 | 값 |
|---|---|---|
| **Plaintext** | `ANET_API_LOGIN_ID` | `9bAG37FQf4` |
| **Secret** ⚠️ | `ANET_TRANSACTION_KEY` | `6m8rdvFu78434RXJ` |
| **Plaintext** | `ANET_ENV` | `sandbox` |

⚠️ **`ANET_TRANSACTION_KEY`는 무조건 Secret 타입으로!** 한 번 저장하면 다시 조회 불가. Plaintext로 저장 시 평문 노출.

4. 저장 후 자동 적용 (별도 deploy 불필요)

### Step 5. kimchi-shop frontend 통합

`kimchi-shop/index.html` 안의 핵심 코드 구조 (이미 적용됨):

#### 5-1. ANET_CONFIG 객체 (`<script>` 안)

```javascript
const ANET_ENV = 'sandbox'; // ← 운영 전환 시 'production'으로 변경
const ANET_CONFIG = {
  sandbox: {
    apiLoginID: '9bAG37FQf4',
    publicClientKey: '3surx8G5S4nDr85mSakaUYE8LQn8xgb5pHtH6RY6n373ZGBKw3j5Gq4gE6aMaTKE',
    acceptJsUrl: 'https://jstest.authorize.net/v1/Accept.js',
    backendUrl: 'https://kimchi-pay.specialmasterdj.workers.dev'
  },
  production: {
    apiLoginID: '',          // ← 운영 키 도착 시 채움
    publicClientKey: '',     // ← 운영 키 도착 시 채움
    acceptJsUrl: 'https://js.authorize.net/v1/Accept.js',
    backendUrl: 'https://kimchi-pay.specialmasterdj.workers.dev'
  }
};
const ANET_ENABLED_STORES = [2]; // STORES 배열 인덱스. 2 = Hollywood
```

#### 5-2. Accept.js 동적 로드

```javascript
(function loadAcceptJs() {
  const cfg = ANET_CONFIG[ANET_ENV];
  if (!cfg.acceptJsUrl) return;
  if (document.querySelector(`script[src="${cfg.acceptJsUrl}"]`)) return;
  const s = document.createElement('script');
  s.src = cfg.acceptJsUrl;
  s.async = true;
  document.head.appendChild(s);
})();
```

#### 5-3. submitToAuthorizeNet 함수 (카드 → nonce → 백엔드)

```javascript
function submitToAuthorizeNet({cardNumber, month, year, cardCode, amount, customer}) {
  const cfg = ANET_CONFIG[ANET_ENV];
  return new Promise((resolve, reject) => {
    if (!window.Accept) { reject(new Error('Payment library not loaded')); return; }
    const secureData = {
      authData: { clientKey: cfg.publicClientKey, apiLoginID: cfg.apiLoginID },
      cardData: { cardNumber, month, year, cardCode }
    };
    Accept.dispatchData(secureData, async (response) => {
      if (response.messages.resultCode === 'Error') {
        reject(new Error(response.messages.message.map(m => m.text).join('; ')));
        return;
      }
      const nonce = response.opaqueData.dataValue;
      const dataDescriptor = response.opaqueData.dataDescriptor;
      const r = await fetch(cfg.backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, dataDescriptor, amount, customer })
      });
      const data = await r.json();
      if (data.success) resolve(data);
      else reject(new Error(data.error || 'Charge declined'));
    });
  });
}
```

#### 5-4. placeOrder() 핵심 흐름

```javascript
async function placeOrder() {
  // 1. 입력 검증
  // 2. Hollywood 매장이 아니면 toast로 차단
  // 3. amount 계산 (cart summary와 동일 패턴)
  //    - subtotal = items.forEach with PRODUCTS.find + getMemberPrice
  //    - disc = getDiscount() (K1=5%, K2=10%)
  //    - total = subtotal - subtotal*disc + deliveryFee
  // 4. submitToAuthorizeNet 호출
  // 5. 성공: Order Placed! + Transaction ID 표시
  // 6. 실패: Payment Failed 화면
}
```

### Step 6. Hollywood 매장 분기 UX

체크아웃 화면에서 매장에 따라 다른 안내:

- **Hollywood 선택 시** → 녹색 박스
  ```
  🔒 Secured by Authorize.net · Hollywood store · SANDBOX MODE (test cards only)
  ```
- **다른 매장 선택 시** → 주황 경고 박스
  ```
  ⚠️ Card payment is currently only available at Hollywood store.
  For [매장명], please choose Pay at Pickup or Zelle/Venmo/PayPal,
  or use external delivery (DoorDash / Uber Eats / Grubhub).
  ```

코드 위치: `index.html` 체크아웃 렌더링 부분

```javascript
${!ANET_ENABLED_STORES.includes(coState.store) ? `
  <div style="background:#FFF3E0;...">⚠️ ...</div>
` : `
  <div style="background:#E8F5E9;...">🔒 Secured by Authorize.net ...</div>
`}
```

---

## 3. Sandbox 테스트 (실제 진행한 절차)

### 3-1. 끝-끝 테스트 단계

1. `https://specialmasterdj-sketch.github.io/kimchi-shop/` 접속
2. **Ctrl+Shift+N** (시크릿 창) 권장 — 캐시 무시
3. 매장 선택 = **Hollywood**
4. 상품 1개 카트에 담기
5. Cart → **Checkout**
6. **Pickup** 채널 선택
7. Payment → **Credit/Debit Card**
8. 녹색 "SANDBOX MODE" 박스 확인
9. 카드 정보 입력:
   - Card Number: `4111 1111 1111 1111`
   - Expiry: `12/30`
   - CVV: `123`
   - Name: 임의
10. **Place Order** 클릭

### 3-2. 기대 결과 (성공한 모습)

화면에 표시:
```
✅ Order Placed!
Order # KM-MOHX05KJ
─────────────────────
📦 Store Pickup
📍 Hollywood
   2420 N Dixie Hwy, Hollywood, FL 33020
💳 Card ending XXXX1111
Txn: 80054393172 (Sandbox)    ← Authorize.net Transaction ID
👤 Dae Jung · 19544945025
```

### 3-3. Authorize.net Sandbox 대시보드에서 확인

1. `demo.authorize.net` 로그인 (Sandbox 가입 시 정한 username/password)
2. 좌측 **Payments → Manage Transactions**
3. 상단 **Unsettled Transactions** 탭
4. 거래 1건 보임:
   - Amount (USD): $14.49
   - Submit date: 2026-04-27
   - Invoice number: KM-MOHX05KJ (kimchi-shop의 Order # 매칭)
   - Customer: Dae Jung
   - Payment method: VISA -1111
   - **Status: Captured Charge** ← 결제 승인 + 캡처 완료

### 3-4. 거절 케이스 테스트 (선택)

- 카드 `4000 0000 0000 0002` 입력 → "Payment Failed" 화면 + 거절 메시지

---

## 4. 운영 전환 절차 (운영 키 도착 시 진행)

거래처에서 Hollywood 매장 운영 머천트 발급 완료 후 받을 것:
- 운영 API Login ID (예: `89axxxxxxx`)
- 운영 Transaction Key (16자)
- 운영 Public Client Key (60+자)

### 4-1. Cloudflare Worker 환경변수 교체 (3단계)

1. `https://workers.cloudflare.com` 로그인 → kimchi-pay → Settings → Variables and Secrets
2. 각 변수 옆 ✏️ 편집:
   - `ANET_API_LOGIN_ID` → 운영 API Login ID로 교체
   - `ANET_TRANSACTION_KEY` (Secret) → 운영 Transaction Key로 교체 (한 번 저장하면 다시 못 봄, 신중하게)
   - `ANET_ENV` → `sandbox` → `production` 변경
3. 저장 → 자동 적용

### 4-2. kimchi-shop frontend 코드 수정 (한 줄 + 추가 키)

`kimchi-shop/index.html`에서:

```javascript
// 1. 환경 토글
const ANET_ENV = 'production';  // 'sandbox' → 'production'

// 2. production 키 채움
const ANET_CONFIG = {
  sandbox: { /* 그대로 */ },
  production: {
    apiLoginID: '운영 API Login ID',
    publicClientKey: '운영 Public Client Key',
    acceptJsUrl: 'https://js.authorize.net/v1/Accept.js',
    backendUrl: 'https://kimchi-pay.specialmasterdj.workers.dev'
  }
};
```

### 4-3. 운영 카드 1달러 테스트

1. **본인 진짜 카드**로 $1짜리 상품 결제 (또는 카트 강제로 $1 만들기)
2. Authorize.net 운영 대시보드 (`account.authorize.net`)에서 거래 확인
3. 매장 통장으로 정산 입금 확인 (보통 1-2 영업일)
4. 거래 환불 처리 (테스트였으니까)

### 4-4. UX 라벨 업데이트 (선택)

코드의 SANDBOX MODE 라벨을 Live로 자동 전환됨 (`ANET_ENV === 'sandbox' ? 'SANDBOX MODE' : 'Live'`).

### 4-5. 다른 매장 단계적 활성화

`index.html`의 `ANET_ENABLED_STORES` 배열에 매장 인덱스 추가:

```javascript
// 현재 (Hollywood만)
const ANET_ENABLED_STORES = [2];

// Hollywood 1-2주 검증 후 → Miami 추가
const ANET_ENABLED_STORES = [0, 2];

// 점진 확장
const ANET_ENABLED_STORES = [0, 1, 2, 3, 4];

// 6번째 신규 매장 오픈 후
const ANET_ENABLED_STORES = [0, 1, 2, 3, 4, 5];
```

매장 인덱스 매핑:
- 0: Miami (Palmetto Bay)
- 1: Pembroke Pines
- 2: **Hollywood** ← 1차 도입
- 3: Coral Springs
- 4: Fort Lauderdale (Las Olas)
- 5: New Location (Coming Soon, 6번 매장)

---

## 5. 비용 정보

### 5-1. Authorize.net 일반 요율 (운영)
- 월 게이트웨이 요금: **$25**
- 거래당: **$0.10 + 카드사 수수료** (보통 2.9%)
- Sandbox: **무료**

### 5-2. Cloudflare Workers
- 무료 티어: 월 10만 요청 (커피 한 잔 매출도 안 됨, 충분)
- 초과 시: $5/월 (천만 요청)

### 5-3. 예상 월 비용
- 결제 게이트웨이 + 백엔드: **$25/월** + 매출의 ~3%
- (도메인, 호스팅 별도 — 이미 GitHub Pages 사용 중)

---

## 6. 보안 원칙 (반드시 준수)

| 키 | 위치 | 노출 가능 | 비고 |
|---|---|---|---|
| API Login ID | client + server | ✅ OK | 식별자, 민감 정보 X |
| Public Client Key | client + server | ✅ OK | Authorize.net 명시 |
| **Transaction Key** | **server 전용** | ❌ **절대 X** | charge 권한 키 |
| Signature Key | server 전용 | ❌ 절대 X | webhook 검증용 |

**금지 행위:**
- 운영 Transaction Key를 채팅 / 스크린샷 / 이메일 / GitHub commit 어디든 노출
- frontend 코드(`index.html`)에 Transaction Key 박기
- `.env.production` 같은 파일을 GitHub에 commit (`.gitignore` 등록 필수)

**키 노출됐을 때 대응:**
1. Authorize.net 대시보드에서 즉시 키 재발급 (Account → Settings → API Credentials → "Obtain a New Transaction Key")
2. Cloudflare Worker 환경변수 새 키로 교체
3. 24시간 내 거래 내역 점검

---

## 7. 트러블슈팅 (실제 만난 문제 + 해결)

### 7-1. "A HTTPS connection is required"
- **원인**: Accept.js는 HTTPS만 허용. localhost (HTTP)에서 카드 처리 시도
- **해결**: 반드시 GitHub Pages (HTTPS) URL `https://specialmasterdj-sketch.github.io/kimchi-shop/`에서 테스트

### 7-2. "A valid amount is required"
- **원인**: frontend가 amount=0 또는 invalid 형식으로 백엔드에 보냄
- **진단 방법**: F12 → Console 탭에서 디버그 로그 확인
  ```
  [Authorize.net charge] cart: ..., subtotal: ..., total: ...
  [Authorize.net charge] sending amount: "..."
  ```
- **해결**: `placeOrder()`의 amount 계산 패턴이 `openCheckout()`의 cart summary 패턴과 정확히 일치해야 함 (이미 적용됨)

### 7-3. "Card payment only available at Hollywood store"
- **원인**: 의도된 동작. Hollywood 외 매장에서 카드 결제 차단
- **해결**: 매장 선택을 Hollywood로 변경 또는 Pay at Pickup 등 다른 결제 수단

### 7-4. "OTS Service Error 'Field validation error.'"
- **원인**: Authorize.net이 nonce를 거절 (가짜 nonce 또는 만료)
- **해결**: 페이지 새로고침 후 다시 시도 (nonce는 일회용, 1분 내 사용)

### 7-5. Google Wallet 팝업
- **원인**: Chrome 자체 기능 (사이트 코드와 무관)
- **해결**: **No thanks** 클릭. 본인 카드 정보 저장 X (sandbox 카드도 마찬가지)

### 7-6. "Save card securely?" 자동 팝업
- 위와 동일. Chrome 브라우저 기능. 저장 안 하고 무시.

### 7-7. F12 (개발자 도구) 사용법
1. 페이지에서 **F12** 키
2. 우측/하단에 패널 열림
3. 위쪽 **Console** 탭 클릭
4. Place Order 누르면 디버그 로그 자동 표시
5. 메시지 옆 ▶ 화살표 클릭하면 객체 펼쳐짐

---

## 8. 거래처에 줘야 할 정보 (Hollywood 운영 머천트 신청용)

### 8-1. 사업체 정보
- **상호**: Kimchi Mart Hollywood (또는 LLC 정식 명칭)
- **사업자 등록증 (Articles of Incorporation 또는 LLC Certificate)**
- **EIN** (연방 세금 ID, 9자리)
- **주소**: 2420 N Dixie Hwy, Hollywood, FL 33020
- **전화**: (754) 210-7965

### 8-2. 사업주 정보 (신용 조회용)
- 이름 (legal name)
- SSN 또는 ITIN
- 생년월일
- 자택 주소
- 주민번호 또는 운전면허

### 8-3. 정산용 통장
- Bank Name
- Routing Number (9자리)
- Account Number
- Account Type (Checking 권장)

### 8-4. 사업 정보
- 월 예상 매출 (달러)
- 평균 거래 금액
- 최대 거래 금액
- 사업 분야 (Grocery / Korean Food / Retail)
- 사업 시작일

---

## 9. 채널별 결제 분기 (이미 구현됨)

### 9-1. 자체 결제 (Authorize.net 사용)
- ✅ Pickup In-Store
- ✅ Curbside Pickup
- ✅ Kimchi Direct (자체 배송)
- ✅ Restaurant Free Delivery (K2 회원)

### 9-2. 외부 redirect (3rd party 결제)
kimchi-shop은 결제 안 받음. 외부 앱 redirect:
- DoorDash → DoorDash 앱
- Uber Eats → Uber Eats 앱
- Grubhub → Grubhub 앱

코드: `index.html`의 `PARTNER_URLS` 객체. 각 매장별 store URL은 추후 등록 시 수정.

---

## 10. 검증 완료 기록 (2026-04-27)

| 항목 | 결과 |
|---|---|
| Sandbox 키 3종 발급 | ✅ |
| Cloudflare Worker 배포 | ✅ `kimchi-pay.specialmasterdj.workers.dev` |
| Worker 환경변수 (Transaction Key Secret) | ✅ |
| Frontend Accept.js 통합 | ✅ |
| Hollywood 매장 분기 | ✅ 녹색/주황 박스 동작 |
| 끝-끝 결제 (실제 카드 4111) | ✅ |
| Authorize.net Sandbox 대시보드 거래 확인 | ✅ Order KM-MOHX05KJ, $14.49, Captured Charge |
| Transaction ID 표시 | ✅ 80054393172 |

**Phase 4a (Sandbox) 100% 완료.** 운영 키 받으면 production 토글로 바로 시작.

---

## 11. 관련 파일 위치

| 파일 | 위치 | 용도 |
|---|---|---|
| Frontend | `kimchi-shop/index.html` | 단일 파일, ANET_CONFIG + Accept.js + placeOrder |
| Worker 코드 | Cloudflare Dashboard에 인라인 (이 매뉴얼 Step 3) | charge endpoint |
| 매뉴얼 (이 파일) | `kimchi-shop/PAYMENT_MANUAL.md` | 한국어 통합 가이드 |
| .gitignore | `kimchi-shop/.gitignore` | `.env*`, `.claude/` 등 |
| GitHub Repo | `https://github.com/specialmasterdj-sketch/kimchi-shop` | Frontend 소스 |
| 라이브 사이트 | `https://specialmasterdj-sketch.github.io/kimchi-shop/` | GitHub Pages |

---

## 12. 핵심 명령어 / URL 요약

```bash
# 코드 push (수정 후)
cd "kimchi-shop"
git add index.html
git commit -m "메시지"
git push origin main

# 로컬 미리보기 (HTTPS 아님 — Accept.js 동작 X)
py -m http.server 8002
# → http://localhost:8002

# 라이브 사이트 (HTTPS)
https://specialmasterdj-sketch.github.io/kimchi-shop/

# Authorize.net Sandbox 대시보드
https://demo.authorize.net

# Authorize.net 운영 대시보드 (운영 가입 후)
https://account.authorize.net

# Cloudflare 대시보드
https://dash.cloudflare.com
```

---

## 13. FAQ

**Q. Sandbox 카드로 결제하면 진짜 돈 나가?**
A. 절대 안 나감. Sandbox는 가짜 환경. `4111 1111 1111 1111`은 어떤 은행에도 발급 안 된 테스트 카드.

**Q. 본인 진짜 카드를 sandbox에 넣으면?**
A. Sandbox 모드면 어차피 거절됨 (Authorize.net이 sandbox라 charge 자체를 안 함). 그러나 절대 권장 안 함. 무조건 4111 카드만.

**Q. 운영 모드에서 4111 카드 넣으면?**
A. Authorize.net이 "Invalid card" 거절. 안전.

**Q. 키가 노출됐을 때?**
A. Authorize.net 대시보드에서 즉시 재발급. 새 키로 Worker 환경변수 교체. 그 사이 거래 점검.

**Q. Cloudflare Worker가 안 켜지면?**
A. workers.dev 서브도메인은 항상 작동. 무료 한도 초과 시 자동 차단되지만 월 10만 요청은 충분히 큼.

**Q. 사용자가 결제 후 환불은 어떻게?**
A. Authorize.net 대시보드 → Manage Transactions → 해당 거래 → **Refund** 버튼. Captured 거래는 24시간 후 Settled되면 환불 처리 가능.

**Q. 다른 매장 추가하려면?**
A. `index.html`의 `ANET_ENABLED_STORES` 배열에 매장 인덱스 추가 → push. (운영 머천트는 매장 통합 1개 또는 매장별 분리 둘 다 가능. 거래처와 협의)

---

## 14. 다음 단계 (운영 전환 후)

운영이 안정적으로 돌면:
1. **Phase 5**: 회원 DB (5만 회원 전화번호 → Firebase/Supabase + SMS OTP)
2. **Phase 6**: miamikimchi.com 도메인 cutover (Vercel/Netlify로 호스팅 이전)
3. **Phase 7**: 소셜 미디어 7개 연결 (FB/IG/TikTok 등)

각 Phase별 받아야 할 자산은 메모리 `project_kimchi_shop_weee_roadmap.md` 참조.

---

**작성자:** Claude (Anthropic Opus 4.7) + Daegil Jung
**최종 검증일:** 2026-04-27
**문서 위치:** `kimchi-shop/PAYMENT_MANUAL.md`
