# 🚀 연차관리 시스템 v3.0 - 설치 및 배포 가이드

## 📋 목차

1. [시스템 준비](#1-시스템-준비)
2. [Google Sheets 설정](#2-google-sheets-설정)
3. [Google Apps Script 설정](#3-google-apps-script-설정)
4. [웹앱 배포](#4-웹앱-배포)
5. [초기 설정](#5-초기-설정)
6. [테스트 및 확인](#6-테스트-및-확인)
7. [문제해결](#7-문제해결)

---

## 1. 시스템 준비

### ✅ 필요사항 체크리스트

- [ ] 구글 계정 (G Suite 또는 개인 계정)
- [ ] 구글 드라이브 접근 권한
- [ ] 구글 앱스 스크립트 사용 권한
- [ ] 이메일 발송을 위한 Gmail 계정

### 📁 프로젝트 파일 구조

```
연차관리시스템_v3/
├── 📄 PRD.md (요구사항 문서)
├── 📊 Google Sheets (데이터베이스)
├── 🔧 Google Apps Script 프로젝트
│   ├── Code.gs (메인 백엔드)
│   ├── LeaveManagement.gs (연차 관리)
│   ├── EmployeeManagement.gs (직원 관리)
│   ├── login.html (로그인 페이지)
│   ├── main.html (메인 애플리케이션)
│   ├── error.html (오류 페이지)
│   └── webapp-functions.js (클라이언트 함수)
└── 📖 이 가이드 문서들
```

---

## 2. Google Sheets 설정

### 🏗️ 단계 1: 구글시트 생성

1. **구글 드라이브** 접속 (drive.google.com)
2. **"새로 만들기"** → **"Google Sheets"** 클릭
3. 파일명을 **"연차관리시스템\_v3"**로 변경
4. 기본 "시트1" 삭제

### 📋 단계 2: 10개 시트 생성

**🏢 1. Departments (부서 정보)**

```
시트 추가 → 이름을 "Departments"로 변경
A1: DeptID    B1: DeptName

초기 데이터:
A2: 10        B2: 개발팀
A3: 20        B3: 영업팀
A4: 30        B4: 인사팀
A5: 40        B5: 총무팀
```

**👤 2. Employees (직원 정보)**

```
시트 추가 → 이름을 "Employees"로 변경
A1: EmpID     B1: Name      C1: Email           D1: Phone
E1: DeptID    F1: JoinDate  G1: Position        H1: PasswordHash

관리자 계정 추가:
A2: 1001      B2: 관리자    C2: admin@company.com  D2: 010-0000-0000
E2: 30        F2: 2020-01-01  G2: 관리자           H2: (비워두세요)
```

**📝 3. LeaveRequests (연차 신청) - 헤더만**

```
시트 추가 → 이름을 "LeaveRequests"로 변경
A1: ReqID     B1: EmpID     C1: StartDate   D1: EndDate     E1: Days
F1: LeaveType G1: Reason    H1: Status      I1: SubmitDate
```

**✅ 4. ApprovalSteps (결재 단계) - 헤더만**

```
시트 추가 → 이름을 "ApprovalSteps"로 변경
A1: ReqID     B1: GroupID   C1: ApproverID  D1: StepOrder
```

**📄 5. ApprovalLogs (결재 이력) - 헤더만**

```
시트 추가 → 이름을 "ApprovalLogs"로 변경
A1: ReqID     B1: ApproverID  C1: Result    D1: DateTime    E1: Comment
```

**🤝 6. CollaborationSteps (협조 단계) - 헤더만**

```
시트 추가 → 이름을 "CollaborationSteps"로 변경
A1: ReqID     B1: CollaboratorID  C1: StepOrder
```

**📄 7. CollaborationLogs (협조 이력) - 헤더만**

```
시트 추가 → 이름을 "CollaborationLogs"로 변경
A1: ReqID     B1: CollaboratorID  C1: Result  D1: DateTime  E1: Comment
```

**📊 8. LeaveUsage (연차 사용 기록) - 헤더만**

```
시트 추가 → 이름을 "LeaveUsage"로 변경
A1: ReqID     B1: EmpID     C1: UsedDays    D1: RegisterDate
```

**⚙️ 9. Settings (시스템 설정)**

```
시트 추가 → 이름을 "Settings"로 변경
A1: Key       B1: Value

필수 설정값:
A2: 연차발생기준    B2: 입사일 기준
A3: 연차발생주기    B3: 매년
A4: 기본연차일수    B4: 15
A5: 최대연차일수    B5: 25
A6: 세션타임아웃    B6: 120
```

**📈 10. Statistics (통계) - 헤더만**

```
시트 추가 → 이름을 "Statistics"로 변경
A1: Year      B1: Month     C1: EmpID     D1: UsedDays    E1: RemainDays
```

### 🔗 단계 3: 시트 ID 복사

1. 구글시트 URL에서 시트 ID 복사
   ```
   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
   ```
2. {SHEET_ID} 부분을 메모장에 저장

---

## 3. Google Apps Script 설정

### 🚀 단계 1: 새 프로젝트 생성

1. **script.google.com** 접속
2. **"새 프로젝트"** 클릭
3. 프로젝트명을 **"연차관리시스템\_v3"**로 변경

### 📁 단계 2: 스크립트 파일 추가

#### 📄 Code.gs (메인 파일)

- 기본 `Code.gs` 파일의 내용을 모두 삭제
- 제공된 `Code.gs` 코드 전체 복사/붙여넣기
- **중요**: 2~3번째 줄의 상수 수정
  ```javascript
  const SHEET_ID = "YOUR_SHEET_ID_HERE"; // ← 복사한 시트 ID로 변경
  const WEB_APP_URL = "YOUR_WEB_APP_URL_HERE"; // ← 나중에 웹앱 URL로 변경
  ```

#### 📁 추가 파일들 생성

각각 **"파일" → "새로 만들기"**로 추가:

1. **LeaveManagement.gs** - 연차 관리 로직
2. **EmployeeManagement.gs** - 직원 관리 로직
3. **login.html** - 로그인 페이지
4. **main.html** - 메인 애플리케이션
5. **error.html** - 오류 페이지
6. **webapp-functions.js** - 클라이언트 함수들

각 파일에 해당하는 코드를 복사/붙여넣기 하세요.

### 🔐 단계 3: 권한 설정

1. **"실행"** → **"권한 검토"** 클릭
2. 구글 계정으로 로그인
3. **"고급"** → **"연차관리시스템\_v3(안전하지 않음)으로 이동"** 클릭
4. **"허용"** 클릭

---

## 4. 웹앱 배포

### 🌐 단계 1: 배포 설정

1. **"배포"** → **"새 배포"** 클릭
2. **"유형"**에서 **"웹 앱"** 선택
3. 설정값:
   - **설명**: "연차관리시스템 v3.0"
   - **실행 사용자**: "나"
   - **액세스 권한**: "조직 내 모든 사용자" (또는 "모든 사용자")
4. **"배포"** 클릭

### 🔗 단계 2: 웹앱 URL 복사

1. 배포 완료 후 표시되는 **"웹 앱 URL"** 복사
2. `Code.gs` 파일의 `WEB_APP_URL` 상수를 해당 URL로 변경
3. **"저장"** 후 **다시 배포**

---

## 5. 초기 설정

### 🔑 단계 1: 관리자 비밀번호 설정

1. 웹앱 URL로 접속
2. 로그인 페이지에서:
   - **이메일**: admin@company.com
   - **비밀번호**: temp123
3. 로그인 후 **"비밀번호 변경"** 메뉴에서 새 비밀번호 설정

### 👥 단계 2: 직원 정보 추가

**옵션 A: 관리자 메뉴 사용 (권장)**

1. **"관리자 메뉴"** → **"직원 관리"** 클릭
2. 각 직원 정보 입력 (이메일 주소 반드시 포함)

**옵션 B: 구글시트 직접 입력**

1. Employees 시트에서 직원 정보 직접 입력
2. PasswordHash 컬럼은 비워두기 (최초 로그인 시 temp123 사용)

### 🏢 단계 3: 부서 정보 조정

필요에 따라 Departments 시트에서 부서 정보 수정/추가

---

## 6. 테스트 및 확인

### ✅ 기능 테스트 체크리스트

**🔐 인증 기능**

- [ ] 관리자 로그인/로그아웃
- [ ] 일반 직원 로그인 (temp123)
- [ ] 비밀번호 변경
- [ ] 세션 타임아웃

**📝 연차 신청**

- [ ] 연차/반차/특별휴가 신청
- [ ] 결재자/협조자 선택
- [ ] 일수 자동 계산 (반차 0.5일)
- [ ] 입력값 검증

**✅ 결재 처리**

- [ ] 결재 승인/반려
- [ ] 협조 처리
- [ ] 이메일 알림 발송
- [ ] 결재 순서 준수

**📊 조회 기능**

- [ ] 대시보드 데이터
- [ ] 내 신청 현황
- [ ] 결재/협조 대기 목록
- [ ] 개인 정보 조회

### 🧪 테스트 데이터 생성

Apps Script 에디터에서 다음 함수 실행:

```javascript
createTestData(); // 테스트 데이터 생성
clearTestData(); // 테스트 데이터 삭제
```

---

## 7. 문제해결

### 🚨 자주 발생하는 문제들

**❌ "시트를 찾을 수 없습니다" 오류**

- `Code.gs`의 `SHEET_ID` 확인
- 구글시트 공유 권한 확인
- 시트 이름 정확성 확인 (Departments, Employees 등)

**❌ 로그인 안 됨**

- Employees 시트에 관리자 계정 확인
- 이메일 주소 정확성 확인
- temp123 비밀번호 확인

**❌ 이메일 알림 안 옴**

- Gmail 권한 승인 확인
- `Code.gs`의 `WEB_APP_URL` 설정 확인
- 직원 이메일 주소 확인

**❌ 웹앱 접속 안 됨**

- 배포 권한 설정 확인 ("조직 내 모든 사용자")
- 새 배포 재실행
- 브라우저 캐시 삭제

### 🔧 디버깅 팁

**Apps Script 로그 확인:**

1. Apps Script 에디터에서 **"실행"** → **"로그 보기"**
2. `console.log()` 출력 확인

**네트워크 오류 확인:**

1. 브라우저 개발자 도구 (F12)
2. Network 탭에서 API 호출 오류 확인

### 📞 지원 및 문의

시스템 관련 문의사항이나 추가 기능 요청은 개발팀에 연락주세요.

---

## 🎉 축하합니다!

연차관리 시스템 v3.0 설치가 완료되었습니다!

### 🚀 다음 단계:

1. **직원들에게 웹앱 URL 공유**
2. **최초 로그인 안내** (이메일 + temp123)
3. **비밀번호 변경 안내**
4. **시스템 사용법 교육**

### ✨ 주요 특징:

- 🔐 **강화된 보안**: 이메일 + 비밀번호 인증
- 📱 **반응형 디자인**: 모바일/데스크톱 모두 지원
- ⚡ **실시간 알림**: 웹앱 + 이메일 이중 알림
- 🎯 **유연한 결재**: 누구든 결재자/협조자 가능
- 📊 **직관적 UI**: 사용하기 쉬운 인터페이스

**즐거운 연차 관리 되세요!** 🏖️✨
