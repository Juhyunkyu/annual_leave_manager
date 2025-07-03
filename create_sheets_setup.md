# 📋 연차관리 시스템 - Google Sheets 설정 가이드

## 🚀 1단계: 구글시트 생성

1. **구글 드라이브** 접속 → **새로 만들기** → **Google Sheets**
2. 파일명을 **"연차관리시스템\_v3"**로 변경
3. 기본 "시트1" 삭제

## 📝 2단계: 10개 시트 생성 및 헤더 설정

### **🏢 1. Departments (부서 정보)**

```
시트명: Departments
A1: DeptID    B1: DeptName

초기 데이터:
A2: 10        B2: 개발팀
A3: 20        B3: 영업팀
A4: 30        B4: 인사팀
A5: 40        B5: 총무팀
```

### **👤 2. Employees (직원 정보)**

```
시트명: Employees
A1: EmpID     B1: Name      C1: Email           D1: Phone
E1: DeptID    F1: JoinDate  G1: Position        H1: PasswordHash

초기 관리자 계정:
A2: 1001      B2: 관리자    C2: admin@company.com  D2: 010-0000-0000
E2: 30        F2: 2020-01-01  G2: 관리자         H2: (비워두세요)
```

### **📝 3. LeaveRequests (연차 신청) - 헤더만**

```
시트명: LeaveRequests
A1: ReqID     B1: EmpID     C1: StartDate   D1: EndDate     E1: Days
F1: LeaveType G1: Reason    H1: Status      I1: SubmitDate
```

### **✅ 4. ApprovalSteps (결재 단계) - 헤더만**

```
시트명: ApprovalSteps
A1: ReqID     B1: GroupID   C1: ApproverID  D1: StepOrder
```

### **📋 5. ApprovalLogs (결재 이력) - 헤더만**

```
시트명: ApprovalLogs
A1: ReqID     B1: ApproverID  C1: Result    D1: DateTime    E1: Comment
```

### **🤝 6. CollaborationSteps (협조 단계) - 헤더만**

```
시트명: CollaborationSteps
A1: ReqID     B1: CollaboratorID  C1: StepOrder
```

### **📝 7. CollaborationLogs (협조 이력) - 헤더만**

```
시트명: CollaborationLogs
A1: ReqID     B1: CollaboratorID  C1: Result    D1: DateTime    E1: Comment
```

### **📊 8. LeaveUsage (연차 사용 기록) - 헤더만**

```
시트명: LeaveUsage
A1: ReqID     B1: EmpID     C1: UsedDays    D1: RegisterDate
```

### **⚙️ 9. Settings (시스템 설정)**

```
시트명: Settings
A1: Key       B1: Value

필수 설정값:
A2: 연차발생기준    B2: 입사일 기준
A3: 연차발생주기    B3: 매년
A4: 기본연차일수    B4: 15
A5: 최대연차일수    B5: 25
A6: 세션타임아웃    B6: 120
```

### **📈 10. Statistics (월별 통계) - 헤더만**

```
시트명: Statistics
A1: Year      B1: Month     C1: EmpID       D1: UsedDays    E1: RemainDays
```

## ✅ 3단계: 시트 설정 완료 체크

- [ ] 총 10개 시트 생성 완료
- [ ] 각 시트에 헤더 입력 완료
- [ ] Departments에 부서 데이터 입력
- [ ] Employees에 관리자 계정 입력 (PasswordHash는 비워두기)
- [ ] Settings에 시스템 설정값 입력

## 🔗 4단계: Apps Script 연동 준비

시트 설정이 완료되면 **시트 ID**를 복사해두세요:

1. 구글시트 URL에서 `/d/` 다음의 긴 문자열이 시트 ID입니다
2. 예: `https://docs.google.com/spreadsheets/d/[여기가_시트_ID]/edit`

**다음 단계에서 이 시트 ID가 필요합니다!**
