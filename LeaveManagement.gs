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
 * 📋 최근 연차 신청 내역 가져오기
 */
function getRecentRequests(empId, limit = 5) {
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

    return requests.slice(0, limit);
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
    const sheet = getSheet("LeaveUsage");
    const data = sheet.getDataRange().getValues();

    let totalUsed = 0;

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == empId) {
        // EmpID 비교
        const registerDate = new Date(data[i][3]);
        if (registerDate.getFullYear() === year) {
          totalUsed += parseFloat(data[i][2]) || 0; // UsedDays
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

    // 날짜 검증
    const startDate = new Date(requestData.startDate);
    const endDate = new Date(requestData.endDate);
    const today = new Date();

    if (startDate < today) {
      return {
        valid: false,
        message: "시작일은 오늘 이후여야 합니다.",
      };
    }

    if (endDate < startDate) {
      return {
        valid: false,
        message: "종료일은 시작일 이후여야 합니다.",
      };
    }

    // 연차 잔여일수 확인
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
 * 🆔 신청 ID 생성
 */
function generateRequestId() {
  const today = new Date();
  const dateString =
    today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, "0") +
    today.getDate().toString().padStart(2, "0");

  // 같은 날짜의 신청 개수 확인
  const sheet = getSheet("LeaveRequests");
  const data = sheet.getDataRange().getValues();

  let count = 1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().startsWith(dateString)) {
      count++;
    }
  }

  return dateString + "-" + count.toString().padStart(3, "0");
}

/**
 * 📋 결재 단계 생성
 */
function createApprovalSteps(reqId, approvers) {
  try {
    const sheet = getSheet("ApprovalSteps");

    approvers.forEach((approverId, index) => {
      sheet.appendRow([
        reqId,
        null, // GroupID는 사용하지 않음
        approverId,
        index + 1, // StepOrder
      ]);
    });

    console.log("결재 단계 생성 완료:", reqId, approvers.length + "단계");
  } catch (error) {
    console.error("결재 단계 생성 오류:", error);
    throw error;
  }
}

/**
 * 🤝 협조 단계 생성
 */
function createCollaborationSteps(reqId, collaborators) {
  try {
    const sheet = getSheet("CollaborationSteps");

    collaborators.forEach((collaboratorId, index) => {
      sheet.appendRow([
        reqId,
        collaboratorId,
        index + 1, // StepOrder
      ]);
    });

    console.log("협조 단계 생성 완료:", reqId, collaborators.length + "명");
  } catch (error) {
    console.error("협조 단계 생성 오류:", error);
    throw error;
  }
}

// =====================================
// ✅ 결재/협조 처리 함수들
// =====================================

/**
 * ✅ 결재 처리
 */
function processApproval(reqId, approverId, result, comment) {
  try {
    console.log("결재 처리:", reqId, approverId, result);

    // 결재 로그 기록
    const logsSheet = getSheet("ApprovalLogs");
    logsSheet.appendRow([reqId, approverId, result, new Date(), comment || ""]);

    if (result === "반려") {
      // 반려 시 신청 상태 업데이트
      updateRequestStatus(reqId, "반려");

      // 신청자에게 반려 알림
      sendRejectionNotification(reqId, comment);

      return {
        success: true,
        message: "연차 신청이 반려되었습니다.",
      };
    } else if (result === "승인") {
      // 다음 결재자 확인
      const nextApprover = getNextApprover(reqId, approverId);

      if (nextApprover) {
        // 다음 결재자에게 알림
        sendApprovalNotification(reqId, nextApprover);

        return {
          success: true,
          message: "결재가 완료되었습니다. 다음 결재자에게 전달됩니다.",
        };
      } else {
        // 최종 승인 완료
        finalizeApproval(reqId);

        return {
          success: true,
          message: "연차 신청이 최종 승인되었습니다.",
        };
      }
    }
  } catch (error) {
    console.error("결재 처리 오류:", error);
    return {
      success: false,
      message: "결재 처리 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 🔍 다음 결재자 찾기
 */
function getNextApprover(reqId, currentApproverId) {
  try {
    const sheet = getSheet("ApprovalSteps");
    const data = sheet.getDataRange().getValues();

    let currentStep = 0;

    // 현재 결재자의 단계 찾기
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reqId && data[i][2] == currentApproverId) {
        currentStep = data[i][3];
        break;
      }
    }

    // 다음 단계의 결재자 찾기
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reqId && data[i][3] === currentStep + 1) {
        return data[i][2]; // ApproverID
      }
    }

    return null; // 다음 결재자가 없음 (최종 단계)
  } catch (error) {
    console.error("다음 결재자 찾기 오류:", error);
    return null;
  }
}

/**
 * ✅ 최종 승인 처리
 */
function finalizeApproval(reqId) {
  try {
    // 신청 상태 업데이트
    updateRequestStatus(reqId, "승인");

    // 연차 사용 기록 생성
    recordLeaveUsage(reqId);

    // 신청자에게 최종 승인 알림
    sendFinalApprovalNotification(reqId);

    console.log("최종 승인 처리 완료:", reqId);
  } catch (error) {
    console.error("최종 승인 처리 오류:", error);
    throw error;
  }
}

/**
 * 🔄 신청 상태 업데이트
 */
function updateRequestStatus(reqId, status) {
  try {
    const sheet = getSheet("LeaveRequests");
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reqId) {
        sheet.getRange(i + 1, 8).setValue(status); // Status 컬럼 업데이트
        break;
      }
    }
  } catch (error) {
    console.error("신청 상태 업데이트 오류:", error);
    throw error;
  }
}

/**
 * 📊 연차 사용 기록 생성
 */
function recordLeaveUsage(reqId) {
  try {
    // 신청 정보 조회
    const requestInfo = getRequestInfo(reqId);
    if (!requestInfo) {
      throw new Error("신청 정보를 찾을 수 없습니다.");
    }

    // LeaveUsage 시트에 기록
    const usageSheet = getSheet("LeaveUsage");
    usageSheet.appendRow([
      reqId,
      requestInfo.empId,
      requestInfo.days,
      new Date(),
    ]);

    console.log("연차 사용 기록 완료:", reqId, requestInfo.days + "일");
  } catch (error) {
    console.error("연차 사용 기록 오류:", error);
    throw error;
  }
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
