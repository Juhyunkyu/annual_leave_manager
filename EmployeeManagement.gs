/**
 * 📋 연차관리 시스템 - 직원 관리 모듈 (통합 최적화)
 *
 * 🔧 기능: 직원 조회, 부서 관리, 결재/협조 대기 목록 조회
 * 👥 처리: Employees, Departments 시트 관리
 */

// =====================================
// 🚀 캐싱 시스템 (성능 최적화)
// =====================================

// 전역 캐시 변수들
var departmentCache = null;
var departmentCacheTime = null;
var employeeCache = null;
var employeeCacheTime = null;

var CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

/**
 * 🏢 부서 정보만 빠르게 조회 (직원 수 계산 없음)
 */
function getDepartmentsQuick() {
  try {
    // 캐시 확인
    var now = new Date().getTime();
    if (
      departmentCache &&
      departmentCacheTime &&
      now - departmentCacheTime < CACHE_DURATION
    ) {
      console.log("부서 캐시 사용");
      return departmentCache;
    }

    console.log("부서 정보 새로 조회");
    var deptSheet = getSheet("Departments");
    var deptData = deptSheet.getDataRange().getValues();

    if (deptData.length <= 1) {
      return [];
    }

    var departments = [];
    for (var i = 1; i < deptData.length; i++) {
      if (deptData[i][0] && deptData[i][1]) {
        departments.push({
          deptId: deptData[i][0].toString(),
          deptName: deptData[i][1].toString(),
        });
      }
    }

    // 캐시 저장
    departmentCache = departments;
    departmentCacheTime = now;

    return departments;
  } catch (error) {
    console.error("빠른 부서 조회 오류:", error);
    return [];
  }
}

/**
 * 🏢 부서 정보 맵 생성 (캐싱 최적화) - 개선된 버전
 */
function getDepartmentMap() {
  try {
    var departments = getDepartmentsQuick();
    var deptMap = {};

    departments.forEach(function (dept) {
      deptMap[dept.deptId] = dept.deptName;
    });

    console.log("최종 부서 맵:", deptMap);
    return deptMap;
  } catch (error) {
    console.error("부서 맵 생성 오류:", error);
    return {};
  }
}

/**
 * 📊 내 연차 정보 조회 (대시보드용) - 최적화된 버전
 */
function getMyLeaveInfoFast(empId) {
  try {
    // 현재 세션 확인
    const session = getValidSession();

    // 관리자인 경우 별도 처리
    if (session && session.userType === "admin") {
      // 관리자 정보 조회
      const adminInfo = getAdminByAdminId(session.adminId);

      // 관리자는 연차 정보가 없으므로 기본값 반환
      return {
        totalLeaves: 0,
        usedLeaves: 0,
        remainingLeaves: 0,
        thisYearUsed: 0,
        year: new Date().getFullYear(),
        isAdmin: true,
        deptName: "관리부서",
        empName: adminInfo ? adminInfo.name : "관리자",
        position: adminInfo ? adminInfo.role : "시스템관리자",
        message: "관리자는 연차 정보가 제공되지 않습니다.",
      };
    }

    // 직원인 경우 - 부서 정보만 빠르게 조회
    const employee = getEmployee(empId);
    if (!employee) {
      console.warn("직원 정보를 찾을 수 없습니다. empId:", empId);
      return {
        totalLeaves: 15,
        usedLeaves: 0,
        remainingLeaves: 15,
        thisYearUsed: 0,
        year: new Date().getFullYear(),
        deptName: "부서 미지정",
        empName: "사용자",
        position: "직원",
        error: "직원 정보를 찾을 수 없습니다.",
      };
    }

    // 부서 정보 빠른 조회 (직원 수 계산 없이)
    const deptMap = getDepartmentMap();
    const deptName = deptMap[employee.deptId] || "부서 미지정";

    // 연차 정보 계산
    const currentYear = new Date().getFullYear();
    const basicLeaves = parseInt(getSystemSetting("기본연차일수", 15));
    const usedLeaves = calculateUsedLeaves(empId, currentYear);
    const remainingLeaves = Math.max(0, basicLeaves - usedLeaves);

    return {
      totalLeaves: basicLeaves,
      usedLeaves: usedLeaves,
      remainingLeaves: remainingLeaves,
      thisYearUsed: usedLeaves,
      year: currentYear,
      deptName: deptName,
      empName: employee.name,
      position: employee.position,
    };
  } catch (error) {
    console.error("내 연차 정보 조회 오류:", error);
    return {
      totalLeaves: 15,
      usedLeaves: 0,
      remainingLeaves: 15,
      thisYearUsed: 0,
      year: new Date().getFullYear(),
      deptName: "부서 미지정",
      empName: "사용자",
      position: "직원",
      error: "시스템 오류가 발생했습니다.",
    };
  }
}

/**
 * 🔄 캐시 초기화 함수
 */
function clearCache() {
  departmentCache = null;
  departmentCacheTime = null;
  employeeCache = null;
  employeeCacheTime = null;
  console.log("캐시가 초기화되었습니다.");
}

// =====================================
// 👥 직원 관리 통합 함수들
// =====================================

/**
 * 👥 전체 직원 목록 조회 (부서 정보 포함) - 통합 최적화
 */
function getAllEmployees() {
  try {
    console.log("getAllEmployees 함수 시작");
    const empSheet = getSheet("Employees");
    const empData = empSheet.getDataRange().getValues();
    console.log("직원 시트 데이터 행 수:", empData.length);

    if (empData.length <= 1) {
      console.log("직원 데이터가 없습니다 (헤더만 존재)");
      return [];
    }

    // 부서 정보를 한 번만 조회하여 맵으로 변환
    const deptMap = getDepartmentMap();
    console.log("부서 맵:", deptMap);

    const employees = [];

    // 헤더 제외하고 직원 정보 수집 (완화된 검증)
    for (let i = 1; i < empData.length; i++) {
      const row = empData[i];

      // 사번이 있으면 유효한 직원으로 처리 (이름이 없어도 허용)
      const empId = row[0];
      const name = row[1];

      if (empId !== null && empId !== undefined && empId !== "") {
        const empIdStr = empId.toString().trim();
        const nameStr = name ? name.toString().trim() : "이름 없음";

        if (empIdStr) {
          console.log(`직원 데이터 처리 중: 사번=${empIdStr}, 이름=${nameStr}`);

          employees.push({
            empId: empIdStr,
            name: nameStr,
            email: row[2] ? row[2].toString().trim() : "",
            phone: row[3] ? row[3].toString().trim() : "",
            deptId: row[4] ? row[4].toString().trim() : "",
            deptName: deptMap[row[4]] || "부서 미지정",
            joinDate: row[5] || "",
            position: row[6] ? row[6].toString().trim() : "",
            passwordHash: row[7] || "",
          });
        }
      }
    }

    console.log("수집된 직원 수:", employees.length);

    // 이름순 정렬
    employees.sort((a, b) => a.name.localeCompare(b.name, "ko"));

    return employees;
  } catch (error) {
    console.error("전체 직원 조회 오류:", error);
    return [];
  }
}

/**
 * 👤 직원 정보 조회 (통합 함수 - ID 또는 이메일로 조회)
 */
function getEmployee(identifier, searchType = "id") {
  try {
    const employees = getAllEmployees();

    if (searchType === "email") {
      return (
        employees.find(
          (emp) =>
            emp.email && emp.email.toLowerCase() === identifier.toLowerCase()
        ) || null
      );
    } else {
      return (
        employees.find((emp) => emp.empId === identifier.toString()) || null
      );
    }
  } catch (error) {
    console.error("직원 정보 조회 오류:", error);
    return null;
  }
}

/**
 * 🏢 전체 부서 목록 조회 (직원 수 계산 최적화)
 */
function getAllDepartments() {
  try {
    const deptSheet = getSheet("Departments");
    const deptData = deptSheet.getDataRange().getValues();

    if (deptData.length <= 1) {
      return [];
    }

    // 전체 직원 목록을 한 번만 조회
    const allEmployees = getAllEmployees();

    const departments = [];

    for (let i = 1; i < deptData.length; i++) {
      if (deptData[i][0] && deptData[i][1]) {
        const deptId = deptData[i][0].toString();

        // 해당 부서의 직원 수 계산
        const employeeCount = allEmployees.filter(
          (emp) => emp.deptId === deptId
        ).length;

        departments.push({
          deptId: deptId,
          deptName: deptData[i][1],
          employeeCount: employeeCount,
        });
      }
    }

    return departments;
  } catch (error) {
    console.error("부서 목록 조회 오류:", error);
    return [];
  }
}

/**
 * 🔍 부서별 직원 조회
 */
function getEmployeesByDepartment(deptId) {
  try {
    const allEmployees = getAllEmployees();
    return allEmployees.filter((emp) => emp.deptId === deptId.toString());
  } catch (error) {
    console.error("부서별 직원 조회 오류:", error);
    return [];
  }
}

/**
 * 👥 특정 직원 ID들로 직원 정보 조회
 */
function getEmployeesByIds(empIds) {
  try {
    if (!empIds || empIds.length === 0) {
      return [];
    }

    const allEmployees = getAllEmployees();
    return allEmployees.filter((emp) => empIds.includes(emp.empId));
  } catch (error) {
    console.error("직원 ID 조회 오류:", error);
    return [];
  }
}

// =====================================
// 📊 내 신청 현황 관련 함수들
// =====================================

/**
 * 📊 내 연차 신청 목록 조회
 */
function getMyRequests(empId, limit = null) {
  try {
    const sheet = getSheet("LeaveRequests");
    const data = sheet.getDataRange().getValues();

    const requests = [];

    // 헤더 제외하고 해당 직원의 신청 찾기
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == empId) {
        requests.push({
          reqId: data[i][0],
          empId: data[i][1],
          startDate: data[i][2],
          endDate: data[i][3],
          days: data[i][4],
          leaveType: data[i][5],
          reason: data[i][6],
          status: data[i][7],
          submitDate: data[i][8],
        });
      }
    }

    // 신청일 기준 내림차순 정렬
    requests.sort((a, b) => new Date(b.submitDate) - new Date(a.submitDate));

    return limit ? requests.slice(0, limit) : requests;
  } catch (error) {
    console.error("내 신청 목록 조회 오류:", error);
    return [];
  }
}

/**
 * 📋 신청 상세 정보 및 결재 현황 조회
 */
function getRequestDetails(reqId) {
  try {
    // 기본 신청 정보
    const requestInfo = getRequestInfo(reqId);
    if (!requestInfo) {
      return null;
    }

    // 신청자 정보
    const applicant = getEmployee(requestInfo.empId);

    // 결재 현황
    const approvalStatus = getApprovalStatus(reqId);

    // 협조 현황
    const collaborationStatus = getCollaborationStatus(reqId);

    return {
      request: requestInfo,
      applicant: applicant,
      approvalStatus: approvalStatus,
      collaborationStatus: collaborationStatus,
    };
  } catch (error) {
    console.error("신청 상세 정보 조회 오류:", error);
    return null;
  }
}

/**
 * ✅ 결재 현황 조회
 */
function getApprovalStatus(reqId) {
  try {
    const stepsSheet = getSheet("ApprovalSteps");
    const stepsData = stepsSheet.getDataRange().getValues();

    const logsSheet = getSheet("ApprovalLogs");
    const logsData = logsSheet.getDataRange().getValues();

    const approvalStatus = [];

    // 결재 단계 조회
    for (let i = 1; i < stepsData.length; i++) {
      if (stepsData[i][0] === reqId) {
        const approverId = stepsData[i][2];
        const stepOrder = stepsData[i][3];

        // 해당 결재자 정보
        const approver = getEmployee(approverId);

        // 결재 로그에서 처리 결과 찾기
        let approvalLog = null;
        for (let j = 1; j < logsData.length; j++) {
          if (logsData[j][0] === reqId && logsData[j][1] == approverId) {
            approvalLog = {
              result: logsData[j][2],
              dateTime: logsData[j][3],
              comment: logsData[j][4],
            };
            break;
          }
        }

        approvalStatus.push({
          stepOrder: stepOrder,
          approverId: approverId,
          approverName: approver ? approver.name : "알 수 없음",
          approverPosition: approver ? approver.position : "",
          status: approvalLog ? approvalLog.result : "대기",
          processedDate: approvalLog ? approvalLog.dateTime : null,
          comment: approvalLog ? approvalLog.comment : "",
        });
      }
    }

    // 단계순 정렬
    approvalStatus.sort((a, b) => a.stepOrder - b.stepOrder);

    return approvalStatus;
  } catch (error) {
    console.error("결재 현황 조회 오류:", error);
    return [];
  }
}

/**
 * 🤝 협조 현황 조회
 */
function getCollaborationStatus(reqId) {
  try {
    const stepsSheet = getSheet("CollaborationSteps");
    const stepsData = stepsSheet.getDataRange().getValues();

    const logsSheet = getSheet("CollaborationLogs");
    const logsData = logsSheet.getDataRange().getValues();

    const collaborationStatus = [];

    // 협조 단계 조회
    for (let i = 1; i < stepsData.length; i++) {
      if (stepsData[i][0] === reqId) {
        const collaboratorId = stepsData[i][1];
        const stepOrder = stepsData[i][2];

        // 해당 협조자 정보
        const collaborator = getEmployee(collaboratorId);

        // 협조 로그에서 처리 결과 찾기
        let collaborationLog = null;
        for (let j = 1; j < logsData.length; j++) {
          if (logsData[j][0] === reqId && logsData[j][1] == collaboratorId) {
            collaborationLog = {
              result: logsData[j][2],
              dateTime: logsData[j][3],
              comment: logsData[j][4],
            };
            break;
          }
        }

        collaborationStatus.push({
          stepOrder: stepOrder,
          collaboratorId: collaboratorId,
          collaboratorName: collaborator ? collaborator.name : "알 수 없음",
          collaboratorPosition: collaborator ? collaborator.position : "",
          status: collaborationLog ? collaborationLog.result : "대기",
          processedDate: collaborationLog ? collaborationLog.dateTime : null,
          comment: collaborationLog ? collaborationLog.comment : "",
        });
      }
    }

    // 단계순 정렬
    collaborationStatus.sort((a, b) => a.stepOrder - b.stepOrder);

    return collaborationStatus;
  } catch (error) {
    console.error("협조 현황 조회 오류:", error);
    return [];
  }
}

// =====================================
// ✅ 결재/협조 대기 목록 관련 함수들
// =====================================

/**
 * ✅ 내가 결재해야 할 목록 조회
 */
function getPendingApprovals(empId) {
  try {
    const stepsSheet = getSheet("ApprovalSteps");
    const stepsData = stepsSheet.getDataRange().getValues();

    const logsSheet = getSheet("ApprovalLogs");
    const logsData = logsSheet.getDataRange().getValues();

    const pendingApprovals = [];

    // 내가 결재자로 지정된 건들 찾기
    for (let i = 1; i < stepsData.length; i++) {
      if (stepsData[i][2] == empId) {
        const reqId = stepsData[i][0];
        const stepOrder = stepsData[i][3];

        // 이미 처리했는지 확인
        let alreadyProcessed = false;
        for (let j = 1; j < logsData.length; j++) {
          if (logsData[j][0] === reqId && logsData[j][1] == empId) {
            alreadyProcessed = true;
            break;
          }
        }

        // 아직 처리하지 않았고, 내 차례인지 확인
        if (!alreadyProcessed && isMyTurnToApprove(reqId, stepOrder)) {
          const requestInfo = getRequestInfo(reqId);
          if (requestInfo && requestInfo.status === "대기") {
            const applicant = getEmployee(requestInfo.empId);

            pendingApprovals.push({
              reqId: reqId,
              stepOrder: stepOrder,
              empId: requestInfo.empId,
              applicantName: applicant ? applicant.name : "알 수 없음",
              startDate: requestInfo.startDate,
              endDate: requestInfo.endDate,
              days: requestInfo.days,
              leaveType: requestInfo.leaveType,
              reason: requestInfo.reason,
              submitDate: requestInfo.submitDate,
            });
          }
        }
      }
    }

    // 신청일 기준 정렬
    pendingApprovals.sort(
      (a, b) => new Date(a.submitDate) - new Date(b.submitDate)
    );

    return pendingApprovals;
  } catch (error) {
    console.error("결재 대기 목록 조회 오류:", error);
    return [];
  }
}

/**
 * 🤝 내가 협조해야 할 목록 조회
 */
function getPendingCollaborations(empId) {
  try {
    const stepsSheet = getSheet("CollaborationSteps");
    const stepsData = stepsSheet.getDataRange().getValues();

    const logsSheet = getSheet("CollaborationLogs");
    const logsData = logsSheet.getDataRange().getValues();

    const pendingCollaborations = [];

    // 내가 협조자로 지정된 건들 찾기
    for (let i = 1; i < stepsData.length; i++) {
      if (stepsData[i][1] == empId) {
        const reqId = stepsData[i][0];

        // 이미 처리했는지 확인
        let alreadyProcessed = false;
        for (let j = 1; j < logsData.length; j++) {
          if (logsData[j][0] === reqId && logsData[j][1] == empId) {
            alreadyProcessed = true;
            break;
          }
        }

        // 아직 처리하지 않았고, 신청이 대기 중인지 확인
        if (!alreadyProcessed) {
          const requestInfo = getRequestInfo(reqId);
          if (requestInfo && requestInfo.status === "대기") {
            const applicant = getEmployee(requestInfo.empId);

            pendingCollaborations.push({
              reqId: reqId,
              empId: requestInfo.empId,
              applicantName: applicant ? applicant.name : "알 수 없음",
              startDate: requestInfo.startDate,
              endDate: requestInfo.endDate,
              days: requestInfo.days,
              leaveType: requestInfo.leaveType,
              reason: requestInfo.reason,
              submitDate: requestInfo.submitDate,
            });
          }
        }
      }
    }

    // 신청일 기준 정렬
    pendingCollaborations.sort(
      (a, b) => new Date(a.submitDate) - new Date(b.submitDate)
    );

    return pendingCollaborations;
  } catch (error) {
    console.error("협조 대기 목록 조회 오류:", error);
    return [];
  }
}

/**
 * 🔍 내 차례인지 확인 (결재 순서 체크)
 */
function isMyTurnToApprove(reqId, myStepOrder) {
  try {
    const logsSheet = getSheet("ApprovalLogs");
    const logsData = logsSheet.getDataRange().getValues();

    // 내 이전 단계가 모두 완료되었는지 확인
    for (let step = 1; step < myStepOrder; step++) {
      let stepCompleted = false;

      for (let i = 1; i < logsData.length; i++) {
        if (logsData[i][0] === reqId) {
          // 해당 단계의 결재자 ID 찾기
          const stepApproverId = getApproverByStep(reqId, step);
          if (
            stepApproverId &&
            logsData[i][1] == stepApproverId &&
            logsData[i][2] === "승인"
          ) {
            stepCompleted = true;
            break;
          }
        }
      }

      if (!stepCompleted) {
        return false; // 이전 단계가 완료되지 않음
      }
    }

    return true; // 내 차례임
  } catch (error) {
    console.error("결재 순서 확인 오류:", error);
    return false;
  }
}

/**
 * 🔍 특정 단계의 결재자 ID 조회
 */
function getApproverByStep(reqId, stepOrder) {
  try {
    const sheet = getSheet("ApprovalSteps");
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reqId && data[i][3] === stepOrder) {
        return data[i][2]; // ApproverID
      }
    }

    return null;
  } catch (error) {
    console.error("단계별 결재자 조회 오류:", error);
    return null;
  }
}

// =====================================
// 🤝 협조 처리 함수들
// =====================================

/**
 * 🤝 협조 처리
 */
function processCollaboration(reqId, collaboratorId, result, comment) {
  try {
    // 협조 로그 기록
    const logsSheet = getSheet("CollaborationLogs");
    logsSheet.appendRow([
      reqId,
      collaboratorId,
      result,
      new Date(),
      comment || "",
    ]);

    return {
      success: true,
      message: "협조 처리가 완료되었습니다.",
    };
  } catch (error) {
    console.error("협조 처리 오류:", error);
    return {
      success: false,
      message: "협조 처리 중 오류가 발생했습니다: " + error.message,
    };
  }
}

// =====================================
// 📊 개인 정보 관련 함수들
// =====================================

/**
 * 👤 내 정보 조회 (연차 현황 포함)
 */
function getMyInfo(empId) {
  try {
    // 기본 직원 정보
    const employee = getEmployee(empId);
    if (!employee) {
      return null;
    }

    // 부서 정보
    const departments = getAllDepartments();
    const department = departments.find(
      (dept) => dept.deptId == employee.deptId
    );

    // 연차 정보
    const currentYear = new Date().getFullYear();
    const basicLeaves = parseInt(getSystemSetting("기본연차일수", 15));
    const usedLeaves = calculateUsedLeaves(empId, currentYear);
    const remainingLeaves = Math.max(0, basicLeaves - usedLeaves);

    return {
      employee: {
        ...employee,
        deptName: department ? department.deptName : "부서 미지정",
      },
      leaveInfo: {
        basicLeaves: basicLeaves,
        usedLeaves: usedLeaves,
        remainingLeaves: remainingLeaves,
        year: currentYear,
      },
    };
  } catch (error) {
    console.error("내 정보 조회 오류:", error);
    return null;
  }
}

// =====================================
// 📅 근무표 관리 함수들은 WorkScheduleManagement.gs로 이동
// =====================================

// 근무표 관련 함수들은 WorkScheduleManagement.gs 파일로 이동됨

// 근무표 관련 함수들은 WorkScheduleManagement.gs 파일로 이동됨

/**
 * 👥 직원 행 설정
 */
function setupEmployeeRows(sheet, employees, year, month) {
  try {
    console.log("👥 직원 행 설정 중...", employees.length + "명");

    if (!employees || employees.length === 0) {
      console.log("⚠️ 해당 부서에 직원이 없습니다.");
      return;
    }

    const lastDay = new Date(year, month, 0).getDate();
    const basicLeaves = parseInt(getSystemSetting("기본연차일수", 15));

    employees.forEach((employee, index) => {
      const rowIndex = 6 + index; // 6행부터 시작

      // 기본 정보
      const rowData = [
        employee.empId,
        employee.name,
        basicLeaves, // 발생연차
        basicLeaves, // 그전달까지 남은연차 (임시로 기본값)
      ];

      // 날짜별 기본값 설정
      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();

        // 일요일은 OFF, 토요일과 평일은 D
        if (dayOfWeek === 0) {
          rowData.push("OFF"); // 일요일
        } else {
          rowData.push("D"); // 근무일
        }
      }

      // 사용, 잔여, 비고
      rowData.push(0, basicLeaves, "");

      // 행 데이터 설정
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    });

    console.log("✅ 직원 행 설정 완료");
  } catch (error) {
    console.error("❌ 직원 행 설정 오류:", error);
    throw error;
  }
}

/**
 * 🎨 근무표 스타일 적용
 */
function applyWorkScheduleStyles(sheet, year, month) {
  try {
    console.log("🎨 근무표 스타일 적용 중...");

    const lastDay = new Date(year, month, 0).getDate();
    const totalColumns = 4 + lastDay + 3; // 기본정보(4) + 날짜 + 사용/잔여/비고(3)

    // 1행 제목 스타일
    const titleRange = sheet.getRange(1, 1, 1, totalColumns);
    titleRange.merge();
    titleRange.setBackground("#667eea");
    titleRange.setFontColor("white");
    titleRange.setFontSize(14);
    titleRange.setFontWeight("bold");
    titleRange.setHorizontalAlignment("center");
    titleRange.setVerticalAlignment("middle");

    // 2-5행 헤더 스타일
    const headerRange = sheet.getRange(2, 1, 4, totalColumns);
    headerRange.setBackground("#e3f2fd");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");

    // 직원 정보 열 스타일 (A-D열)
    const employeeInfoRange = sheet.getRange(6, 1, sheet.getLastRow() - 5, 4);
    employeeInfoRange.setBackground("#f8f9fa");

    // 주말 색상 적용
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const columnIndex = 4 + day; // 날짜 열 위치

      if (dayOfWeek === 0) {
        // 일요일
        const sundayRange = sheet.getRange(
          2,
          columnIndex,
          sheet.getLastRow() - 1,
          1
        );
        sundayRange.setBackground("#ffebee");
        sundayRange.setFontColor("#d32f2f");
      } else if (dayOfWeek === 6) {
        // 토요일
        const saturdayRange = sheet.getRange(
          2,
          columnIndex,
          sheet.getLastRow() - 1,
          1
        );
        saturdayRange.setBackground("#e3f2fd");
        saturdayRange.setFontColor("#1976d2");
      }
    }

    // 테두리 설정
    const allDataRange = sheet.getRange(1, 1, sheet.getLastRow(), totalColumns);
    allDataRange.setBorder(true, true, true, true, true, true);

    // 행 높이 조정
    sheet.setRowHeight(1, 40); // 제목 행
    for (let i = 2; i <= 5; i++) {
      sheet.setRowHeight(i, 25); // 헤더 행들
    }

    // 열 너비 조정
    sheet.setColumnWidth(1, 80); // 사번
    sheet.setColumnWidth(2, 100); // 이름
    sheet.setColumnWidth(3, 80); // 발생연차
    sheet.setColumnWidth(4, 120); // 그전달까지 남은연차

    // 날짜 열들 (좁게)
    for (let day = 1; day <= lastDay; day++) {
      sheet.setColumnWidth(4 + day, 35);
    }

    sheet.setColumnWidth(4 + lastDay + 1, 60); // 사용
    sheet.setColumnWidth(4 + lastDay + 2, 60); // 잔여
    sheet.setColumnWidth(4 + lastDay + 3, 100); // 비고

    console.log("✅ 근무표 스타일 적용 완료");
  } catch (error) {
    console.error("❌ 근무표 스타일 적용 오류:", error);
    // 스타일 오류는 치명적이지 않으므로 계속 진행
  }
}
