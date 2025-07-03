/**
 * 📋 연차관리 시스템 - 직원 관리 모듈
 *
 * 🔧 기능: 직원 조회, 부서 관리, 결재/협조 대기 목록 조회
 * 👥 처리: Employees, Departments 시트 관리
 */

// =====================================
// 👥 직원 관리 함수들
// =====================================

/**
 * 👥 전체 직원 목록 조회 (부서 정보 포함)
 */
function getAllEmployees() {
  try {
    const empSheet = getSheet("Employees");
    const empData = empSheet.getDataRange().getValues();

    const deptSheet = getSheet("Departments");
    const deptData = deptSheet.getDataRange().getValues();

    // 부서 정보를 맵으로 변환
    const deptMap = {};
    for (let i = 1; i < deptData.length; i++) {
      deptMap[deptData[i][0]] = deptData[i][1]; // DeptID -> DeptName
    }

    const employees = [];

    // 헤더 제외하고 직원 정보 수집
    for (let i = 1; i < empData.length; i++) {
      employees.push({
        empId: empData[i][0],
        name: empData[i][1],
        email: empData[i][2],
        phone: empData[i][3],
        deptId: empData[i][4],
        deptName: deptMap[empData[i][4]] || "부서 미지정",
        joinDate: empData[i][5],
        position: empData[i][6],
      });
    }

    // 이름순 정렬
    employees.sort((a, b) => a.name.localeCompare(b.name, "ko"));

    return employees;
  } catch (error) {
    console.error("전체 직원 조회 오류:", error);
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
    return allEmployees.filter((emp) => empIds.includes(emp.empId.toString()));
  } catch (error) {
    console.error("직원 ID 조회 오류:", error);
    return [];
  }
}

/**
 * 🏢 전체 부서 목록 조회
 */
function getAllDepartments() {
  try {
    const deptSheet = getSheet("Departments");
    const deptData = deptSheet.getDataRange().getValues();

    const empSheet = getSheet("Employees");
    const empData = empSheet.getDataRange().getValues();

    const departments = [];

    for (let i = 1; i < deptData.length; i++) {
      const deptId = deptData[i][0];

      // 해당 부서의 직원 수 계산
      let employeeCount = 0;
      for (let j = 1; j < empData.length; j++) {
        if (empData[j][4] == deptId) {
          // DeptID 컬럼 비교
          employeeCount++;
        }
      }

      departments.push({
        deptId: deptId,
        deptName: deptData[i][1],
        employeeCount: employeeCount,
      });
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
    return allEmployees.filter((emp) => emp.deptId == deptId);
  } catch (error) {
    console.error("부서별 직원 조회 오류:", error);
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
        // EmpID 비교
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
    const applicant = getEmployeeById(requestInfo.empId);

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
        const approver = getEmployeeById(approverId);

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
        const collaborator = getEmployeeById(collaboratorId);

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
        // ApproverID 비교
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
            const applicant = getEmployeeById(requestInfo.empId);

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
        // CollaboratorID 비교
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
            const applicant = getEmployeeById(requestInfo.empId);

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
    const employee = getEmployeeById(empId);
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
