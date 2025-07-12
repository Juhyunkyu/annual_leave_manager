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
 * 📊 근무표 데이터 조회 (구글시트 구조에 맞게 수정)
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

    if (data.length < 4) {
      console.log("⚠️ 근무표 데이터가 충분하지 않습니다.");
      return null;
    }

    return {
      title: data[0][0], // 제목
      columnHeaders: data[1], // 컬럼 헤더
      subHeaders: data[2], // 서브 헤더 (요일)
      employeeData: data.slice(3), // 직원 데이터 (4행부터)
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
 * 📋 근무표 헤더 설정 (요구 표 구조에 맞게)
 */
function setupWorkScheduleHeader(sheet, department, year, month) {
  try {
    const lastDay = new Date(year, month, 0).getDate();
    const totalColumns = 3 + lastDay + 4; // 사번,이름,발생 + 1~31 + 사용,Y/2,잔여,비고

    // 1행: 전체 병합, 제목
    const title = `${year}년 ${month}월 ${department.deptName} 근무표`;
    sheet.getRange(1, 1, 1, totalColumns).merge();
    sheet
      .getRange(1, 1)
      .setValue(title)
      .setBackground("#667eea")
      .setFontColor("white")
      .setFontSize(16)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // 2행: 메인 헤더
    const mainHeaders = ["사번", "이름", "발생"];
    for (let day = 1; day <= lastDay; day++) mainHeaders.push(`${day}`);
    mainHeaders.push("사용", "", "잔여", "비고");
    sheet.getRange(2, 1, 1, mainHeaders.length).setValues([mainHeaders]);

    // 3행: 서브 헤더 (요일)
    const subHeaders = ["", "", "Y"];
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][
        date.getDay()
      ];
      subHeaders.push(dayOfWeek);
    }
    subHeaders.push("Y", "Y/2", "Y", "");
    sheet.getRange(3, 1, 1, subHeaders.length).setValues([subHeaders]);

    // 헤더 스타일 및 중앙정렬
    sheet
      .getRange(2, 1, 2, totalColumns)
      .setBackground("#e3f2fd")
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");

    // 셀 병합: A2:A3, B2:B3, AI2:AJ2
    sheet.getRange(2, 1, 2, 1).merge(); // A2:A3
    sheet.getRange(2, 2, 2, 1).merge(); // B2:B3
    const aiCol = 3 + lastDay + 1;
    sheet.getRange(2, aiCol, 1, 2).merge(); // AI2:AJ2
  } catch (error) {
    console.error("❌ 근무표 헤더 설정 오류:", error);
    throw error;
  }
}

/**
 * 👥 직원 행 설정 (중앙정렬)
 */
function setupEmployeeRows(sheet, employees, year, month) {
  try {
    if (!employees || employees.length === 0) return;
    const lastDay = new Date(year, month, 0).getDate();
    employees.forEach((employee, index) => {
      const rowIndex = 4 + index; // 4행부터
      const previousRemaining = getPreviousMonthRemaining(
        employee.empId,
        year,
        month
      );
      const rowData = [employee.empId, employee.name, previousRemaining];
      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (isHoliday(year, month, day)) rowData.push("OFF");
        else if (dayOfWeek === 0) rowData.push("OFF");
        else rowData.push("D");
      }
      rowData.push(0, 0, previousRemaining, "");
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    });
    // 직원 데이터 중앙정렬
    const totalColumns = 3 + lastDay + 4;
    sheet
      .getRange(4, 1, employees.length, totalColumns)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
  } catch (error) {
    console.error("❌ 직원 행 설정 오류:", error);
    throw error;
  }
}

/**
 * 📅 이전 달 잔여 연차 조회
 */
function getPreviousMonthRemaining(empId, year, month) {
  try {
    // 이전 달 계산
    let prevYear = year;
    let prevMonth = month - 1;

    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    // 이전 달 근무표 시트명 생성
    const prevMonthStr = prevMonth.toString().padStart(2, "0");
    const prevSheetName = `근무표_${prevYear}_${prevMonthStr}`;

    // 이전 달 시트 존재 확인
    const prevSheet = getSheetIfExists(prevSheetName);
    if (!prevSheet) {
      console.log(`⚠️ 이전 달 근무표 없음: ${prevSheetName}`);
      return parseInt(getSystemSetting("기본연차일수", 15)); // 기본값 반환
    }

    // 이전 달 데이터에서 해당 직원의 잔여 찾기
    const prevData = prevSheet.getDataRange().getValues();

    for (let i = 3; i < prevData.length; i++) {
      // 4행부터 직원 데이터
      if (prevData[i][0] == empId) {
        // 사번 일치
        const remaining = prevData[i][prevData[i].length - 3]; // 잔여 열 (마지막에서 3번째)
        return remaining || parseInt(getSystemSetting("기본연차일수", 15));
      }
    }

    console.log(`⚠️ 이전 달 데이터에서 직원 ${empId} 찾을 수 없음`);
    return parseInt(getSystemSetting("기본연차일수", 15));
  } catch (error) {
    console.error("❌ 이전 달 잔여 조회 오류:", error);
    return parseInt(getSystemSetting("기본연차일수", 15));
  }
}

/**
 * 🎨 근무표 스타일 적용 (셀 병합, 중앙정렬, 색상, 테두리)
 */
function applyWorkScheduleStyles(sheet, year, month) {
  try {
    const lastDay = new Date(year, month, 0).getDate();
    const totalColumns = 3 + lastDay + 4;
    // 날짜별 색상 적용 (생략)
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const col = 3 + day;
      const range = sheet.getRange(2, col, sheet.getLastRow() - 1, 1);
      if (isHoliday(year, month, day)) {
        range
          .setBackground("#ffebee")
          .setFontColor("#d32f2f")
          .setFontWeight("bold");
      } else if (dayOfWeek === 0) {
        range.setBackground("#ffebee").setFontColor("#d32f2f");
      } else if (dayOfWeek === 6) {
        range.setBackground("#e3f2fd").setFontColor("#1976d2");
      } else {
        range.setBackground("#ffffff").setFontColor("#222");
      }
    }
    // 열 너비 조정
    sheet.setColumnWidth(1, 60); // 사번
    sheet.setColumnWidth(2, 80); // 이름
    sheet.setColumnWidth(3, 60); // 발생
    for (let day = 1; day <= lastDay; day++) {
      sheet.setColumnWidth(3 + day, 28); // 날짜 열
    }
    sheet.setColumnWidth(3 + lastDay + 1, 40); // 사용
    sheet.setColumnWidth(3 + lastDay + 2, 40); // Y/2
    sheet.setColumnWidth(3 + lastDay + 3, 50); // 잔여
    sheet.setColumnWidth(3 + lastDay + 4, 120); // 비고
    // 전체 폰트 크기 줄이기
    sheet.getRange(1, 1, sheet.getLastRow(), totalColumns).setFontSize(9);
    // 테두리 전체
    sheet
      .getRange(1, 1, sheet.getLastRow(), totalColumns)
      .setBorder(true, true, true, true, true, true);
  } catch (error) {
    console.error("❌ 근무표 스타일 적용 오류:", error);
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
 * 🧪 이전 달 잔여 조회 테스트
 */
function testPreviousMonthRemaining() {
  try {
    console.log("🧪 이전 달 잔여 조회 테스트");

    const testEmpId = "1001";
    const testYear = 2025;
    const testMonth = 7;

    const remaining = getPreviousMonthRemaining(testEmpId, testYear, testMonth);
    console.log("이전 달 잔여:", remaining);

    return { empId: testEmpId, remaining: remaining };
  } catch (error) {
    console.error("❌ 테스트 오류:", error);
    return { error: error.message };
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
    console.log("🧪 전체 근무표 시스템 테스트");

    const results = {
      creation: testWorkScheduleCreation(),
      previousRemaining: testPreviousMonthRemaining(),
      holidays: getHolidays(2025),
      isHoliday: isHoliday(2025, 7, 15), // 7월 15일 공휴일 확인
    };

    console.log("전체 테스트 결과:", results);
    return results;
  } catch (error) {
    console.error("❌ 전체 테스트 오류:", error);
    return { error: error.message };
  }
}
