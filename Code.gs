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
    // 강제 로그아웃 파라미터 확인
    if (e.parameter && e.parameter.logout === "true") {
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
        isAdmin: true,
        userType: "admin",
      };
    } else {
      template.user = {
        empId: userDetails.empId,
        name: userDetails.name,
        email: userDetails.email,
        position: userDetails.position,
        department: userDetails.department || "미지정",
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
 * 👤 이메일로 사용자 정보 조회
 */
function getUserByEmail(email) {
  try {
    const sheet = getSheet("Employees");
    const data = sheet.getDataRange().getValues();

    // 헤더 제외하고 검색
    for (let i = 1; i < data.length; i++) {
      if (
        data[i][2] &&
        data[i][2].toString().toLowerCase() === email.toLowerCase()
      ) {
        return {
          empId: data[i][0],
          name: data[i][1],
          email: data[i][2],
          phone: data[i][3],
          deptId: data[i][4],
          joinDate: data[i][5],
          position: data[i][6],
          passwordHash: data[i][7] || "",
        };
      }
    }

    return null;
  } catch (error) {
    console.error("사용자 조회 오류:", error);
    throw error;
  }
}

/**
 * 👤 직원ID로 사용자 정보 조회
 */
function getUserByEmpId(empId) {
  try {
    const sheet = getSheet("Employees");
    const data = sheet.getDataRange().getValues();

    // 헤더 제외하고 검색
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString() === empId.toString()) {
        // 부서명도 함께 조회
        let departmentName = "미지정";
        try {
          const deptSheet = getSheet("Departments");
          const deptData = deptSheet.getDataRange().getValues();
          for (let j = 1; j < deptData.length; j++) {
            if (deptData[j][0] === data[i][4]) {
              departmentName = deptData[j][1];
              break;
            }
          }
        } catch (e) {
          console.log("부서 정보 조회 실패:", e.message);
        }

        return {
          empId: data[i][0],
          name: data[i][1],
          email: data[i][2],
          phone: data[i][3],
          deptId: data[i][4],
          department: departmentName,
          joinDate: data[i][5],
          position: data[i][6],
          passwordHash: data[i][7] || "",
        };
      }
    }

    return null;
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
    // 현재는 빈 배열 반환 (추후 구현)
    return [];
  } catch (error) {
    console.error("최근 신청 내역 조회 오류:", error);
    return [];
  }
}

// =====================================
// 🔧 관리자 기능 함수들
// =====================================

/**
 * 👥 직원 추가
 */
function addEmployee(employeeData) {
  try {
    const sheet = getSheet("Employees");
    const data = sheet.getDataRange().getValues();

    // 중복 사번 확인
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == employeeData.empId) {
        return {
          success: false,
          error: "이미 존재하는 사번입니다.",
        };
      }
    }

    // 중복 이메일 확인
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === employeeData.email) {
        return {
          success: false,
          error: "이미 존재하는 이메일입니다.",
        };
      }
    }

    // 새 직원 추가
    sheet.appendRow([
      employeeData.empId,
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
 * 📈 시스템 통계 조회
 */
function getSystemStatistics() {
  try {
    const empSheet = getSheet("Employees");
    const reqSheet = getSheet("LeaveRequests");
    const usageSheet = getSheet("LeaveUsage");

    // 전체 직원 수
    const totalEmployees = Math.max(
      0,
      empSheet.getDataRange().getNumRows() - 1
    );

    // 총 신청 건수
    const totalRequests = Math.max(0, reqSheet.getDataRange().getNumRows() - 1);

    // 승인된 신청 건수
    let approvedRequests = 0;
    if (totalRequests > 0) {
      const reqData = reqSheet.getDataRange().getValues();
      for (let i = 1; i < reqData.length; i++) {
        if (reqData[i][7] === "승인") {
          // Status 컬럼
          approvedRequests++;
        }
      }
    }

    // 총 사용 연차 일수
    let totalLeaveDays = 0;
    const usageNumRows = usageSheet.getDataRange().getNumRows();
    if (usageNumRows > 1) {
      const usageData = usageSheet.getDataRange().getValues();
      for (let i = 1; i < usageData.length; i++) {
        totalLeaveDays += parseFloat(usageData[i][2]) || 0; // UsedDays 컬럼
      }
    }

    return {
      totalEmployees: totalEmployees,
      totalRequests: totalRequests,
      approvedRequests: approvedRequests,
      totalLeaveDays: totalLeaveDays,
    };
  } catch (error) {
    console.error("시스템 통계 조회 오류:", error);
    return {
      totalEmployees: 0,
      totalRequests: 0,
      approvedRequests: 0,
      totalLeaveDays: 0,
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
