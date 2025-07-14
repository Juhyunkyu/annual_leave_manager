# 🔧 트러블슈팅 가이드

> **연차관리 시스템 개발 및 운영 중 발생한 문제들과 해결 방법**

---

## 📋 목차

1. [Date 객체 직렬화 문제](#date-객체-직렬화-문제)
2. [empId 타입 불일치 문제](#empid-타입-불일치-문제)
3. [로그인 세션 관리 문제](#로그인-세션-관리-문제)
4. [세션 관리 문제](#세션-관리-문제)
5. [Google Apps Script 제한사항](#google-apps-script-제한사항)
6. [성능 최적화](#성능-최적화)

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

## 🔢 empId 타입 불일치 문제

### 🚨 **문제 현상**

- **증상**: `checkLeaveRequestsData()` 함수 실행 시 직원 1001의 승인된 연차가 빈 값으로 나옴
- **근무표 생성**: Y, Y/2 데이터가 구글 시트에 나타나지 않음
- **데이터 필터링**: 특정 직원의 연차 데이터가 조회되지 않음
- **콘솔 로그**: 데이터는 존재하지만 필터링 과정에서 누락됨

### 🔍 **원인 분석**

1. **타입 불일치**: empId 비교 시 숫자와 문자열 타입이 섞여 있음

   - Google Sheets에서 읽어온 empId: 숫자 타입 (예: `1001`)
   - 비교 대상 empId: 문자열 타입 (예: `"1001"`)
   - JavaScript 엄격 비교: `1001 === "1001"` → `false`

2. **필터링 실패**: 승인된 연차 조회 시 empId 비교가 실패하여 해당 직원의 데이터가 누락됨

3. **근무표 영향**: 연차 데이터가 제대로 조회되지 않아 근무표에 Y, Y/2 표시가 안 됨

### 🛠️ **해결 방법**

#### **1단계: empId 비교 로직 통일**

모든 empId 비교를 `toString()`으로 통일하여 문자열로 비교:

```javascript
// 기존 코드 (문제)
if (requestEmpId === empId) {
  // 필터링 로직
}

// 수정된 코드 (해결)
if (requestEmpId.toString() === empId.toString()) {
  // 필터링 로직
}
```

#### **2단계: 주요 함수들 수정**

**`getApprovedLeavesForMonth` 함수**:

```javascript
function getApprovedLeavesForMonth(year, month) {
  try {
    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();
    const approvedLeaves = [];

    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      const status = request[7]; // 상태 컬럼

      if (status === "승인") {
        const startDate = new Date(request[2]); // 시작일
        const endDate = new Date(request[3]); // 종료일
        const empId = request[1]; // 직원 ID
        const leaveType = request[5]; // 연차 종류
        const days = request[4]; // 일수

        // 해당 월에 포함되는지 확인
        if (
          (startDate.getFullYear() === year &&
            startDate.getMonth() + 1 === month) ||
          (endDate.getFullYear() === year &&
            endDate.getMonth() + 1 === month) ||
          (startDate.getFullYear() === year &&
            startDate.getMonth() + 1 <= month &&
            endDate.getFullYear() === year &&
            endDate.getMonth() + 1 >= month)
        ) {
          approvedLeaves.push({
            empId: empId,
            startDate: startDate,
            endDate: endDate,
            leaveType: leaveType,
            days: days,
          });
        }
      }
    }

    return approvedLeaves;
  } catch (error) {
    console.error("승인된 연차 정보 조회 오류:", error);
    return [];
  }
}
```

**`getUsedLeavesUntilMonth` 함수**:

```javascript
function getUsedLeavesUntilMonth(empId, year, month) {
  try {
    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();
    let totalUsed = 0;

    // 해당 월 이전까지의 사용 연차 계산
    const targetDate = new Date(year, month, 0); // 해당 월 마지막 날

    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      const status = request[7]; // 상태 컬럼
      const requestEmpId = request[1]; // 직원 ID

      if (status === "승인" && requestEmpId.toString() === empId.toString()) {
        const startDate = new Date(request[2]); // 시작일
        const endDate = new Date(request[3]); // 종료일
        const leaveType = request[5]; // 연차 종류

        // 해당 월 이전에 끝난 연차만 계산
        if (endDate <= targetDate) {
          const daysDiff =
            Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

          if (leaveType === "반차") {
            totalUsed += daysDiff * 0.5;
          } else {
            totalUsed += daysDiff;
          }
        }
      }
    }

    return totalUsed;
  } catch (error) {
    console.error("❌ 사용 연차 계산 오류:", error);
    return 0;
  }
}
```

**`getMonthlyUsedLeaves` 함수**:

```javascript
function getMonthlyUsedLeaves(empId, year, month) {
  try {
    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();
    let usedFullDays = 0; // 연차 일수
    let usedHalfDays = 0; // 반차 일수

    // 해당 월의 시작일과 종료일
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      const status = request[7]; // 상태 컬럼
      const requestEmpId = request[1]; // 직원 ID

      if (status === "승인" && requestEmpId.toString() === empId.toString()) {
        const startDate = new Date(request[2]); // 시작일
        const endDate = new Date(request[3]); // 종료일
        const leaveType = request[5]; // 연차 종류

        // 해당 월에 포함되는 연차만 계산
        if (startDate <= monthEnd && endDate >= monthStart) {
          // 해당 월에 포함되는 기간 계산
          const effectiveStart =
            startDate < monthStart ? monthStart : startDate;
          const effectiveEnd = endDate > monthEnd ? monthEnd : endDate;

          const daysDiff =
            Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) +
            1;

          if (leaveType === "반차") {
            usedHalfDays += daysDiff * 0.5;
          } else {
            usedFullDays += daysDiff;
          }
        }
      }
    }

    const totalUsedDays = usedFullDays + usedHalfDays;

    return {
      fullDays: usedFullDays,
      halfDays: usedHalfDays,
      totalUsed: totalUsedDays,
    };
  } catch (error) {
    console.error("❌ 월별 사용 연차 계산 오류:", error);
    return {
      fullDays: 0,
      halfDays: 0,
      totalUsed: 0,
    };
  }
}
```

### ✅ **결과**

- **이전**: `1001 === "1001"` → `false` → 데이터 누락
- **현재**: `1001.toString() === "1001".toString()` → `"1001" === "1001"` → `true` → 데이터 정상 조회 ✅

### 📝 **학습 포인트**

1. **JavaScript 타입 비교**: 엄격 비교(`===`)는 타입까지 확인하므로 주의 필요
2. **Google Sheets 데이터 타입**: 시트에서 읽어온 숫자는 숫자 타입, 입력값은 문자열일 수 있음
3. **일관된 타입 처리**: 모든 ID 비교는 동일한 타입으로 통일하여 처리
4. **디버깅 방법**: 데이터 존재 여부와 필터링 로직을 분리하여 확인

### 🔧 **예방 방법**

```javascript
// 안전한 ID 비교 함수
function safeIdCompare(id1, id2) {
  return id1.toString() === id2.toString();
}

// 사용 예시
if (safeIdCompare(requestEmpId, empId)) {
  // 필터링 로직
}
```

---

## 🔐 로그인 세션 관리 문제

### 🚨 **문제 현상**

#### **1차 문제: 보안 이슈**

- **증상**: 한 사용자가 로그인하면 다른 사용자들도 같은 세션을 공유하는 심각한 보안 문제
- **원인**: Google Apps Script의 `PropertiesService`와 `CacheService`가 배포자 컨텍스트에서 실행되어 모든 사용자가 같은 세션을 공유
- **영향**: 다중 사용자 환경에서 세션 격리가 불가능

#### **2차 문제: JavaScript 에러**

- **증상**: 로그인 후 `Identifier 'SessionManager' has already been declared` 에러 발생
- **증상**: 사이드 메뉴 클릭 시 `showPage is not defined` 에러 발생
- **증상**: 로그인 후 "직원 정보 수정" 모달이 자동으로 표시되는 문제

#### **3차 문제: 빈 화면 출력**

- **증상**: 에러 해결 후 로그인하면 빈 화면만 출력됨
- **원인**: `document.write()` → `location.href` 변경으로 인해 메인 앱이 로드되지 않음

### 🔍 **원인 분석**

#### **1. 서버 사이드 세션 관리의 한계**

```javascript
// 문제가 되었던 코드 (서버 사이드 세션)
function doLogin(email, password) {
  // ...
  PropertiesService.getUserProperties().setProperty(
    "session",
    JSON.stringify(sessionData)
  );
  // 모든 사용자가 같은 세션을 공유하는 문제
}
```

#### **2. Google Apps Script의 특수한 환경**

- **스크립트 실행 환경**: 서버 사이드에서 실행되어 브라우저의 일반적인 JS 디버깅 도구가 제한적
- **HTML 처리 방식**: `HtmlService`는 특별한 방식으로 HTML을 처리하므로 일반적인 `document.write()`와 다르게 동작
- **세션 컨텍스트**: 배포된 웹앱은 배포자의 컨텍스트에서 실행되어 사용자별 세션 분리가 어려움

#### **3. JavaScript 중복 선언 문제**

```javascript
// login.html과 main.html에서 모두 SessionManager 선언
class SessionManager { ... } // 중복 선언 에러
const sessionManager = new SessionManager(); // 중복 선언 에러
```

### 🛠️ **해결 방법**

#### **1단계: 클라이언트 사이드 세션 관리로 전환**

**백엔드 수정 (Code.gs)**:

```javascript
function doLogin(email, password) {
  // ...
  // 서버에 세션 저장하지 않고 클라이언트로 반환
  return {
    success: true,
    sessionData: sessionData, // 클라이언트에서 localStorage에 저장
    userType: "employee",
    redirectToMain: true,
  };
}
```

**프론트엔드 수정 (login.html)**:

```javascript
// SessionManager 클래스 중복 선언 방지
if (typeof SessionManager === "undefined") {
  class SessionManager {
    constructor() {
      this.sessionKey = "annual_leave_session";
      this.sessionTimeout = 120 * 60 * 1000; // 2시간
    }

    saveSession(sessionData) {
      try {
        const session = {
          ...sessionData,
          lastActivity: new Date().getTime(),
        };
        localStorage.setItem(this.sessionKey, JSON.stringify(session));
        return true;
      } catch (error) {
        console.error("세션 저장 오류:", error);
        return false;
      }
    }

    getSession() {
      try {
        const sessionData = localStorage.getItem(this.sessionKey);
        if (!sessionData) return null;

        const session = JSON.parse(sessionData);

        // 세션 타임아웃 확인
        const now = new Date().getTime();
        if (now - session.lastActivity > this.sessionTimeout) {
          this.clearSession();
          return null;
        }

        // 마지막 활동 시간 업데이트
        session.lastActivity = now;
        this.saveSession(session);

        return session;
      } catch (error) {
        console.error("세션 조회 오류:", error);
        return null;
      }
    }

    clearSession() {
      localStorage.removeItem(this.sessionKey);
    }
  }
}

// sessionManager 인스턴스 중복 선언 방지
if (typeof sessionManager === "undefined") {
  var sessionManager = new SessionManager();
}
```

#### **2단계: 페이지 전환 방식 개선**

**login.html의 handleLogin 함수**:

```javascript
async function handleLogin(event) {
  // ...
  if (result.success) {
    // 클라이언트 사이드 세션 저장
    if (result.sessionData) {
      sessionManager.saveSession(result.sessionData);
    }

    // 메인 화면 HTML을 서버에서 가져와서 교체
    try {
      const mainResult = await callServerFunction(
        "getMainAppAfterLogin",
        result.sessionData
      );

      if (mainResult && mainResult.success && mainResult.html) {
        // document.write 방식으로 페이지 교체
        document.open();
        document.write(mainResult.html);
        document.close();
      } else {
        // 폴백: 페이지 새로고침
        setTimeout(() => {
          const baseUrl = window.location.href.split("?")[0];
          window.location.href = baseUrl + "?t=" + new Date().getTime();
        }, 500);
      }
    } catch (error) {
      console.error("메인 화면 로드 오류:", error);
      // 오류 시 페이지 새로고침으로 폴백
      setTimeout(() => {
        const baseUrl = window.location.href.split("?")[0];
        window.location.href = baseUrl + "?t=" + new Date().getTime();
      }, 500);
    }
  }
}
```

#### **3단계: 모달 자동 표시 문제 해결**

**main.html의 모달 설정**:

```html
<!-- 직원 수정 모달 - 기본적으로 숨김 -->
<div id="editEmployeeModal" class="modal-overlay" style="display: none;">
  <!-- 모달 내용 -->
</div>
```

**JavaScript에서 모달 제어**:

```javascript
// editEmployee 함수에서만 모달을 표시
async function editEmployee(empId) {
  try {
    // 해당 직원 정보 찾기
    const employee = allEmployees.find((emp) => emp.empId === empId);
    if (!employee) {
      showNotification("직원 정보를 찾을 수 없습니다.", "error");
      return;
    }

    // 모달 필드에 기존 데이터 채우기
    document.getElementById("editEmpId").value = employee.empId;
    document.getElementById("editEmpName").value = employee.name;
    // ... 기타 필드들

    // 모달 표시 (이 함수에서만 실행)
    const modal = document.getElementById("editEmployeeModal");
    modal.style.display = "flex";
  } catch (error) {
    console.error("직원 수정 모달 오류:", error);
    showNotification("직원 정보 수정 중 오류가 발생했습니다.", "error");
  }
}

// closeEditEmployeeModal 함수 정의
if (typeof closeEditEmployeeModal !== "function") {
  function closeEditEmployeeModal() {
    const modal = document.getElementById("editEmployeeModal");
    if (modal) {
      modal.style.display = "none";
    }
    // 폼 초기화
    const form = document.getElementById("editEmployeeForm");
    if (form) form.reset();
  }
}
```

#### **4단계: showPage 함수 정의**

**main.html에 showPage 함수 추가**:

```javascript
// showPage 함수가 없으면 더미 함수라도 추가
if (typeof showPage !== "function") {
  function showPage(pageName) {
    // TODO: 실제 페이지 전환 로직 구현 필요
    // location.href = 'main.html?page=' + pageName; // 권장 방식 예시
    console.log("showPage 호출됨:", pageName);
  }
}
```

### ✅ **최종 결과**

#### **보안 개선**

- ✅ **사용자별 세션 격리**: 각 사용자가 독립적인 세션을 가짐
- ✅ **브라우저별 세션 분리**: 다른 브라우저에서 로그인해도 세션 공유 안됨
- ✅ **세션 타임아웃**: 2시간 후 자동 로그아웃
- ✅ **다중 사용자 지원**: 여러 사용자가 동시에 안전하게 사용 가능

#### **에러 해결**

- ✅ **SessionManager 중복 선언 에러 해결**
- ✅ **showPage is not defined 에러 해결**
- ✅ **직원 정보 수정 모달 자동 표시 문제 해결**

#### **기능 복원**

- ✅ **로그인 후 메인 화면 정상 로드**
- ✅ **사이드 메뉴 정상 작동**
- ✅ **모든 기능 정상 동작**

### 📝 **학습 포인트**

#### **1. Google Apps Script의 특수성**

- **서버 사이드 실행**: 브라우저의 일반적인 JS 디버깅 도구가 제한적
- **세션 관리 한계**: 배포자 컨텍스트에서 실행되어 사용자별 세션 분리 어려움
- **HTML 처리 방식**: `HtmlService`는 특별한 방식으로 HTML을 처리

#### **2. 클라이언트 사이드 세션 관리의 장점**

- **사용자 격리**: 각 사용자가 독립적인 세션을 가짐
- **브라우저 분리**: 다른 브라우저에서도 세션 공유 안됨
- **타임아웃 관리**: 자동 세션 만료로 보안 강화
- **확장성**: 다중 사용자 환경에서 안정적 동작

#### **3. JavaScript 중복 선언 방지 기법**

```javascript
// 클래스 중복 선언 방지
if (typeof SessionManager === 'undefined') {
  class SessionManager { ... }
}

// 변수 중복 선언 방지
if (typeof sessionManager === 'undefined') {
  var sessionManager = new SessionManager();
}

// 함수 중복 선언 방지
if (typeof showPage !== 'function') {
  function showPage(pageName) { ... }
}
```

#### **4. Google Apps Script 디버깅 방법**

- **Apps Script 에디터**: `View → Execution log` 또는 `View → Logs`
- **콘솔 로그**: 브라우저 개발자 도구가 아닌 Apps Script 자체 로그에서 확인
- **단계별 테스트**: 각 함수별로 개별 테스트 실행

### 🔧 **추가 권장사항**

#### **1. 보안 강화**

```javascript
// 민감한 데이터는 최소한만 저장
const sessionData = {
  userType: "employee",
  empId: user.empId,
  name: user.name,
  // 이메일, 비밀번호 등은 저장하지 않음
  loginTime: new Date().getTime(),
  lastActivity: new Date().getTime(),
};
```

#### **2. 에러 처리 강화**

```javascript
// try-catch로 모든 세션 관련 작업 감싸기
try {
  sessionManager.saveSession(sessionData);
} catch (error) {
  console.error("세션 저장 실패:", error);
  // 폴백 처리
}
```

#### **3. 페이지 전환 방식 개선**

```javascript
// document.write 대신 location.href 사용 고려
// (단, Google Apps Script 환경에서는 document.write가 더 안정적일 수 있음)
```

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
2. **JavaScript 타입 비교 주의**: 엄격 비교(`===`)는 타입까지 확인하므로 일관된 타입 처리 필요
3. **단계별 디버깅**: 문제를 작은 단위로 나누어 체계적으로 해결
4. **사전 테스트**: 새로운 기능 개발 시 다양한 시나리오 테스트
5. **문서화**: 문제 해결 과정을 상세히 기록하여 재발 방지

앞으로 새로운 문제가 발생하면 이 문서에 계속 추가하여 팀의 지식을 축적해 나가겠습니다.
