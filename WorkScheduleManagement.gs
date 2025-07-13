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
    mainHeaders.push("사용", "Y/2", "잔여", "비고");
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
 * 📅 승인된 연차 정보 조회
 */
function getApprovedLeavesForMonth(year, month) {
  try {
    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();
    const approvedLeaves = [];

    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      const status = request[7]; // 상태 컬럼

      if (status === "승인") {
        const startDate = new Date(request[2]); // 시작일
        const endDate = new Date(request[3]); // 종료일
        const empId = request[1]; // 직원 ID
        const leaveType = request[5]; // 연차 종류
        const days = request[4]; // 일수

        // 해당 월에 포함되는지 확인
        if (
          (startDate.getFullYear() === year &&
            startDate.getMonth() + 1 === month) ||
          (endDate.getFullYear() === year &&
            endDate.getMonth() + 1 === month) ||
          (startDate.getFullYear() === year &&
            startDate.getMonth() + 1 <= month &&
            endDate.getFullYear() === year &&
            endDate.getMonth() + 1 >= month)
        ) {
          approvedLeaves.push({
            empId: empId,
            startDate: startDate,
            endDate: endDate,
            leaveType: leaveType,
            days: days,
          });
        }
      }
    }

    return approvedLeaves;
  } catch (error) {
    console.error("승인된 연차 정보 조회 오류:", error);
    return [];
  }
}

/**
 * 👥 직원 행 설정 (중앙정렬 + 연차 정보 반영)
 */
function setupEmployeeRows(sheet, employees, year, month) {
  try {
    if (!employees || employees.length === 0) return;
    const lastDay = new Date(year, month, 0).getDate();

    // 승인된 연차 정보 조회
    const approvedLeaves = getApprovedLeavesForMonth(year, month);
    console.log("📅 승인된 연차 정보:", approvedLeaves);

    employees.forEach((employee, index) => {
      const rowIndex = 4 + index; // 4행부터

      // 1. 발생 연차 계산 (현재 달 연차 제외한 남은 연차)
      const earnedLeaves = calculateEarnedLeaves(employee.empId, year, month);
      const usedUntilPreviousMonth = getUsedLeavesUntilMonth(
        employee.empId,
        year,
        month
      );
      const earnedRemaining = Math.max(
        0,
        earnedLeaves - usedUntilPreviousMonth
      );

      // 2. 해당 월의 사용 연차 계산 (연차와 반차 구분)
      const monthlyUsage = getMonthlyUsedLeaves(employee.empId, year, month);
      const usedFullDays = monthlyUsage.fullDays; // 연차 일수 (예: Y가 3개면 3)
      const usedHalfDays = monthlyUsage.halfDays; // 반차 일수 (예: Y/2[0.5]가 2개면 1)

      // 3. 잔여 연차 계산 (발생 - 사용)
      const remainingDays = Math.max(
        0,
        earnedRemaining - monthlyUsage.totalUsed
      );

      const rowData = [employee.empId, employee.name, earnedRemaining];

      // 해당 직원의 승인된 연차 정보 찾기
      const employeeLeaves = approvedLeaves.filter(
        (leave) => leave.empId === employee.empId
      );

      // 날짜별 연차 표시
      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();

        // 해당 날짜에 연차가 있는지 확인
        let leaveMark = "";
        for (const leave of employeeLeaves) {
          const currentDate = new Date(year, month - 1, day);
          if (currentDate >= leave.startDate && currentDate <= leave.endDate) {
            if (leave.leaveType === "연차") {
              leaveMark = "Y";
            } else if (leave.leaveType === "반차") {
              leaveMark = "Y/2";
            } else {
              leaveMark = "Y"; // 기타 연차 종류도 Y로 표시
            }
            break;
          }
        }

        if (leaveMark) {
          rowData.push(leaveMark);
        } else if (isHoliday(year, month, day)) {
          rowData.push("OFF");
        } else if (dayOfWeek === 0) {
          rowData.push("OFF");
        } else {
          rowData.push("D");
        }
      }

      // 데이터 추가: [사용, Y/2, 잔여, 비고]
      rowData.push(usedFullDays, usedHalfDays, remainingDays, "");

      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);

      console.log(
        `📊 직원 ${employee.name} (${employee.empId}) 근무표 데이터:`,
        {
          earnedRemaining: earnedRemaining,
          usedFullDays: usedFullDays,
          usedHalfDays: usedHalfDays,
          remainingDays: remainingDays,
        }
      );
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
 * 📅 발생 연차 계산 (현재 달 연차 제외)
 */
function calculateEarnedLeaves(empId, year, month) {
  try {
    // 기본 연차 일수 (시스템 설정에서 가져오기)
    const basicLeaves = parseInt(getSystemSetting("기본연차일수", 15));

    // 직원 정보 조회
    const employee = getEmployee(empId);
    if (!employee) {
      console.log(`⚠️ 직원 ${empId} 정보를 찾을 수 없음`);
      return basicLeaves;
    }

    // 입사일 기준 연차 발생 계산
    const joinDate = new Date(employee.joinDate);
    const currentDate = new Date(year, month - 1, 1); // 해당 월 1일

    // 입사 후 경과 개월 수 계산
    const monthsDiff =
      (currentDate.getFullYear() - joinDate.getFullYear()) * 12 +
      (currentDate.getMonth() - joinDate.getMonth());

    // 연차 발생 계산 (입사 후 1년 미만: 월 1일씩, 1년 이상: 기본 연차)
    let totalEarned = 0;
    if (monthsDiff < 12) {
      // 입사 후 1년 미만: 월 1일씩 발생
      totalEarned = monthsDiff;
    } else {
      // 입사 후 1년 이상: 기본 연차 발생
      totalEarned = basicLeaves;
    }

    console.log(`📊 직원 ${empId} 발생 연차 계산:`, {
      empId: empId,
      joinDate: employee.joinDate,
      monthsDiff: monthsDiff,
      totalEarned: totalEarned,
    });

    return totalEarned;
  } catch (error) {
    console.error("❌ 발생 연차 계산 오류:", error);
    return parseInt(getSystemSetting("기본연차일수", 15));
  }
}

/**
 * 📅 이전 달까지 사용한 연차 계산
 */
function getUsedLeavesUntilMonth(empId, year, month) {
  try {
    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();
    let totalUsed = 0;

    // 해당 월 이전까지의 사용 연차 계산
    const targetDate = new Date(year, month, 0); // 해당 월 마지막 날

    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      const status = request[7]; // 상태 컬럼
      const requestEmpId = request[1]; // 직원 ID

      if (status === "승인" && requestEmpId.toString() === empId.toString()) {
        const startDate = new Date(request[2]); // 시작일
        const endDate = new Date(request[3]); // 종료일
        const leaveType = request[5]; // 연차 종류

        // 해당 월 이전에 끝난 연차만 계산
        if (endDate <= targetDate) {
          const daysDiff =
            Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

          if (leaveType === "반차") {
            totalUsed += daysDiff * 0.5;
          } else {
            totalUsed += daysDiff;
          }
        }
      }
    }

    return totalUsed;
  } catch (error) {
    console.error("❌ 사용 연차 계산 오류:", error);
    return 0;
  }
}

/**
 * 📅 발생 연차 계산 (현재 달 연차 제외)
 */
function getPreviousMonthRemaining(empId, year, month) {
  try {
    // 발생 연차 계산
    const earnedLeaves = calculateEarnedLeaves(empId, year, month);

    // 이전 달까지 사용한 연차 계산
    let prevYear = year;
    let prevMonth = month - 1;

    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const usedLeaves = getUsedLeavesUntilMonth(empId, prevYear, prevMonth);

    // 잔여 연차 = 발생 연차 - 사용 연차
    const remaining = Math.max(0, earnedLeaves - usedLeaves);

    console.log(`📊 직원 ${empId} 잔여 연차 계산:`, {
      empId: empId,
      earnedLeaves: earnedLeaves,
      usedLeaves: usedLeaves,
      remaining: remaining,
    });

    return remaining;
  } catch (error) {
    console.error("❌ 잔여 연차 계산 오류:", error);
    return parseInt(getSystemSetting("기본연차일수", 15));
  }
}

/**
 * 📅 해당 월의 사용 연차 계산 (연차와 반차 구분)
 */
function getMonthlyUsedLeaves(empId, year, month) {
  try {
    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();
    let usedFullDays = 0; // 연차 일수 (예: Y가 3개면 3)
    let usedHalfDays = 0; // 반차 일수 (예: Y/2[0.5]가 2개면 1)

    // 해당 월의 시작일과 종료일
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      const status = request[7]; // 상태 컬럼
      const requestEmpId = request[1]; // 직원 ID

      if (status === "승인" && requestEmpId.toString() === empId.toString()) {
        const startDate = new Date(request[2]); // 시작일
        const endDate = new Date(request[3]); // 종료일
        const leaveType = request[5]; // 연차 종류

        // 해당 월에 포함되는 연차만 계산
        if (startDate <= monthEnd && endDate >= monthStart) {
          // 해당 월에 포함되는 기간 계산
          const effectiveStart =
            startDate < monthStart ? monthStart : startDate;
          const effectiveEnd = endDate > monthEnd ? monthEnd : endDate;

          const daysDiff =
            Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) +
            1;

          if (leaveType === "반차") {
            // 반차는 일수로 계산 (0.5일씩)
            usedHalfDays += daysDiff * 0.5;
          } else {
            // 연차는 일수로 계산
            usedFullDays += daysDiff;
          }
        }
      }
    }

    // 총 사용 일수 계산 (Y + Y/2)
    const totalUsedDays = usedFullDays + usedHalfDays;

    console.log(`📊 직원 ${empId} ${year}년 ${month}월 사용 연차:`, {
      empId: empId,
      usedFullDays: usedFullDays,
      usedHalfDays: usedHalfDays,
      totalUsedDays: totalUsedDays,
    });

    return {
      fullDays: usedFullDays,
      halfDays: usedHalfDays,
      totalUsed: totalUsedDays,
    };
  } catch (error) {
    console.error("❌ 월별 사용 연차 계산 오류:", error);
    return {
      fullDays: 0,
      halfDays: 0,
      totalUsed: 0,
    };
  }
}

/**
 * 🎨 연차 색상 적용
 */
function applyLeaveColors(sheet, year, month) {
  try {
    const lastDay = new Date(year, month, 0).getDate();
    const approvedLeaves = getApprovedLeavesForMonth(year, month);

    // 각 날짜별로 연차 정보 확인하여 색상 적용
    for (let day = 1; day <= lastDay; day++) {
      const col = 3 + day;
      const currentDate = new Date(year, month - 1, day);

      // 해당 날짜에 연차가 있는 직원들 찾기
      const leavesOnThisDay = approvedLeaves.filter((leave) => {
        return currentDate >= leave.startDate && currentDate <= leave.endDate;
      });

      if (leavesOnThisDay.length > 0) {
        // 연차가 있는 날짜는 배경색 변경
        const range = sheet.getRange(2, col, sheet.getLastRow() - 1, 1);
        range.setBackground("#fff3e0"); // 연한 주황색 배경

        // 연차 셀에 특별한 색상과 텍스트 적용
        for (const leave of leavesOnThisDay) {
          const empId = leave.empId;
          // 해당 직원의 행 찾기
          const data = sheet.getDataRange().getValues();
          for (let row = 3; row < data.length; row++) {
            if (data[row][0] === empId) {
              const cell = sheet.getRange(row + 1, col);

              // 연차 종류에 따른 텍스트 설정
              let leaveText = "Y";
              if (leave.leaveType === "반차") {
                leaveText = "Y/2";
              }

              // 셀에 텍스트와 스타일 적용
              cell.setValue(leaveText);

              if (leave.leaveType === "연차") {
                cell
                  .setBackground("#4caf50")
                  .setFontColor("white")
                  .setFontWeight("bold"); // 초록색
              } else if (leave.leaveType === "반차") {
                cell
                  .setBackground("#ff9800")
                  .setFontColor("white")
                  .setFontWeight("bold"); // 주황색
              } else {
                cell
                  .setBackground("#2196f3")
                  .setFontColor("white")
                  .setFontWeight("bold"); // 파란색
              }
              break;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ 연차 색상 적용 오류:", error);
  }
}

/**
 * 🎨 근무표 스타일 적용 (셀 병합, 중앙정렬, 색상, 테두리)
 */
function applyWorkScheduleStyles(sheet, year, month) {
  try {
    const lastDay = new Date(year, month, 0).getDate();
    const totalColumns = 3 + lastDay + 4;

    // 날짜별 색상 적용
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

    // 연차 정보에 따른 색상 적용
    applyLeaveColors(sheet, year, month);

    // 열 너비 조정
    sheet.setColumnWidth(1, 60); // 사번
    sheet.setColumnWidth(2, 80); // 이름
    sheet.setColumnWidth(3, 60); // 발생
    for (let day = 1; day <= lastDay; day++) {
      sheet.setColumnWidth(3 + day, 28); // 날짜 열
    }
    sheet.setColumnWidth(3 + lastDay + 1, 40); // 사용
    sheet.setColumnWidth(3 + lastDay + 2, 50); // Y/2
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
 * 🔄 승인된 연차에 따른 근무표 자동 업데이트
 */
function updateWorkScheduleForApprovedLeave(approvedRequest) {
  try {
    console.log("🔄 근무표 자동 업데이트 시작:", approvedRequest);

    // 승인된 연차의 시작일과 종료일
    const startDate = new Date(approvedRequest.startDate);
    const endDate = new Date(approvedRequest.endDate);
    const empId = approvedRequest.empId;
    const leaveType = approvedRequest.leaveType;

    // 직원 정보 조회
    const employee = getEmployee(empId);
    if (!employee) {
      console.log("⚠️ 직원 정보를 찾을 수 없습니다:", empId);
      return;
    }

    // 해당 월의 근무표 시트들 업데이트
    const monthsToUpdate = [];

    // 시작일과 종료일이 걸쳐있는 모든 월을 찾기
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const monthKey = `${year}-${month}`;

      if (!monthsToUpdate.includes(monthKey)) {
        monthsToUpdate.push(monthKey);
      }

      // 다음 달로 이동
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    console.log("📅 업데이트할 월들:", monthsToUpdate);

    // 각 월별로 근무표 업데이트
    for (const monthKey of monthsToUpdate) {
      const [year, month] = monthKey.split("-").map(Number);

      // 해당 월의 근무표 시트 찾기
      const sheetName = findWorkScheduleSheet(employee.deptId, year, month);
      if (sheetName) {
        updateWorkScheduleSheet(
          sheetName,
          empId,
          startDate,
          endDate,
          leaveType
        );
        console.log(`✅ ${year}년 ${month}월 근무표 업데이트 완료`);
      } else {
        console.log(`⚠️ ${year}년 ${month}월 근무표가 존재하지 않습니다.`);
      }
    }

    console.log("🔄 근무표 자동 업데이트 완료");
  } catch (error) {
    console.error("❌ 근무표 자동 업데이트 오류:", error);
  }
}

/**
 * 🔍 근무표 시트명 찾기
 */
function findWorkScheduleSheet(deptId, year, month) {
  try {
    const department = getDepartmentById(deptId);
    if (!department) return null;

    const monthStr = month.toString().padStart(2, "0");
    const sheetName = `${department.deptName}_${year}_${monthStr}`;

    const sheet = getSheetIfExists(sheetName);
    return sheet ? sheetName : null;
  } catch (error) {
    console.error("❌ 근무표 시트명 찾기 오류:", error);
    return null;
  }
}

/**
 * 📝 근무표 시트 업데이트
 */
function updateWorkScheduleSheet(
  sheetName,
  empId,
  startDate,
  endDate,
  leaveType
) {
  try {
    const sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const lastDay = new Date(
      data[0][0].split("년")[0],
      data[0][0].split("월")[0].split("년")[1],
      0
    ).getDate();

    // 해당 직원의 행 찾기
    let employeeRow = -1;
    for (let row = 3; row < data.length; row++) {
      if (data[row][0] === empId) {
        employeeRow = row;
        break;
      }
    }

    if (employeeRow === -1) {
      console.log("⚠️ 직원 행을 찾을 수 없습니다:", empId);
      return;
    }

    // 연차 표시 텍스트 결정
    let leaveText = "Y";
    if (leaveType === "반차") {
      leaveText = "Y/2";
    }

    // 해당 월의 날짜들에 연차 표시
    for (let day = 1; day <= lastDay; day++) {
      const currentDate = new Date(
        data[0][0].split("년")[0],
        data[0][0].split("월")[0].split("년")[1] - 1,
        day
      );

      if (currentDate >= startDate && currentDate <= endDate) {
        const col = 3 + day; // 날짜 열 위치
        const cell = sheet.getRange(employeeRow + 1, col);

        // 셀에 연차 정보 설정
        cell.setValue(leaveText);

        // 색상 설정
        if (leaveType === "연차") {
          cell
            .setBackground("#4caf50")
            .setFontColor("white")
            .setFontWeight("bold");
        } else if (leaveType === "반차") {
          cell
            .setBackground("#ff9800")
            .setFontColor("white")
            .setFontWeight("bold");
        } else {
          cell
            .setBackground("#2196f3")
            .setFontColor("white")
            .setFontWeight("bold");
        }
      }
    }

    // 사용 일수 업데이트
    updateUsedDaysInSheet(sheet, employeeRow, startDate, endDate, lastDay);

    console.log(`✅ ${sheetName} 업데이트 완료`);
  } catch (error) {
    console.error("❌ 근무표 시트 업데이트 오류:", error);
  }
}

/**
 * 📊 사용 일수 업데이트
 */
function updateUsedDaysInSheet(
  sheet,
  employeeRow,
  startDate,
  endDate,
  lastDay
) {
  try {
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;
    const currentMonthStart = new Date(year, month - 1, 1);
    const currentMonthEnd = new Date(year, month, 0);

    // 해당 월에 포함되는 일수 계산
    const effectiveStart =
      startDate < currentMonthStart ? currentMonthStart : startDate;
    const effectiveEnd = endDate > currentMonthEnd ? currentMonthEnd : endDate;

    let usedDays = 0;
    if (effectiveStart <= effectiveEnd) {
      usedDays =
        Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
    }

    // 사용 일수 열 업데이트 (마지막에서 4번째 열)
    const usedDaysCol = 3 + lastDay + 1;
    const currentUsedDays =
      sheet.getRange(employeeRow + 1, usedDaysCol).getValue() || 0;
    sheet
      .getRange(employeeRow + 1, usedDaysCol)
      .setValue(currentUsedDays + usedDays);

    // 잔여 일수 업데이트 (마지막에서 3번째 열)
    const remainingCol = 3 + lastDay + 3;
    const currentRemaining =
      sheet.getRange(employeeRow + 1, remainingCol).getValue() || 0;
    sheet
      .getRange(employeeRow + 1, remainingCol)
      .setValue(currentRemaining - usedDays);
  } catch (error) {
    console.error("❌ 사용 일수 업데이트 오류:", error);
  }
}

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

/**
 * 🧪 개선된 근무표 생성 테스트
 */
function testImprovedWorkSchedule() {
  try {
    console.log("🧪 개선된 근무표 생성 테스트 시작");

    // 테스트할 부서와 월 설정
    const testDeptId = "10"; // 개발팀
    const testYear = 2025;
    const testMonth = 7;

    console.log("📋 테스트 조건:", {
      deptId: testDeptId,
      year: testYear,
      month: testMonth,
    });

    // 1. 근무표 생성
    const createResult = createWorkScheduleSheet(
      testDeptId,
      testYear,
      testMonth
    );
    console.log("📋 근무표 생성 결과:", createResult);

    if (!createResult.success) {
      console.error("❌ 근무표 생성 실패:", createResult.error);
      return;
    }

    // 2. 생성된 근무표 데이터 확인
    const dataResult = getWorkScheduleData(testDeptId, testYear, testMonth);
    console.log("📊 근무표 데이터 결과:", dataResult);

    // 3. 직원별 연차 계산 확인
    const employees = getEmployeesByDepartment(testDeptId);
    console.log("👥 부서 직원 목록:", employees);

    employees.forEach((emp) => {
      const remaining = getPreviousMonthRemaining(
        emp.empId,
        testYear,
        testMonth
      );
      console.log(`📊 직원 ${emp.name}(${emp.empId}) 발생 연차:`, remaining);
    });

    console.log("✅ 개선된 근무표 생성 테스트 완료");
    return {
      success: true,
      createResult: createResult,
      dataResult: dataResult,
      employeeCount: employees.length,
    };
  } catch (error) {
    console.error("❌ 개선된 근무표 생성 테스트 오류:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 🧪 근무표 데이터 계산 테스트
 */
function testWorkScheduleCalculation(empId, year, month) {
  try {
    // 매개변수 기본값 설정 및 유효성 검사
    if (typeof empId !== "string" || !empId) {
      empId = "1001";
      console.log("⚠️ empId 기본값 설정:", empId);
    }

    if (typeof year !== "number" || !year) {
      year = 2025;
      console.log("⚠️ year 기본값 설정:", year);
    }

    if (typeof month !== "number" || !month) {
      month = 7;
      console.log("⚠️ month 기본값 설정:", month);
    }

    // 타입 변환
    year = Number(year);
    month = Number(month);

    console.log(`🧪 근무표 데이터 계산 테스트: ${empId}, ${year}년 ${month}월`);

    // 직원 존재 여부 확인
    const employee = getEmployee(empId);
    if (!employee) {
      console.error(`❌ 직원 ${empId}을 찾을 수 없습니다.`);
      return { error: `직원 ${empId}을 찾을 수 없습니다.` };
    }

    console.log(`👤 직원 정보: ${employee.name} (${empId})`);

    // 1. 발생 연차 계산
    const earnedLeaves = calculateEarnedLeaves(empId, year, month);
    console.log("1. 발생 연차:", earnedLeaves);

    // 2. 이전 달까지 사용한 연차
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    const usedUntilPreviousMonth = getUsedLeavesUntilMonth(
      empId,
      prevYear,
      prevMonth
    );
    console.log("2. 이전 달까지 사용한 연차:", usedUntilPreviousMonth);

    // 3. 발생 잔여 (발생 - 이전 달까지 사용)
    const earnedRemaining = Math.max(0, earnedLeaves - usedUntilPreviousMonth);
    console.log("3. 발생 잔여:", earnedRemaining);

    // 4. 해당 월 사용 연차
    const monthlyUsage = getMonthlyUsedLeaves(empId, year, month);
    console.log("4. 해당 월 사용 연차:", monthlyUsage);

    // 5. 최종 잔여 (발생 잔여 - 해당 월 사용)
    const finalRemaining = Math.max(
      0,
      earnedRemaining - monthlyUsage.totalUsed
    );
    console.log("5. 최종 잔여:", finalRemaining);

    const result = {
      empId: empId,
      employeeName: employee.name,
      year: year,
      month: month,
      earnedLeaves: earnedLeaves,
      usedUntilPreviousMonth: usedUntilPreviousMonth,
      earnedRemaining: earnedRemaining,
      monthlyUsage: monthlyUsage,
      finalRemaining: finalRemaining,
    };

    console.log("📊 최종 테스트 결과:", result);
    return result;
  } catch (error) {
    console.error("❌ 근무표 데이터 계산 테스트 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 모든 직원의 근무표 데이터 계산 테스트
 */
function testAllEmployeesWorkSchedule(year, month) {
  try {
    // 매개변수 기본값 설정 및 유효성 검사
    if (typeof year !== "number" || !year) {
      year = 2025;
      console.log("⚠️ year 기본값 설정:", year);
    }

    if (typeof month !== "number" || !month) {
      month = 7;
      console.log("⚠️ month 기본값 설정:", month);
    }

    // 타입 변환
    year = Number(year);
    month = Number(month);

    console.log(`🧪 모든 직원 근무표 데이터 계산 테스트: ${year}년 ${month}월`);

    const employees = getAllEmployees();
    console.log(`👥 총 ${employees.length}명의 직원 데이터 계산 시작`);

    const results = [];

    employees.forEach((employee, index) => {
      console.log(
        `\n📊 ${index + 1}/${employees.length} - ${employee.name} (${
          employee.empId
        }) 계산 중...`
      );

      const result = testWorkScheduleCalculation(employee.empId, year, month);

      if (result.error) {
        console.error(`❌ ${employee.name} 계산 실패:`, result.error);
        results.push({
          empId: employee.empId,
          name: employee.name,
          error: result.error,
        });
      } else {
        results.push({
          empId: employee.empId,
          name: employee.name,
          ...result,
        });
      }
    });

    // 성공/실패 통계
    const successCount = results.filter((r) => !r.error).length;
    const errorCount = results.filter((r) => r.error).length;

    console.log(`\n📊 전체 테스트 완료:`);
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`❌ 실패: ${errorCount}명`);
    console.log("📊 전체 테스트 결과:", results);

    return {
      totalEmployees: employees.length,
      successCount: successCount,
      errorCount: errorCount,
      results: results,
    };
  } catch (error) {
    console.error("❌ 전체 직원 근무표 데이터 계산 테스트 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 간단한 테스트 함수 (매개변수 없이 실행)
 */
function testSimple() {
  try {
    console.log("🧪 간단한 테스트 시작");

    // 1. 기본값으로 테스트 실행
    const result = testWorkScheduleCalculation();
    console.log("✅ 데이터 계산 테스트 완료:", result);

    // 2. 근무표 생성 테스트
    console.log("📋 근무표 생성 테스트 시작...");
    const createResult = createWorkScheduleSheet("10", 2025, 7); // 개발팀, 2025년 7월
    console.log("📋 근무표 생성 결과:", createResult);

    return {
      calculation: result,
      creation: createResult,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ 간단한 테스트 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 전체 직원 간단 테스트 (매개변수 없이 실행)
 */
function testAllSimple() {
  try {
    console.log("🧪 전체 직원 간단 테스트 시작");

    // 기본값으로 테스트 실행
    const result = testAllEmployeesWorkSchedule();
    console.log("✅ 전체 테스트 완료:", result);

    return result;
  } catch (error) {
    console.error("❌ 전체 직원 간단 테스트 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 연차 데이터 확인 함수 (디버깅용)
 */
function checkLeaveRequestsData() {
  try {
    console.log("🔍 연차 데이터 확인 시작");

    const requestSheet = getSheet("LeaveRequests");
    const data = requestSheet.getDataRange().getValues();

    console.log("📊 LeaveRequests 시트 데이터:");
    console.log("- 전체 행 수:", data.length);
    console.log("- 헤더:", data[0]);

    // 승인된 연차 데이터만 필터링
    const approvedRequests = [];
    for (let i = 1; i < data.length; i++) {
      const request = data[i];
      if (request[7] === "승인") {
        // 상태가 승인인 것만
        approvedRequests.push({
          reqId: request[0],
          empId: request[1],
          startDate: request[2],
          endDate: request[3],
          days: request[4],
          leaveType: request[5],
          reason: request[6],
          status: request[7],
          submitDate: request[8],
        });
      }
    }

    console.log("✅ 승인된 연차 신청:", approvedRequests.length + "건");
    console.log("📋 승인된 연차 목록:", approvedRequests);

    // 특정 직원의 연차 데이터 확인
    const testEmpId = "1001";
    const empRequests = approvedRequests.filter(
      (req) => req.empId.toString() === testEmpId
    );
    console.log(`👤 직원 ${testEmpId}의 승인된 연차:`, empRequests);

    return {
      totalRequests: data.length - 1,
      approvedRequests: approvedRequests.length,
      testEmpRequests: empRequests.length,
      sampleData: approvedRequests.slice(0, 3), // 처음 3개만 샘플로
    };
  } catch (error) {
    console.error("❌ 연차 데이터 확인 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 근무표 계산 로직 테스트 (새로운 버전)
 */
function testWorkScheduleCalculationNew() {
  try {
    console.log("🧪 근무표 계산 로직 테스트 시작");

    const testEmpId = "1001";
    const testYear = 2025;
    const testMonth = 7;

    console.log(
      `📊 테스트 조건: 직원 ${testEmpId}, ${testYear}년 ${testMonth}월`
    );

    // 1. 발생 연차 계산
    const earnedLeaves = calculateEarnedLeaves(testEmpId, testYear, testMonth);
    console.log("1. 발생 연차:", earnedLeaves);

    // 2. 이전 달까지 사용한 연차
    let prevYear = testYear;
    let prevMonth = testMonth - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = testYear - 1;
    }
    const usedUntilPreviousMonth = getUsedLeavesUntilMonth(
      testEmpId,
      prevYear,
      prevMonth
    );
    console.log("2. 이전 달까지 사용한 연차:", usedUntilPreviousMonth);

    // 3. 발생 잔여 (발생 - 이전 달까지 사용)
    const earnedRemaining = Math.max(0, earnedLeaves - usedUntilPreviousMonth);
    console.log("3. 발생 잔여:", earnedRemaining);

    // 4. 해당 월 사용 연차 (새로운 계산법)
    const monthlyUsage = getMonthlyUsedLeaves(testEmpId, testYear, testMonth);
    console.log("4. 해당 월 사용 연차:", monthlyUsage);

    // 5. 최종 잔여 (발생 잔여 - 해당 월 사용)
    const finalRemaining = Math.max(
      0,
      earnedRemaining - monthlyUsage.totalUsed
    );
    console.log("5. 최종 잔여:", finalRemaining);

    // 6. 근무표에 표시될 데이터
    const workScheduleData = {
      발생: earnedRemaining,
      사용_Y: monthlyUsage.fullDays,
      사용_Y2: monthlyUsage.halfDays,
      잔여: finalRemaining,
    };

    console.log("📋 근무표에 표시될 데이터:", workScheduleData);

    // 7. 계산 검증
    const verification = {
      계산식: `${earnedRemaining} - (${monthlyUsage.fullDays} + ${monthlyUsage.halfDays}) = ${finalRemaining}`,
      검증결과:
        Math.abs(
          finalRemaining -
            (earnedRemaining - (monthlyUsage.fullDays + monthlyUsage.halfDays))
        ) < 0.01
          ? "✅ 정확"
          : "❌ 오류",
    };

    console.log("🔍 계산 검증:", verification);

    return {
      empId: testEmpId,
      year: testYear,
      month: testMonth,
      earnedLeaves: earnedLeaves,
      usedUntilPreviousMonth: usedUntilPreviousMonth,
      earnedRemaining: earnedRemaining,
      monthlyUsage: monthlyUsage,
      finalRemaining: finalRemaining,
      workScheduleData: workScheduleData,
      verification: verification,
    };
  } catch (error) {
    console.error("❌ 근무표 계산 로직 테스트 오류:", error);
    return { error: error.message };
  }
}

/**
 * 🧪 근무표 생성 및 데이터 확인 테스트
 */
function testWorkScheduleWithData() {
  try {
    console.log("🧪 근무표 생성 및 데이터 확인 테스트 시작");

    // 1. 연차 데이터 확인
    console.log("📊 1단계: 연차 데이터 확인");
    const leaveData = checkLeaveRequestsData();
    console.log("연차 데이터 결과:", leaveData);

    // 2. 계산 로직 테스트
    console.log("📊 2단계: 계산 로직 테스트");
    const calculationResult = testWorkScheduleCalculationNew();
    console.log("계산 결과:", calculationResult);

    // 3. 근무표 생성
    console.log("📊 3단계: 근무표 생성");
    const createResult = createWorkScheduleSheet("10", 2025, 7); // 개발팀, 2025년 7월
    console.log("근무표 생성 결과:", createResult);

    // 4. 생성된 근무표 데이터 확인
    console.log("📊 4단계: 생성된 근무표 데이터 확인");
    const workScheduleData = getWorkScheduleData("10", 2025, 7);
    console.log("근무표 데이터:", workScheduleData);

    return {
      leaveData: leaveData,
      calculationResult: calculationResult,
      createResult: createResult,
      workScheduleData: workScheduleData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ 근무표 생성 및 데이터 확인 테스트 오류:", error);
    return { error: error.message };
  }
}
