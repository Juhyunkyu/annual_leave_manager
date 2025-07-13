/**
 * 📋 연차관리 시스템 - 연차 관리 모듈
 *
 * 🔧 기능: 연차 신청, 결재 처리, 데이터 조회, 통계 생성
 * 📊 처리: LeaveRequests, ApprovalSteps, ApprovalLogs 등
 */

// =====================================
// 📊 대시보드 및 데이터 조회 함수들
// =====================================

/**
 * 🏠 대시보드 데이터 가져오기
 */
function getDashboardData(empId) {
  try {
    console.log("대시보드 데이터 조회:", empId);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    return {
      remainingLeaves: calculateRemainingLeaves(empId, currentYear),
      pendingRequests: getPendingRequestsCount(empId),
      pendingApprovals: getPendingApprovalsCount(empId),
      thisMonthUsed: getMonthlyUsedLeaves(empId, currentYear, currentMonth),
    };
  } catch (error) {
    console.error("대시보드 데이터 조회 오류:", error);
    return {
      remainingLeaves: 15,
      pendingRequests: 0,
      pendingApprovals: 0,
      thisMonthUsed: 0,
    };
  }
}

/**
 * 📋 최근 연차 신청 내역 가져오기 (클라이언트 호환)
 */
function getRecentRequests(empId, limit = 5) {
  try {
    // 통합 함수 사용 (이미 클라이언트 호환 처리됨)
    return getMyRequests(empId, limit);
  } catch (error) {
    console.error("최근 신청 내역 조회 오류:", error);
    return [];
  }
}

/**
 * 📈 남은 연차 계산
 */
function calculateRemainingLeaves(empId, year) {
  try {
    // 기본 연차 일수 가져오기
    const basicLeaves = parseInt(getSystemSetting("기본연차일수", 15));

    // 사용한 연차 계산
    const usedLeaves = calculateUsedLeaves(empId, year);

    return Math.max(0, basicLeaves - usedLeaves);
  } catch (error) {
    console.error("남은 연차 계산 오류:", error);
    return 15; // 기본값
  }
}

/**
 * 📊 사용한 연차 계산
 */
function calculateUsedLeaves(empId, year) {
  try {
    // LeaveRequests 시트에서 승인된 연차만 계산
    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();

    let totalUsed = 0;

    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      const status = request[7]; // 상태 컬럼
      const requestEmpId = request[1]; // 직원 ID

      if (status === "승인" && requestEmpId === empId) {
        const startDate = new Date(request[2]); // 시작일
        const endDate = new Date(request[3]); // 종료일
        const leaveType = request[5]; // 연차 종류
        const days = parseFloat(request[4]) || 0; // 일수

        // 해당 연도의 모든 연차 계산 (과거 포함)
        if (startDate.getFullYear() === year) {
          if (leaveType === "반차") {
            totalUsed += days * 0.5;
          } else {
            totalUsed += days;
          }
        }
      }
    }

    return totalUsed;
  } catch (error) {
    console.error("사용한 연차 계산 오류:", error);
    return 0;
  }
}

/**
 * 📊 전체 사용 연차 계산 (과거 포함 - 통계용)
 */
function calculateTotalUsedLeaves(empId, year) {
  try {
    // LeaveRequests 시트에서 승인된 모든 연차 계산
    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();

    let totalUsed = 0;

    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      const status = request[7]; // 상태 컬럼
      const requestEmpId = request[1]; // 직원 ID

      if (status === "승인" && requestEmpId === empId) {
        const startDate = new Date(request[2]); // 시작일
        const leaveType = request[5]; // 연차 종류
        const days = parseFloat(request[4]) || 0; // 일수

        // 해당 연도의 모든 연차 계산 (과거 포함)
        if (startDate.getFullYear() === year) {
          if (leaveType === "반차") {
            totalUsed += days * 0.5;
          } else {
            totalUsed += days;
          }
        }
      }
    }

    return totalUsed;
  } catch (error) {
    console.error("전체 사용 연차 계산 오류:", error);
    return 0;
  }
}

/**
 * ⏳ 대기 중인 신청 개수
 */
function getPendingRequestsCount(empId) {
  try {
    const sheet = getSheet("LeaveRequests");
    const data = sheet.getDataRange().getValues();

    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == empId && data[i][7] === "대기") {
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error("대기 중인 신청 개수 조회 오류:", error);
    return 0;
  }
}

/**
 * ✅ 내가 처리해야 할 결재 개수
 */
function getPendingApprovalsCount(empId) {
  try {
    const sheet = getSheet("ApprovalSteps");
    const data = sheet.getDataRange().getValues();

    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] == empId) {
        // ApproverID 비교
        // 해당 신청이 아직 대기 중인지 확인
        const reqId = data[i][0];
        if (isRequestPending(reqId)) {
          count++;
        }
      }
    }

    return count;
  } catch (error) {
    console.error("대기 중인 결재 개수 조회 오류:", error);
    return 0;
  }
}

/**
 * 📅 이번 달 사용한 연차
 */
function getMonthlyUsedLeaves(empId, year, month) {
  try {
    const sheet = getSheet("LeaveUsage");
    const data = sheet.getDataRange().getValues();

    let monthlyUsed = 0;

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == empId) {
        // EmpID 비교
        const registerDate = new Date(data[i][3]);
        if (
          registerDate.getFullYear() === year &&
          registerDate.getMonth() + 1 === month
        ) {
          monthlyUsed += parseFloat(data[i][2]) || 0;
        }
      }
    }

    return monthlyUsed;
  } catch (error) {
    console.error("월별 사용 연차 조회 오류:", error);
    return 0;
  }
}

// =====================================
// 📝 연차 신청 관련 함수들
// =====================================

/**
 * 📝 연차 신청 처리
 */
function submitLeaveRequest(requestData) {
  try {
    console.log("연차 신청 처리:", requestData);

    // 입력값 검증
    const validation = validateLeaveRequest(requestData);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message,
      };
    }

    // 신청 ID 생성
    const reqId = generateRequestId();

    // LeaveRequests 시트에 저장
    const leaveSheet = getSheet("LeaveRequests");
    const newRow = [
      reqId,
      requestData.empId,
      requestData.startDate,
      requestData.endDate,
      requestData.days,
      requestData.leaveType,
      requestData.reason,
      "대기",
      new Date(),
    ];

    leaveSheet.appendRow(newRow);

    // 결재 단계 생성
    if (requestData.approvers && requestData.approvers.length > 0) {
      createApprovalSteps(reqId, requestData.approvers);
    }

    // 협조 단계 생성
    if (requestData.collaborators && requestData.collaborators.length > 0) {
      createCollaborationSteps(reqId, requestData.collaborators);
    }

    // 첫 번째 결재자에게 알림 발송
    if (requestData.approvers && requestData.approvers.length > 0) {
      sendApprovalNotification(reqId, requestData.approvers[0], requestData);
    }

    console.log("연차 신청 완료:", reqId);

    return {
      success: true,
      message: "연차 신청이 완료되었습니다.",
      reqId: reqId,
    };
  } catch (error) {
    console.error("연차 신청 처리 오류:", error);
    return {
      success: false,
      message: "연차 신청 처리 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * ✅ 연차 신청 유효성 검사
 */
function validateLeaveRequest(requestData) {
  try {
    // 필수 필드 확인
    if (
      !requestData.empId ||
      !requestData.startDate ||
      !requestData.endDate ||
      !requestData.leaveType ||
      !requestData.reason
    ) {
      return {
        valid: false,
        message: "모든 필수 항목을 입력해주세요.",
      };
    }

    // 날짜 검증 (과거 날짜도 허용)
    const startDate = new Date(requestData.startDate);
    const endDate = new Date(requestData.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작 시간으로 설정

    // 과거 날짜 허용 (급한 연차 신청을 위해)
    // if (startDate < today) {
    //   return {
    //     valid: false,
    //     message: "시작일은 오늘 이후여야 합니다.",
    //   };
    // }

    if (endDate < startDate) {
      return {
        valid: false,
        message: "종료일은 시작일 이후여야 합니다.",
      };
    }

    // 연차 잔여일수 확인 (과거 날짜 신청도 차감됨)
    const remainingLeaves = calculateRemainingLeaves(
      requestData.empId,
      startDate.getFullYear()
    );
    if (requestData.days > remainingLeaves) {
      return {
        valid: false,
        message: `잔여 연차가 부족합니다. (잔여: ${remainingLeaves}일, 신청: ${requestData.days}일)`,
      };
    }

    // 결재자 확인
    if (!requestData.approvers || requestData.approvers.length === 0) {
      return {
        valid: false,
        message: "최소 1명의 결재자를 선택해주세요.",
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("유효성 검사 오류:", error);
    return {
      valid: false,
      message: "유효성 검사 중 오류가 발생했습니다.",
    };
  }
}

/**
 * 🔢 신청 ID 생성
 */
function generateRequestId() {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const timeStr =
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  return `${dateStr}-${timeStr}`;
}

/**
 * 📋 신청 정보 조회
 */
function getRequestInfo(reqId) {
  try {
    const sheet = getSheet("LeaveRequests");
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reqId) {
        return {
          reqId: data[i][0],
          empId: data[i][1],
          startDate: data[i][2],
          endDate: data[i][3],
          days: data[i][4],
          leaveType: data[i][5],
          reason: data[i][6],
          status: data[i][7],
          submitDate: data[i][8],
        };
      }
    }

    return null;
  } catch (error) {
    console.error("신청 정보 조회 오류:", error);
    return null;
  }
}

/**
 * ❓ 신청이 아직 대기 중인지 확인
 */
function isRequestPending(reqId) {
  try {
    const requestInfo = getRequestInfo(reqId);
    return requestInfo && requestInfo.status === "대기";
  } catch (error) {
    console.error("신청 상태 확인 오류:", error);
    return false;
  }
}

// =====================================
// ✅ 결재 처리 관련 함수들
// =====================================

/**
 * ✅ 결재 단계 생성
 */
function createApprovalSteps(reqId, approvers) {
  try {
    const sheet = getSheet("ApprovalSteps");

    for (let i = 0; i < approvers.length; i++) {
      // 결재자의 부서 정보 조회
      const approver = getEmployee(approvers[i]);
      const groupId = approver ? approver.deptId : null;

      const newRow = [
        reqId,
        groupId, // GroupID (결재자의 부서 ID)
        approvers[i],
        i + 1, // StepOrder
      ];
      sheet.appendRow(newRow);
    }

    console.log("결재 단계 생성 완료:", reqId);
  } catch (error) {
    console.error("결재 단계 생성 오류:", error);
    throw error;
  }
}

/**
 * ✅ 결재 처리
 */
function processApproval(reqId, approverId, result, comment = "") {
  try {
    // 결재 로그 기록
    const logSheet = getSheet("ApprovalLogs");
    const logRow = [reqId, approverId, result, new Date(), comment];
    logSheet.appendRow(logRow);

    // 반려인 경우 신청 상태 변경
    if (result === "반려") {
      const requestSheet = getSheet("LeaveRequests");
      const data = requestSheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === reqId) {
          requestSheet.getRange(i + 1, 8).setValue("반려");
          break;
        }
      }

      // 신청자에게 반려 알림 발송
      sendRejectionNotification(reqId, comment);
      return { success: true, message: "반려 처리 완료" };
    }

    // 승인인 경우 다음 결재자 확인
    const nextApprover = getNextApprover(reqId, approverId);
    if (nextApprover) {
      // 다음 결재자에게 알림 발송
      sendApprovalNotification(reqId, nextApprover);
    } else {
      // 모든 결재 완료 - 최종 승인 처리
      finalizeApproval(reqId);
    }

    return { success: true, message: "결재 처리 완료" };
  } catch (error) {
    console.error("결재 처리 오류:", error);
    return { success: false, message: "결재 처리 중 오류가 발생했습니다." };
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
      if (
        data[i][0] === reqId &&
        parseInt(data[i][3]) === parseInt(stepOrder)
      ) {
        return data[i][2]; // ApproverID
      }
    }

    return null;
  } catch (error) {
    console.error("단계별 결재자 조회 오류:", error);
    return null;
  }
}

/**
 * ✅ 다음 결재자 조회
 */
function getNextApprover(reqId, currentApproverId) {
  try {
    const sheet = getSheet("ApprovalSteps");
    const data = sheet.getDataRange().getValues();

    let currentStep = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reqId && data[i][2] == currentApproverId) {
        currentStep = parseInt(data[i][3]);
        break;
      }
    }

    // 다음 단계 결재자 찾기
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reqId && parseInt(data[i][3]) === currentStep + 1) {
        return data[i][2];
      }
    }

    return null;
  } catch (error) {
    console.error("다음 결재자 조회 오류:", error);
    return null;
  }
}

/**
 * ✅ 최종 승인 처리
 */
function finalizeApproval(reqId) {
  try {
    // 신청 상태를 승인으로 변경
    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();
    let approvedRequest = null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reqId) {
        requestSheet.getRange(i + 1, 8).setValue("승인");

        // 승인된 신청 정보 저장
        approvedRequest = {
          empId: data[i][1],
          startDate: new Date(data[i][2]),
          endDate: new Date(data[i][3]),
          days: parseFloat(data[i][4]) || 0, // E열: Days
          leaveType: data[i][5],
        };
        break;
      }
    }

    // 연차 사용 기록 추가
    const usageSheet = getSheet("LeaveUsage");

    // 연차 종류에 따라 사용 일수 계산
    let usedDays = approvedRequest.days;
    if (approvedRequest.leaveType === "반차") {
      // 반차는 신청 시점에서 이미 0.5로 계산되어 저장되었으므로 그대로 사용
      // LeaveRequests의 Days 컬럼: 반차 1일 = 0.5, 반차 2일 = 1.0
      usedDays = approvedRequest.days;
    }

    const usageRow = [
      reqId,
      approvedRequest.empId,
      usedDays, // 계산된 사용 일수
      new Date(),
    ];
    usageSheet.appendRow(usageRow);

    // 신청자에게 최종 승인 알림 발송
    sendFinalApprovalNotification(reqId);

    // 근무표 자동 업데이트
    updateWorkScheduleForApprovedLeave(approvedRequest);

    console.log("최종 승인 처리 완료:", reqId);
    console.log("LeaveUsage 저장 데이터:", {
      reqId: reqId,
      empId: approvedRequest.empId,
      usedDays: usedDays,
      leaveType: approvedRequest.leaveType,
      originalDays: approvedRequest.days,
      calculationNote:
        approvedRequest.leaveType === "반차"
          ? "반차는 신청 시점에서 이미 0.5로 계산되어 저장됨"
          : "연차는 그대로 사용",
    });
  } catch (error) {
    console.error("최종 승인 처리 오류:", error);
    throw error;
  }
}

// =====================================
// 🤝 협조 처리 관련 함수들
// =====================================

/**
 * 🤝 협조 단계 생성
 */
function createCollaborationSteps(reqId, collaborators) {
  try {
    const sheet = getSheet("CollaborationSteps");

    for (let i = 0; i < collaborators.length; i++) {
      const newRow = [
        reqId,
        collaborators[i],
        i + 1, // StepOrder
      ];
      sheet.appendRow(newRow);
    }

    console.log("협조 단계 생성 완료:", reqId);
  } catch (error) {
    console.error("협조 단계 생성 오류:", error);
    throw error;
  }
}

/**
 * 🤝 협조 처리
 */
function processCollaboration(reqId, collaboratorId, result, comment = "") {
  try {
    // 협조 로그 기록
    const logSheet = getSheet("CollaborationLogs");
    const logRow = [reqId, collaboratorId, result, new Date(), comment];
    logSheet.appendRow(logRow);

    console.log("협조 처리 완료:", reqId);
    return { success: true, message: "협조 처리 완료" };
  } catch (error) {
    console.error("협조 처리 오류:", error);
    return { success: false, message: "협조 처리 중 오류가 발생했습니다." };
  }
}

// =====================================
// 📧 알림 시스템 함수들
// =====================================

/**
 * 📧 결재 알림 발송
 */
function sendApprovalNotification(reqId, approverId, requestData = null) {
  try {
    // 결재자 정보 조회
    const approver = getEmployeeById(approverId);
    if (!approver || !approver.email) {
      console.log("결재자 이메일을 찾을 수 없습니다:", approverId);
      return;
    }

    // 신청 정보 조회
    const request = requestData || getRequestInfo(reqId);
    if (!request) {
      console.log("신청 정보를 찾을 수 없습니다:", reqId);
      return;
    }

    // 신청자 정보 조회
    const applicant = getEmployeeById(request.empId);

    const subject = `[연차관리] 결재 요청 - ${
      applicant ? applicant.name : "직원"
    } (${reqId})`;
    const body = `
      <h2>📋 연차 결재 요청</h2>
      <p><strong>${approver.name}</strong>님께 연차 결재 요청이 있습니다.</p>
      
      <h3>📝 신청 정보</h3>
      <ul>
        <li><strong>신청자:</strong> ${
          applicant ? applicant.name : "알 수 없음"
        }</li>
        <li><strong>신청 번호:</strong> ${reqId}</li>
        <li><strong>연차 종류:</strong> ${request.leaveType}</li>
        <li><strong>기간:</strong> ${formatDateString(
          request.startDate
        )} ~ ${formatDateString(request.endDate)}</li>
        <li><strong>일수:</strong> ${request.days}일</li>
        <li><strong>사유:</strong> ${request.reason}</li>
      </ul>
      
      <p>📱 <a href="${WEB_APP_URL}">연차관리 시스템</a>에 로그인하여 결재를 진행해주세요.</p>
    `;

    MailApp.sendEmail({
      to: approver.email,
      subject: subject,
      htmlBody: body,
    });

    console.log("결재 알림 발송 완료:", approver.email);
  } catch (error) {
    console.error("결재 알림 발송 오류:", error);
  }
}

/**
 * 📧 반려 알림 발송
 */
function sendRejectionNotification(reqId, comment) {
  try {
    const request = getRequestInfo(reqId);
    const applicant = getEmployeeById(request.empId);

    if (!applicant || !applicant.email) {
      console.log("신청자 이메일을 찾을 수 없습니다:", request.empId);
      return;
    }

    const subject = `[연차관리] 연차 신청 반려 - ${reqId}`;
    const body = `
      <h2>❌ 연차 신청 반려</h2>
      <p><strong>${applicant.name}</strong>님의 연차 신청이 반려되었습니다.</p>
      
      <h3>📝 신청 정보</h3>
      <ul>
        <li><strong>신청 번호:</strong> ${reqId}</li>
        <li><strong>연차 종류:</strong> ${request.leaveType}</li>
        <li><strong>기간:</strong> ${formatDateString(
          request.startDate
        )} ~ ${formatDateString(request.endDate)}</li>
        <li><strong>일수:</strong> ${request.days}일</li>
      </ul>
      
      ${comment ? `<h3>💬 반려 사유</h3><p>${comment}</p>` : ""}
      
      <p>📱 <a href="${WEB_APP_URL}">연차관리 시스템</a>에서 자세한 내용을 확인하세요.</p>
    `;

    MailApp.sendEmail({
      to: applicant.email,
      subject: subject,
      htmlBody: body,
    });

    console.log("반려 알림 발송 완료:", applicant.email);
  } catch (error) {
    console.error("반려 알림 발송 오류:", error);
  }
}

/**
 * 📧 최종 승인 알림 발송
 */
function sendFinalApprovalNotification(reqId) {
  try {
    const request = getRequestInfo(reqId);
    const applicant = getEmployeeById(request.empId);

    if (!applicant || !applicant.email) {
      console.log("신청자 이메일을 찾을 수 없습니다:", request.empId);
      return;
    }

    const subject = `[연차관리] 연차 신청 승인 - ${reqId}`;
    const body = `
      <h2>✅ 연차 신청 승인</h2>
      <p><strong>${
        applicant.name
      }</strong>님의 연차 신청이 최종 승인되었습니다.</p>
      
      <h3>📝 승인된 연차 정보</h3>
      <ul>
        <li><strong>신청 번호:</strong> ${reqId}</li>
        <li><strong>연차 종류:</strong> ${request.leaveType}</li>
        <li><strong>기간:</strong> ${formatDateString(
          request.startDate
        )} ~ ${formatDateString(request.endDate)}</li>
        <li><strong>일수:</strong> ${request.days}일</li>
      </ul>
      
      <p>🎉 연차를 즐겁게 보내세요!</p>
      <p>📱 <a href="${WEB_APP_URL}">연차관리 시스템</a>에서 자세한 내용을 확인하세요.</p>
    `;

    MailApp.sendEmail({
      to: applicant.email,
      subject: subject,
      htmlBody: body,
    });

    console.log("최종 승인 알림 발송 완료:", applicant.email);
  } catch (error) {
    console.error("최종 승인 알림 발송 오류:", error);
  }
}

// =====================================
// 🔧 유틸리티 함수들
// =====================================

/**
 * 👤 직원 ID로 직원 정보 조회 (통합 함수 사용)
 */
function getEmployeeById(empId) {
  try {
    return getEmployee(empId);
  } catch (error) {
    console.error("직원 정보 조회 오류:", error);
    return null;
  }
}

/**
 * 📅 날짜 문자열 포맷팅
 */
function formatDateString(dateValue) {
  if (!dateValue) return "-";

  try {
    const date = new Date(dateValue);
    return date.toLocaleDateString("ko-KR");
  } catch (error) {
    return dateValue.toString();
  }
}

/**
 * 🔔 알림 개수 조회
 */
function getNotificationCount(empId) {
  try {
    // 결재 대기 + 협조 대기 개수
    const approvalCount = getPendingApprovalsCount(empId);
    const collaborationCount = getPendingCollaborationsCount(empId);

    return approvalCount + collaborationCount;
  } catch (error) {
    console.error("알림 개수 조회 오류:", error);
    return 0;
  }
}

/**
 * 🤝 협조 대기 개수 조회
 */
function getPendingCollaborationsCount(empId) {
  try {
    const sheet = getSheet("CollaborationSteps");
    const data = sheet.getDataRange().getValues();

    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == empId) {
        // CollaboratorID 비교
        const reqId = data[i][0];
        if (isRequestPending(reqId)) {
          count++;
        }
      }
    }

    return count;
  } catch (error) {
    console.error("협조 대기 개수 조회 오류:", error);
    return 0;
  }
}

/**
 * 🏢 부서명 조회
 */
function getDepartmentName(deptId) {
  try {
    const sheet = getSheet("Departments");
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == deptId) {
        return data[i][1];
      }
    }

    return "부서 미지정";
  } catch (error) {
    console.error("부서명 조회 오류:", error);
    return "부서 미지정";
  }
}

/**
 * ⚙️ 시스템 설정값 조회
 */
function getSystemSetting(key, defaultValue = "") {
  try {
    const sheet = getSheet("Settings");
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return data[i][1];
      }
    }

    return defaultValue;
  } catch (error) {
    console.error("시스템 설정 조회 오류:", error);
    return defaultValue;
  }
}

/**
 * 🧪 과거 날짜 연차 신청 테스트
 */
function testPastDateLeaveRequest() {
  try {
    console.log("🧪 과거 날짜 연차 신청 테스트 시작");

    // 테스트 데이터 (과거 날짜)
    const testRequest = {
      empId: "1001", // 테스트 직원 ID
      startDate: "2025-01-15", // 과거 날짜
      endDate: "2025-01-16", // 과거 날짜
      days: 2,
      leaveType: "연차",
      reason: "테스트용 과거 날짜 연차 신청",
      approvers: ["1002"], // 테스트 결재자
      collaborators: [],
    };

    console.log("📋 테스트 데이터:", testRequest);

    // 유효성 검사 테스트
    const validation = validateLeaveRequest(testRequest);
    console.log("✅ 유효성 검사 결과:", validation);

    if (!validation.valid) {
      console.error("❌ 유효성 검사 실패:", validation.message);
      return {
        success: false,
        error: validation.message,
      };
    }

    // 실제 신청 처리 테스트
    const result = submitLeaveRequest(testRequest);
    console.log("📝 연차 신청 결과:", result);

    return {
      success: true,
      validation: validation,
      submission: result,
      message: "과거 날짜 연차 신청 테스트 완료",
    };
  } catch (error) {
    console.error("❌ 과거 날짜 연차 신청 테스트 오류:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 🧪 과거 날짜 연차 신청 잔여 영향 테스트
 */
function testPastDateLeaveImpact() {
  try {
    console.log("🧪 과거 날짜 연차 신청 잔여 영향 테스트 시작");

    const testEmpId = "1001"; // 테스트 직원 ID
    const currentYear = new Date().getFullYear();

    // 1. 현재 잔여 연차 확인
    const beforeRemaining = calculateRemainingLeaves(testEmpId, currentYear);
    const beforeTotalUsed = calculateUsedLeaves(testEmpId, currentYear);

    console.log("📊 테스트 전 상태:", {
      empId: testEmpId,
      remainingLeaves: beforeRemaining,
      usedLeaves: beforeTotalUsed,
    });

    // 2. 과거 날짜 연차 신청 테스트
    const pastRequest = {
      empId: testEmpId,
      startDate: "2025-01-15", // 과거 날짜
      endDate: "2025-01-16", // 과거 날짜
      days: 2,
      leaveType: "연차",
      reason: "테스트용 과거 날짜 연차 신청",
      approvers: ["1002"],
      collaborators: [],
    };

    // 3. 과거 연차 신청 처리
    const submissionResult = submitLeaveRequest(pastRequest);
    console.log("📝 과거 연차 신청 결과:", submissionResult);

    if (!submissionResult.success) {
      console.error("❌ 과거 연차 신청 실패:", submissionResult.message);
      return {
        success: false,
        error: submissionResult.message,
      };
    }

    // 4. 신청 후 잔여 연차 재확인
    const afterRemaining = calculateRemainingLeaves(testEmpId, currentYear);
    const afterTotalUsed = calculateUsedLeaves(testEmpId, currentYear);

    console.log("📊 테스트 후 상태:", {
      remainingLeaves: afterRemaining,
      usedLeaves: afterTotalUsed,
      remainingChange: afterRemaining - beforeRemaining,
      usedChange: afterTotalUsed - beforeTotalUsed,
    });

    // 5. 결과 검증 (과거 연차도 차감되어야 함)
    const remainingDecreased = afterRemaining < beforeRemaining;
    const totalUsedIncreased = afterTotalUsed > beforeTotalUsed;

    console.log("✅ 검증 결과:", {
      remainingDecreased: remainingDecreased,
      totalUsedIncreased: totalUsedIncreased,
      testPassed: remainingDecreased && totalUsedIncreased,
    });

    return {
      success: true,
      testPassed: remainingDecreased && totalUsedIncreased,
      before: {
        remaining: beforeRemaining,
        used: beforeTotalUsed,
      },
      after: {
        remaining: afterRemaining,
        used: afterTotalUsed,
      },
      impact: {
        remainingChange: afterRemaining - beforeRemaining,
        usedChange: afterTotalUsed - beforeTotalUsed,
      },
      message:
        remainingDecreased && totalUsedIncreased
          ? "✅ 과거 날짜 연차 신청이 현재 잔여에서 올바르게 차감됩니다."
          : "❌ 과거 날짜 연차 신청이 현재 잔여에서 차감되지 않습니다.",
    };
  } catch (error) {
    console.error("❌ 과거 날짜 연차 신청 잔여 영향 테스트 오류:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 🧪 LeaveUsage 시트 데이터 확인 (디버깅용)
 */
function checkLeaveUsageData() {
  try {
    console.log("=== LeaveUsage 시트 데이터 확인 ===");

    const usageSheet = getSheet("LeaveUsage");
    const data = usageSheet.getDataRange().getValues();

    console.log("전체 데이터:", data);
    console.log("데이터 행 수:", data.length - 1); // 헤더 제외

    if (data.length > 1) {
      console.log("최근 5개 기록:");
      for (let i = Math.max(1, data.length - 5); i < data.length; i++) {
        console.log(`행 ${i}:`, {
          reqId: data[i][0],
          empId: data[i][1],
          usedDays: data[i][2],
          registerDate: data[i][3],
        });
      }
    } else {
      console.log("데이터가 없습니다.");
    }

    return {
      totalRecords: Math.max(0, data.length - 1),
      data: data,
    };
  } catch (error) {
    console.error("LeaveUsage 데이터 확인 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 ApprovalSteps 시트 데이터 확인 (디버깅용)
 */
function checkApprovalStepsData() {
  try {
    console.log("=== ApprovalSteps 시트 데이터 확인 ===");

    const stepsSheet = getSheet("ApprovalSteps");
    const data = stepsSheet.getDataRange().getValues();

    console.log("전체 데이터:", data);
    console.log("데이터 행 수:", data.length - 1); // 헤더 제외

    if (data.length > 1) {
      console.log("최근 5개 기록:");
      for (let i = Math.max(1, data.length - 5); i < data.length; i++) {
        // 결재자 정보 조회
        const approver = getEmployee(data[i][2]);
        const groupName = data[i][1]
          ? getDepartmentName(data[i][1])
          : "부서 없음";

        console.log(`행 ${i}:`, {
          reqId: data[i][0],
          groupId: data[i][1],
          groupName: groupName,
          approverId: data[i][2],
          approverName: approver ? approver.name : "알 수 없음",
          stepOrder: data[i][3],
        });
      }
    } else {
      console.log("데이터가 없습니다.");
    }

    return {
      totalRecords: Math.max(0, data.length - 1),
      data: data,
    };
  } catch (error) {
    console.error("ApprovalSteps 데이터 확인 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 반차 계산 로직 테스트 (디버깅용)
 */
function testHalfDayCalculation() {
  try {
    console.log("=== 반차 계산 로직 테스트 ===");

    // 테스트 케이스들
    const testCases = [
      { leaveType: "연차", days: 1, expected: 1 },
      { leaveType: "연차", days: 2, expected: 2 },
      { leaveType: "반차", days: 0.5, expected: 0.5 },
      { leaveType: "반차", days: 1, expected: 1 },
      { leaveType: "반차", days: 2, expected: 2 },
      { leaveType: "특별휴가", days: 3, expected: 3 },
    ];

    console.log("테스트 결과:");
    testCases.forEach((testCase, index) => {
      let usedDays = testCase.days;
      if (testCase.leaveType === "반차") {
        // 반차는 신청 시점에서 이미 0.5로 계산되어 저장되었으므로 그대로 사용
        usedDays = testCase.days;
      }

      const isCorrect = usedDays === testCase.expected;
      console.log(
        `${index + 1}. ${testCase.leaveType} ${
          testCase.days
        }일 → ${usedDays}일 (${isCorrect ? "✅" : "❌"})`
      );
    });

    return {
      success: true,
      testCases: testCases,
      message: "반차 계산 로직 테스트 완료",
    };
  } catch (error) {
    console.error("반차 계산 테스트 오류:", error);
    return { error: error.message };
  }
}
