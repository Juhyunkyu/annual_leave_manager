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
function getMyLeaveInfoFast(empId, sessionData = null) {
  try {
    // 클라이언트에서 전달받은 세션 데이터 확인
    if (sessionData && sessionData.userType === "admin") {
      // 관리자 정보 조회
      const adminInfo = getAdminByAdminId(sessionData.adminId);

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

    // 연차 정보 계산 (모든 승인된 연차 반영)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // 1. 입사일 기준 발생 연차 계산
    const earnedLeaves = calculateEarnedLeaves(
      empId,
      currentYear,
      currentMonth
    );

    // 2. 모든 승인된 연차 계산 (과거 + 현재 + 미래)
    const allApprovedLeaves = calculateAllApprovedLeaves(empId);

    // 3. 최종 잔여 (발생 - 모든 승인된 연차)
    const remainingLeaves = Math.max(0, earnedLeaves - allApprovedLeaves);

    // 4. 해당 월 사용 연차 (표시용)
    const monthlyUsage = getMonthlyUsedLeaves(empId, currentYear, currentMonth);

    // 대기 중인 신청 개수 계산
    const pendingRequests = getPendingRequestsCount(empId);
    const pendingApprovals = getPendingApprovalsCount(empId);

    return {
      totalLeaves: earnedLeaves,
      usedLeaves: allApprovedLeaves,
      remainingLeaves: remainingLeaves,
      thisYearUsed: allApprovedLeaves,
      pendingRequests: pendingRequests,
      pendingApprovals: pendingApprovals,
      year: currentYear,
      deptName: deptName,
      empName: employee.name,
      position: employee.position,
      // 디버깅용 추가 정보
      debug: {
        earnedLeaves: earnedLeaves,
        allApprovedLeaves: allApprovedLeaves,
        monthlyUsage: monthlyUsage,
        calculation: `${earnedLeaves} - ${allApprovedLeaves} = ${remainingLeaves}`,
      },
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

/**
 * ⏳ 대기 중인 신청 개수 (EmployeeManagement.gs에서 사용)
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
 * ✅ 내가 처리해야 할 결재 개수 (EmployeeManagement.gs에서 사용)
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
 * ❓ 신청이 아직 대기 중인지 확인 (EmployeeManagement.gs에서 사용)
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

/**
 * 📋 신청 정보 조회 (EmployeeManagement.gs에서 사용)
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
 * 📊 신청 상세 정보 조회 (상세보기용)
 */
function getRequestDetailsForModal(reqId) {
  try {
    console.log("📊 신청 상세 정보 조회 시작:", reqId);

    // 기본 신청 정보
    const requestInfo = getRequestInfo(reqId);
    if (!requestInfo) {
      return { success: false, error: "신청 정보를 찾을 수 없습니다." };
    }

    // 신청자 정보
    const applicant = getEmployee(requestInfo.empId);
    if (!applicant) {
      return { success: false, error: "신청자 정보를 찾을 수 없습니다." };
    }

    // 결재 현황
    const approvalStatus = getApprovalStatus(reqId);

    // 협조 현황
    const collaborationStatus = getCollaborationStatus(reqId);

    const result = {
      success: true,
      request: requestInfo,
      applicant: applicant,
      approvalStatus: approvalStatus,
      collaborationStatus: collaborationStatus,
    };

    console.log("📊 신청 상세 정보 조회 완료:", result);
    return result;
  } catch (error) {
    console.error("신청 상세 정보 조회 오류:", error);
    return { success: false, error: "상세 정보 조회 중 오류가 발생했습니다." };
  }
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
 * 🚨 코드 업데이트 확인용 함수
 */
function checkCodeUpdate() {
  const timestamp = new Date().toISOString();
  console.log("🚨🚨🚨 코드 업데이트 확인 - 타임스탬프:", timestamp);
  return {
    updated: true,
    timestamp: timestamp,
    version: "2.0",
    message: "새 코드가 정상적으로 적용되었습니다!",
  };
}

/**
 * 🔍 디버깅: LeaveRequests 시트 데이터 구조 확인
 */
function debugLeaveRequestsSheet() {
  try {
    console.log("🔍 LeaveRequests 시트 디버깅 시작");

    const sheet = getSheet("LeaveRequests");
    if (!sheet) {
      return { error: true, message: "LeaveRequests 시트를 찾을 수 없습니다." };
    }

    const data = sheet.getDataRange().getValues();
    console.log("📊 시트 데이터 전체:", data);

    const result = {
      sheetName: "LeaveRequests",
      totalRows: data.length,
      totalCols: data[0] ? data[0].length : 0,
      header: data[0] || [],
      sampleData: data.slice(1, 6), // 최대 5개 행 샘플
      allData: data, // 전체 데이터 (디버깅용)
      columnInfo: {},
    };

    // 컬럼별 정보 분석
    if (data.length > 0) {
      const header = data[0];
      for (let col = 0; col < header.length; col++) {
        const columnName = header[col];
        const columnValues = data
          .slice(1)
          .map((row) => row[col])
          .filter((val) => val !== "" && val !== null && val !== undefined);
        result.columnInfo[columnName] = {
          index: col,
          sampleValues: columnValues.slice(0, 5),
          totalValues: columnValues.length,
          dataTypes: [...new Set(columnValues.map((val) => typeof val))],
        };
      }
    }

    console.log("🔍 디버깅 결과:", result);
    return result;
  } catch (error) {
    console.error("❌ 디버깅 오류:", error);
    return {
      error: true,
      message: error.message,
      stack: error.stack,
    };
  }
}

/**
 * 📊 내 연차 신청 목록 조회 (안정적 버전)
 */
function getMyRequests(empId, limit = null, sessionData = null) {
  console.log("🚀🚀🚀 getMyRequests 함수 시작 🚀🚀🚀");
  console.log("📥 입력 파라미터:", { empId, limit, empIdType: typeof empId });

  try {
    // 1. 함수 진입 확인
    console.log("✅ Step 1: 함수 진입 성공");

    // 2. 클라이언트에서 전달받은 세션 데이터 확인
    console.log("🔍 Step 2: 세션 확인 시작");
    console.log("📋 세션 상태:", {
      hasSession: !!sessionData,
      sessionData: sessionData,
    });

    if (!sessionData) {
      console.error("❌ Step 2 실패: 세션이 없습니다");
      console.log("🔙 반환값: 빈 배열 (세션 없음)");
      return [];
    }

    console.log("✅ Step 2 성공: 세션 확인 완료");
    console.log("📋 세션 정보:", {
      userType: sessionData.userType,
      empId: sessionData.empId,
      adminId: sessionData.adminId,
      name: sessionData.name,
    });

    // 3. 관리자인 경우 처리
    console.log("🔍 Step 3: 사용자 타입 확인");
    if (sessionData.userType === "admin") {
      console.log("ℹ️ Step 3: 관리자 사용자 - 연차 신청 내역 없음");
      console.log("🔙 반환값: 빈 배열 (관리자)");
      return [];
    }

    // 4. 직원 세션에서 empId 확인
    console.log("🔍 Step 4: 직원 ID 확인");
    const actualEmpId = sessionData.empId || empId;
    console.log("📋 직원 ID 결정:", {
      sessionEmpId: sessionData.empId,
      parameterEmpId: empId,
      actualEmpId: actualEmpId,
    });

    if (!actualEmpId) {
      console.error("❌ Step 4 실패: 직원 ID를 찾을 수 없습니다");
      console.log("🔙 반환값: 빈 배열 (empId 없음)");
      return [];
    }

    console.log("✅ Step 4 성공: 조회 대상 empId =", actualEmpId);

    // 5. LeaveRequests 시트 접근
    console.log("🔍 Step 5: LeaveRequests 시트 접근");
    const sheet = getSheet("LeaveRequests");
    console.log("✅ Step 5a: 시트 객체 획득 성공");

    const data = sheet.getDataRange().getValues();
    console.log("✅ Step 5b: 시트 데이터 읽기 성공");
    console.log("📋 시트 데이터 정보:", {
      totalRows: data.length,
      headerRow: data[0],
      hasData: data.length > 1,
    });

    if (!data || data.length <= 1) {
      console.log("ℹ️ Step 5: 연차 신청 데이터가 없습니다");
      console.log("🔙 반환값: 빈 배열 (데이터 없음)");
      return [];
    }

    console.log(
      "✅ Step 5 성공: 시트 데이터 조회 완료 - 총",
      data.length - 1,
      "건"
    );

    // 6. 데이터 필터링
    console.log("🔍 Step 6: 해당 직원의 신청 내역 필터링");
    const requests = [];
    const normalizedEmpId = actualEmpId.toString().trim();
    console.log("📋 매칭 대상 empId:", normalizedEmpId);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowEmpId = row[1]; // empId는 2번째 컬럼 (인덱스 1)
      const normalizedRowEmpId = rowEmpId ? rowEmpId.toString().trim() : "";

      console.log(`📋 행 ${i} 검사:`, {
        rowEmpId: rowEmpId,
        normalizedRowEmpId: normalizedRowEmpId,
        isMatch: normalizedRowEmpId === normalizedEmpId,
      });

      if (normalizedRowEmpId === normalizedEmpId) {
        const request = {
          reqId: row[0] || "",
          empId: row[1] || "",
          startDate: formatDateForClient(row[2]),
          endDate: formatDateForClient(row[3]),
          days: row[4] || 0,
          leaveType: row[5] || "",
          reason: row[6] || "",
          status: row[7] || "대기",
          submitDate: formatDateForClient(row[8]),
        };
        requests.push(request);
        console.log("✅ 매칭 성공:", request);
      }
    }

    console.log("✅ Step 6 성공: 매칭된 신청 건수 =", requests.length);

    // 7. 날짜 정렬
    console.log("🔍 Step 7: 날짜 정렬");
    requests.sort((a, b) => {
      try {
        return new Date(b.submitDate) - new Date(a.submitDate);
      } catch (e) {
        console.warn("⚠️ 정렬 오류:", e);
        return 0;
      }
    });

    // 8. 제한 개수 적용
    console.log("🔍 Step 8: 제한 개수 적용");
    const result = limit ? requests.slice(0, limit) : requests;

    console.log("🎉🎉🎉 getMyRequests 완료 🎉🎉🎉");
    console.log("🔙 최종 반환값:", {
      type: "array",
      length: result.length,
      data: result,
    });

    return result;
  } catch (error) {
    console.error("❌❌❌ getMyRequests 전체 오류 ❌❌❌");
    console.error("❌ 오류 메시지:", error.message);
    console.error("❌ 오류 스택:", error.stack);
    console.error("❌ 오류 상세:", error);

    console.log("🔙 오류 시 반환값: 빈 배열");
    return [];
  }
}

/**
 * 🧪 디버깅: getMyRequests 함수 테스트
 */
function testGetMyRequests() {
  try {
    console.log("=== 🧪 getMyRequests 테스트 시작 ===");

    // 1. 현재 세션 확인
    const session = getValidSession();
    console.log("1. 현재 세션:", session);

    // 2. 임의의 empId로 테스트
    const testEmpId = "1001"; // 테스트용 empId
    console.log("2. 테스트 empId:", testEmpId);

    // 3. getMyRequests 직접 호출
    const result = getMyRequests(testEmpId);
    console.log("3. getMyRequests 결과:", result);
    console.log("3. 결과 타입:", typeof result);
    console.log("3. 결과 길이:", result ? result.length : "N/A");

    // 4. LeaveRequests 시트 직접 조회
    const sheet = getSheet("LeaveRequests");
    const data = sheet.getDataRange().getValues();
    console.log("4. LeaveRequests 시트 전체 데이터:", data);

    // 5. 해당 empId의 데이터 확인
    const matchingRows = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().trim() === testEmpId) {
        matchingRows.push(data[i]);
      }
    }
    console.log("5. 매칭되는 행들:", matchingRows);

    return {
      session: session,
      testEmpId: testEmpId,
      functionResult: result,
      sheetData: data,
      matchingRows: matchingRows,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ 테스트 오류:", error);
    return {
      error: true,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 🧪 디버깅: 클라이언트용 getMyRequests 테스트
 */
function testGetMyRequestsForClient() {
  try {
    console.log("=== 🧪 클라이언트용 getMyRequests 테스트 시작 ===");

    // 현재 세션에서 empId 가져오기
    const session = getValidSession();
    if (!session) {
      return {
        error: true,
        message: "세션이 없습니다. 로그인이 필요합니다.",
      };
    }

    let empId;
    if (session.userType === "admin") {
      empId = "1001"; // 관리자인 경우 테스트용 empId
    } else {
      empId = session.empId;
    }

    console.log("테스트 대상 empId:", empId);

    // getMyRequests 호출
    const result = getMyRequests(empId);

    console.log("getMyRequestsForClient 결과:", {
      sessionType: session.userType,
      empId: empId,
      resultType: typeof result,
      resultLength: result ? result.length : "N/A",
      result: result,
    });

    return {
      success: true,
      sessionType: session.userType,
      empId: empId,
      resultType: typeof result,
      resultLength: result ? result.length : "N/A",
      result: result,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ 클라이언트용 테스트 오류:", error);
    return {
      error: true,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
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

        // Date 객체를 문자열로 변환
        const formatDateForClient = (dateValue) => {
          if (!dateValue) return "";
          if (dateValue instanceof Date) {
            return dateValue.toISOString().split("T")[0];
          }
          return dateValue.toString();
        };

        approvalStatus.push({
          stepOrder: stepOrder,
          approverId: approverId,
          approverName: approver ? approver.name : "알 수 없음",
          approverPosition: approver ? approver.position : "",
          status: approvalLog ? approvalLog.result : "대기",
          processedDate: approvalLog
            ? formatDateForClient(approvalLog.dateTime)
            : null,
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

        // Date 객체를 문자열로 변환
        const formatDateForClient = (dateValue) => {
          if (!dateValue) return "";
          if (dateValue instanceof Date) {
            return dateValue.toISOString().split("T")[0];
          }
          return dateValue.toString();
        };

        collaborationStatus.push({
          stepOrder: stepOrder,
          collaboratorId: collaboratorId,
          collaboratorName: collaborator ? collaborator.name : "알 수 없음",
          collaboratorPosition: collaborator ? collaborator.position : "",
          status: collaborationLog ? collaborationLog.result : "대기",
          processedDate: collaborationLog
            ? formatDateForClient(collaborationLog.dateTime)
            : null,
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
        if (
          !alreadyProcessed &&
          isMyTurnToApprove(reqId, parseInt(stepOrder))
        ) {
          const requestInfo = getRequestInfo(reqId);
          if (requestInfo && requestInfo.status === "대기") {
            const applicant = getEmployee(requestInfo.empId);

            // Date 객체를 문자열로 변환
            const formatDateForClient = (dateValue) => {
              if (!dateValue) return "";
              if (dateValue instanceof Date) {
                return dateValue.toISOString().split("T")[0];
              }
              return dateValue.toString();
            };

            pendingApprovals.push({
              reqId: reqId,
              stepOrder: stepOrder,
              empId: requestInfo.empId,
              applicantName: applicant ? applicant.name : "알 수 없음",
              startDate: formatDateForClient(requestInfo.startDate),
              endDate: formatDateForClient(requestInfo.endDate),
              days: requestInfo.days,
              leaveType: requestInfo.leaveType,
              reason: requestInfo.reason,
              submitDate: formatDateForClient(requestInfo.submitDate),
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

            // Date 객체를 문자열로 변환
            const formatDateForClient = (dateValue) => {
              if (!dateValue) return "";
              if (dateValue instanceof Date) {
                return dateValue.toISOString().split("T")[0];
              }
              return dateValue.toString();
            };

            pendingCollaborations.push({
              reqId: reqId,
              empId: requestInfo.empId,
              applicantName: applicant ? applicant.name : "알 수 없음",
              startDate: formatDateForClient(requestInfo.startDate),
              endDate: formatDateForClient(requestInfo.endDate),
              days: requestInfo.days,
              leaveType: requestInfo.leaveType,
              reason: requestInfo.reason,
              submitDate: formatDateForClient(requestInfo.submitDate),
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
    for (let step = 1; step < parseInt(myStepOrder); step++) {
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

/**
 * 📊 모든 승인된 연차 계산 (과거 + 현재 + 미래)
 */
function calculateAllApprovedLeaves(empId) {
  try {
    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();
    let totalApproved = 0;

    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      const status = request[7]; // 상태 컬럼
      const requestEmpId = request[1]; // 직원 ID

      if (status === "승인" && requestEmpId.toString() === empId.toString()) {
        const days = parseFloat(request[4]) || 0; // 일수
        const leaveType = request[5]; // 연차 종류
        const startDate = new Date(request[2]); // 시작일
        const endDate = new Date(request[3]); // 종료일

        // 모든 승인된 연차를 합산 (과거, 현재, 미래 모두 포함)
        if (leaveType === "반차") {
          // 반차는 이미 0.5로 저장되어 있으므로 그대로 사용
          totalApproved += days;
        } else {
          // 연차는 그대로 사용
          totalApproved += days;
        }

        console.log(
          `📅 승인된 연차: ${startDate.toISOString().split("T")[0]} ~ ${
            endDate.toISOString().split("T")[0]
          }, ${leaveType}, ${days}일`
        );
      }
    }

    console.log(`📊 직원 ${empId} 모든 승인된 연차 합계:`, totalApproved);
    return totalApproved;
  } catch (error) {
    console.error("❌ 모든 승인된 연차 계산 오류:", error);
    return 0;
  }
}

/**
 * 🧪 대시보드 연차 계산 테스트
 */
function testDashboardLeaveCalculation(empId) {
  try {
    console.log("🧪 대시보드 연차 계산 테스트 시작:", empId);

    // 1. 기존 방식으로 계산
    const basicLeaves = parseInt(getSystemSetting("기본연차일수", 15));
    const oldUsedLeaves = calculateUsedLeaves(empId, new Date().getFullYear());
    const oldRemainingLeaves = Math.max(0, basicLeaves - oldUsedLeaves);

    // 2. 새로운 방식으로 계산 (getMyLeaveInfoFast 사용)
    const newLeaveInfo = getMyLeaveInfoFast(empId);

    // 3. 새로운 방식으로 계산 (모든 승인된 연차 반영)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const earnedLeaves = calculateEarnedLeaves(
      empId,
      currentYear,
      currentMonth
    );
    const allApprovedLeaves = calculateAllApprovedLeaves(empId);
    const newRemainingLeaves = Math.max(0, earnedLeaves - allApprovedLeaves);

    const result = {
      empId: empId,
      timestamp: new Date().toISOString(),
      oldCalculation: {
        basicLeaves: basicLeaves,
        usedLeaves: oldUsedLeaves,
        remainingLeaves: oldRemainingLeaves,
        formula: `${basicLeaves} - ${oldUsedLeaves} = ${oldRemainingLeaves}`,
      },
      newCalculation: {
        totalLeaves: newLeaveInfo.totalLeaves,
        usedLeaves: newLeaveInfo.usedLeaves,
        remainingLeaves: newLeaveInfo.remainingLeaves,
        debug: newLeaveInfo.debug,
      },
      newCalculation: {
        earnedLeaves: earnedLeaves,
        allApprovedLeaves: allApprovedLeaves,
        remainingLeaves: newRemainingLeaves,
        formula: `${earnedLeaves} - ${allApprovedLeaves} = ${newRemainingLeaves}`,
      },
      comparison: {
        oldVsNew:
          oldRemainingLeaves === newLeaveInfo.remainingLeaves
            ? "✅ 일치"
            : "❌ 불일치",
        newVsImproved:
          newLeaveInfo.remainingLeaves === newRemainingLeaves
            ? "✅ 일치"
            : "❌ 불일치",
        oldVsImproved:
          oldRemainingLeaves === newRemainingLeaves ? "✅ 일치" : "❌ 불일치",
      },
    };

    console.log("🧪 대시보드 연차 계산 테스트 결과:", result);
    return result;
  } catch (error) {
    console.error("❌ 대시보드 연차 계산 테스트 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 모든 승인된 연차 계산 테스트
 */
function testAllApprovedLeaves(empId) {
  try {
    console.log("🧪 모든 승인된 연차 계산 테스트 시작:", empId);

    const allApproved = calculateAllApprovedLeaves(empId);
    const earnedLeaves = calculateEarnedLeaves(
      empId,
      new Date().getFullYear(),
      new Date().getMonth() + 1
    );
    const remainingLeaves = Math.max(0, earnedLeaves - allApproved);

    const result = {
      empId: empId,
      earnedLeaves: earnedLeaves,
      allApprovedLeaves: allApproved,
      remainingLeaves: remainingLeaves,
      calculation: `${earnedLeaves} - ${allApproved} = ${remainingLeaves}`,
      timestamp: new Date().toISOString(),
    };

    console.log("🧪 모든 승인된 연차 계산 테스트 결과:", result);
    return result;
  } catch (error) {
    console.error("❌ 모든 승인된 연차 계산 테스트 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 서버 통신 테스트 - 간단한 함수
 */
function testServerConnection() {
  console.log("🧪 testServerConnection 함수 호출됨");
  return {
    success: true,
    message: "서버 통신이 정상적으로 작동합니다!",
    timestamp: new Date().toISOString(),
    testData: ["테스트1", "테스트2", "테스트3"],
  };
}

/**
 * 🧪 현재 세션 상태 확인
 */
function getCurrentSessionStatus() {
  try {
    console.log("🧪 getCurrentSessionStatus 함수 호출됨");
    const session = getValidSession();

    return {
      success: true,
      hasSession: !!session,
      sessionType: session ? session.userType : null,
      empId: session ? session.empId : null,
      adminId: session ? session.adminId : null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 🧪 LeaveRequests 시트 상태 확인
 */
function checkLeaveRequestsSheet() {
  try {
    console.log("🧪 checkLeaveRequestsSheet 함수 호출됨");

    const sheet = getSheet("LeaveRequests");
    const data = sheet.getDataRange().getValues();

    return {
      success: true,
      sheetExists: true,
      totalRows: data.length,
      headerRow: data[0] || [],
      sampleDataRows: data.slice(1, 4), // 최대 3개 샘플 데이터
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 📅 날짜를 클라이언트용 문자열로 변환
 */
function formatDateForClient(dateValue) {
  try {
    if (!dateValue) {
      return "";
    }

    // 이미 문자열인 경우
    if (typeof dateValue === "string") {
      return dateValue;
    }

    // Date 객체인 경우 YYYY-MM-DD 형식으로 변환
    if (dateValue instanceof Date) {
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, "0");
      const day = String(dateValue.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // 다른 타입인 경우 문자열로 변환
    return String(dateValue);
  } catch (error) {
    console.warn("날짜 변환 오류:", error, "원본 값:", dateValue);
    return "";
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

// =====================================
// 🧪 Google Apps Script 디버거용 테스트 함수들
// =====================================

/**
 * 🧪 테스트 함수 1: 서버 통신 테스트
 */
function runDebugTest1() {
  console.log("=== 🧪 서버 통신 테스트 ===");
  const result = testServerConnection();
  console.log("결과:", result);
  return result;
}

/**
 * 🧪 테스트 함수 2: 현재 세션 상태
 */
function runDebugTest2() {
  console.log("=== 🧪 세션 상태 테스트 ===");
  const result = getCurrentSessionStatus();
  console.log("결과:", result);
  return result;
}

/**
 * 🧪 테스트 함수 3: LeaveRequests 시트 확인
 */
function runDebugTest3() {
  console.log("=== 🧪 LeaveRequests 시트 테스트 ===");
  const result = checkLeaveRequestsSheet();
  console.log("결과:", result);
  return result;
}

/**
 * 🧪 테스트 함수 4: getMyRequests 직접 테스트
 */
function runDebugTest4() {
  console.log("=== 🧪 getMyRequests 직접 테스트 ===");

  // 1001번 직원으로 테스트
  const empId = "1001";
  console.log("테스트 대상 empId:", empId);

  const result = getMyRequests(empId);
  console.log("getMyRequests 결과:", result);
  console.log("결과 타입:", typeof result);
  console.log("결과 길이:", result ? result.length : "N/A");

  return {
    empId: empId,
    result: result,
    type: typeof result,
    length: result ? result.length : "N/A",
  };
}

/**
 * 🧪 테스트 함수 5: 전체 종합 테스트
 */
function runDebugTestAll() {
  console.log("🚀🚀🚀 전체 종합 테스트 시작 🚀🚀🚀");

  const results = {
    timestamp: new Date().toISOString(),
    test1: null,
    test2: null,
    test3: null,
    test4: null,
    summary: "",
  };

  try {
    // Test 1: 서버 통신
    console.log("📞 Test 1: 서버 통신 테스트");
    results.test1 = runDebugTest1();

    // Test 2: 세션 상태
    console.log("👤 Test 2: 세션 상태 테스트");
    results.test2 = runDebugTest2();

    // Test 3: 시트 상태
    console.log("📊 Test 3: 시트 상태 테스트");
    results.test3 = runDebugTest3();

    // Test 4: getMyRequests
    console.log("🔍 Test 4: getMyRequests 테스트");
    results.test4 = runDebugTest4();

    // 요약 생성
    const summary = [
      `✅ Test 1 (서버 통신): ${results.test1?.success ? "SUCCESS" : "FAIL"}`,
      `${
        results.test2?.success && results.test2?.hasSession ? "✅" : "❌"
      } Test 2 (세션): ${results.test2?.hasSession ? "ACTIVE" : "NONE"}`,
      `${results.test3?.success ? "✅" : "❌"} Test 3 (시트): ${
        results.test3?.success ? "OK" : "FAIL"
      }`,
      `${
        results.test4?.result && Array.isArray(results.test4.result)
          ? "✅"
          : "❌"
      } Test 4 (getMyRequests): ${results.test4?.type} (${
        results.test4?.length
      }건)`,
    ];

    results.summary = summary.join("\n");

    console.log("🎯 전체 테스트 요약:");
    console.log(results.summary);

    return results;
  } catch (error) {
    console.error("❌ 전체 테스트 오류:", error);
    results.summary = `❌ 전체 테스트 실패: ${error.message}`;
    return results;
  }
}

/**
 * 🧪 테스트 함수 6: 클라이언트 호환 버전 테스트
 */
function runDebugTest6() {
  console.log("=== 🧪 클라이언트 호환 버전 테스트 ===");

  // 1001번 직원으로 테스트
  const empId = "1001";
  console.log("테스트 대상 empId:", empId);

  const result = getMyRequests(empId);
  console.log("클라이언트 호환 버전 결과:", result);

  // 날짜 형식 확인
  if (result && result.length > 0) {
    const firstRequest = result[0];
    console.log("첫 번째 요청의 날짜 형식:", {
      startDate: {
        value: firstRequest.startDate,
        type: typeof firstRequest.startDate,
      },
      endDate: {
        value: firstRequest.endDate,
        type: typeof firstRequest.endDate,
      },
      submitDate: {
        value: firstRequest.submitDate,
        type: typeof firstRequest.submitDate,
      },
    });
  }

  return {
    empId: empId,
    result: result,
    type: typeof result,
    length: result ? result.length : "N/A",
    dateFormats:
      result && result.length > 0
        ? {
            startDateType: typeof result[0].startDate,
            endDateType: typeof result[0].endDate,
            submitDateType: typeof result[0].submitDate,
          }
        : null,
  };
}

/**
 * 📊 결재 현황 상세보기용 데이터 조회
 */
function getRequestDetailsForModal(reqId) {
  try {
    console.log("📊 결재 현황 상세보기 데이터 조회 시작:", reqId);

    // 1. 신청 정보 조회
    const requestInfo = getRequestInfo(reqId);
    if (!requestInfo) {
      console.log("❌ 신청 정보를 찾을 수 없음:", reqId);
      return {
        success: false,
        error: "신청 정보를 찾을 수 없습니다.",
      };
    }

    // 2. 신청자 정보 조회
    const applicant = getUserByEmpId(requestInfo.empId);
    if (!applicant) {
      console.log("❌ 신청자 정보를 찾을 수 없음:", requestInfo.empId);
      return {
        success: false,
        error: "신청자 정보를 찾을 수 없습니다.",
      };
    }

    // 3. 결재 현황 조회
    const approvalStatus = getApprovalStatus(reqId);

    // 4. 협조 현황 조회
    const collaborationStatus = getCollaborationStatus(reqId);

    // Date 객체를 문자열로 변환 (직렬화 문제 해결)
    const formatDateForClient = (dateValue) => {
      if (!dateValue) return "";
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split("T")[0];
      }
      return dateValue.toString();
    };

    const result = {
      success: true,
      requestInfo: {
        reqId: requestInfo.reqId,
        applicantName: applicant.name,
        leaveType: requestInfo.leaveType,
        startDate: formatDateForClient(requestInfo.startDate),
        endDate: formatDateForClient(requestInfo.endDate),
        days: requestInfo.days,
        reason: requestInfo.reason,
        status: requestInfo.status,
        submitDate: formatDateForClient(requestInfo.submitDate),
      },
      approvalStatus: approvalStatus || [],
      collaborationStatus: collaborationStatus || [],
    };

    console.log("📊 결재 현황 상세보기 데이터 조회 완료:", result);
    return result;
  } catch (error) {
    console.error("❌ 결재 현황 상세보기 데이터 조회 오류:", error);
    return {
      success: false,
      error: "데이터 조회 중 오류가 발생했습니다: " + error.message,
    };
  }
}
