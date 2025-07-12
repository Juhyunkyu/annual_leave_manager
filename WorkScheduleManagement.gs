/**
 * 📅 근무표 관리 시스템 v2.0
 *
 * 🔧 기능: 부서별 근무표 생성, 조회, 관리
 * 📊 구조: 사번, 이름, 발생연차, 날짜별 근무상태, 사용/잔여/비고
 * 🎨 스타일: 공휴일 빨간색, 토요일 파란색, 평일 기본색
 */

// =====================================
// 📅 공휴일 관리
// =====================================

/**
 * 📅 공휴일 목록 조회 (2025년 기준)
 */
function getHolidays(year) {
  const holidays = {
    // 법정공휴일
    "0101": "신정",
    "0301": "삼일절",
    "0505": "어린이날",
    "0606": "현충일",
    "0815": "광복절",
    1003: "개천절",
    1009: "한글날",
    1225: "크리스마스",

    // 설날 (음력 기준 - 2025년은 1월 28-30일)
    "0128": "설날",
    "0129": "설날",
    "0130": "설날",

    // 부처님 오신 날 (음력 4월 8일 - 2025년은 5월 6일)
    "0506": "부처님오신날",

    // 추석 (음력 8월 14-16일 - 2025년은 10월 5-7일)
    1005: "추석",
    1006: "추석",
    1007: "추석",

    // 대체공휴일
    "0127": "설날 대체공휴일", // 설날 전날이 일요일인 경우
    1004: "추석 대체공휴일", // 추석 전날이 일요일인 경우

    // 근로자의 날
    "0501": "근로자의날",
  };

  return holidays;
}

/**
 * 📅 특정 날짜가 공휴일인지 확인
 */
function isHoliday(year, month, day) {
  const holidays = getHolidays(year);
  const dateKey = String(month).padStart(2, "0") + String(day).padStart(2, "0");
  return holidays.hasOwnProperty(dateKey);
}

/**
 * 📅 특정 날짜의 공휴일명 조회
 */
function getHolidayName(year, month, day) {
  const holidays = getHolidays(year);
  const dateKey = String(month).padStart(2, "0") + String(day).padStart(2, "0");
  return holidays[dateKey] || null;
}

// =====================================
// 📊 근무표 관리 함수들
// =====================================

/**
 * 📋 근무표 시트 생성 (개선된 버전)
 */
function createWorkScheduleSheet(deptId, year, month) {
  try {
    console.log("📋 근무표 시트 생성 시작:", { deptId, year, month });

    // 부서 정보 조회
    const department = getDepartmentById(deptId);
    if (!department) {
      return { success: false, error: "부서 정보를 찾을 수 없습니다." };
    }

    // 시트명 생성
    const monthStr = month.toString().padStart(2, "0");
    const sheetName = `${department.deptName}_${year}_${monthStr}`;

    // 기존 시트 확인 및 삭제
    const existingSheet = getSheetIfExists(sheetName);
    if (existingSheet) {
      SpreadsheetApp.getActiveSpreadsheet().deleteSheet(existingSheet);
      console.log("🗑️ 기존 시트 삭제:", sheetName);
    }

    // 새 시트 생성
    const sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);

    // 근무표 헤더 설정 (개선된 구조)
    setupWorkScheduleHeader(sheet, department, year, month);

    // 부서 직원 목록 가져와서 행 생성
    const employees = getEmployeesByDepartment(deptId);
    setupEmployeeRows(sheet, employees, year, month);

    // 스타일 적용 (공휴일 포함)
    applyWorkScheduleStyles(sheet, year, month);

    console.log("✅ 근무표 시트 생성 완료:", sheetName);

    return {
      success: true,
      sheetName: sheetName,
      employeeCount: employees.length,
      department: department.deptName,
      year: year,
      month: month,
    };
  } catch (error) {
    console.error("❌ 근무표 시트 생성 오류:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 📊 근무표 존재 여부 확인
 */
function checkWorkScheduleExists(deptId, year, month) {
  try {
    console.log("🔍 근무표 존재 확인:", { deptId, year, month });

    // 부서 정보 조회
    const department = getDepartmentById(deptId);
    if (!department) {
      return { exists: false, error: "부서 정보를 찾을 수 없습니다." };
    }

    // 시트명 생성
    const monthStr = month.toString().padStart(2, "0");
    const sheetName = `${department.deptName}_${year}_${monthStr}`;

    // 시트 존재 확인
    const sheet = getSheetIfExists(sheetName);
    const exists = sheet !== null;

    console.log("📊 근무표 존재 여부:", { sheetName, exists });

    return {
      exists: exists,
      sheetName: sheetName,
      department: department.deptName,
    };
  } catch (error) {
    console.error("❌ 근무표 존재 확인 오류:", error);
    return { exists: false, error: error.message };
  }
}

/**
 * 📊 근무표 데이터 조회 (개선된 버전)
 */
function getWorkScheduleData(deptId, year, month) {
  try {
    console.log("📊 근무표 데이터 조회:", { deptId, year, month });

    // 부서 정보 조회
    const department = getDepartmentById(deptId);
    if (!department) {
      return null;
    }

    // 시트명 생성
    const monthStr = month.toString().padStart(2, "0");
    const sheetName = `${department.deptName}_${year}_${monthStr}`;
    const sheet = getSheetIfExists(sheetName);

    if (!sheet) {
      console.log("📋 근무표 시트가 없습니다:", sheetName);
      return null;
    }

    // 데이터 조회
    const data = sheet.getDataRange().getValues();

    if (data.length < 6) {
      console.log("⚠️ 근무표 데이터가 충분하지 않습니다.");
      return null;
    }

    return {
      title: data[0][0], // 제목
      columnHeaders: data[1], // 컬럼 헤더
      subHeaders: data[2], // 서브 헤더 (요일)
      usageHeaders: data[3], // 사용 헤더
      remainHeaders: data[4], // 잔여 헤더
      employeeData: data.slice(5), // 직원 데이터 (6행부터)
      sheetName: sheetName,
      department: department.deptName,
      year: year,
      month: month,
    };
  } catch (error) {
    console.error("❌ 근무표 데이터 조회 오류:", error);
    return null;
  }
}

/**
 * 📋 근무표 헤더 설정 (요구사항에 맞게 개선)
 */
function setupWorkScheduleHeader(sheet, department, year, month) {
  try {
    console.log("📋 근무표 헤더 설정 중...");

    // 해당 월의 마지막 날짜 계산
    const lastDay = new Date(year, month, 0).getDate();

    // 1행: 제목
    const title = `${year}년 ${month}월 ${department.deptName} 근무표`;
    sheet.getRange(1, 1).setValue(title);

    // 2행: 메인 헤더
    const mainHeaders = ["사번", "이름", "발생", "그전달까지 남은연차"];

    // 날짜 헤더 추가 (1일부터 마지막 날까지)
    for (let day = 1; day <= lastDay; day++) {
      mainHeaders.push(`${day}일`);
    }

    mainHeaders.push("사용", "잔여", "비고");

    // 헤더 설정
    sheet.getRange(2, 1, 1, mainHeaders.length).setValues([mainHeaders]);

    // 3행: 서브 헤더 (요일 정보)
    const subHeaders = ["", "", "", ""];

    // 요일 정보 추가
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][
        date.getDay()
      ];
      subHeaders.push(dayOfWeek);
    }

    subHeaders.push("", "", "");

    // 서브 헤더 설정
    sheet.getRange(3, 1, 1, subHeaders.length).setValues([subHeaders]);

    // 4행: 사용 행
    const usageHeaders = ["사용", "사용", "사용", "사용"];
    for (let day = 1; day <= lastDay; day++) {
      usageHeaders.push("");
    }
    usageHeaders.push("Y", "Y/2", "");
    sheet.getRange(4, 1, 1, usageHeaders.length).setValues([usageHeaders]);

    // 5행: 잔여 행
    const remainHeaders = ["잔여", "잔여", "잔여", "잔여"];
    for (let day = 1; day <= lastDay; day++) {
      remainHeaders.push("");
    }
    remainHeaders.push("Y", "", "");
    sheet.getRange(5, 1, 1, remainHeaders.length).setValues([remainHeaders]);

    console.log("✅ 근무표 헤더 설정 완료");
  } catch (error) {
    console.error("❌ 근무표 헤더 설정 오류:", error);
    throw error;
  }
}

/**
 * 👥 직원 행 설정 (개선된 버전)
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

      // 날짜별 근무 상태 설정
      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();

        // 공휴일 확인
        if (isHoliday(year, month, day)) {
          rowData.push("OFF"); // 공휴일
        } else if (dayOfWeek === 0) {
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
 * 🎨 근무표 스타일 적용 (공휴일 포함)
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

    // 날짜별 색상 적용
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const columnIndex = 4 + day; // 날짜 열 위치

      // 해당 열의 범위
      const columnRange = sheet.getRange(
        2,
        columnIndex,
        sheet.getLastRow() - 1,
        1
      );

      if (isHoliday(year, month, day)) {
        // 공휴일 - 빨간색
        columnRange.setBackground("#ffebee");
        columnRange.setFontColor("#d32f2f");
        columnRange.setFontWeight("bold");
      } else if (dayOfWeek === 0) {
        // 일요일 - 빨간색
        columnRange.setBackground("#ffebee");
        columnRange.setFontColor("#d32f2f");
      } else if (dayOfWeek === 6) {
        // 토요일 - 파란색
        columnRange.setBackground("#e3f2fd");
        columnRange.setFontColor("#1976d2");
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
// 🔧 유틸리티 함수들
// =====================================

/**
 * 🏢 부서 정보 조회 (ID로)
 */
function getDepartmentById(deptId) {
  try {
    const departments = getDepartmentsQuick();
    for (let i = 0; i < departments.length; i++) {
      if (departments[i].deptId === deptId.toString()) {
        return departments[i];
      }
    }
    return null;
  } catch (error) {
    console.error("❌ 부서 정보 조회 오류:", error);
    return null;
  }
}

/**
 * 📋 시트 존재 확인 및 반환
 */
function getSheetIfExists(sheetName) {
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  } catch (error) {
    return null;
  }
}

/**
 * 👥 부서별 직원 조회
 */
function getEmployeesByDepartment(deptId) {
  try {
    const allEmployees = getAllEmployees();
    return allEmployees.filter((emp) => emp.deptId === deptId.toString());
  } catch (error) {
    console.error("❌ 부서별 직원 조회 오류:", error);
    return [];
  }
}

// =====================================
// 🧪 테스트 함수들
// =====================================

/**
 * 🧪 근무표 생성 테스트
 */
function testWorkScheduleCreation() {
  try {
    console.log("🧪 근무표 생성 테스트 시작");

    const testDeptId = "10"; // 개발팀
    const testYear = 2025;
    const testMonth = 7;

    const result = createWorkScheduleSheet(testDeptId, testYear, testMonth);
    console.log("테스트 결과:", result);

    return result;
  } catch (error) {
    console.error("❌ 테스트 오류:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🧪 공휴일 확인 테스트
 */
function testHolidayCheck() {
  try {
    console.log("🧪 공휴일 확인 테스트");

    const testYear = 2025;
    const testMonth = 7;

    for (let day = 1; day <= 31; day++) {
      const isHolidayResult = isHoliday(testYear, testMonth, day);
      const holidayName = getHolidayName(testYear, testMonth, day);

      if (isHolidayResult) {
        console.log(`${testMonth}월 ${day}일: ${holidayName} (공휴일)`);
      }
    }

    return "공휴일 테스트 완료";
  } catch (error) {
    console.error("❌ 공휴일 테스트 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 근무표 존재 확인 테스트
 */
function testWorkScheduleExists() {
  try {
    console.log("🧪 근무표 존재 확인 테스트");

    const testDeptId = "10"; // 개발팀
    const testYear = 2025;
    const testMonth = 7;

    const result = checkWorkScheduleExists(testDeptId, testYear, testMonth);
    console.log("존재 확인 결과:", result);

    return result;
  } catch (error) {
    console.error("❌ 존재 확인 테스트 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 전체 근무표 시스템 테스트
 */
function testWorkScheduleSystem() {
  try {
    console.log("🧪 전체 근무표 시스템 테스트 시작");

    const testDeptId = "10"; // 개발팀
    const testYear = 2025;
    const testMonth = 7;

    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // 1. 공휴일 테스트
    console.log("1. 공휴일 테스트");
    results.tests.holiday = testHolidayCheck();

    // 2. 근무표 존재 확인 테스트
    console.log("2. 근무표 존재 확인 테스트");
    results.tests.exists = testWorkScheduleExists();

    // 3. 근무표 생성 테스트
    console.log("3. 근무표 생성 테스트");
    results.tests.creation = testWorkScheduleCreation();

    // 4. 생성 후 존재 확인 테스트
    console.log("4. 생성 후 존재 확인 테스트");
    results.tests.existsAfterCreation = testWorkScheduleExists();

    console.log("✅ 전체 테스트 완료:", results);
    return results;
  } catch (error) {
    console.error("❌ 전체 테스트 오류:", error);
    return { error: error.message };
  }
}
