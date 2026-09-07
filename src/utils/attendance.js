import {
    currentMonthPrefix,
    getCurrentWeekDates,
    dayLabel,
    parseTimeToMinutes,
    formatTimestamp,
    todayISO,
} from "./time";
import config from "../data/dashboard.json";

const { company } = config;

function countWorkingDays(yearMonthPrefix) {
    const [year, month] = yearMonthPrefix.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(year, month - 1, d).getDay(); 
        if (dow !== 0 && dow !== 6) count++;
    }
    return count;
}

export function computeStats(records, employeeId) {
    const prefix = currentMonthPrefix();
    const month  = records.filter(r =>
        r.date.startsWith(prefix) &&
        (employeeId == null || r.employeeId === employeeId)
    );

    return {
        presentDays     : month.filter(r => r.status === "Present" || r.status === "Late").length,
        lateDays        : month.filter(r => r.isLate).length,
        halfDays        : month.filter(r => r.status === "Half Day"    && !r.isLate).length,
        earlyLeaveDays  : month.filter(r => r.status === "Early Leave" && !r.isLate).length,
        totalWorkingDays: countWorkingDays(prefix),
    };
}

export function computeWeeklyHours(records, employeeId) {
    const weekDates = getCurrentWeekDates();
    return weekDates.map(date => {
        const rec = records.find(r =>
            r.date === date &&
            (employeeId == null || r.employeeId === employeeId)
        );
        const totalHours = rec
            ? parseFloat((rec.workedHours + (rec.breakMinutes ?? 0) / 60).toFixed(1))
            : 0;
        return {
            day  : dayLabel(date),
            hours: totalHours,
            date,
        };
    });
}

function determineStatus(clockInMs, workedHours) {
    const ci        = new Date(clockInMs);
    const ciMinutes = ci.getHours() * 60 + ci.getMinutes();
    const officeMin = parseTimeToMinutes(company.officeStartTime);
    const lateMin   = officeMin + company.lateThresholdMinutes;
    const isLate    = ciMinutes > lateMin;

    if (workedHours >= company.minHoursFullDay) {
        return isLate ? "Late" : "Present";
    }
    if (workedHours >= company.minHoursHalfDay) {
        return "Early Leave";
    }
    return "Half Day";
}

export function buildRecord(clockInMs, clockOutMs, employee, breakSec = 0) {
    const rawSec      = Math.max(0, Math.floor((clockOutMs - clockInMs) / 1000));
    const workedSec   = Math.max(0, rawSec - breakSec);
    const workedHours = parseFloat((workedSec / 3600).toFixed(2));
    const breakMinutes = Math.round(breakSec / 60);

    const ci  = new Date(clockInMs);
    const pad = n => String(n).padStart(2, "0");
    const date = `${ci.getFullYear()}-${pad(ci.getMonth() + 1)}-${pad(ci.getDate())}`;

    return {
        id           : `att_${clockInMs}`,
        employeeId   : employee.id,
        employee     : employee.name,
        date,
        clockIn      : formatTimestamp(clockInMs),
        clockOut     : formatTimestamp(clockOutMs),
        clockInMs,
        clockOutMs,
        breakMinutes,
        workedSeconds: workedSec,
        workedHours,
        status       : determineStatus(clockInMs, workedHours),
    };
}

export function hasTodayRecord(records, employeeId) {
    const today = todayISO();
    return records.some(r => r.date === today && r.employeeId === employeeId);
}
