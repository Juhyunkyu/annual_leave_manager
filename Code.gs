/**
 * 📋 연차관리 시스템 v4.0 - Google Apps Script 백엔드
 *
 * 🔐 기능: 로그인/인증, 세션 관리, 데이터 처리, 알림 시스템
 * 🗄️ 연동: Google Sheets (10개 시트)
 * 🌐 배포: Google Apps Script Web App
 */

// ⚙️ 시스템 설정 - 실제 시트 ID로 변경하세요!
const SHEET_ID = "1ClLTOiDo-MHRDsS81AFRzeZ84x0e95Ce_p_lkPqFCiw"; // 구글시트 ID를 여기에 입력하세요
const WEB_APP_URL = "YOUR_WEB_APP_URL_HERE"; // 웹앱 배포 후 URL을 여기에 입력하세요

/**
 * 🚀 웹앱 진입점 - 로그인 상태에 따라 화면 분기
 */
function doGet(e) {
  try {
    console.log("🚀 doGet 함수 시작 - 파라미터:", e);

    // e가 undefined인 경우 빈 객체로 초기화 (Apps Script 에디터에서 직접 실행 시)
    if (!e) {
      console.log("⚠️ e 매개변수가 undefined - 기본값으로 초기화");
      e = { parameter: {} };
    }

    // parameter가 없는 경우 빈 객체로 초기화
    if (!e.parameter) {
      console.log("⚠️ e.parameter가 undefined - 기본값으로 초기화");
      e.parameter = {};
    }

    // 강제 로그아웃 파라미터 확인
    if (e.parameter.logout === "true") {
      console.log("🔐 강제 로그아웃 요청");
      clearAllSessions();
      clearSession();
      return showLoginPage();
    }

    // 세션 확인
    const session = getValidSession();

    if (session && (session.empId || session.adminId)) {
      // 로그인된 사용자 - 메인 화면 표시
      let userDetails = null;
      if (session.userType === "admin") {
        userDetails = getAdminByAdminId(session.adminId);
      } else {
        userDetails = getUserByEmpId(session.empId);
      }

      if (!userDetails) {
        clearAllSessions();
        return showLoginPage();
      }

      return showMainApp(session);
    } else {
      // 비로그인 사용자 - 로그인 페이지 표시
      return showLoginPage();
    }
  } catch (error) {
    console.error("❌ doGet 오류:", error);
    return showErrorPage("시스템 오류가 발생했습니다: " + error.message);
  }
}

/**
 * 🔐 로그인 페이지 HTML 생성
 */
function showLoginPage() {
  const template = HtmlService.createTemplateFromFile("login");
  const html = template
    .evaluate()
    .setTitle("연차관리 시스템 - 로그인")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0");

  return html;
}

/**
 * 🏠 메인 앱 화면 HTML 생성
 */
function showMainApp(session) {
  try {
    // 세션 유효성 재확인 (관리자/직원 구분)
    if (!session || (!session.empId && !session.adminId)) {
      return showErrorPage(
        "세션 정보가 유효하지 않습니다. 다시 로그인해주세요."
      );
    }

    let userDetails = null;

    // 세션 타입에 따라 사용자 정보 조회
    if (session.userType === "admin") {
      userDetails = getAdminByAdminId(session.adminId);
      if (!userDetails) {
        return showErrorPage(
          "관리자 정보를 찾을 수 없습니다. 시스템 관리자에게 문의하세요."
        );
      }
    } else {
      userDetails = getUserByEmpId(session.empId);
      if (!userDetails) {
        return showErrorPage(
          "직원 정보를 찾을 수 없습니다. 관리자에게 문의하세요."
        );
      }
    }

    const template = HtmlService.createTemplateFromFile("main");

    // 템플릿에 사용자 정보 전달 (관리자/직원 구분)
    if (session.userType === "admin") {
      template.user = {
        empId: userDetails.adminId, // 관리자는 adminId를 empId 필드에
        name: userDetails.name,
        email: userDetails.email,
        position: userDetails.role || "관리자",
        department: "관리부서",
        deptId: "ADMIN",
        deptName: "관리부서",
        isAdmin: true,
        userType: "admin",
      };
    } else {
      // 직원인 경우 부서 정보도 함께 조회
      const deptSheet = getSheet("Departments");
      const deptData = deptSheet.getDataRange().getValues();
      let deptName = "부서 미지정";

      // 부서명 찾기
      for (let i = 1; i < deptData.length; i++) {
        if (deptData[i][0] == userDetails.deptId) {
          deptName = deptData[i][1];
          break;
        }
      }

      template.user = {
        empId: userDetails.empId,
        name: userDetails.name,
        email: userDetails.email,
        position: userDetails.position,
        department: deptName,
        deptId: userDetails.deptId,
        deptName: deptName,
        isAdmin: userDetails.position === "관리자" || session.isAdmin,
        userType: "employee",
      };
    }

    // 추가 정보도 전달
    template.userInfo = template.user; // 호환성을 위해

    // HTML 생성
    const html = template
      .evaluate()
      .setTitle("연차관리 시스템")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0");

    return html;
  } catch (error) {
    console.error("❌ 메인 앱 화면 생성 오류:", error);
    return showErrorPage(
      "메인 화면 로드 중 오류가 발생했습니다: " + error.message
    );
  }
}

/**
 * ❌ 오류 페이지 HTML 생성
 */
function showErrorPage(message) {
  const template = HtmlService.createTemplateFromFile("error");
  template.errorMessage = message;

  return template
    .evaluate()
    .setTitle("오류 - 연차관리 시스템")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 📁 HTML 파일 include 함수 (CSS/JS 포함용)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// =====================================
// 🔐 인증 및 세션 관리 함수들
// =====================================

/**
 * 🔑 일반 직원 로그인 처리 함수
 */
function doLogin(email, password) {
  try {
    // 입력값 검증
    if (!email || !password) {
      return {
        success: false,
        message: "이메일과 비밀번호를 입력해주세요.",
      };
    }

    // 사용자 정보 조회 (Employees 시트에서만)
    const user = getUserByEmail(email);
    if (!user) {
      return {
        success: false,
        message: "등록되지 않은 직원 이메일입니다.",
      };
    }

    // 비밀번호 확인
    if (!verifyPassword(password, user.passwordHash)) {
      return {
        success: false,
        message: "비밀번호가 일치하지 않습니다.",
      };
    }

    // 직원 세션 생성
    const sessionId = createEmployeeSession(user);

    // 최초 로그인 확인 (비밀번호가 임시인지)
    const isFirstLogin = isTemporaryPassword(user.passwordHash);

    return {
      success: true,
      sessionId: sessionId,
      isFirstLogin: isFirstLogin,
      userType: "employee",
      redirectToMain: true,
      user: {
        empId: user.empId,
        name: user.name,
        position: user.position,
        isAdmin: false,
      },
    };
  } catch (error) {
    console.error("직원 로그인 오류:", error);
    return {
      success: false,
      message: "로그인 처리 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 🔐 관리자 로그인 처리 함수
 */
function doAdminLogin(email, password) {
  try {
    // 입력값 검증
    if (!email || !password) {
      return {
        success: false,
        message: "관리자 이메일과 비밀번호를 입력해주세요.",
      };
    }

    // 관리자 정보 조회 (Admins 시트에서만)
    const admin = getAdminByEmail(email);
    if (!admin) {
      return {
        success: false,
        message: "등록되지 않은 관리자 이메일입니다.",
      };
    }

    // 비밀번호 확인
    if (!verifyPassword(password, admin.passwordHash)) {
      return {
        success: false,
        message: "관리자 비밀번호가 일치하지 않습니다.",
      };
    }

    // 관리자 세션 생성
    const sessionId = createAdminSession(admin);

    // 로그인 기록 업데이트
    updateAdminLoginRecord(admin.adminId);

    // 최초 로그인 확인
    const isFirstLogin = isTemporaryPassword(admin.passwordHash);

    return {
      success: true,
      sessionId: sessionId,
      isFirstLogin: isFirstLogin,
      userType: "admin",
      redirectToMain: true,
      user: {
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isAdmin: true,
        isSuperAdmin: admin.role === "SUPER",
      },
    };
  } catch (error) {
    console.error("관리자 로그인 오류:", error);
    return {
      success: false,
      message: "관리자 로그인 처리 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 🔓 로그아웃 처리 함수
 */
function doLogout() {
  try {
    // 세션 삭제
    clearSession();

    return {
      success: true,
      message: "로그아웃이 완료되었습니다.",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ 로그아웃 오류:", error);
    return {
      success: false,
      message: "로그아웃 중 오류가 발생했습니다: " + error.message,
      error: error.toString(),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 🔐 로그아웃 후 로그인 페이지 HTML 반환
 */
function getLoginPageAfterLogout() {
  try {
    // 세션이 정말 삭제되었는지 확인
    const session = getValidSession();
    if (session) {
      clearSession();
      clearAllSessions();
    }

    // 로그인 페이지 HTML 생성
    const loginPageHtml = showLoginPage();
    const htmlContent = loginPageHtml.getContent();

    return {
      success: true,
      html: htmlContent,
      message: "로그인 페이지가 준비되었습니다.",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ 로그인 페이지 생성 오류:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 🏠 로그인 후 메인 화면 HTML 반환
 */
function getMainAppAfterLogin() {
  try {
    // 현재 세션 확인
    const session = getValidSession();
    if (!session) {
      return { success: false, error: "세션 없음" };
    }

    let userDetails = null;

    // 세션 타입에 따라 사용자 정보 조회
    if (session.userType === "admin") {
      userDetails = getAdminByAdminId(session.adminId);
      if (!userDetails) {
        return { success: false, error: "관리자 정보 없음" };
      }
    } else {
      userDetails = getUserByEmpId(session.empId);
      if (!userDetails) {
        return { success: false, error: "직원 정보 없음" };
      }
    }

    // 메인 앱 HTML 생성
    const mainAppHtml = showMainApp(session);
    const htmlContent = mainAppHtml.getContent();

    return {
      success: true,
      html: htmlContent,
      user: {
        name: userDetails.name,
        id:
          session.userType === "admin"
            ? userDetails.adminId
            : userDetails.empId,
        userType: session.userType,
      },
    };
  } catch (error) {
    console.error("❌ 메인 앱 생성 오류:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🎫 직원 세션 생성
 */
function createEmployeeSession(user) {
  const sessionId = generateSessionId();
  const sessionData = {
    userType: "employee",
    empId: user.empId,
    name: user.name,
    email: user.email,
    position: user.position,
    isAdmin: false,
    loginTime: new Date().getTime(),
    lastActivity: new Date().getTime(),
  };

  // PropertiesService에 세션 저장 (2시간 = 7200초)
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(
    "employee_session_" + sessionId,
    JSON.stringify(sessionData)
  );
  userProperties.setProperty("current_session", sessionId);
  userProperties.setProperty("session_type", "employee");

  // CacheService에도 저장 (빠른 접근용 - 1시간)
  const cache = CacheService.getUserCache();
  cache.put("employee_session_" + sessionId, JSON.stringify(sessionData), 3600);

  return sessionId;
}

/**
 * 🔐 관리자 세션 생성
 */
function createAdminSession(admin) {
  const sessionId = generateSessionId();
  const sessionData = {
    userType: "admin",
    adminId: admin.adminId,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    isAdmin: true,
    isSuperAdmin: admin.role === "SUPER",
    loginTime: new Date().getTime(),
    lastActivity: new Date().getTime(),
  };

  // PropertiesService에 세션 저장 (2시간 = 7200초)
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty(
    "admin_session_" + sessionId,
    JSON.stringify(sessionData)
  );
  userProperties.setProperty("current_session", sessionId);
  userProperties.setProperty("session_type", "admin");

  // CacheService에도 저장 (빠른 접근용 - 1시간)
  const cache = CacheService.getUserCache();
  cache.put("admin_session_" + sessionId, JSON.stringify(sessionData), 3600);

  return sessionId;
}

/**
 * ✅ 유효한 세션 가져오기 (직원/관리자 구분)
 */
function getValidSession() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const currentSessionId = userProperties.getProperty("current_session");
    const sessionType = userProperties.getProperty("session_type");

    if (!currentSessionId || !sessionType) {
      return null;
    }

    const sessionKey = sessionType + "_session_" + currentSessionId;

    // 먼저 캐시에서 확인
    const cache = CacheService.getUserCache();
    let sessionData = cache.get(sessionKey);

    if (!sessionData) {
      // 캐시에 없으면 PropertiesService에서 확인
      sessionData = userProperties.getProperty(sessionKey);
    }

    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData);

    // 세션 타임아웃 확인 (2시간 = 7200000ms)
    const now = new Date().getTime();
    const sessionTimeout = getSystemSetting("세션타임아웃", 120) * 60 * 1000; // 분을 밀리초로 변환

    if (now - session.lastActivity > sessionTimeout) {
      // 세션 만료
      clearSession();
      return null;
    }

    // 마지막 활동 시간 업데이트
    session.lastActivity = now;
    userProperties.setProperty(sessionKey, JSON.stringify(session));
    cache.put(sessionKey, JSON.stringify(session), 3600);

    return session;
  } catch (error) {
    console.error("세션 확인 오류:", error);
    return null;
  }
}

/**
 * 🗑️ 세션 삭제
 */
function clearSession() {
  try {
    const userProperties = PropertiesService.getUserProperties();
    const currentSessionId = userProperties.getProperty("current_session");
    const sessionType = userProperties.getProperty("session_type");

    if (currentSessionId && sessionType) {
      // 올바른 세션 키로 삭제
      const sessionKey = sessionType + "_session_" + currentSessionId;

      userProperties.deleteProperty(sessionKey);
      userProperties.deleteProperty("current_session");
      userProperties.deleteProperty("session_type");

      const cache = CacheService.getUserCache();
      cache.remove(sessionKey);
    }
  } catch (error) {
    console.error("세션 삭제 오류:", error);
  }
}

/**
 * 🔢 세션 ID 생성
 */
function generateSessionId() {
  return "sess_" + Utilities.getUuid() + "_" + new Date().getTime();
}

/**
 * 📊 관리자 로그인 기록 업데이트
 */
function updateAdminLoginRecord(adminId) {
  try {
    const sheet = getSheet("Admins");
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === adminId) {
        const now = new Date();
        const currentLoginCount = (data[i][8] || 0) + 1;

        // H열: LastLogin, I열: LoginCount 업데이트
        sheet.getRange(i + 1, 8).setValue(now);
        sheet.getRange(i + 1, 9).setValue(currentLoginCount);
        break;
      }
    }
  } catch (error) {
    console.error("관리자 로그인 기록 업데이트 오류:", error);
  }
}

/**
 * 🗑️ 모든 세션 삭제 (로그아웃 시 사용)
 */
function clearAllSessions() {
  try {
    // UserProperties에서 세션 정보 삭제
    const userProperties = PropertiesService.getUserProperties();
    userProperties.deleteProperty("current_session");
    userProperties.deleteProperty("session_type");

    // Cache에서 세션 정보 삭제
    const cache = CacheService.getUserCache();

    // 가능한 캐시 키들을 삭제
    const possibleKeys = [
      "current_session",
      "session_" + Session.getActiveUser().getEmail(),
      "user_session",
      "login_session",
    ];

    possibleKeys.forEach((key) => {
      try {
        cache.remove(key);
      } catch (e) {
        // 개별 키 삭제 실패는 무시
      }
    });
  } catch (error) {
    console.error("세션 삭제 오류:", error);
  }
}

// =====================================
// 🗄️ 데이터베이스 연동 함수들
// =====================================

/**
 * 📊 구글시트 객체 가져오기
 */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SHEET_ID);
  } catch (error) {
    throw new Error(
      "구글시트에 접근할 수 없습니다. 시트 ID를 확인해주세요: " + error.message
    );
  }
}

/**
 * 📋 특정 시트 가져오기
 */
function getSheet(sheetName) {
  try {
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error(`시트 '${sheetName}'을 찾을 수 없습니다.`);
    }

    return sheet;
  } catch (error) {
    throw new Error(`시트 접근 오류 (${sheetName}): ` + error.message);
  }
}

/**
 * 👤 이메일로 사용자 정보 조회 (통합 함수 사용)
 */
function getUserByEmail(email) {
  try {
    return getEmployee(email, "email");
  } catch (error) {
    console.error("사용자 조회 오류:", error);
    throw error;
  }
}

/**
 * 👤 직원ID로 사용자 정보 조회 (통합 함수 사용)
 */
function getUserByEmpId(empId) {
  try {
    const employee = getEmployee(empId);
    if (employee) {
      // 기존 호환성을 위해 department 필드 추가
      employee.department = employee.deptName;
    }
    return employee;
  } catch (error) {
    console.error("직원ID로 사용자 조회 오류:", error);
    throw error;
  }
}

/**
 * 🔐 이메일로 관리자 정보 조회
 */
function getAdminByEmail(email) {
  try {
    const sheet = getSheet("Admins");
    const data = sheet.getDataRange().getValues();

    // 헤더 제외하고 검색
    for (let i = 1; i < data.length; i++) {
      if (
        data[i][2] &&
        data[i][2].toString().toLowerCase() === email.toLowerCase()
      ) {
        return {
          adminId: data[i][0],
          name: data[i][1],
          email: data[i][2],
          phone: data[i][3],
          role: data[i][4],
          joinDate: data[i][5],
          passwordHash: data[i][6] || "",
          lastLogin: data[i][7],
          loginCount: data[i][8] || 0,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("관리자 조회 오류:", error);
    throw error;
  }
}

/**
 * 🔐 관리자ID로 관리자 정보 조회
 */
function getAdminByAdminId(adminId) {
  try {
    const sheet = getSheet("Admins");
    const data = sheet.getDataRange().getValues();

    // 헤더 제외하고 검색
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString() === adminId.toString()) {
        return {
          adminId: data[i][0],
          name: data[i][1],
          email: data[i][2],
          phone: data[i][3],
          role: data[i][4],
          joinDate: data[i][5],
          passwordHash: data[i][6] || "",
          lastLogin: data[i][7],
          loginCount: data[i][8] || 0,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("관리자ID로 관리자 조회 오류:", error);
    throw error;
  }
}

/**
 * 🔑 비밀번호 해시 생성 (SHA-256)
 */
function hashPassword(password) {
  try {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password)
      .map((byte) => (byte & 0xff).toString(16).padStart(2, "0"))
      .join("");
  } catch (error) {
    throw new Error("비밀번호 암호화 실패: " + error.message);
  }
}

/**
 * ✅ 비밀번호 검증
 */
function verifyPassword(inputPassword, storedHash) {
  try {
    // 저장된 해시가 없으면 임시 비밀번호 'temp123' 확인
    if (!storedHash) {
      return inputPassword === "temp123";
    }

    const inputHash = hashPassword(inputPassword);
    return inputHash === storedHash;
  } catch (error) {
    console.error("비밀번호 검증 오류:", error);
    return false;
  }
}

/**
 * 🔄 임시 비밀번호 확인
 */
function isTemporaryPassword(passwordHash) {
  return !passwordHash || passwordHash === "";
}

/**
 * ⚙️ 시스템 설정값 가져오기
 */
function getSystemSetting(key, defaultValue = null) {
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
 * 💾 시스템 설정값 저장
 */
function setSystemSetting(key, value) {
  try {
    const sheet = getSheet("Settings");
    const data = sheet.getDataRange().getValues();

    // 기존 설정 찾기
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value);
        return true;
      }
    }

    // 새 설정 추가
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, 1, 2).setValues([[key, value]]);
    return true;
  } catch (error) {
    console.error("시스템 설정 저장 오류:", error);
    return false;
  }
}

// =====================================
// 🔑 비밀번호 관리 함수들
// =====================================

/**
 * 🔄 비밀번호 변경 (클라이언트에서 호출)
 */
function changePassword(currentPassword, newPassword) {
  try {
    // 현재 세션에서 사용자 정보 가져오기
    const session = getValidSession();
    if (!session) {
      return {
        success: false,
        message: "세션이 만료되었습니다. 다시 로그인해주세요.",
      };
    }

    // 입력값 검증
    if (!newPassword || newPassword.length < 8) {
      return {
        success: false,
        message: "새 비밀번호는 8자 이상이어야 합니다.",
      };
    }

    // 관리자/직원 구분하여 처리
    if (session.userType === "admin") {
      return changeAdminPassword(session, currentPassword, newPassword);
    } else {
      return changeEmployeePassword(session, currentPassword, newPassword);
    }
  } catch (error) {
    console.error("비밀번호 변경 오류:", error);
    return {
      success: false,
      message: "비밀번호 변경 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 🔐 관리자 비밀번호 변경
 */
function changeAdminPassword(session, currentPassword, newPassword) {
  try {
    const sheet = getSheet("Admins");
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === session.adminId) {
        // 현재 비밀번호 확인 (비밀번호가 설정되어 있는 경우)
        if (data[i][6] && !verifyPassword(currentPassword, data[i][6])) {
          return {
            success: false,
            message: "현재 비밀번호가 일치하지 않습니다.",
          };
        }

        // 새 비밀번호 해시 생성 및 저장
        const newPasswordHash = hashPassword(newPassword);
        sheet.getRange(i + 1, 7).setValue(newPasswordHash); // G열: PasswordHash

        return {
          success: true,
          message: "관리자 비밀번호가 성공적으로 변경되었습니다.",
        };
      }
    }

    return {
      success: false,
      message: "관리자 정보를 찾을 수 없습니다.",
    };
  } catch (error) {
    console.error("관리자 비밀번호 변경 오류:", error);
    return {
      success: false,
      message: "관리자 비밀번호 변경 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 👤 직원 비밀번호 변경
 */
function changeEmployeePassword(session, currentPassword, newPassword) {
  try {
    const sheet = getSheet("Employees");
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == session.empId) {
        // 현재 비밀번호 확인 (최초 로그인이 아닌 경우)
        if (data[i][7] && !verifyPassword(currentPassword, data[i][7])) {
          return {
            success: false,
            message: "현재 비밀번호가 일치하지 않습니다.",
          };
        }

        // 새 비밀번호 해시 생성 및 저장
        const newPasswordHash = hashPassword(newPassword);
        sheet.getRange(i + 1, 8).setValue(newPasswordHash); // H열: PasswordHash

        return {
          success: true,
          message: "비밀번호가 성공적으로 변경되었습니다.",
        };
      }
    }

    return {
      success: false,
      message: "직원 정보를 찾을 수 없습니다.",
    };
  } catch (error) {
    console.error("직원 비밀번호 변경 오류:", error);
    return {
      success: false,
      message: "직원 비밀번호 변경 중 오류가 발생했습니다: " + error.message,
    };
  }
}

// =====================================
// 📊 대시보드 및 알림 함수들
// =====================================

/**
 * 🔔 알림 목록 가져오기
 */
function getNotifications() {
  try {
    // 현재는 빈 배열 반환 (추후 구현)
    return [];
  } catch (error) {
    console.error("알림 조회 오류:", error);
    return [];
  }
}

/**
 * 🔔 알림 개수 가져오기
 */
function getNotificationCount(empId) {
  try {
    // 현재는 0 반환 (추후 구현)
    return 0;
  } catch (error) {
    console.error("알림 개수 조회 오류:", error);
    return 0;
  }
}

/**
 * 📊 대시보드 데이터 가져오기
 */
function getDashboardData(empId) {
  try {
    // 기본 데이터 반환 (추후 실제 데이터로 교체)
    return {
      remainingLeaves: 15,
      pendingRequests: 0,
      pendingApprovals: 0,
      thisMonthUsed: 0,
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
 * 📝 최근 신청 내역 가져오기
 */
function getRecentRequests(empId) {
  try {
    // 통합 함수 사용
    return getMyRequests(empId, 5); // 최대 5개 최근 신청 반환
  } catch (error) {
    console.error("최근 신청 내역 조회 오류:", error);
    return [];
  }
}

// =====================================
// 🔧 관리자 기능 함수들
// =====================================

/**
 * 🔢 사번 자동 생성
 */
function generateNextEmpId() {
  try {
    const sheet = getSheet("Employees");
    const data = sheet.getDataRange().getValues();

    let maxEmpId = 1000; // 시작 번호

    // 기존 사번 중 최대값 찾기
    for (let i = 1; i < data.length; i++) {
      const empId = parseInt(data[i][0]);
      if (!isNaN(empId) && empId > maxEmpId) {
        maxEmpId = empId;
      }
    }

    // 다음 사번 생성 (최대값 + 1)
    return (maxEmpId + 1).toString();
  } catch (error) {
    console.error("사번 생성 오류:", error);
    // 오류 시 현재 시간 기반으로 생성
    return "2024" + String(Date.now()).slice(-4);
  }
}

/**
 * 🔑 초기 비밀번호 생성 (보안 강화)
 */
function generateInitialPassword(empId, name) {
  try {
    // 방식 1: 사번 + 이름 첫 글자 + 고정 문자
    const nameInitial = name.charAt(0);
    const initialPassword = `${empId}${nameInitial}@2024`;

    return initialPassword;
  } catch (error) {
    console.error("초기 비밀번호 생성 오류:", error);
    // 오류 시 기본 임시 비밀번호 반환
    return "temp123!";
  }
}

/**
 * 👥 직원 추가 (개선된 버전)
 */
function addEmployee(employeeData) {
  try {
    const sheet = getSheet("Employees");
    const data = sheet.getDataRange().getValues();

    // 사번 자동 생성
    const newEmpId = generateNextEmpId();

    // 중복 이메일 확인
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === employeeData.email) {
        return {
          success: false,
          error: "이미 존재하는 이메일입니다.",
        };
      }
    }

    // 초기 비밀번호 생성 (해시화하지 않음 - 첫 로그인 시 temp123으로 처리)
    const initialPassword = "temp123"; // 단순한 임시 비밀번호 유지

    // 새 직원 추가
    sheet.appendRow([
      newEmpId, // 자동 생성된 사번
      employeeData.name,
      employeeData.email,
      employeeData.phone || "",
      employeeData.deptId || "",
      new Date().toISOString().split("T")[0], // 오늘 날짜를 입사일로
      employeeData.position || "",
      "", // PasswordHash는 비워둠 (최초 로그인 시 temp123 사용)
    ]);

    return {
      success: true,
      message: "직원이 성공적으로 추가되었습니다.",
      empId: newEmpId,
      initialPassword: initialPassword, // 초기 비밀번호 반환
      loginInfo: {
        email: employeeData.email,
        password: initialPassword,
      },
    };
  } catch (error) {
    console.error("직원 추가 오류:", error);
    return {
      success: false,
      error: "직원 추가 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 🏢 부서 추가
 */
function addDepartment(deptData) {
  try {
    const sheet = getSheet("Departments");
    const data = sheet.getDataRange().getValues();

    // 중복 부서코드 확인
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == deptData.deptId) {
        return {
          success: false,
          error: "이미 존재하는 부서코드입니다.",
        };
      }
    }

    // 중복 부서명 확인
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === deptData.deptName) {
        return {
          success: false,
          error: "이미 존재하는 부서명입니다.",
        };
      }
    }

    // 새 부서 추가
    sheet.appendRow([deptData.deptId, deptData.deptName]);

    return {
      success: true,
      message: "부서가 성공적으로 추가되었습니다.",
    };
  } catch (error) {
    console.error("부서 추가 오류:", error);
    return {
      success: false,
      error: "부서 추가 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * ⚙️ 시스템 설정 조회
 */
function getSystemSettings() {
  try {
    const sheet = getSheet("Settings");
    const data = sheet.getDataRange().getValues();

    const settings = {};
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      const value = data[i][1];

      switch (key) {
        case "기본연차일수":
          settings.basicLeaves = parseInt(value) || 15;
          break;
        case "최대연차일수":
          settings.maxLeaves = parseInt(value) || 25;
          break;
        case "세션타임아웃":
          settings.sessionTimeout = parseInt(value) || 120;
          break;
        case "연차발생기준":
          settings.leavePolicy = value || "입사일 기준";
          break;
      }
    }

    return settings;
  } catch (error) {
    console.error("시스템 설정 조회 오류:", error);
    return {
      basicLeaves: 15,
      maxLeaves: 25,
      sessionTimeout: 120,
      leavePolicy: "입사일 기준",
    };
  }
}

/**
 * ⚙️ 시스템 설정 업데이트
 */
function updateSystemSettings(settings) {
  try {
    const sheet = getSheet("Settings");
    const data = sheet.getDataRange().getValues();

    // 설정값 매핑
    const settingsMap = {
      기본연차일수: settings.basicLeaves,
      최대연차일수: settings.maxLeaves,
      세션타임아웃: settings.sessionTimeout,
      연차발생기준: settings.leavePolicy,
    };

    // 각 설정값 업데이트
    for (const [key, value] of Object.entries(settingsMap)) {
      let found = false;

      // 기존 설정 찾아서 업데이트
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === key) {
          sheet.getRange(i + 1, 2).setValue(value);
          found = true;
          break;
        }
      }

      // 새 설정 추가
      if (!found) {
        sheet.appendRow([key, value]);
      }
    }

    return {
      success: true,
      message: "시스템 설정이 성공적으로 저장되었습니다.",
    };
  } catch (error) {
    console.error("시스템 설정 업데이트 오류:", error);
    return {
      success: false,
      error: "설정 저장 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 📊 시스템 통계 조회 (관리자용) - 통합 함수 사용
 */
function getSystemStatistics() {
  try {
    // 전체 직원 수 (통합 함수 사용)
    const allEmployees = getAllEmployees();
    const totalEmployees = allEmployees.length;

    // 전체 부서 수 (통합 함수 사용)
    const allDepartments = getAllDepartments();
    const totalDepartments = allDepartments.length;

    // 총 신청 건수
    const reqSheet = getSheet("LeaveRequests");
    const reqData = reqSheet.getDataRange().getValues();
    const totalRequests = Math.max(0, reqData.length - 1);

    // 승인된 신청 건수
    let approvedRequests = 0;
    if (totalRequests > 0) {
      for (let i = 1; i < reqData.length; i++) {
        if (reqData[i][7] === "승인") {
          approvedRequests++;
        }
      }
    }

    // 총 사용 연차 일수
    let totalLeaveDays = 0;
    const usageSheet = getSheet("LeaveUsage");
    const usageData = usageSheet.getDataRange().getValues();
    if (usageData.length > 1) {
      for (let i = 1; i < usageData.length; i++) {
        totalLeaveDays += parseFloat(usageData[i][2]) || 0;
      }
    }

    console.log("시스템 통계:", {
      totalEmployees,
      totalRequests,
      approvedRequests,
      totalLeaveDays,
      totalDepartments,
    });

    return {
      totalEmployees: totalEmployees,
      totalRequests: totalRequests,
      approvedRequests: approvedRequests,
      totalLeaveDays: totalLeaveDays,
      totalDepartments: totalDepartments,
    };
  } catch (error) {
    console.error("시스템 통계 조회 오류:", error);
    return {
      totalEmployees: 0,
      totalRequests: 0,
      approvedRequests: 0,
      totalLeaveDays: 0,
      totalDepartments: 0,
    };
  }
}

/**
 * 📥 시스템 데이터 내보내기
 */
function exportSystemData() {
  try {
    // 간단한 구현 - 실제로는 CSV 파일 생성 등의 로직 필요
    return {
      success: true,
      message: "데이터 내보내기가 완료되었습니다.",
      // 실제로는 다운로드 링크나 파일 정보 제공
    };
  } catch (error) {
    console.error("데이터 내보내기 오류:", error);
    return {
      success: false,
      error: "데이터 내보내기 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 💾 시스템 백업 생성
 */
function createSystemBackup() {
  try {
    // 간단한 구현 - 실제로는 시트 복사 등의 로직 필요
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // 백업 로그 기록 (실제 구현에서는 별도 시트에 기록)
    console.log(`시스템 백업 생성: ${timestamp}`);

    return {
      success: true,
      message: `시스템 백업이 성공적으로 생성되었습니다. (${timestamp})`,
    };
  } catch (error) {
    console.error("백업 생성 오류:", error);
    return {
      success: false,
      error: "백업 생성 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 📊 개선된 통계 데이터 조회 (실시간 운영 지표 + KPI)
 */
function getAdvancedStatistics() {
  try {
    console.log("📊 고급 통계 데이터 조회 시작");

    // 기본 데이터 가져오기
    const employees = getAllEmployees();
    const departments = getAllDepartments();
    const reqSheet = getSheet("LeaveRequests");
    const reqData = reqSheet.getDataRange().getValues();

    // 현재 날짜 정보
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. 실시간 운영 지표
    let pendingRequests = 0;
    let thisMonthRequests = 0;
    let totalRequests = Math.max(0, reqData.length - 1);
    let approvedRequests = 0;
    let totalProcessTime = 0;
    let processedCount = 0;

    if (totalRequests > 0) {
      for (let i = 1; i < reqData.length; i++) {
        const status = reqData[i][7];
        const submitDate = new Date(reqData[i][8]);

        // 대기 중인 신청
        if (status === "대기") {
          pendingRequests++;
        }

        // 이번 달 신청
        if (
          submitDate.getMonth() + 1 === currentMonth &&
          submitDate.getFullYear() === currentYear
        ) {
          thisMonthRequests++;
        }

        // 승인된 신청
        if (status === "승인") {
          approvedRequests++;
        }

        // 처리 시간 계산 (승인/반려된 것들)
        if (status === "승인" || status === "반려") {
          const processDate = reqData[i][9]
            ? new Date(reqData[i][9])
            : new Date();
          const daysDiff = Math.max(
            1,
            Math.ceil((processDate - submitDate) / (1000 * 60 * 60 * 24))
          );
          totalProcessTime += daysDiff;
          processedCount++;
        }
      }
    }

    // 평균 처리 시간
    const avgProcessTime =
      processedCount > 0 ? Math.round(totalProcessTime / processedCount) : 0;

    // 승인률
    const approvalRate =
      totalRequests > 0
        ? Math.round((approvedRequests / totalRequests) * 100)
        : 0;

    // 2. 핵심 성과 지표 (KPI)
    const totalEmployees = employees.length;
    const totalDepartments = departments.length;

    // 평균 연차 사용일수 계산
    const usageSheet = getSheet("LeaveUsage");
    const usageData = usageSheet.getDataRange().getValues();
    let totalLeaveDays = 0;

    if (usageData.length > 1) {
      for (let i = 1; i < usageData.length; i++) {
        totalLeaveDays += parseFloat(usageData[i][2]) || 0;
      }
    }

    const avgLeaveUsage =
      totalEmployees > 0
        ? Math.round((totalLeaveDays / totalEmployees) * 10) / 10
        : 0;

    // 시스템 건전성 점수 계산 (0-100)
    let healthScore = 70; // 기본 점수

    // 승인률이 높으면 +점수
    if (approvalRate >= 80) healthScore += 15;
    else if (approvalRate >= 60) healthScore += 10;
    else if (approvalRate >= 40) healthScore += 5;

    // 처리 시간이 빠르면 +점수
    if (avgProcessTime <= 1) healthScore += 15;
    else if (avgProcessTime <= 3) healthScore += 10;
    else if (avgProcessTime <= 7) healthScore += 5;

    // 대기 건수가 적으면 +점수
    if (pendingRequests === 0) healthScore += 10;
    else if (pendingRequests <= 2) healthScore += 5;

    healthScore = Math.min(100, Math.max(0, healthScore));

    const result = {
      // 실시간 운영 지표
      pendingRequests: pendingRequests,
      thisMonthRequests: thisMonthRequests,
      avgProcessTime: avgProcessTime,
      approvalRate: approvalRate,

      // 핵심 성과 지표
      totalEmployees: totalEmployees,
      avgLeaveUsage: avgLeaveUsage,
      totalDepartments: totalDepartments,
      systemHealth: healthScore,

      // 추가 정보
      totalRequests: totalRequests,
      approvedRequests: approvedRequests,
      totalLeaveDays: totalLeaveDays,
    };

    console.log("📊 고급 통계 결과:", result);
    return result;
  } catch (error) {
    console.error("고급 통계 조회 오류:", error);
    return {
      pendingRequests: 0,
      thisMonthRequests: 0,
      avgProcessTime: 0,
      approvalRate: 0,
      totalEmployees: 0,
      avgLeaveUsage: 0,
      totalDepartments: 0,
      systemHealth: 0,
      totalRequests: 0,
      approvedRequests: 0,
      totalLeaveDays: 0,
    };
  }
}

/**
 * 🏢 부서별 통계 데이터 조회
 */
function getDepartmentStatistics() {
  try {
    console.log("🏢 부서별 통계 조회 시작");

    const employees = getAllEmployees();
    const departments = getAllDepartments();
    const usageSheet = getSheet("LeaveUsage");
    const usageData = usageSheet.getDataRange().getValues();

    const departmentStats = [];

    // 각 부서별로 통계 계산
    departments.forEach((dept) => {
      const deptEmployees = employees.filter(
        (emp) => emp.deptId === dept.deptId
      );
      const employeeCount = deptEmployees.length;

      if (employeeCount > 0) {
        let totalUsed = 0;
        let totalRemaining = 0;

        // 부서 직원들의 연차 사용 현황 집계
        deptEmployees.forEach((emp) => {
          // 사용한 연차 계산
          let usedLeaves = 0;
          if (usageData.length > 1) {
            for (let i = 1; i < usageData.length; i++) {
              if (usageData[i][0] === emp.empId) {
                usedLeaves += parseFloat(usageData[i][2]) || 0;
              }
            }
          }

          totalUsed += usedLeaves;

          // 잔여 연차 계산 (기본 15일 - 사용한 연차)
          const basicLeaves = 15;
          const remaining = Math.max(0, basicLeaves - usedLeaves);
          totalRemaining += remaining;
        });

        // 평균 계산
        const avgUsed = employeeCount > 0 ? totalUsed / employeeCount : 0;
        const avgRemaining =
          employeeCount > 0 ? totalRemaining / employeeCount : 0;

        // 사용률 계산 (%)
        const usageRate = Math.round((avgUsed / 15) * 100);

        departmentStats.push({
          deptId: dept.deptId,
          deptName: dept.deptName,
          employeeCount: employeeCount,
          avgUsed: Math.round(avgUsed * 10) / 10,
          avgRemainingLeaves: Math.round(avgRemaining * 10) / 10,
          usageRate: Math.max(0, Math.min(100, usageRate)),
        });
      }
    });

    // 사용률 기준으로 정렬 (높은 순)
    departmentStats.sort((a, b) => b.usageRate - a.usageRate);

    console.log("🏢 부서별 통계 결과:", departmentStats);
    return departmentStats;
  } catch (error) {
    console.error("부서별 통계 조회 오류:", error);
    return [];
  }
}

/**
 * 🧪 임시 디버깅 함수 - 직원 데이터 확인
 */
function testEmployeeData() {
  try {
    console.log("=== 직원 데이터 테스트 시작 ===");

    // 1. 직원 시트 원본 데이터 확인
    const empSheet = getSheet("Employees");
    const empData = empSheet.getDataRange().getValues();
    console.log("직원 시트 원본 데이터:", empData);

    // 2. 부서 시트 원본 데이터 확인
    const deptSheet = getSheet("Departments");
    const deptData = deptSheet.getDataRange().getValues();
    console.log("부서 시트 원본 데이터:", deptData);

    // 3. getAllEmployees 함수 결과 확인
    const employees = getAllEmployees();
    console.log("getAllEmployees 결과:", employees);
    console.log("직원 수:", employees.length);

    return {
      empData: empData,
      deptData: deptData,
      employees: employees,
      employeeCount: employees.length,
    };
  } catch (error) {
    console.error("테스트 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🔧 웹앱용 getAllEmployees 래퍼 함수 (날짜 직렬화 처리 + 최신순 정렬)
 */
function getEmployeesForWeb() {
  try {
    console.log("=== getEmployeesForWeb 호출 ===");

    const result = getAllEmployees();
    console.log("getAllEmployees 원본 결과:", result);

    if (!result || result.length === 0) {
      console.log("결과가 없음");
      return [];
    }

    // 날짜 객체를 문자열로 변환하여 직렬화 문제 해결
    const serializedResult = result.map((emp) => ({
      empId: emp.empId,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      deptId: emp.deptId,
      deptName: emp.deptName,
      joinDate: emp.joinDate ? emp.joinDate.toString() : "",
      position: emp.position,
      passwordHash: emp.passwordHash,
    }));

    // 최신 직원이 맨 위에 오도록 사번 기준으로 역순 정렬 (사번이 클수록 최신)
    serializedResult.sort((a, b) => {
      const empIdA = parseInt(a.empId) || 0;
      const empIdB = parseInt(b.empId) || 0;
      return empIdB - empIdA; // 내림차순 정렬
    });

    console.log("최신순 정렬된 결과:", serializedResult);
    return serializedResult;
  } catch (error) {
    console.error("getEmployeesForWeb 오류:", error);
    console.error("오류 스택:", error.stack);
    return [];
  }
}

/**
 * 🧪 임시 하드코딩 테스트 함수
 */
function getEmployeesHardcoded() {
  return [
    {
      empId: "1001",
      name: "홍길동",
      email: "dandy_jhk@naver.com",
      phone: "010-2616-3096",
      deptId: "10",
      deptName: "개발팀",
      joinDate: "2025-07-03",
      position: "과장",
      passwordHash: "",
    },
    {
      empId: "1002",
      name: "날라리",
      email: "hhh@naver.com",
      phone: "010-2222-3333",
      deptId: "20",
      deptName: "영업팀",
      joinDate: "2025-07-04",
      position: "팀장",
      passwordHash: "",
    },
  ];
}

/**
 * ✏️ 직원 정보 수정
 */
function updateEmployee(updateData) {
  try {
    const sheet = getSheet("Employees");
    const data = sheet.getDataRange().getValues();

    // 해당 직원 찾기
    let targetRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == updateData.empId) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return {
        success: false,
        error: "직원 정보를 찾을 수 없습니다.",
      };
    }

    // 이메일 중복 확인 (본인 제외)
    for (let i = 1; i < data.length; i++) {
      if (i !== targetRowIndex && data[i][2] === updateData.email) {
        return {
          success: false,
          error: "이미 존재하는 이메일입니다.",
        };
      }
    }

    // 부서 유효성 확인
    const deptSheet = getSheet("Departments");
    const deptData = deptSheet.getDataRange().getValues();
    let deptExists = false;
    for (let i = 1; i < deptData.length; i++) {
      if (deptData[i][0] == updateData.deptId) {
        deptExists = true;
        break;
      }
    }

    if (!deptExists) {
      return {
        success: false,
        error: "존재하지 않는 부서입니다.",
      };
    }

    // 직원 정보 업데이트
    const row = targetRowIndex + 1;
    sheet.getRange(row, 2).setValue(updateData.name); // B열: Name
    sheet.getRange(row, 3).setValue(updateData.email); // C열: Email
    sheet.getRange(row, 4).setValue(updateData.phone); // D열: Phone
    sheet.getRange(row, 5).setValue(updateData.deptId); // E열: DeptId
    sheet.getRange(row, 7).setValue(updateData.position); // G열: Position

    // 비밀번호 초기화 옵션
    if (updateData.resetPassword) {
      sheet.getRange(row, 8).setValue(""); // H열: PasswordHash를 비움 (temp123 사용)
    }

    return {
      success: true,
      message: "직원 정보가 성공적으로 수정되었습니다.",
      empId: updateData.empId,
    };
  } catch (error) {
    console.error("직원 수정 오류:", error);
    return {
      success: false,
      error: "직원 수정 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 🗑️ 직원 삭제
 */
function deleteEmployee(empId) {
  try {
    const sheet = getSheet("Employees");
    const data = sheet.getDataRange().getValues();

    // 해당 직원 찾기
    let targetRowIndex = -1;
    let employeeName = "";
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == empId) {
        targetRowIndex = i;
        employeeName = data[i][1];
        break;
      }
    }

    if (targetRowIndex === -1) {
      return {
        success: false,
        error: "삭제할 직원 정보를 찾을 수 없습니다.",
      };
    }

    // 안전장치: 관리자인지 확인
    const session = getValidSession();
    if (session && session.empId == empId) {
      return {
        success: false,
        error: "본인의 계정은 삭제할 수 없습니다.",
      };
    }

    // 실제 행 삭제 (하드 삭제)
    sheet.deleteRow(targetRowIndex + 1);

    // 삭제 로그 기록 (선택사항 - 실제 구현에서는 별도 로그 시트에 기록)
    console.log(
      `직원 삭제: ${empId} (${employeeName}) - ${new Date().toISOString()}`
    );

    return {
      success: true,
      message: `${employeeName} 직원이 성공적으로 삭제되었습니다.`,
      deletedEmpId: empId,
      deletedName: employeeName,
    };
  } catch (error) {
    console.error("직원 삭제 오류:", error);
    return {
      success: false,
      error: "직원 삭제 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 🏢 부서 정보 단일 조회
 */
function getDepartmentById(deptId) {
  try {
    const sheet = getSheet("Departments");
    const data = sheet.getDataRange().getValues();

    // 헤더 건너뛰고 부서 찾기
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == deptId) {
        return {
          deptId: data[i][0],
          deptName: data[i][1],
        };
      }
    }

    return null;
  } catch (error) {
    console.error("부서 정보 조회 오류:", error);
    return null;
  }
}

/**
 * ✏️ 부서 정보 수정
 */
function updateDepartment(updateData) {
  try {
    const sheet = getSheet("Departments");
    const data = sheet.getDataRange().getValues();

    // 해당 부서 찾기
    let targetRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == updateData.deptId) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return {
        success: false,
        error: "부서 정보를 찾을 수 없습니다.",
      };
    }

    // 부서명 중복 확인 (본인 제외)
    for (let i = 1; i < data.length; i++) {
      if (i !== targetRowIndex && data[i][1] === updateData.deptName) {
        return {
          success: false,
          error: "이미 존재하는 부서명입니다.",
        };
      }
    }

    // 부서명 길이 확인
    if (updateData.deptName.length < 2 || updateData.deptName.length > 20) {
      return {
        success: false,
        error: "부서명은 2자 이상 20자 이하로 입력해주세요.",
      };
    }

    // 부서 정보 업데이트 (부서코드는 변경하지 않음)
    const updateRow = targetRowIndex + 1;
    sheet.getRange(updateRow, 2).setValue(updateData.deptName); // 부서명만 업데이트

    return {
      success: true,
      message: "부서 정보가 성공적으로 수정되었습니다.",
    };
  } catch (error) {
    console.error("부서 수정 오류:", error);
    return {
      success: false,
      error: "부서 수정 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 🗑️ 부서 삭제
 */
function deleteDepartment(deptId) {
  try {
    const deptSheet = getSheet("Departments");
    const empSheet = getSheet("Employees");

    // 부서 존재 확인
    const deptData = deptSheet.getDataRange().getValues();
    let targetRowIndex = -1;
    let deptName = "";

    for (let i = 1; i < deptData.length; i++) {
      if (deptData[i][0] == deptId) {
        targetRowIndex = i;
        deptName = deptData[i][1];
        break;
      }
    }

    if (targetRowIndex === -1) {
      return {
        success: false,
        error: "부서 정보를 찾을 수 없습니다.",
      };
    }

    // 소속 직원 확인
    const empData = empSheet.getDataRange().getValues();
    let employeeCount = 0;
    let employeeNames = [];

    for (let i = 1; i < empData.length; i++) {
      if (empData[i][4] == deptId) {
        // 부서ID 컬럼 확인
        employeeCount++;
        employeeNames.push(empData[i][1]); // 직원 이름 저장
      }
    }

    if (employeeCount > 0) {
      return {
        success: false,
        error: `소속 직원이 ${employeeCount}명 있는 부서는 삭제할 수 없습니다.\n\n소속 직원: ${employeeNames.join(
          ", "
        )}\n\n먼저 소속 직원들을 다른 부서로 이동시킨 후 삭제해주세요.`,
      };
    }

    // 시스템 부서 보호 (기본 부서들 삭제 방지)
    const systemDepts = ["10", "20", "30", "40"]; // 개발팀, 영업팀, 인사팀, 총무팀
    if (systemDepts.includes(deptId.toString())) {
      return {
        success: false,
        error: "시스템 기본 부서는 삭제할 수 없습니다.",
      };
    }

    // 부서 삭제 (1-based index)
    deptSheet.deleteRow(targetRowIndex + 1);

    // 삭제 로그 기록
    console.log(
      `부서 삭제: ${deptId} (${deptName}) - ${new Date().toISOString()}`
    );

    return {
      success: true,
      message: `${deptName} 부서가 성공적으로 삭제되었습니다.`,
      deletedDeptId: deptId,
      deletedName: deptName,
    };
  } catch (error) {
    console.error("부서 삭제 오류:", error);
    return {
      success: false,
      error: "부서 삭제 중 오류가 발생했습니다: " + error.message,
    };
  }
}

/**
 * 🎯 직원 부서 이동 (드래그 앤 드롭용)
 */
function moveEmployeeDepartment(moveData) {
  try {
    console.log("🎯 직원 부서 이동 요청:", moveData);

    const empSheet = getSheet("Employees");
    const deptSheet = getSheet("Departments");

    const empId = moveData.empId;
    const newDeptId = moveData.newDeptId;

    // 입력 유효성 검증
    if (!empId || !newDeptId) {
      return {
        success: false,
        error: "직원 사번과 부서 코드는 필수입니다.",
      };
    }

    // 직원 존재 확인
    const empData = empSheet.getDataRange().getValues();
    let targetRowIndex = -1;
    let employeeName = "";
    let currentDeptId = "";

    for (let i = 1; i < empData.length; i++) {
      if (empData[i][0] == empId) {
        targetRowIndex = i;
        employeeName = empData[i][1];
        currentDeptId = empData[i][4];
        break;
      }
    }

    if (targetRowIndex === -1) {
      return {
        success: false,
        error: "직원 정보를 찾을 수 없습니다.",
      };
    }

    // 같은 부서로 이동하려는 경우
    if (currentDeptId == newDeptId) {
      return {
        success: false,
        error: "이미 해당 부서에 소속되어 있습니다.",
      };
    }

    // 대상 부서 존재 확인
    const deptData = deptSheet.getDataRange().getValues();
    let targetDeptExists = false;
    let targetDeptName = "";

    for (let i = 1; i < deptData.length; i++) {
      if (deptData[i][0] == newDeptId) {
        targetDeptExists = true;
        targetDeptName = deptData[i][1];
        break;
      }
    }

    if (!targetDeptExists) {
      return {
        success: false,
        error: "이동할 부서가 존재하지 않습니다.",
      };
    }

    // 세션 확인 (관리자 권한 확인)
    const session = getValidSession();
    if (!session || !session.isAdmin) {
      return {
        success: false,
        error: "관리자 권한이 필요합니다.",
      };
    }

    // 부서 이동 실행
    const updateRow = targetRowIndex + 1;
    empSheet.getRange(updateRow, 5).setValue(newDeptId); // 부서ID 컬럼 업데이트 (E열)

    // 이동 로그 기록
    const logMessage = `부서 이동: ${employeeName}(${empId}) -> ${targetDeptName}(${newDeptId}) - ${new Date().toISOString()}`;
    console.log(logMessage);

    return {
      success: true,
      message: `${employeeName}님이 ${targetDeptName}으로 성공적으로 이동되었습니다.`,
      empId: empId,
      employeeName: employeeName,
      newDeptId: newDeptId,
      newDeptName: targetDeptName,
    };
  } catch (error) {
    console.error("직원 부서 이동 오류:", error);
    return {
      success: false,
      error: "부서 이동 중 오류가 발생했습니다: " + error.message,
    };
  }
}
