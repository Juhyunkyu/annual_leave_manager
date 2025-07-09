/**
 * 근무표 관리 시스템 (Phase 1)
 * 기능: 부서별 근무표 생성, 조회, 관리
 */

// =====================================
// 근무표 관리 함수들 (Phase 1)
// =====================================

/**
 * 근무표 시트 생성
 */
function createWorkScheduleSheet(deptId, year, month) {
  try {
    console.log("근무표 시트 생성 시작: " + deptId + ", " + year + "-" + month);

    // 부서 정보 조회
    var department = getDepartmentById(deptId);
    if (!department) {
      return { success: false, error: "부서 정보를 찾을 수 없습니다." };
    }

    // 시트명 생성
    var monthStr = month.toString();
    if (monthStr.length === 1) monthStr = "0" + monthStr;
    var sheetName = department.deptName + "_" + year + "_" + monthStr;

    // 기존 시트 확인 및 삭제
    var existingSheet = getSheetIfExists(sheetName);
    if (existingSheet) {
      SpreadsheetApp.getActiveSpreadsheet().deleteSheet(existingSheet);
      console.log("기존 시트 삭제: " + sheetName);
    }

    // 새 시트 생성
    var sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);

    // 근무표 헤더 설정
    setupWorkScheduleHeader(sheet, department, year, month);

    // 부서 직원 목록 가져와서 행 생성
    var employees = getEmployeesByDepartment(deptId);
    setupEmployeeRows(sheet, employees, year, month);

    // 스타일 적용
    applyWorkScheduleStyles(sheet, year, month);

    console.log("근무표 시트 생성 완료: " + sheetName);

    return {
      success: true,
      sheetName: sheetName,
      employeeCount: employees.length,
    };
  } catch (error) {
    console.error("근무표 시트 생성 오류:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 근무표 데이터 조회
 */
function getWorkScheduleData(deptId, year, month) {
  try {
    console.log("근무표 데이터 조회: " + deptId + ", " + year + "-" + month);

    // 부서 정보 조회
    var department = getDepartmentById(deptId);
    if (!department) {
      return null;
    }

    // 시트명 생성
    var monthStr = month.toString();
    if (monthStr.length === 1) monthStr = "0" + monthStr;
    var sheetName = department.deptName + "_" + year + "_" + monthStr;
    var sheet = getSheetIfExists(sheetName);

    if (!sheet) {
      console.log("근무표 시트가 없습니다: " + sheetName);
      return null;
    }

    // 데이터 조회
    var data = sheet.getDataRange().getValues();

    if (data.length < 6) {
      console.log("근무표 데이터가 충분하지 않습니다.");
      return null;
    }

    return {
      title: data[0][0], // 제목
      columnHeaders: data[1], // 컬럼 헤더
      subHeaders: data[2], // 서브 헤더
      employeeData: data.slice(5), // 직원 데이터 (5행부터)
      sheetName: sheetName,
      department: department.deptName,
      year: year,
      month: month,
    };
  } catch (error) {
    console.error("근무표 데이터 조회 오류:", error);
    return null;
  }
}

/**
 * 부서 정보 조회 (ID로)
 */
function getDepartmentById(deptId) {
  try {
    var departments = getDepartmentsQuick();
    for (var i = 0; i < departments.length; i++) {
      if (departments[i].deptId === deptId.toString()) {
        return departments[i];
      }
    }
    return null;
  } catch (error) {
    console.error("부서 정보 조회 오류:", error);
    return null;
  }
}

/**
 * 시트 존재 확인 및 반환
 */
function getSheetIfExists(sheetName) {
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  } catch (error) {
    return null;
  }
}

/**
 * 근무표 헤더 설정
 */
function setupWorkScheduleHeader(sheet, department, year, month) {
  try {
    console.log("근무표 헤더 설정 중...");

    // 해당 월의 마지막 날짜 계산
    var lastDay = new Date(year, month, 0).getDate();

    // 1행: 제목
    var title = year + "년 " + month + "월 " + department.deptName + " 근무표";
    sheet.getRange(1, 1).setValue(title);

    // 2행: 메인 헤더
    var mainHeaders = ["사번", "이름", "발생연차", "그전달까지 남은연차"];

    // 날짜 헤더 추가 (1일부터 마지막 날까지)
    for (var day = 1; day <= lastDay; day++) {
      mainHeaders.push(day + "일");
    }

    mainHeaders.push("사용", "잔여", "비고");

    // 헤더 설정
    sheet.getRange(2, 1, 1, mainHeaders.length).setValues([mainHeaders]);

    // 3행: 서브 헤더 (요일 정보)
    var subHeaders = ["", "", "", ""];

    // 요일 정보 추가
    for (var day = 1; day <= lastDay; day++) {
      var date = new Date(year, month - 1, day);
      var dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
      subHeaders.push(dayOfWeek);
    }

    subHeaders.push("", "", "");

    // 서브 헤더 설정
    sheet.getRange(3, 1, 1, subHeaders.length).setValues([subHeaders]);

    // 4행: 사용 행
    var usageHeaders = ["사용", "사용", "사용", "사용"];
    for (var day = 1; day <= lastDay; day++) {
      usageHeaders.push("");
    }
    usageHeaders.push("Y", "Y/2", "");
    sheet.getRange(4, 1, 1, usageHeaders.length).setValues([usageHeaders]);

    // 5행: 잔여 행
    var remainHeaders = ["잔여", "잔여", "잔여", "잔여"];
    for (var day = 1; day <= lastDay; day++) {
      remainHeaders.push("");
    }
    remainHeaders.push("", "", "");
    sheet.getRange(5, 1, 1, remainHeaders.length).setValues([remainHeaders]);

    console.log("근무표 헤더 설정 완료");
  } catch (error) {
    console.error("근무표 헤더 설정 오류:", error);
    throw error;
  }
}

/**
 * 직원 행 설정
 */
function setupEmployeeRows(sheet, employees, year, month) {
  try {
    console.log("직원 행 설정 중...", employees.length + "명");

    if (!employees || employees.length === 0) {
      console.log("해당 부서에 직원이 없습니다.");
      return;
    }

    var lastDay = new Date(year, month, 0).getDate();
    var basicLeaves = parseInt(getSystemSetting("기본연차일수", 15));

    for (var i = 0; i < employees.length; i++) {
      var employee = employees[i];
      var rowIndex = 6 + i; // 6행부터 시작

      // 기본 정보
      var rowData = [
        employee.empId,
        employee.name,
        basicLeaves, // 발생연차
        basicLeaves, // 그전달까지 남은연차 (임시로 기본값)
      ];

      // 날짜별 기본값 설정
      for (var day = 1; day <= lastDay; day++) {
        var date = new Date(year, month - 1, day);
        var dayOfWeek = date.getDay();

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
    }

    console.log("직원 행 설정 완료");
  } catch (error) {
    console.error("직원 행 설정 오류:", error);
    throw error;
  }
}

/**
 * 근무표 스타일 적용
 */
function applyWorkScheduleStyles(sheet, year, month) {
  try {
    console.log("근무표 스타일 적용 중...");

    var lastDay = new Date(year, month, 0).getDate();
    var totalColumns = 4 + lastDay + 3; // 기본정보(4) + 날짜 + 사용/잔여/비고(3)

    // 1행 제목 스타일
    var titleRange = sheet.getRange(1, 1, 1, totalColumns);
    titleRange.merge();
    titleRange.setBackground("#667eea");
    titleRange.setFontColor("white");
    titleRange.setFontSize(14);
    titleRange.setFontWeight("bold");
    titleRange.setHorizontalAlignment("center");
    titleRange.setVerticalAlignment("middle");

    // 2-5행 헤더 스타일
    var headerRange = sheet.getRange(2, 1, 4, totalColumns);
    headerRange.setBackground("#e3f2fd");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");

    // 직원 정보 열 스타일 (A-D열)
    var employeeInfoRange = sheet.getRange(6, 1, sheet.getLastRow() - 5, 4);
    employeeInfoRange.setBackground("#f8f9fa");

    // 주말 색상 적용
    for (var day = 1; day <= lastDay; day++) {
      var date = new Date(year, month - 1, day);
      var dayOfWeek = date.getDay();
      var columnIndex = 4 + day; // 날짜 열 위치

      if (dayOfWeek === 0) {
        // 일요일
        var sundayRange = sheet.getRange(
          2,
          columnIndex,
          sheet.getLastRow() - 1,
          1
        );
        sundayRange.setBackground("#ffebee");
        sundayRange.setFontColor("#d32f2f");
      } else if (dayOfWeek === 6) {
        // 토요일
        var saturdayRange = sheet.getRange(
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
    var allDataRange = sheet.getRange(1, 1, sheet.getLastRow(), totalColumns);
    allDataRange.setBorder(true, true, true, true, true, true);

    // 행 높이 조정
    sheet.setRowHeight(1, 40); // 제목 행
    for (var i = 2; i <= 5; i++) {
      sheet.setRowHeight(i, 25); // 헤더 행들
    }

    // 열 너비 조정
    sheet.setColumnWidth(1, 80); // 사번
    sheet.setColumnWidth(2, 100); // 이름
    sheet.setColumnWidth(3, 80); // 발생연차
    sheet.setColumnWidth(4, 120); // 그전달까지 남은연차

    // 날짜 열들 (좁게)
    for (var day = 1; day <= lastDay; day++) {
      sheet.setColumnWidth(4 + day, 35);
    }

    sheet.setColumnWidth(4 + lastDay + 1, 60); // 사용
    sheet.setColumnWidth(4 + lastDay + 2, 60); // 잔여
    sheet.setColumnWidth(4 + lastDay + 3, 100); // 비고

    console.log("근무표 스타일 적용 완료");
  } catch (error) {
    console.error("근무표 스타일 적용 오류:", error);
    // 스타일 오류는 치명적이지 않으므로 계속 진행
  }
}
