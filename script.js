const rooms = ['琴房 A', '琴房 B', '琴房 C', '琴房 D', '琴房 E', '琴房 F'];
const timeslots = [
    '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
    '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00',
    '15:00 - 16:00', '16:00 - 17:00', '17:00 - 18:00'
];



let currentRole = 'student';
const currentTeacherName = '楊老師';
let curRoom = 0;
let activeFilter = 'all';

let currentDate = new Date();
let weekOffset = 0;

// 隨時可多選的暫存格子 key 陣列
let selectedBatchCells = [];

// 取得指定日期所在週的星期一 Date 物件
function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

// 取得日期對應的 ISO 週號
function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// 透過 weekNum 與 dIdx 反推真實日期物件
function getCellRealDate(weekNum, dIdx) {
    const simpleYear = currentDate.getFullYear();
    const simpleDate = new Date(simpleYear, 0, 1);
    const dayOfWeek = simpleDate.getDay() || 7;

    let daysOffset = (weekNum - 1) * 7 + (dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek);
    const targetMonday = new Date(simpleYear, 0, 1);
    targetMonday.setDate(simpleDate.getDate() + daysOffset - 1);

    const cellDate = new Date(targetMonday);
    cellDate.setDate(targetMonday.getDate() + dIdx + 1);
    return cellDate;
}

let scheduleData = {
    '0-46-1-2': { status: 'booked', user: '張教授', reason: '聲樂個別課' },
    '0-46-5-3': { status: 'booked', user: '李老師', reason: '鋼琴陪練' },
    '0-46-6-0': { status: 'booked', user: '陳老師', reason: '鋼琴教學' },
    '0-46-1-6': { status: 'booked', user: '張教授', reason: '聲樂個別課' },
    '0-46-3-4': { status: 'booked', user: '李老師', reason: '鋼琴陪練' },
    '0-46-6-5': { status: 'booked', user: '陳老師', reason: '鋼琴教學' },
    '0-46-4-6': { status: 'booked', user: '楊老師', reason: '聲樂教學' },
    '0-46-4-2': { status: 'booked', user: '楊老師', reason: '聲樂教學' },
    '0-46-0-1': { status: 'maintain', user: '系統', reason: '定期調音維護' },
    '0-46-1-1': { status: 'maintain', user: '系統', reason: '定期調音維護' },
    '0-46-2-1': { status: 'maintain', user: '系統', reason: '定期調音維護' },
    '0-46-3-1': { status: 'maintain', user: '系統', reason: '定期調音維護' },
    '0-47-1-1': { status: 'booked', user: '張教授', reason: '聲樂個別課' },
    '0-47-3-3': { status: 'booked', user: '李老師', reason: '鋼琴陪練' },
    '0-47-6-2': { status: 'booked', user: '陳老師', reason: '鋼琴教學' },
    '0-47-7-5': { status: 'booked', user: '楊老師', reason: '聲樂教學' },
    '0-47-0-6': { status: 'booked', user: '楊老師', reason: '聲樂教學' },
    '0-47-1-6': { status: 'booked', user: '楊老師', reason: '聲樂教學' },
    '0-47-5-4': { status: 'maintain', user: '系統', reason: '定期調音維護' },
    '0-47-6-4': { status: 'maintain', user: '系統', reason: '定期調音維護' },
    '0-47-7-4': { status: 'maintain', user: '系統', reason: '定期調音維護' },
    '0-47-8-4': { status: 'maintain', user: '系統', reason: '定期調音維護' }
};

// 每週固定關閉時段設定範例
let weeklyClosedRules = [
    { id: 1, room: '琴房 B', dayOfWeek: 3, startTime: '13:00', endTime: '18:00', status: '關閉' } // dayOfWeek: 3 代表週三
];

let userData = [
    { id: 1, name: '張教授', email: 'chang@music.edu', role: '教師', status: '啟用' },
    { id: 2, name: '李老師', email: 'lee@music.edu', role: '教師', status: '啟用' },
    { id: 3, name: '楊老師', email: 'yang@music.edu', role: '教師', status: '啟用' },
    { id: 4, name: '系統管理員', email: 'admin@music.edu', role: '管理者', status: '啟用' }
];

let targetCell = null;

document.addEventListener('DOMContentLoaded', () => {
    currentRole = document.body.getAttribute('data-role') || 'student';
    renderRooms();
    renderSchedule();
    renderTeacherHistory();

    // 綁定旁邊的「確定預約」按鈕點擊事件
    const confirmBtn = document.querySelector('.confirm-reservation-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleConfirmReservationClick);
    }

    // 【新增】綁定旁邊的「關閉時段」按鈕點擊事件
    const closeSlotBtn = document.querySelector('.close-slot-btn');
    if (closeSlotBtn) {
        closeSlotBtn.addEventListener('click', handleBatchCloseSlots);
    }

    if (document.getElementById('time-list')) renderTimeTable();
    if (document.getElementById('user-list')) renderUserTable();
    if (document.getElementById('weekly-close-list')) renderWeeklyCloseTable();
});

function renderRooms() {
    const box = document.getElementById('room-tabs');
    if (!box) return;
    box.innerHTML = rooms.map((r, i) => `
        <button class="tab-item ${i === curRoom ? 'active' : ''}" onclick="setRoom(${i})">${r}</button>
    `).join('');
}

function setRoom(index) {
    curRoom = index;
    renderRooms();
    renderSchedule();
}

function changeWeek(delta) {
    weekOffset += delta;
    renderSchedule();
}

function filterStatus(status) {
    activeFilter = status;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderSchedule();
}

// -------------------------------------------------------------
// 側邊「確定預約」按鈕點擊處理邏輯
// -------------------------------------------------------------
function handleConfirmReservationClick() {
    if (currentRole !== 'teacher' && currentRole !== 'admin') {
        alert('【權限提示】目前為學生模式，無預約權限。');
        return;
    }

    if (selectedBatchCells.length === 0) {
        alert('請先在課表中點擊選擇要預約的時段（可單選或多選）！');
        return;
    }

    const modal = document.getElementById('modal-booking');
    const title = document.getElementById('modal-title');
    const info = document.getElementById('modal-info');
    const btn = document.getElementById('modal-action-btn');
    const userInput = document.getElementById('book-user');
    const reasonInput = document.getElementById('book-reason');
    const formGroupUser = userInput ? userInput.closest('.form-group') : null;
    const formGroupReason = reasonInput ? reasonInput.closest('.form-group') : null;

    if (!modal || !btn) return;

    modal.classList.add('active');

    const weekDaysChinese = ['(日)', '(一)', '(二)', '(三)', '(四)', '(五)', '(六)'];

    // 建立或取得管理者專用的教師下拉選單容器（不破壞原本的 formGroupUser）
    let adminTeacherGroup = document.getElementById('modal-batch-admin-teacher-group');
    if (!adminTeacherGroup && formGroupReason) {
        adminTeacherGroup = document.createElement('div');
        adminTeacherGroup.id = 'modal-batch-admin-teacher-group';
        adminTeacherGroup.className = 'form-group';
        formGroupReason.parentNode.insertBefore(adminTeacherGroup, formGroupReason);
    }

    if (currentRole === 'admin') {
        if (formGroupUser) formGroupUser.style.display = 'none';
        if (adminTeacherGroup) {
            adminTeacherGroup.style.display = 'block';
            const teachers = userData.filter(u => u.role === '教師' && u.status === '啟用');
            const teacherOptions = teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
            adminTeacherGroup.innerHTML = `
                <label style="display: block; font-size: 0.85rem; margin-bottom: 5px; color: var(--text-muted);">預約教師姓名：</label>
                <select id="batch-book-teacher-select" class="input">
                    ${teacherOptions}
                </select>
            `;
        }
    } else {
        if (adminTeacherGroup) adminTeacherGroup.style.display = 'none';
        if (formGroupUser) formGroupUser.style.display = 'none';
        if (userInput) userInput.value = currentTeacherName;
    }

    if (formGroupReason) formGroupReason.style.display = 'block';
    if (reasonInput) reasonInput.value = '聲樂課';

    // 內部渲染時段清單與重複選項的函式
    function renderBatchModalContent() {
        if (selectedBatchCells.length === 0) {
            closeModal('modal-booking');
            renderSchedule();
            return;
        }

        title.innerText = '琴房預約操作';

        let listHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: bold; color: var(--text-main);">已選取時段清單：</span>
                <button type="button" onclick="continueSelectingSlots()" title="返回課表繼續加選時段" 
                    style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; border: 1px solid #C8B49E; background-color: #F3EAE0; color: #5A4A3B; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        `;
        listHtml += `<div style="max-height: 130px; overflow-y: auto; border: 1px solid #E6D5C3; padding: 6px; border-radius: 6px; background: #FAF6F0; margin-bottom: 10px;">`;

        selectedBatchCells.forEach((cellKey, index) => {
            const parts = cellKey.split('-');
            const roomIdx = parseInt(parts[0]);
            const weekNum = parseInt(parts[1]);
            const tIdx = parseInt(parts[2]);
            const dIdx = parseInt(parts[3]);

            const cellDate = getCellRealDate(weekNum, dIdx);
            const dateStr = `${cellDate.getFullYear()}/${String(cellDate.getMonth() + 1).padStart(2, '0')}/${String(cellDate.getDate()).padStart(2, '0')}${weekDaysChinese[cellDate.getDay()]}`;
            const timeStr = timeslots[tIdx];

            listHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid #EAE0D0; font-size: 0.85rem;">
                    <span> ${rooms[roomIdx]}｜${dateStr} ${timeStr}</span>
                    <button type="button" onclick="removeBatchCellByIndex(${index})" title="刪除此時段" style="background: none; border: none; color: #b54545; cursor: pointer; padding: 2px 6px;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        });
        listHtml += `</div>`;

        let repeatHtml = `
            <div id="repeat-group" style="margin-top: 10px;">
                <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 4px; color: var(--text-main);">重複預約頻率：</label>
                <select id="repeat-select" style="width: 100%; padding: 6px; border: 1px solid #D4BCA5; border-radius: 4px; background: #fff; font-size: 0.9rem;">
                    <option value="none" selected>不重複</option>
                    <option value="daily">每天 (連續 7 天)</option>
                    <option value="weekly">每週 (連續 4 週)</option>
                    <option value="monthly">每月 (連續 3 個月)</option>
                </select>
            </div>
        `;

        info.innerHTML = listHtml + repeatHtml;
    }

    renderBatchModalContent();

    btn.innerText = '確認提交預約';
    btn.className = 'btn btn-dark';

    // 綁定提交按鈕事件（保留完整重複展開與衝突偵測邏輯）
    btn.onclick = function(e) {
        e.preventDefault(); // 防止預設表單提交行為
        
        const selectedTeacher = (currentRole === 'admin') 
            ? (document.getElementById('batch-book-teacher-select')?.value || currentTeacherName)
            : currentTeacherName;
        const reason = (reasonInput && reasonInput.value.trim()) ? reasonInput.value.trim() : '個人練習';
        const repeatType = document.getElementById('repeat-select')?.value || 'none';

        let targetSlotsToBook = [];

        selectedBatchCells.forEach(cellKey => {
            const parts = cellKey.split('-');
            const roomIdx = parseInt(parts[0]);
            let baseWeekNum = parseInt(parts[1]);
            const tIdx = parseInt(parts[2]);
            const baseDIdx = parseInt(parts[3]);

            const baseDate = getCellRealDate(baseWeekNum, baseDIdx);

            let repeatCount = 1;
            let stepDays = 0;
            let stepWeeks = 0;
            let stepMonths = 0;

            if (repeatType === 'daily') {
                repeatCount = 7;
                stepDays = 1;
            } else if (repeatType === 'weekly') {
                repeatCount = 4;
                stepWeeks = 1;
            } else if (repeatType === 'monthly') {
                repeatCount = 3;
                stepMonths = 1;
            }

            for (let i = 0; i < repeatCount; i++) {
                let targetDate = new Date(baseDate);
                if (stepDays > 0) targetDate.setDate(baseDate.getDate() + (i * stepDays));
                if (stepWeeks > 0) targetDate.setDate(baseDate.getDate() + (i * 7 * stepWeeks));
                if (stepMonths > 0) targetDate.setMonth(baseDate.getMonth() + (i * stepMonths));

                const targetWeekNum = getWeekNumber(targetDate);
                let targetDayOfWeek = targetDate.getDay();
                let targetDIdx = targetDayOfWeek === 0 ? 6 : targetDayOfWeek - 1;

                const targetKey = `${roomIdx}-${targetWeekNum}-${tIdx}-${targetDIdx}`;
                const dateFormatted = `${targetDate.getFullYear()}/${String(targetDate.getMonth() + 1).padStart(2, '0')}/${String(targetDate.getDate()).padStart(2, '0')}${weekDaysChinese[targetDate.getDay()]}`;

                targetSlotsToBook.push({
                    key: targetKey,
                    roomIdx,
                    weekNum: targetWeekNum,
                    tIdx,
                    dIdx: targetDIdx,
                    dateTimeDesc: `${dateFormatted} ${timeslots[tIdx]}`
                });
            }
        });

        // 檢查衝突
        let conflictedSlots = targetSlotsToBook.filter(slot => {
            const existing = scheduleData[slot.key];
            return existing && existing.status !== 'free';
        });

        if (conflictedSlots.length > 0) {
            let conflictMsg = `以下時段已被預約或維護中，發生衝突：\n`;
            conflictedSlots.forEach(s => {
                conflictMsg += `- ${rooms[s.roomIdx]} ${s.dateTimeDesc}\n`;
            });
            conflictMsg += `\n請選擇處理方式：\n【確定】跳過衝突時段，僅預約其他可用時段\n【取消】重新修改時間`;

            const userChoice = confirm(conflictMsg);
            if (!userChoice) {
                return;
            } else {
                targetSlotsToBook = targetSlotsToBook.filter(slot => {
                    const existing = scheduleData[slot.key];
                    return !existing || existing.status === 'free';
                });
            }
        }

        if (targetSlotsToBook.length === 0) {
            alert('沒有任何可預約的有效時段！');
            return;
        }

        // 正式寫入資料
        targetSlotsToBook.forEach(slot => {
            scheduleData[slot.key] = {
                status: 'booked',
                user: selectedTeacher,
                reason: reason
            };
        });

        alert(`成功完成 ${targetSlotsToBook.length} 個時段的預約！`);
        closeModal('modal-booking');
        
        selectedBatchCells = []; 
        renderSchedule();
        renderTeacherHistory();

        btn.onclick = submitBooking;
    };
}

// -------------------------------------------------------------
// 側邊「關閉時段」按鈕點擊處理邏輯（批次將多選格子設為維護中）
// -------------------------------------------------------------
function handleBatchCloseSlots() {
    // 1. 權限檢查：只有管理者才能執行
    if (currentRole !== 'admin') {
        alert('【權限限制】您沒有權限關閉預約權限！此操作僅限系統管理者執行。');
        return;
    }

    // 2. 檢查是否有選取格子
    if (selectedBatchCells.length === 0) {
        alert('請先在課表中點擊選擇要關閉維護的時段（可單選或多選）！');
        return;
    }

    // 3. 彈出確認視窗
    if (confirm(`確定要將選取的 ${selectedBatchCells.length} 個時段關閉預約權限嗎？（將設為維護中狀態）`)) {
        // 4. 迴圈將所有選取的格子設為 maintain 狀態
        selectedBatchCells.forEach(cellKey => {
            const parts = cellKey.split('-'); // [roomIdx, weekNum, tIdx, dIdx]
            const roomIdx = parseInt(parts[0]);
            const weekNum = parseInt(parts[1]);
            const tIdx = parseInt(parts[2]);
            const dIdx = parseInt(parts[3]);

            const key = `${roomIdx}-${weekNum}-${tIdx}-${dIdx}`;
            scheduleData[key] = { 
                status: 'maintain', 
                user: '系統', 
                reason: '管理者手動關閉' 
            };
        });

        alert(`已成功將選取的 ${selectedBatchCells.length} 個時段關閉預約權限！`);
        
        selectedBatchCells = []; // 清空暫存選取
        renderSchedule();        // 重新渲染課表
        renderTeacherHistory();  // 更新歷史或相關面板
    }
}

// 彈窗內點擊刪除單一時段的輔助函式
function removeBatchCellByIndex(index) {
    selectedBatchCells.splice(index, 1); // 從暫存陣列移除該時段
    renderSchedule(); // 同步更新課表上的勾選狀態

    if (selectedBatchCells.length === 0) {
        alert('已清除所有選取時段');
        closeModal('modal-booking');
    } else {
        // 重新整理彈窗內的清單
        handleConfirmReservationClick();
    }
}

// 點擊彈窗內的「+」按鈕：關閉彈窗並自動捲動至課表，保留已選格子繼續加選
function continueSelectingSlots() {
    closeModal('modal-booking');
    
    // 還原按鈕預設事件，避免影響後續單格操作
    const btn = document.getElementById('modal-action-btn');
    if (btn) btn.onclick = submitBooking;

    // 平滑捲動到課表位置，方便直接繼續點選
    const scheduleTable = document.querySelector('.schedule-table');
    if (scheduleTable) {
        scheduleTable.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// -------------------------------------------------------------
// 渲染琴房一覽表課表（支援跨時段合併顯示與隨時多選勾選外框）
// -------------------------------------------------------------
function renderSchedule() {
    const body = document.getElementById('schedule-body');
    const tableHeader = document.querySelector('.schedule-table thead');
    const weekDisplay = document.getElementById('week-display');
    if (!body) return;

    const today = new Date();
    const baseMonday = getMonday(currentDate);
    const targetMonday = new Date(baseMonday);
    targetMonday.setDate(targetMonday.getDate() + (weekOffset * 7));

    const weekDaysStr = ['(一)', '(二)', '(三)', '(四)', '(五)', '(六)', '(日)'];
    const weekDates = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(targetMonday);
        d.setDate(d.getDate() + i);
        weekDates.push(d);
    }

    const sunday = weekDates[6];
    const weekNum = getWeekNumber(targetMonday);
    if (weekDisplay) {
        weekDisplay.innerText = `${targetMonday.getFullYear()}年${targetMonday.getMonth() + 1}月${targetMonday.getDate()}日 - ${sunday.getFullYear()}年${sunday.getMonth() + 1}月${sunday.getDate()}日 (第 ${weekNum} 週)`;
    }

    if (tableHeader) {
        let thHtml = '<tr><th>時段 / 日期</th>';
        weekDates.forEach((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            const dateStr = `${d.getMonth() + 1}/${d.getDate()}${weekDaysStr[i]}`;
            thHtml += `<th class="${isToday ? 'today-header' : ''}">
                ${dateStr} ${isToday ? '<span class="today-tag">今日</span>' : ''}
            </th>`;
        });
        thHtml += '</tr>';
        tableHeader.innerHTML = thHtml;
    }

    body.innerHTML = '';

    let skipMap = {};
    for (let dIdx = 0; dIdx < 7; dIdx++) {
        let tIdx = 0;
        while (tIdx < timeslots.length) {
            const key = `${curRoom}-${weekNum}-${tIdx}-${dIdx}`;
            const data = scheduleData[key];

            if (data && data.status === 'booked') {
                let streak = 1;
                while (tIdx + streak < timeslots.length) {
                    const nextKey = `${curRoom}-${weekNum}-${tIdx + streak}-${dIdx}`;
                    const nextData = scheduleData[nextKey];
                    if (nextData && nextData.status === 'booked' && nextData.user === data.user && nextData.reason === data.reason) {
                        streak++;
                    } else {
                        break;
                    }
                }
                if (streak > 1) {
                    skipMap[`${tIdx}-${dIdx}`] = streak;
                    for (let s = 1; s < streak; s++) {
                        skipMap[`${tIdx + s}-${dIdx}`] = 'skip';
                    }
                    tIdx += streak;
                    continue;
                }
            }
            tIdx++;
        }
    }

    timeslots.forEach((time, tIdx) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${time}</strong></td>`;

        const endTimeStr = time.split(' - ')[1];
        const [endHour, endMinute] = endTimeStr.split(':').map(Number);

        for (let dIdx = 0; dIdx < 7; dIdx++) {
            const skipStatus = skipMap[`${tIdx}-${dIdx}`];
            if (skipStatus === 'skip') {
                continue;
            }

            const cellDate = new Date(weekDates[dIdx]);
            cellDate.setHours(endHour, endMinute, 0, 0);

            // 【修改這裡】取得該時段的「開始時間」（例如 14:00 - 15:00 取出 14:00）
            const startTimeStr = timeslots[tIdx].split(' - ')[0];
            const [startH, startM] = startTimeStr.split(':').map(Number);
            
            const cellStartDate = new Date(weekDates[dIdx]);
            cellStartDate.setHours(startH, startM, 0, 0); // 設為開始時間 (14:00)

            const isToday = weekDates[dIdx].toDateString() === today.toDateString();
            
            // 只要當前時間大於或等於該時段的「開始時間」，就視為已過期！
            const isPastTime = cellStartDate < today;

            const key = `${curRoom}-${weekNum}-${tIdx}-${dIdx}`;
            const data = scheduleData[key] || { status: 'free' };
            const roomName = rooms[curRoom];
            const dayOfWeek = cellDate.getDay(); // 0(日) ~ 6(六)
            const timeSlotStr = timeslots[tIdx]; // 例如 "13:00 - 14:00"
            const slotStartHourStr = timeSlotStr.split(' - ')[0]; // "13:00"

            let isWeeklyClosed = false;
            weeklyClosedRules.forEach(rule => {
                if (rule.status === '關閉' && rule.room === roomName && rule.dayOfWeek === dayOfWeek) {
                    // 比對該時段是否落在規則的開始與結束時間之間
                    if (slotStartHourStr >= rule.startTime && slotStartHourStr < rule.endTime) {
                        isWeeklyClosed = true;
                    }
                }
            });

            let text = '可預約';
            let cellClass = 'cell-free';
            const isSelectedInBatch = selectedBatchCells.includes(key);

            if (isWeeklyClosed) {
                text = '維護中'; // 或顯示 "關閉"
                cellClass = 'cell-maintain';
            } else if (isPastTime) {
                const isMyBooking = (currentRole === 'teacher' && data.status === 'booked' && data.user === currentTeacherName);
                if (isMyBooking) {
                    text = `您的預約<br><small style="color:var(--text-muted);">(已結束)</small>`;
                    cellClass = 'cell-booked cell-my-booked';
                } else {
                    if (data.status === 'booked') {
                        text = `${data.user}<br><small>(已結束)</small>`;
                        cellClass = 'cell-booked';
                    } else if (data.status === 'maintain') {
                        text = '維護中';
                        cellClass = 'cell-maintain';
                    } else {
                        text = '----';
                        cellClass = 'cell-past';
                    }
                }
            } else {
                if (data.status === 'booked') {
                    cellClass = 'cell-booked';
                    if (currentRole === 'student') {
                        text = `${data.user}`;
                    } else if (currentRole === 'teacher') {
                        if (data.user === currentTeacherName) {
                            let displayTimeStr = timeslots[tIdx];
                            if (typeof skipStatus === 'number' && skipStatus > 1) {
                                const startH = timeslots[tIdx].split(' - ')[0];
                                const endH = timeslots[tIdx + skipStatus - 1].split(' - ')[1];
                                displayTimeStr = `${startH} - ${endH}`;
                            }
                            text = `您已預約<br><small>(${data.reason})</small>`;
                            cellClass = 'cell-booked cell-my-booked';
                        } else {
                            text = `${data.user}`;
                        }
                    } else {
                        text = `${data.user}<br><small>(${data.reason})</small>`;
                    }
                } else if (data.status === 'maintain') {
                    text = '維護中';
                    cellClass = 'cell-maintain';
                }
            }

            let isHide = (activeFilter !== 'all' && activeFilter !== data.status);
            const todayClass = isToday ? 'cell-today' : '';

            let batchStyle = '';
            if (isSelectedInBatch) {
                cellClass += ' cell-batch-selected';
                batchStyle = 'background-color: rgba(206, 177, 151, 0.6) !important; border: 2px dashed #5A4A3B !important; font-weight: bold;';
            }

            let rowSpanAttr = (typeof skipStatus === 'number' && skipStatus > 1) ? `rowspan="${skipStatus}"` : '';

            const isPast = isPastTime; 
            const isMaintain = (data.status === 'maintain');
            const isBooked = (data.status === 'booked');
            const isFree = (data.status === 'free');

            // 組合專屬的 CSS 類別
            let stateClass = isPast ? 'cell-is-past' : 'cell-is-future';
            if (isMaintain) stateClass += ' cell-is-maintain';
            if (isBooked) stateClass += ' cell-is-booked';
            if (isFree && isPast) stateClass += ' cell-is-past-free'; // 專門給過期的 ---- (cell-past)

            let cellDisplayContent = isSelectedInBatch 
                ? '<i class="fa-solid fa-check" style="margin-right:4px;"></i>已選取' 
                : text;

            tr.innerHTML += `
                <td ${rowSpanAttr} class="cell ${cellClass} ${todayClass} ${stateClass}" style="${isHide ? 'opacity:0.2;' : ''} ${batchStyle}" onclick="handleCellClick('${key}')">
                    ${cellDisplayContent}
                </td>
            `;
        }
        body.appendChild(tr);
    });
    // 控制批次按鈕（確定預約、關閉時段）的顯示與隱藏
    const confirmBtn = document.querySelector('.confirm-reservation-btn');
    const closeSlotBtn = document.querySelector('.close-slot-btn'); // 確保您的關閉時段按鈕有這個 class
    
    const hasSelected = selectedBatchCells.length > 0;
    
    if (confirmBtn) {
        confirmBtn.style.display = hasSelected ? 'inline-flex' : 'none'; // 改用 inline-flex 保持按鈕內部的對齊與排版
    }
    if (closeSlotBtn) {
        closeSlotBtn.style.display = hasSelected ? 'inline-flex' : 'none';
    }
}

// 點擊格子總入口（隨時可點擊多個空白格子進行複選）
function handleCellClick(key) {
    const parts = key.split('-');
    const roomIdx = parseInt(parts[0]);
    const weekNum = parseInt(parts[1]);
    const tIdx = parseInt(parts[2]);
    const dIdx = parseInt(parts[3]);

    const cellDate = getCellRealDate(weekNum, dIdx);

    // 【共用檢查】是否為每週關閉時段
    const closedRule = checkIsWeeklyClosed(roomIdx, cellDate, tIdx);
    if (closedRule) {
        if (currentRole === 'admin') {
            alert('【提示】此時段為「每週固定關閉時段」，若需開放請至下方「系統管理區 > 每週關閉時段設定」進行調整。');
        } else {
            alert('【權限限制】此時段為固定關閉維護時段，無法預約！');
        }
        return;
    }

    const data = scheduleData[key] || { status: 'free' };
    if (currentRole === 'student') {
        alert('【提示】目前為學生/訪客模式，無預約權限。請點擊右上角「教師入口」或「管理者入口」。');
        return;
    }

    if (data.status === 'free') {
        // ... 後續原本的空白格子點擊邏輯保持不變
        const startTimeStr = timeslots[tIdx].split(' - ')[0];
        const [startHour, startMinute] = startTimeStr.split(':').map(Number);
        cellDate.setHours(startHour, startMinute, 0, 0);

        const today = new Date();
        if (cellDate < today) {
            alert('【提示】此時段已過期（今天以前或今日已結束），無法進行預約或修改。');
            return;
        }

        const index = selectedBatchCells.indexOf(key);
        if (index > -1) {
            selectedBatchCells.splice(index, 1);
        } else {
            selectedBatchCells.push(key);
        }
        renderSchedule();
        return;
    }

    clickCell(key);
}

// 檢查指定日期與時段是否被每週固定關閉規則涵蓋
function checkIsWeeklyClosed(roomIdx, cellDate, tIdx) {
    const roomName = rooms[roomIdx];
    const dayOfWeek = cellDate.getDay(); // 0(日) ~ 6(六)
    const slotStartHourStr = timeslots[tIdx].split(' - ')[0];

    let matchedRule = null;
    weeklyClosedRules.forEach(rule => {
        if (rule.status === '關閉' && rule.room === roomName && rule.dayOfWeek === dayOfWeek) {
            if (slotStartHourStr >= rule.startTime && slotStartHourStr < rule.endTime) {
                matchedRule = rule;
            }
        }
    });
    return matchedRule;
}

// 點擊時段邏輯 (一般彈窗檢視/修改)
function clickCell(key) {
    const parts = key.split('-');
    const weekNum = parseInt(parts[1]);
    const tIdx = parseInt(parts[2]);
    const dIdx = parseInt(parts[3]);

    const cellDate = getCellRealDate(weekNum, dIdx);

    // 【共用檢查】是否為每週關閉時段
    const closedRule = checkIsWeeklyClosed(parseInt(parts[0]), cellDate, tIdx);
    if (closedRule) {
        if (currentRole === 'admin') {
            alert('【提示】此時段為「每週固定關閉時段」，若需開放請至下方「系統管理區 > 每週關閉時段設定」進行調整。');
        } else {
            alert('【權限限制】此時段為固定關閉維護時段，無法預約！');
        }
        return;
    }

    const startTimeStr = timeslots[tIdx].split(' - ')[0];
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    cellDate.setHours(startHour, startMinute, 0, 0);

    const today = new Date();
    // 使用開始時間判斷是否過期
    const cellStartDate = new Date(getCellRealDate(weekNum, dIdx));
    cellStartDate.setHours(startHour, startMinute, 0, 0);

    if (cellStartDate < today) {
        alert('【提示】此時段已過期（今天以前或今日已結束），無法進行預約或修改。');
        return;
    }

    if (currentRole === 'student') {
        alert('【提示】目前為學生/訪客模式，無預約權限。請點擊右上角「教師入口」或「管理者入口」。');
        return;
    }

    targetCell = key;
    const data = scheduleData[key] || { status: 'free' };
    if (data.status === 'maintain' && currentRole !== 'admin') {
        alert('【權限限制】此時段為「維護中」，您沒有權限進行檢視或解除！');
        return; 
    }
    const modal = document.getElementById('modal-booking');
    const title = document.getElementById('modal-title');
    const info = document.getElementById('modal-info');
    const btn = document.getElementById('modal-action-btn');
    const userInput = document.getElementById('book-user');
    const reasonInput = document.getElementById('book-reason');
    
    // 安全防呆，避免找不到元素時報錯
    const formGroupUser = userInput ? userInput.closest('.form-group') : null;
    const formGroupReason = reasonInput ? reasonInput.closest('.form-group') : null;

    if (currentRole === 'teacher' && data.status === 'booked' && data.user !== currentTeacherName) {
        alert(`【權限限制】此時段為「${data.user}」所預約，您（${currentTeacherName}）無法進行刪除或修改。`);
        return;
    }

    if (!modal) return;
    modal.classList.add('active');

    const existingHeaderBtn = document.getElementById('modal-header-close-btn');
    if (existingHeaderBtn) existingHeaderBtn.remove();

    if (data.status === 'free') {
        title.innerText = '新增琴房預約';
        info.innerText = `預約琴房：${rooms[curRoom]}`;
        info.innerHTML += `<br>預約日期：${cellDate.getFullYear()}-${cellDate.getMonth() + 1}-${cellDate.getDate()}<br>預約時段：${timeslots[tIdx]}`;

        if (formGroupUser) formGroupUser.style.display = 'block';
        if (formGroupReason) formGroupReason.style.display = 'block';

        if (currentRole === 'teacher') {
            if (userInput) {
                userInput.value = currentTeacherName;
                userInput.readOnly = true;
            }
        } else {
            if (userInput) {
                userInput.value = '';
                userInput.readOnly = false;
            }
        }

        if (reasonInput) reasonInput.value = '';
        btn.innerText = '確認預約';
        btn.className = 'btn btn-dark';

        if (currentRole === 'admin') {
            const headerBtnContainer = document.getElementById('modal-header-action-container');
            if (headerBtnContainer) {
                const closeSlotBtn = document.createElement('button');
                closeSlotBtn.id = 'modal-header-close-btn';
                closeSlotBtn.className = 'btn btn-line btn-sm';
                closeSlotBtn.style.color = 'var(--color-maintain)';
                closeSlotBtn.style.borderColor = 'var(--color-maintain)';
                closeSlotBtn.innerText = '關閉此時段預約權限';
                closeSlotBtn.onclick = closeBookingSlot;
                headerBtnContainer.appendChild(closeSlotBtn);
            }
        }
    } else if (data.status === 'booked') {
        title.innerText = '修改 / 刪除預約';
        info.innerText = `預約琴房：${rooms[curRoom]}`;

        if (formGroupReason) formGroupReason.style.display = 'block';
        if (reasonInput) reasonInput.value = data.reason;

        // 取得管理者專屬或共用的教師選單容器
        let adminTeacherGroup = document.getElementById('modal-admin-teacher-group');
        if (!adminTeacherGroup && formGroupUser) {
            adminTeacherGroup = document.createElement('div');
            adminTeacherGroup.id = 'modal-admin-teacher-group';
            adminTeacherGroup.className = 'form-group';
            formGroupUser.parentNode.insertBefore(adminTeacherGroup, formGroupUser);
        }

        if (currentRole === 'admin') {
            if (formGroupUser) formGroupUser.style.display = 'none';
            if (adminTeacherGroup) {
                adminTeacherGroup.style.display = 'block';

                const teachers = userData.filter(u => u.role === '教師' && u.status === '啟用');
                let teacherOptions = teachers.map(t => 
                    `<option value="${t.name}" ${t.name === data.user ? 'selected' : ''}>${t.name}</option>`
                ).join('');

                if (!teachers.some(t => t.name === data.user)) {
                    teacherOptions += `<option value="${data.user}" selected>${data.user}</option>`;
                }

                adminTeacherGroup.innerHTML = `
                    <label style="display: block; font-size: 0.85rem; margin-bottom: 5px; color: var(--text-muted);">預約教師姓名：</label>
                    <select id="edit-book-teacher-select" class="input">
                        ${teacherOptions}
                    </select>
                `;
            }
        } else {
            if (adminTeacherGroup) adminTeacherGroup.style.display = 'none';
            if (formGroupUser) formGroupUser.style.display = 'none';
            if (userInput) userInput.value = data.user;
        }

        let editExtraGroup = document.getElementById('modal-edit-extra-fields');
        if (!editExtraGroup && formGroupReason) {
            editExtraGroup = document.createElement('div');
            editExtraGroup.id = 'modal-edit-extra-fields';
            editExtraGroup.className = 'form-group';
            formGroupReason.parentNode.insertBefore(editExtraGroup, formGroupReason);
        }

        const currentDateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
        
        // 產生 09:00 - 18:00 的整點時間選項
        
        let timeOptionsHtml = '';
        for (let h = 9; h <= 18; h++) {
            const hourStr = String(h).padStart(2, '0');
            const timeVal = `${hourStr}:00`;
            timeOptionsHtml += `<option value="${timeVal}">${timeVal}</option>`;
        }
        // 1. 找出這個連續區間的開始時間
        const currentStartTimeStr = timeslots[tIdx].split(' - ')[0]; // 例如 "11:00"

        // 2. 自動向後尋找連續的格子，計算真正的結束時間
        let endTIdx = tIdx;
        while (endTIdx + 1 < timeslots.length) {
            const nextKey = `${parts[0]}-${weekNum}-${endTIdx + 1}-${dIdx}`;
            const nextData = scheduleData[nextKey];
            if (nextData && nextData.status === 'booked' && nextData.user === data.user && nextData.reason === data.reason) {
                endTIdx++;
            } else {
                break;
            }
        }
        // 取得最後一格的結束時間字串 (例如 "14:00")
        const currentEndTimeStr = timeslots[endTIdx].split(' - ')[1];
        if (editExtraGroup) {
            editExtraGroup.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 0.85rem; margin-bottom: 4px; color: var(--text-muted);">更改日期：</label>
                    <input type="date" id="edit-book-date" class="input" value="${currentDateStr}">
                </div>
                <div>
                    <label style="display: block; font-size: 0.85rem; margin-bottom: 4px; color: var(--text-muted);">更改起訖時段 ：</label>
                    <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center;">
                        <select id="edit-book-start-time" class="input">
                            ${timeOptionsHtml}
                        </select>
                        <span style="color: var(--text-muted); font-weight: bold;">—</span>
                        <select id="edit-book-end-time" class="input">
                            ${timeOptionsHtml}
                        </select>
                    </div>
                </div>
            `;
        }

        setTimeout(() => {
            const startSelect = document.getElementById('edit-book-start-time');
            const endSelect = document.getElementById('edit-book-end-time');
            if (startSelect) startSelect.value = currentStartTimeStr;
            if (endSelect) endSelect.value = currentEndTimeStr; // 【修改這裡】帶入正確的連續區間結束時間
        }, 50);
        btn.innerText = '確認修改預約';
        btn.className = 'btn btn-dark';

        let deleteBtn = document.getElementById('modal-delete-btn');
        const modalFooter = document.querySelector('#modal-booking .modal-footer');
        if (!deleteBtn && modalFooter) {
            deleteBtn = document.createElement('button');
            deleteBtn.id = 'modal-delete-btn';
            deleteBtn.className = 'btn btn-line';
            deleteBtn.style.color = 'var(--color-maintain)';
            deleteBtn.style.borderColor = 'var(--color-maintain)';
            deleteBtn.innerText = '刪除此預約';
            deleteBtn.onclick = deleteBooking;
            modalFooter.prepend(deleteBtn);
        } else if (deleteBtn) {
            deleteBtn.style.display = 'inline-flex';
        }
    } else {
        if (currentRole !== 'admin') {
            alert('【權限限制】您沒有權限解除維護狀態！此操作僅限系統管理者執行。');
            return;
        }
        
        title.innerText = '解除維護 / 開放預約';
        info.innerText = `目前狀態：維護中（已關閉預約）`;

        if (formGroupUser) formGroupUser.style.display = 'none';
        if (formGroupReason) formGroupReason.style.display = 'none';

        btn.innerText = '恢復為可預約';
        btn.className = 'btn btn-dark';
    }
}

function submitBooking() {
    if (!targetCell) {
        alert('錯誤：找不到目標時段！');
        return;
    }
    
    const data = scheduleData[targetCell] || { status: 'free' };

    // 如果該時段原本是維護中，執行解除維護
    if (data.status === 'maintain') {
        delete scheduleData[targetCell];
        alert('已成功恢復為可預約時段！');
        closeModal('modal-booking');
        renderSchedule();
        if (typeof renderDaySchedule === 'function') renderDaySchedule();
        return;
    }

    // 取得使用者與原因（支援新增或修改）
    const userInputElem = document.getElementById('book-user');
    const teacherSelect = document.getElementById('edit-book-teacher-select');
    const reasonInputElem = document.getElementById('book-reason');

    let user = '';
    if (currentRole === 'admin' && teacherSelect) {
        user = teacherSelect.value;
    } else if (userInputElem) {
        user = userInputElem.value.trim();
    } else {
        user = currentTeacherName || '教師';
    }

    const reason = reasonInputElem ? (reasonInputElem.value.trim() || '個人練習') : '個人練習';

    // 如果原本是空白格子 -> 執行新增預約
    if (data.status === 'free') {
        if (!user) {
            alert('請輸入預約人姓名');
            if (userInputElem) userInputElem.focus();
            return;
        }
        scheduleData[targetCell] = { status: 'booked', user, reason };
        alert('預約成功！');
    } 
    // 如果原本已預約 -> 執行修改預約（支援起訖時間區間）
    else {
        const newDateElem = document.getElementById('edit-book-date');
        const newStartTimeElem = document.getElementById('edit-book-start-time');
        const newEndTimeElem = document.getElementById('edit-book-end-time');

        // 如果有開啟修改起訖時間的選單
        if (newDateElem && newStartTimeElem && newEndTimeElem && newDateElem.value) {
            const newDateVal = newDateElem.value;
            const newStartTimeVal = newStartTimeElem.value;
            const newEndTimeVal = newEndTimeElem.value;

            const newDate = new Date(newDateVal);
            const today = new Date();
            
            const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const newDateOnly = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());

            if (newDateOnly < todayDateOnly) {
                alert('無法將預約改至過去的日期！');
                return;
            }

            // 【新增】檢查今天已過的時段
            if (newDateOnly.getTime() === todayDateOnly.getTime()) {
                const startH = parseInt(newStartTimeVal.substring(0, 2));
                const startM = parseInt(newStartTimeVal.substring(3, 5)) || 0;
                
                const slotStartTime = new Date(newDate);
                slotStartTime.setHours(startH, startM, 0, 0);

                if (slotStartTime < today) {
                    alert('無法將預約改至今天已經過去的時段！');
                    return;
                }
            }

            const startH = parseInt(newStartTimeVal.substring(0, 2));
            const endH = parseInt(newEndTimeVal.substring(0, 2));
            if (endH <= startH) {
                alert('結束時間必須大於或等於開始時間！');
                return;
            }

            const parts = targetCell.split('-');
            const roomIdx = parseInt(parts[0]);
            const oldWeekNum = parseInt(parts[1]);
            const oldDIdx = parseInt(parts[3]);
            const oldUser = data.user;
            const oldReason = data.reason;

            // 計算新日期的對應週次與星期幾索引
            const newWeekNum = getWeekNumber(newDate);
            const dayOfWeek = newDate.getDay();
            const newDIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

            // 根據選擇的小時區間，計算會涵蓋到哪幾個 timeslots 格子
            let targetKeysToBook = [];
            for (let h = startH; h < endH; h++) {
                const hourSlotStr = `${String(h).padStart(2, '0')}:00`;
                let foundTIdx = -1;
                timeslots.forEach((slotStr, idx) => {
                    if (slotStr.startsWith(hourSlotStr)) {
                        foundTIdx = idx;
                    }
                });

                if (foundTIdx !== -1) {
                    targetKeysToBook.push({
                        tIdx: foundTIdx,
                        key: `${roomIdx}-${newWeekNum}-${foundTIdx}-${newDIdx}`
                    });
                }
            }

            if (targetKeysToBook.length === 0) {
                alert('所選的時間區間無效！');
                return;
            }

            // 先清除這筆預約在原本所有格子中的殘留紀錄
            Object.keys(scheduleData).forEach(k => {
                const kp = k.split('-');
                if (parseInt(kp[0]) === roomIdx && parseInt(kp[1]) === oldWeekNum && parseInt(kp[3]) === oldDIdx) {
                    const item = scheduleData[k];
                    if (item && item.status === 'booked' && item.user === oldUser && item.reason === oldReason) {
                        delete scheduleData[k];
                    }
                }
            });

            // 檢查新選取的格子是否有被其他人佔用（排除自己原本的舊格子）
            let hasConflict = false;
            for (let item of targetKeysToBook) {
                const existing = scheduleData[item.key];
                if (existing && existing.status !== 'free') {
                    hasConflict = true;
                    break;
                }
            }

            if (hasConflict) {
                alert('【提示】您選擇的時間區間內包含已被其他人預約或維護中的時段，無法變更！');
                renderSchedule();
                return;
            }

            // 正式寫入新的連續時段
            targetKeysToBook.forEach(item => {
                scheduleData[item.key] = {
                    status: 'booked',
                    user: user,
                    reason: reason
                };
            });

            alert('預約起訖時間與資訊已成功更新！');
        } else {
            // 如果沒有額外選單，直接更新當前格子的資料
            if (scheduleData[targetCell]) {
                scheduleData[targetCell].user = user;
                scheduleData[targetCell].reason = reason;
            }
            alert('預約資訊已成功更新！');
        }
    }

    closeModal('modal-booking');
    renderSchedule();
    if (typeof renderDaySchedule === 'function') renderDaySchedule();
    if (typeof renderTeacherHistory === 'function') renderTeacherHistory();
}

function closeBookingSlot() {
    if (!targetCell) return;
    if (currentRole !== 'admin') {
        alert('【權限限制】您沒有權限關閉預約權限！此操作僅限系統管理者執行。');
        return;
    }
    if (confirm('確定要關閉此時段的預約權限嗎？（將設為維護中狀態）')) {
        scheduleData[targetCell] = { status: 'maintain', user: '系統', reason: '管理者手動關閉' };
        alert('已成功關閉該時段預約權限！');
        closeModal('modal-booking');
        renderSchedule();
    }
}

function deleteBooking() {
    if (!targetCell) return;
    if (confirm('確定要刪除這筆預約嗎？')) {
        delete scheduleData[targetCell];
        alert('已成功刪除預約！');
        closeModal('modal-booking');
        renderSchedule();
        renderTeacherHistory();
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    
    const deleteBtn = document.getElementById('modal-delete-btn');
    if (deleteBtn) deleteBtn.style.display = 'none';
    
    const headerBtn = document.getElementById('modal-header-close-btn');
    if (headerBtn) headerBtn.remove();

    // 清除修改日期/時段的額外欄位
    const extraFields = document.getElementById('modal-edit-extra-fields');
    if (extraFields) extraFields.innerHTML = '';

    // 隱藏單格修改的管理者教師選單
    const adminTeacherGroup = document.getElementById('modal-admin-teacher-group');
    if (adminTeacherGroup) adminTeacherGroup.style.display = 'none';

    // 隱藏批次預約的管理者教師選單
    const batchAdminTeacherGroup = document.getElementById('modal-batch-admin-teacher-group');
    if (batchAdminTeacherGroup) batchAdminTeacherGroup.style.display = 'none';

    // 恢復預設表單顯示
    const formGroupUser = document.getElementById('book-user')?.closest('.form-group');
    if (formGroupUser) formGroupUser.style.display = 'block';

    // 還原主按鈕預設行為
    const btn = document.getElementById('modal-action-btn');
    if (btn) btn.onclick = submitBooking;
}
// 後台面板切換
function switchAdminTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(panel => panel.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

function renderTimeTable() {
    const list = document.getElementById('time-list');
    if (!list) return;
    list.innerHTML = timeData.map(t => `
        <tr>
            <td>${t.name}</td>
            <td>${t.start}</td>
            <td>${t.end}</td>
            <td><span style="color:${t.status === '開放' ? 'var(--color-free)' : 'var(--color-maintain)'}">${t.status}</span></td>
            <td>
                <button class="action-btn" onclick="alert('修改時段：${t.name}')"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete" onclick="deleteTime(${t.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function deleteTime(id) {
    if (confirm('確定刪除此時段？')) {
        timeData = timeData.filter(t => t.id !== id);
        renderTimeTable();
    }
}

function openTimeModal() {
    const name = prompt('請輸入時段名稱：', '新時段');
    if (name) {
        timeData.push({ id: Date.now(), name, start: '18:00', end: '19:00', status: '開放' });
        renderTimeTable();
    }
}

function renderUserTable() {
    const list = document.getElementById('user-list');
    if (!list) return;
    list.innerHTML = userData.map(u => `
        <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td><strong>${u.role}</strong></td>
            <td><span style="color:var(--color-free)">${u.status}</span></td>
            <td>
                <button class="action-btn" onclick="alert('編輯帳號：${u.name}')"><i class="fa-solid fa-user-pen"></i></button>
                <button class="action-btn delete" onclick="deleteUser(${u.id})"><i class="fa-solid fa-user-xmark"></i></button>
            </td>
        </tr>
    `).join('');
}

function deleteUser(id) {
    if (confirm('確定刪除此帳號？')) {
        userData = userData.filter(u => u.id !== id);
        renderUserTable();
    }
}

function openUserModal() {
    const name = prompt('請輸入姓名：');
    const email = prompt('請輸入 Email：');
    const role = prompt('權限角色（教師 / 管理者）：', '教師');
    if (name && email) {
        userData.push({ id: Date.now(), name, email, role, status: '啟用' });
        renderUserTable();
    }
}

// -------------------------------------------------------------
// 渲染教師的歷史預約單（修復編輯與刪除連動）
// -------------------------------------------------------------
function renderTeacherHistory() {
    const historyBody = document.getElementById('teacher-history-body');
    if (!historyBody) return;

    const roomFilter = document.getElementById('history-room-filter')?.value || 'all';
    const sortOrder = document.getElementById('history-sort-order')?.value || 'newest';
    const startDateInput = document.getElementById('history-start-date')?.value;
    const endDateInput = document.getElementById('history-end-date')?.value;
    const keyword = document.getElementById('history-search-input')?.value.trim().toLowerCase() || '';

    historyBody.innerHTML = '';
    let rawRecords = [];

    for (const key in scheduleData) {
        const data = scheduleData[key];
        
        if (data.status === 'booked' && data.user === currentTeacherName) {
            const parts = key.split('-'); // [roomIdx, weekNum, tIdx, dIdx]
            const roomIdx = parseInt(parts[0]);
            const weekNum = parseInt(parts[1]);
            const tIdx = parseInt(parts[2]);
            const dIdx = parseInt(parts[3]);

            const roomName = rooms[roomIdx] || '未知琴房';
            const cellDate = getCellRealDate(weekNum, dIdx);
            const timeStr = timeslots[tIdx] || '未知時段';

            const endTimeStr = timeStr.split(' - ')[1];
            const [endHour, endMinute] = endTimeStr.split(':').map(Number);
            const fullCellDate = new Date(cellDate);
            fullCellDate.setHours(endHour, endMinute, 0, 0);
            const isPast = fullCellDate < new Date();

            rawRecords.push({
                key, // 保留原始單一 key 用於精準編輯與刪除
                roomIdx,
                roomName,
                cellDate,
                dateStringOnly: cellDate.toISOString().split('T')[0],
                dateFormatted: `${cellDate.getFullYear()}/${String(cellDate.getMonth()+1).padStart(2, '0')}/${String(cellDate.getDate()).padStart(2, '0')}`,
                tIdx,
                reason: data.reason || '無',
                isPast
            });
        }
    }

    let groupedMap = {};
    rawRecords.forEach(r => {
        const gKey = `${r.roomIdx}-${r.dateStringOnly}-${r.reason}`;
        if (!groupedMap[gKey]) {
            groupedMap[gKey] = {
                roomName: r.roomName,
                cellDate: r.cellDate,
                dateStringOnly: r.dateStringOnly,
                dateFormatted: r.dateFormatted,
                reason: r.reason,
                isPast: r.isPast,
                keys: [],
                tIndices: []
            };
        }
        groupedMap[gKey].keys.push(r.key);
        groupedMap[gKey].tIndices.push(r.tIdx);
    });

    let records = [];
    for (const gKey in groupedMap) {
        let g = groupedMap[gKey];
        // 依據 tIndices 排序以找出連續時段
        let combined = g.tIndices.map((t, idx) => ({ tIdx: t, key: g.keys[idx] }));
        combined.sort((a, b) => a.tIdx - b.tIdx);

        let chunks = [];
        let currentChunk = [combined[0]];

        for (let i = 1; i < combined.length; i++) {
            if (combined[i].tIdx === combined[i - 1].tIdx + 1) {
                currentChunk.push(combined[i]);
            } else {
                chunks.push(currentChunk);
                currentChunk = [combined[i]];
            }
        }
        chunks.push(currentChunk);

        chunks.forEach(chunk => {
            const startT = chunk[0].tIdx;
            const endT = chunk[chunk.length - 1].tIdx;
            const startTime = timeslots[startT].split(' - ')[0];
            const endTime = timeslots[endT].split(' - ')[1];
            
            // 該區塊涵蓋的所有 keys
            const chunkKeys = chunk.map(c => c.key);

            records.push({
                keys: chunkKeys,
                roomName: g.roomName,
                cellDate: g.cellDate,
                dateStringOnly: g.dateStringOnly,
                dateFormatted: g.dateFormatted,
                timeStr: `${startTime} - ${endTime}`,
                sortTIdx: startT,
                reason: g.reason,
                isPast: g.isPast
            });
        });
    }

    if (roomFilter !== 'all') {
        records = records.filter(r => r.roomName === roomFilter);
    }
    if (startDateInput) {
        records = records.filter(r => r.dateStringOnly >= startDateInput);
    }
    if (endDateInput) {
        records = records.filter(r => r.dateStringOnly <= endDateInput);
    }
    if (keyword !== '') {
        records = records.filter(r => r.reason.toLowerCase().includes(keyword));
    }

    records.sort((a, b) => {
        const dateDiff = a.cellDate - b.cellDate;
        if (dateDiff !== 0) {
            return sortOrder === 'newest' ? -dateDiff : dateDiff;
        } else {
            return sortOrder === 'newest' ? (b.sortTIdx - a.sortTIdx) : (a.sortTIdx - b.sortTIdx);
        }
    });

    if (records.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="6" style="padding: 20px; color: var(--text-muted);">查無符合條件的預約記錄</td></tr>`;
        return;
    }

    records.forEach(r => {
        let tr = document.createElement('tr');
        // 將 keys 轉換成安全傳遞的字串（以逗號分隔）
        const keysParam = r.keys.join(',');

        tr.innerHTML = `
            <td><strong>${r.roomName}</strong></td>
            <td>${r.dateFormatted}</td>
            <td>${r.timeStr}</td>
            <td>${r.reason}</td>
            <td>
                <span style="color: ${r.isPast ? 'var(--text-muted)' : 'var(--color-free)'}; font-weight: 600;">
                    ${r.isPast ? '已結束' : '有效預約'}
                </span>
            </td>
            <td>
                ${r.isPast ? '<span style="color:var(--text-muted); font-size:0.85rem;">已過期無法修改</span>' : `
                    <button class="action-btn" onclick="editBookingFromHistory('${keysParam}')" title="修改原因"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete" onclick="deleteBookingFromHistory('${keysParam}')" title="刪除預約"><i class="fa-solid fa-trash"></i></button>
                `}
            </td>
        `;
        historyBody.appendChild(tr);
    });

    updateQuickBookedDatesUI(records);
}

// 歷史預約單專用：編輯處理（開啟第一個時段的修改彈窗）
function editBookingFromHistory(keysStr) {
    const keys = keysStr.split(',');
    if (keys.length > 0 && keys[0]) {
        // 直接觸發點擊該預約區塊的第一個格子，開啟標準的「修改/刪除預約」Modal
        clickCell(keys[0]);
    }
}

// 歷史預約單專用：刪除處理（將該筆記錄包含的所有格子一次刪除）
function deleteBookingFromHistory(keysStr) {
    const keys = keysStr.split(',');
    if (confirm(`確定要從歷史預約單中刪除這筆預約嗎？（共 ${keys.length} 個時段）`)) {
        keys.forEach(k => {
            delete scheduleData[k];
        });
        alert('已成功刪除預約！');
        renderSchedule();
        renderTeacherHistory();
    }
}


// 歷史預約單專用：更新「快速選擇已預約日期」的 UI
function updateQuickBookedDatesUI(records) {
    const container = document.getElementById('quick-booked-dates');
    if (!container) return;
    container.innerHTML = '';

    const uniqueDates = [...new Set(records.map(r => r.dateStringOnly))].sort();

    if (uniqueDates.length === 0) {
        container.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">近期無預約記錄</span>';
        return;
    }

    uniqueDates.forEach(dateStr => {
        const parts = dateStr.split('-');
        const labelStr = `${parseInt(parts[1])}/${parseInt(parts[2])}`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm';
        btn.style.cssText = `
            padding: 2px 8px;
            font-size: 0.8rem;
            background-color: #E6D5C3;
            color: #5A4A3B;
            border: 1px solid #D4BCA5;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        btn.innerHTML = `<i class="fa-solid fa-calendar-check" style="margin-right:3px;"></i> ${labelStr}`;

        btn.onclick = () => {
            document.getElementById('history-start-date').value = dateStr;
            document.getElementById('history-end-date').value = dateStr;
            renderTeacherHistory();
        };

        container.appendChild(btn);
    });
}

function clearDateFilter() {
    const start = document.getElementById('history-start-date');
    const end = document.getElementById('history-end-date');
    if (start) start.value = '';
    if (end) end.value = '';
    renderTeacherHistory();
}

function openManualBookingModal() {
    const modal = document.getElementById('modal-manual-booking');
    if (!modal) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('manual-date');
    if (dateInput) dateInput.value = todayStr;

    // 【修改】初始化起訖時間預設值
    const startTimeSelect = document.getElementById('manual-start-time');
    const endTimeSelect = document.getElementById('manual-end-time');
    if (startTimeSelect) startTimeSelect.value = '09:00';
    if (endTimeSelect) endTimeSelect.value = '10:00';

    const reasonInput = document.getElementById('manual-reason');
    if (reasonInput) reasonInput.value = '';

    modal.classList.add('active');
    updateAvailableRoomsForBooking();
}

function updateAvailableRoomsForBooking() {
    const dateVal = document.getElementById('manual-date').value;
    const startTimeVal = document.getElementById('manual-start-time')?.value || '09:00';
    const endTimeVal = document.getElementById('manual-end-time')?.value || '10:00';
    
    const roomSelect = document.getElementById('manual-room');
    const submitBtn = document.getElementById('submit-manual-btn');

    if (!roomSelect) return;
    roomSelect.innerHTML = '';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
    }

    if (!dateVal) {
        roomSelect.innerHTML = '<option value="">請先選擇有效日期</option>';
        return;
    }

    const startH = parseInt(startTimeVal.substring(0, 2));
    const endH = parseInt(endTimeVal.substring(0, 2));

    if (endH <= startH) {
        roomSelect.innerHTML = '<option value="" disabled selected>結束時間必須大於開始時間</option>';
        return;
    }

    const selectedDate = new Date(dateVal);
    const weekNum = getWeekNumber(selectedDate);
    let dayOfWeek = selectedDate.getDay();
    let dIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // 計算這段連續時間區間會涵蓋到哪幾個 tIdx
    let targetTIndices = [];
    for (let h = startH; h < endH; h++) {
        const hourSlotStr = `${String(h).padStart(2, '0')}:00`;
        let foundTIdx = -1;
        timeslots.forEach((slotStr, idx) => {
            if (slotStr.startsWith(hourSlotStr)) {
                foundTIdx = idx;
            }
        });
        if (foundTIdx !== -1) {
            targetTIndices.push(foundTIdx);
        }
    }

    let availableCount = 0;
    let optionsHtml = '<option value="" disabled selected>-- 請選擇琴房 --</option>';

    rooms.forEach((roomName, roomIdx) => {
        // 檢查該琴房在所選的「所有連續時段」是否皆為 free
        let isAllFree = true;
        let conflictReason = '';

        for (let tIdx of targetTIndices) {
            const key = `${roomIdx}-${weekNum}-${tIdx}-${dIdx}`;
            const data = scheduleData[key] || { status: 'free' };
            if (data.status !== 'free') {
                isAllFree = false;
                conflictReason = data.status === 'maintain' ? '維護中' : `已被 ${data.user} 預約`;
                break;
            }
        }

        if (isAllFree && targetTIndices.length > 0) {
            availableCount++;
            optionsHtml += `<option value="${roomIdx}">${roomName} (可預約)</option>`;
        } else {
            optionsHtml += `<option value="${roomIdx}" disabled style="color:#b0b0b0;">${roomName} (${conflictReason || '時段已被佔用'})</option>`;
        }
    });

    roomSelect.innerHTML = optionsHtml;

    if (availableCount === 0) {
        roomSelect.innerHTML = '<option value="" disabled selected>該日期與起訖時段所有琴房皆已滿或維護中</option>';
    }
}

function checkManualRoomSelection() {
    const roomSelect = document.getElementById('manual-room');
    const submitBtn = document.getElementById('submit-manual-btn');
    if (!roomSelect || !submitBtn) return;

    if (roomSelect.value !== "") {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
    } else {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
    }
}

function submitManualBooking() {
    const roomSelect = document.getElementById('manual-room');
    const roomIdx = parseInt(roomSelect.value);
    const dateVal = document.getElementById('manual-date').value;
    
    // 【修改】讀取起訖時間
    const startTimeVal = document.getElementById('manual-start-time')?.value;
    const endTimeVal = document.getElementById('manual-end-time')?.value;
    
    const reason = document.getElementById('manual-reason').value.trim() || '個人練習';

    if (isNaN(roomIdx)) {
        alert('請選擇一間有效的琴房！');
        return;
    }

    if (!dateVal || !startTimeVal || !endTimeVal) {
        alert('請完整選擇日期與起訖時段！');
        return;
    }

    const selectedDate = new Date(dateVal);
    const today = new Date(); // 當前即時時間（含時、分）
    
    // 建立純日期物件（去除時分秒，用於比較日期是否為過去）
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

    if (selectedDateOnly < todayDateOnly) {
        alert('無法預約過去的日期！');
        return;
    }

    // 【新增】如果選擇的是今天，需進一步檢查開始時間是否已經過了目前時間
    if (selectedDateOnly.getTime() === todayDateOnly.getTime()) {
        const startH = parseInt(startTimeVal.substring(0, 2));
        const startM = parseInt(startTimeVal.substring(3, 5)) || 0;
        
        const slotStartTime = new Date(selectedDate);
        slotStartTime.setHours(startH, startM, 0, 0);

        if (slotStartTime < today) {
            alert('無法預約今天已經過去的時段！');
            return;
        }
    }

    const startH = parseInt(startTimeVal.substring(0, 2));
    const endH = parseInt(endTimeVal.substring(0, 2));

    if (endH <= startH) {
        alert('結束時間必須大於開始時間！');
        return;
    }

    const weekNum = getWeekNumber(selectedDate);
    let dayOfWeek = selectedDate.getDay();
    let dIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // 計算所有要寫入的格子 keys
    let keysToBook = [];
    for (let h = startH; h < endH; h++) {
        const hourSlotStr = `${String(h).padStart(2, '0')}:00`;
        let foundTIdx = -1;
        timeslots.forEach((slotStr, idx) => {
            if (slotStr.startsWith(hourSlotStr)) {
                foundTIdx = idx;
            }
        });
        if (foundTIdx !== -1) {
            keysToBook.push(`${roomIdx}-${weekNum}-${foundTIdx}-${dIdx}`);
        }
    }

    // 再次做衝突二次確認
    for (let key of keysToBook) {
        const existing = scheduleData[key];
        if (existing && existing.status !== 'free') {
            alert('【提示】您選擇的時間區間內包含已被其他人預約或進入維護狀態的時段，請重新選擇！');
            updateAvailableRoomsForBooking();
            return;
        }
    }

    // 正式批次寫入預約
    keysToBook.forEach(key => {
        scheduleData[key] = {
            status: 'booked',
            user: currentTeacherName,
            reason: reason
        };
    });

    alert(`成功預約 ${rooms[roomIdx]}（共 ${keysToBook.length} 個時段）！`);
    closeModal('modal-manual-booking');

    renderSchedule();
    renderTeacherHistory();
}

// 渲染每週關閉時段表格
function renderWeeklyCloseTable() {
    const list = document.getElementById('weekly-close-list');
    if (!list) return;

    const daysName = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

    if (weeklyClosedRules.length === 0) {
        list.innerHTML = `<tr><td colspan="4" style="padding: 20px; color: var(--text-muted);">目前無每週關閉時段設定</td></tr>`;
        return;
    }

    list.innerHTML = weeklyClosedRules.map(rule => {
        const dayStr = daysName[rule.dayOfWeek];
        const timeStr = `${dayStr} ${rule.startTime} - ${rule.endTime}`;
        
        // 如果狀態是「關閉」，開關為勾選(true)；如果是「開放」，則為不勾選(false)
        const isChecked = rule.status === '關閉' ? 'checked' : '';

        return `
            <tr>
                <td><strong>${rule.room}</strong></td>
                <td>${timeStr}</td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${isChecked} onchange="toggleWeeklyCloseStatus(${rule.id})">
                        <span class="slider"></span>
                    </label>
                    <span style="margin-left: 8px; font-size: 0.85rem; color: var(--text-muted);">
                        ${rule.status === '關閉' ? '已關閉時段' : '時段開放中'}
                    </span>
                </td>
                <td>
                    <button class="action-btn delete" onclick="deleteWeeklyCloseRule(${rule.id})" title="刪除規則">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 切換開放/關閉狀態
function toggleWeeklyCloseStatus(id) {
    const rule = weeklyClosedRules.find(r => r.id === id);
    if (rule) {
        rule.status = rule.status === '關閉' ? '開放' : '關閉';
        renderWeeklyCloseTable();
        // 若一覽表有用到此規則，此處可呼叫 renderSchedule() 更新畫面
        if (typeof renderSchedule === 'function') renderSchedule();
    }
}

// 刪除每週關閉規則
function deleteWeeklyCloseRule(id) {
    if (confirm('確定要刪除此項每週關閉時段設定嗎？')) {
        weeklyClosedRules = weeklyClosedRules.filter(r => r.id !== id);
        renderWeeklyCloseTable();
        if (typeof renderSchedule === 'function') renderSchedule();
    }
}

// 新增每週關閉時段對話框 (可依需求使用 prompt 或自訂 modal)
function openWeeklyCloseModal() {
    const roomInput = prompt('請輸入琴房名稱 (例如: 琴房 B)：', '琴房 B');
    if (!roomInput) return;

    const dayInput = prompt('請輸入星期幾 (0=週日, 1=週一, 2=週二, 3=週三, 4=週四, 5=週五, 6=週六)：', '3');
    if (dayInput === null) return;

    const startInput = prompt('請輸入開始時間 (例如 13:00)：', '13:00');
    if (!startInput) return;

    const endInput = prompt('請輸入結束時間 (例如 18:00)：', '18:00');
    if (!endInput) return;

    weeklyClosedRules.push({
        id: Date.now(),
        room: roomInput,
        dayOfWeek: parseInt(dayInput),
        startTime: startInput,
        endTime: endInput,
        status: '關閉'
    });

    renderWeeklyCloseTable();
    if (typeof renderSchedule === 'function') renderSchedule();
    alert('成功新增每週關閉時段設定！');
}
//4