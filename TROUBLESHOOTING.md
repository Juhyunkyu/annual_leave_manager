# 🔧 트러블슈팅 가이드

> **연차관리 시스템 개발 및 운영 중 발생한 문제들과 해결 방법**

---

## 📋 목차

1. [Date 객체 직렬화 문제](#date-객체-직렬화-문제)
2. [세션 관리 문제](#세션-관리-문제)
3. [Google Apps Script 제한사항](#google-apps-script-제한사항)
4. [성능 최적화](#성능-최적화)

---

## 🕐 Date 객체 직렬화 문제

### 🚨 **문제 현상**

- **증상**: "My Requests" 페이지에서 직원이 자신의 연차 신청 내역을 조회할 때 `null` 데이터 반환
- **관리자 모드**: 정상 작동
- **직원 모드**: 데이터가 표시되지 않음
- **콘솔 오류**: 특별한 오류 메시지 없이 데이터만 null

### 🔍 **원인 분석**

1. **Google Sheets의 Date 객체**: Google Apps Script에서 시트의 날짜 데이터를 읽어올 때 JavaScript Date 객체로 반환
2. **JSON 직렬화 실패**: Date 객체는 JSON으로 직렬화할 때 특별한 처리가 필요하지만, 기존 코드에서는 Date 객체를 그대로 클라이언트로 전송
3. **클라이언트 파싱 실패**: 브라우저에서 Date 객체가 포함된 JSON을 파싱할 때 문제 발생하여 전체 응답이 null로 처리

### 🛠️ **해결 방법**

#### **1단계: Date 객체 문자열 변환**

`LeaveManagement.gs`의 `getMyRequests` 함수에서 Date 객체를 문자열로 변환:

```javascript
// Date 객체를 YYYY-MM-DD 문자열로 변환
if (request.startDate instanceof Date) {
  request.startDate = request.startDate.toISOString().split("T")[0];
}
if (request.endDate instanceof Date) {
  request.endDate = request.endDate.toISOString().split("T")[0];
}
if (request.submitDate instanceof Date) {
  request.submitDate = request.submitDate.toISOString().split("T")[0];
}
if (request.processDate instanceof Date) {
  request.processDate = request.processDate.toISOString().split("T")[0];
}
```

#### **2단계: 통합 함수 적용**

`getRecentRequests` 함수도 `getMyRequests`를 사용하도록 통합하여 일관성 확보:

```javascript
function getRecentRequests(empId) {
  try {
    return getMyRequests(empId, 5); // 최대 5개 최근 신청 반환
  } catch (error) {
    console.error("최근 신청 내역 조회 오류:", error);
    return [];
  }
}
```

### ✅ **결과**

- **이전**: Date 객체 → JSON 직렬화 실패 → null 응답
- **현재**: Date 객체 → 문자열 변환 → 정상 JSON → 데이터 표시 ✅

### 📝 **학습 포인트**

1. **Google Apps Script의 Date 객체 특성**: 시트에서 읽어온 날짜는 Date 객체로 반환됨
2. **JSON 직렬화 주의사항**: Date 객체는 클라이언트로 전송하기 전에 문자열로 변환 필요
3. **디버깅 방법**: 단계별 로그 확인, 데이터 타입 검증, 클라이언트-서버 통신 검증

---

## 🔐 세션 관리 문제

### 🚨 **문제 현상**

- **증상**: 로그인 후 세션이 제대로 유지되지 않음
- **관리자/직원 구분**: 세션 타입에 따른 분리 처리 필요
- **타임아웃**: 세션 만료 시 자동 로그아웃 처리

### 🛠️ **해결 방법**

#### **세션 타입별 분리**

```javascript
// 직원 세션
function createEmployeeSession(user) {
  const sessionId = generateSessionId();
  const sessionData = {
    userType: "employee",
    empId: user.empId,
    // ... 기타 정보
  };

  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(
    "employee_session_" + sessionId,
    JSON.stringify(sessionData)
  );
  userProperties.setProperty("session_type", "employee");
}

// 관리자 세션
function createAdminSession(admin) {
  const sessionId = generateSessionId();
  const sessionData = {
    userType: "admin",
    adminId: admin.adminId,
    // ... 기타 정보
  };

  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(
    "admin_session_" + sessionId,
    JSON.stringify(sessionData)
  );
  userProperties.setProperty("session_type", "admin");
}
```

#### **세션 유효성 검증**

```javascript
function getValidSession() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const currentSessionId = userProperties.getProperty("current_session");
    const sessionType = userProperties.getProperty("session_type");

    if (!currentSessionId || !sessionType) {
      return null;
    }

    const sessionKey = sessionType + "_session_" + currentSessionId;
    const sessionData = userProperties.getProperty(sessionKey);

    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);

    // 세션 타임아웃 확인 (2시간)
    const now = new Date().getTime();
    const sessionTimeout = getSystemSetting("세션타임아웃", 120) * 60 * 1000;

    if (now - session.lastActivity > sessionTimeout) {
      clearSession();
      return null;
    }

    // 마지막 활동 시간 업데이트
    session.lastActivity = now;
    userProperties.setProperty(sessionKey, JSON.stringify(session));

    return session;
  } catch (error) {
    console.error("세션 확인 오류:", error);
    return null;
  }
}
```

---

## ⚠️ Google Apps Script 제한사항

### 📊 **실행 시간 제한**

- **제한**: 6분 (무료 계정)
- **해결책**:
  - 대용량 데이터 처리 시 배치 처리
  - 캐시 활용으로 반복 작업 최소화
  - 비동기 처리 패턴 적용

### 💾 **메모리 제한**

- **제한**: 50MB (무료 계정)
- **해결책**:
  - 데이터 청크 단위로 처리
  - 불필요한 변수 즉시 해제
  - 스트리밍 방식으로 데이터 처리

### 🔄 **동시 실행 제한**

- **제한**: 동시 실행 20개
- **해결책**:
  - 요청 큐 시스템 구현
  - 사용자별 요청 제한
  - 에러 핸들링 강화

---

## ⚡ 성능 최적화

### 🚀 **캐시 활용**

```javascript
// CacheService 활용
const cache = CacheService.getUserCache();
const cachedData = cache.get("key");
if (!cachedData) {
  // 데이터 조회 및 캐시 저장
  cache.put("key", JSON.stringify(data), 3600); // 1시간 캐시
}
```

### 📊 **배치 처리**

```javascript
// 대량 데이터 처리 시 배치 단위로 분할
function processLargeData(data) {
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    processBatch(batch);
    Utilities.sleep(100); // API 제한 회피
  }
}
```

### 🎯 **데이터베이스 최적화**

- **인덱스 활용**: 자주 조회하는 컬럼 기준 정렬
- **불필요한 데이터 제거**: 사용하지 않는 컬럼 제거
- **정규화**: 데이터 중복 최소화

---

## 🔍 디버깅 팁

### 📝 **로깅 전략**

```javascript
// 단계별 로깅
console.log("=== 함수 시작 ===");
console.log("입력 파라미터:", param);
console.log("중간 결과:", result);
console.log("=== 함수 완료 ===");
```

### 🧪 **테스트 함수**

```javascript
// 디버깅용 테스트 함수
function runStepByStepDiagnosis() {
  console.log("1. 서버 연결 확인");
  const sheet = getSheet("LeaveRequests");
  console.log("시트 접근 성공:", sheet.getName());

  console.log("2. 세션 상태 확인");
  const session = getValidSession();
  console.log("세션 정보:", session);

  console.log("3. 데이터 조회 테스트");
  const requests = getMyRequests("1001", 10);
  console.log("조회 결과:", requests);
}
```

### 🔧 **에러 핸들링**

```javascript
try {
  // 위험한 작업
  const result = riskyOperation();
  return result;
} catch (error) {
  console.error("오류 발생:", error);
  console.error("스택 트레이스:", error.stack);

  // 사용자 친화적 에러 메시지
  return {
    success: false,
    error: "작업 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    details: error.message,
  };
}
```

---

## 📚 참고 자료

- [Google Apps Script 제한사항](https://developers.google.com/apps-script/guides/services/quotas)
- [Google Sheets API 문서](https://developers.google.com/sheets/api)
- [JavaScript Date 객체](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Date)

---

## 🎯 결론

이 문서는 연차관리 시스템 개발 및 운영 중 발생한 주요 문제들과 해결 방법을 기록한 것입니다.

**핵심 교훈**:

1. **Google Apps Script의 특성 이해**: Date 객체, 세션 관리, 제한사항 등
2. **단계별 디버깅**: 문제를 작은 단위로 나누어 체계적으로 해결
3. **사전 테스트**: 새로운 기능 개발 시 다양한 시나리오 테스트
4. **문서화**: 문제 해결 과정을 상세히 기록하여 재발 방지

앞으로 새로운 문제가 발생하면 이 문서에 계속 추가하여 팀의 지식을 축적해 나가겠습니다.
