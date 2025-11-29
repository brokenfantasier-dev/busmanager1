// --- CONFIG ---
const API_BASE = "http://192.168.1.100:8000";
const CHECKIN_COMPLETE_TIME_SECONDS = 10;
const CHECKOUT_INSPECTION_TIME_SECONDS = 10;
const DATA_FETCH_INTERVAL = 2000;

// --- STATE MANAGEMENT ---
const state = {
    tripState: 'ready', // 'ready' | 'check-in' | 'in-progress' | 'stopped' | 'checking-out' | 'alert'
    tripId: null,
    tripTimer: 0,
    vehicleRunningTime: 0,
    stopTimer: 0,
    checkinCountdown: CHECKIN_COMPLETE_TIME_SECONDS,
    checkoutCountdown: CHECKOUT_INSPECTION_TIME_SECONDS,
    counts: { getOn: 0, getOff: 0 },
    lastCounts: { getOn: 0, getOff: 0 },
    currentPassengerCount: 0,
    stopEventData: { passengersOn: 0, passengersOff: 0 },
    isCameraActive: false,
    logEntries: [],
    flowChartData: [],
    cumulativeChartData: [],
    reportData: {
        tripId: null,
        startTime: null,
        endTime: null,
        totalTripDuration: 0,
        vehicleRunningDuration: 0,
        midRoutePassengers: [],
        stopHistory: [],
        fullLog: []
    }
};

let mainInterval, tripInterval, runningInterval, stopInterval, checkinInterval, checkoutInterval;

// --- DOM ELEMENTS ---
const elements = {
    checkinButton: document.getElementById('checkinButton'),
    pauseButton: document.getElementById('pauseButton'),
    checkoutButton: document.getElementById('checkoutButton'),
    activityStatus: document.getElementById('activityStatus'),
    vehicleRunningTimeDisplay: document.getElementById('vehicleRunningTimeDisplay'),
    runningTimePanel: document.getElementById('running-time-panel'),
    countdownPanel: document.getElementById('countdown-panel'),
    countdownLabel: document.getElementById('countdown-label'),
    countdownTimer: document.getElementById('countdown-timer'),
    getOnCount: document.getElementById('getOnCount'),
    getOffCount: document.getElementById('getOffCount'),
    passengersOnBoard: document.getElementById('passengersOnBoard'),
    passengersOnBoardCard: document.getElementById('passengers-on-board-card'),
    logEntries: document.getElementById('logEntries'),
    ttsInput: document.getElementById('tts-input'),
    speakButton: document.getElementById('speakButton'),
    manualGpsButton: document.getElementById('manualGpsButton'),
    mockDataButton: document.getElementById('mockDataButton'),
    latInput: document.getElementById('latInput'),
    lngInput: document.getElementById('lngInput'),
    map: document.getElementById('map'),
    // Dialogs
    stopDialog: document.getElementById('stopDialog'),
    stopTimerDisplay: document.getElementById('stopTimerDisplay'),
    stopDialogPassengerCount: document.getElementById('stopDialogPassengerCount'),
    stopDialogPassengersOn: document.getElementById('stopDialogPassengersOn'),
    stopDialogPassengersOff: document.getElementById('stopDialogPassengersOff'),
    resumeButton: document.getElementById('resumeButton'),
    alertDialog: document.getElementById('alert-dialog'),
    alertIconContainer: document.getElementById('alert-icon-container'),
    alertTitle: document.getElementById('alert-title'),
    alertMessage: document.getElementById('alert-message'),
    alertCloseButton: document.getElementById('alert-close-button'),
};

// --- CHART SETUP ---
let flowChart, cumulativeChart;
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, grid: { color: 'hsl(var(--border))' } }, x: { grid: { display: false } } },
        plugins: { legend: { labels: { color: 'hsl(var(--foreground))' } } }
    };
    flowChart = new Chart(document.getElementById("flowChart"), {
      type: 'line',
      data: { labels: [], datasets: [
          { label: 'Lên xe', data: [], borderColor: 'hsl(var(--primary))', tension: 0.3, fill: true, backgroundColor: 'hsl(var(--primary) / 0.2)'},
          { label: 'Xuống xe', data: [], borderColor: 'hsl(var(--destructive))', tension: 0.3, fill: true, backgroundColor: 'hsl(var(--destructive) / 0.2)'}
      ]},
      options: chartOptions
    });
    cumulativeChart = new Chart(document.getElementById("cumulativeChart"), {
      type: 'bar',
      data: { labels: [], datasets: [
          { label: 'Tổng lên', data: [], backgroundColor: 'hsl(var(--primary) / 0.7)' },
          { label: 'Tổng xuống', data: [], backgroundColor: 'hsl(var(--destructive) / 0.7)' }
      ]},
      options: chartOptions
    });
}

// --- Google Map ---
function initMap() {
    if (isAdmin() && elements.map) {
        const initialLatLng = { lat: 11.9405, lng: 108.4357 };
        window.map = new google.maps.Map(elements.map, {
            center: initialLatLng,
            zoom: 15,
            styles: [ // Dark mode styles
                { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                {
                    featureType: 'administrative.locality',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#d59563' }]
                },
                {
                    featureType: 'poi',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#d59563' }]
                },
                {
                    featureType: 'poi.park',
                    elementType: 'geometry',
                    stylers: [{ color: '#263c3f' }]
                },
                {
                    featureType: 'poi.park',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#6b9a76' }]
                },
                {
                    featureType: 'road',
                    elementType: 'geometry',
                    stylers: [{ color: '#38414e' }]
                },
                {
                    featureType: 'road',
                    elementType: 'geometry.stroke',
                    stylers: [{ color: '#212a37' }]
                },
                {
                    featureType: 'road',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#9ca5b3' }]
                },
                {
                    featureType: 'road.highway',
                    elementType: 'geometry',
                    stylers: [{ color: '#746855' }]
                },
                {
                    featureType: 'road.highway',
                    elementType: 'geometry.stroke',
                    stylers: [{ color: '#1f2835' }]
                },
                {
                    featureType: 'road.highway',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#f3d19c' }]
                },
                {
                    featureType: 'transit',
                    elementType: 'geometry',
                    stylers: [{ color: '#2f3948' }]
                },
                {
                    featureType: 'transit.station',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#d59563' }]
                },
                {
                    featureType: 'water',
                    elementType: 'geometry',
                    stylers: [{ color: '#17263c' }]
                },
                {
                    featureType: 'water',
                    elementType: 'labels.text.fill',
                    stylers: [{ color: '#515c6d' }]
                },
                {
                    featureType: 'water',
                    elementType: 'labels.text.stroke',
                    stylers: [{ color: '#17263c' }]
                }
            ]
        });
        window.marker = new google.maps.Marker({
            position: initialLatLng,
            map: window.map,
        });
    }
}


// --- CORE LOGIC ---
function addLog(message, type) {
    state.logEntries.unshift({ timestamp: new Date(), message, type });
    if (state.logEntries.length > 100) state.logEntries.pop();
    renderLogs();
    
    // Also add to report log if trip is active
    if (state.tripState !== 'ready') {
        state.reportData.fullLog.push({ timestamp: new Date(), message, type });
    }
}

function startTrip() {
    const now = new Date();
    state.tripId = `VEHICLE-01-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    state.reportData = {
        tripId: state.tripId,
        startTime: now,
        endTime: null,
        totalTripDuration: 0,
        vehicleRunningDuration: 0,
        midRoutePassengers: [],
        stopHistory: [],
        fullLog: []
    };
    
    addLog(`Bắt đầu chuyến đi mới: ${state.tripId}`, 'SYSTEM');
    addLog("Bắt đầu quy trình khởi hành chuyến đi.", 'TRIP');
    setTripState('check-in');
}

function setTripState(newState) {
    const oldState = state.tripState;
    state.tripState = newState;
    renderUI();

    // Clear old intervals
    [tripInterval, runningInterval, stopInterval, checkinInterval, checkoutInterval].forEach(clearInterval);

    // Handle state entry logic
    switch (newState) {
        case 'ready':
            if (oldState === 'checking-out' || oldState === 'alert') {
                const msg = "Đã xác nhận không còn hành khách trên xe. An toàn!";
                showAlert("Kiểm tra hoàn tất", msg, false);
                addLog(msg, 'TRIP');
                speak(msg);
            }
            resetState();
            break;

        case 'check-in':
            state.checkinCountdown = CHECKIN_COMPLETE_TIME_SECONDS;
            checkinInterval = setInterval(() => {
                state.checkinCountdown--;
                if (state.checkinCountdown <= 0) {
                    const msg = "Chuyến xe Hành Trình Khoa Học mang số hiệu VIỆT NAM 1, lộ trình từ Đà Lạt đến Sài Gòn chuẩn bị khởi hành. Quý khách vui lòng ổn định vị trí, thắt chặt dây an toàn để cùng chúng tôi trải nghiệm tiếp các tính năng tiếp theo.";
                    addLog("Hoàn tất thủ tục ổn định. Chuyến đi bắt đầu.", 'TRIP');
                    speak(msg);
                    setTripState('in-progress');
                }
                renderUI();
            }, 1000);
            tripInterval = setInterval(() => state.tripTimer++, 1000);
            break;

        case 'in-progress':
            tripInterval = setInterval(() => state.tripTimer++, 1000);
            runningInterval = setInterval(() => {
                state.vehicleRunningTime++;
                renderUI();
            }, 1000);
            break;

        case 'stopped':
            addLog('Xe đã tạm dừng.', 'TRIP');
            state.stopEventData = { passengersOn: 0, passengersOff: 0 };
            elements.stopDialog.style.display = 'flex';
            tripInterval = setInterval(() => state.tripTimer++, 1000);
            stopInterval = setInterval(() => {
                state.stopTimer++;
                renderUI();
            }, 1000);
            break;

        case 'checking-out':
            addLog("Bắt đầu quy trình kiểm tra cuối chuyến.", 'TRIP');
            speak("Xe đã đến điểm dừng cuối. Quý khách vui lòng kiểm tra kỹ trước khi xuống xe", 3);
            state.checkoutCountdown = CHECKOUT_INSPECTION_TIME_SECONDS;
            
            state.reportData.endTime = new Date();
            state.reportData.totalTripDuration = state.tripTimer;
            state.reportData.vehicleRunningDuration = state.vehicleRunningTime;
            localStorage.setItem(`trip_${state.tripId}`, JSON.stringify(state.reportData));
            
            checkoutInterval = setInterval(() => {
                state.checkoutCountdown--;
                if (state.checkoutCountdown <= 0) {
                    setTripState(state.currentPassengerCount > 0 ? 'alert' : 'ready');
                }
                renderUI();
            }, 1000);
            break;
            
        case 'alert':
            const alertMsg = `Phát hiện còn ${state.currentPassengerCount} hành khách trên xe. Yêu cầu kiểm tra ngay!`;
            const ttsMsg = `CẢNH BÁO! Phát hiện ${state.currentPassengerCount} hành khách còn trên xe`;
            showAlert("Cảnh báo khẩn cấp", alertMsg, true);
            addLog(ttsMsg, 'WARNING');
            speak(ttsMsg, 2);
            break;
    }
}

function handleDataFetch(data) {
    state.counts.getOn = data.get_on;
    state.counts.getOff = data.get_off;
    state.currentPassengerCount = Math.max(0, data.get_on - data.get_off);

    const deltaOn = state.counts.getOn - state.lastCounts.getOn;
    const deltaOff = state.counts.getOff - state.lastCounts.getOff;

    if (state.tripState === 'in-progress' && deltaOn > 0) {
        const entry = { timestamp: new Date(), event: 'khach_doc_duong_len', so_nguoi: deltaOn, gps: { lat: elements.latInput.value, lng: elements.lngInput.value }, vi_tri_text: 'Đang xác định...' };
        state.reportData.midRoutePassengers.push(entry);
    }

    if(state.tripState === 'stopped' && (deltaOn > 0 || deltaOff > 0)) {
        state.stopEventData.passengersOn += deltaOn;
        state.stopEventData.passengersOff += deltaOff;
    }

    const time = new Date().toLocaleTimeString('en-GB');
    state.flowChartData.push({ time, deltaOn, deltaOff });
    state.cumulativeChartData.push({ time, getOn: state.counts.getOn, getOff: state.counts.getOff });
    if(state.flowChartData.length > 20) {
        state.flowChartData.shift();
        state.cumulativeChartData.shift();
    }
    
    state.lastCounts = { ...state.counts };
    renderUI();
}

function resumeTrip() {
    elements.stopDialog.style.display = 'none';
    const stopRecord = {
        duration: state.stopTimer,
        passengersOn: state.stopEventData.passengersOn,
        passengersOff: state.stopEventData.passengersOff,
        location: 'Điểm dừng - Bảo Lộc',
        timestamp: new Date(),
    };
    state.reportData.stopHistory.push(stopRecord);
    state.stopTimer = 0;
    addLog(`Hành trình được tiếp tục sau khi dừng ${formatTime(stopRecord.duration)}.`, 'TRIP');
    setTripState('in-progress');
}

function resetState() {
    Object.assign(state, {
        tripState: 'ready',
        tripId: null,
        tripTimer: 0,
        vehicleRunningTime: 0,
        stopTimer: 0,
        checkinCountdown: CHECKIN_COMPLETE_TIME_SECONDS,
        checkoutCountdown: CHECKOUT_INSPECTION_TIME_SECONDS,
        counts: { getOn: 0, getOff: 0 },
        lastCounts: { getOn: 0, getOff: 0 },
        currentPassengerCount: 0,
        flowChartData: [],
        cumulativeChartData: []
    });
    flowChart.data.labels = [];
    flowChart.data.datasets[0].data = [];
    flowChart.data.datasets[1].data = [];
    cumulativeChart.data.labels = [];
    cumulativeChart.data.datasets[0].data = [];
    cumulativeChart.data.datasets[1].data = [];
    flowChart.update();
    cumulativeChart.update();
    renderUI();
}

// --- UI RENDERING ---
function renderUI() {
    // Buttons
    elements.checkinButton.disabled = state.tripState !== 'ready';
    elements.pauseButton.disabled = state.tripState !== 'in-progress';
    elements.checkoutButton.disabled = !['in-progress', 'stopped'].includes(state.tripState);

    // Activity Status
    const statusMap = {
        ready: { text: 'Chờ', icon: 'fa-power-off', className: 'ready' },
        'check-in': { text: 'Trong chuyến đi', icon: 'fa-bus', className: 'in-progress' },
        'in-progress': { text: 'Trong chuyến đi', icon: 'fa-bus', className: 'in-progress' },
        'stopped': { text: 'Trong chuyến đi', icon: 'fa-bus', className: 'in-progress' },
        'checking-out': { text: 'Đang kiểm tra', icon: 'fa-clock', className: 'checking-out' },
        'alert': { text: 'Cảnh báo!', icon: 'fa-exclamation-triangle', className: 'alert' }
    };
    const currentStatus = statusMap[state.tripState];
    elements.activityStatus.innerHTML = `<i class="fas ${currentStatus.icon}"></i> ${currentStatus.text}`;
    elements.activityStatus.className = `status-badge ${currentStatus.className}`;

    // Timers & Countdown
    elements.vehicleRunningTimeDisplay.textContent = formatTime(state.vehicleRunningTime);
    if (state.tripState === 'check-in') {
        elements.runningTimePanel.style.display = 'none';
        elements.countdownPanel.style.display = 'block';
        elements.countdownLabel.textContent = 'Chờ ổn định';
        elements.countdownTimer.textContent = formatCountdown(state.checkinCountdown);
        elements.countdownTimer.style.color = 'orange';
    } else if (state.tripState === 'checking-out') {
        elements.runningTimePanel.style.display = 'none';
        elements.countdownPanel.style.display = 'block';
        elements.countdownLabel.textContent = 'Kiểm tra cuối chuyến';
        elements.countdownTimer.textContent = formatCountdown(state.checkoutCountdown);
        elements.countdownTimer.style.color = 'orange';
    } else {
        elements.runningTimePanel.style.display = 'block';
        elements.countdownPanel.style.display = 'none';
    }

    // Counts
    elements.getOnCount.textContent = state.counts.getOn;
    elements.getOffCount.textContent = state.counts.getOff;
    elements.passengersOnBoard.textContent = state.currentPassengerCount;
    elements.passengersOnBoardCard.classList.toggle('alert', state.tripState === 'alert');

    // Dialogs
    elements.stopTimerDisplay.textContent = formatTime(state.stopTimer);
    elements.stopDialogPassengerCount.textContent = state.currentPassengerCount;
    elements.stopDialogPassengersOn.textContent = `+${state.stopEventData.passengersOn}`;
    elements.stopDialogPassengersOff.textContent = `-${state.stopEventData.passengersOff}`;

    // Charts for admin
    if(isAdmin()){
        flowChart.data.labels = state.flowChartData.map(d => d.time);
        flowChart.data.datasets[0].data = state.flowChartData.map(d => d.deltaOn);
        flowChart.data.datasets[1].data = state.flowChartData.map(d => d.deltaOff);
        flowChart.update();
        
        cumulativeChart.data.labels = state.cumulativeChartData.map(d => d.time);
        cumulativeChart.data.datasets[0].data = state.cumulativeChartData.map(d => d.getOn);
        cumulativeChart.data.datasets[1].data = state.cumulativeChartData.map(d => d.getOff);
        cumulativeChart.update();
    }
}

function renderLogs() {
    elements.logEntries.innerHTML = state.logEntries.map(log => 
        `<div class="log-entry">
            <span class="log-timestamp">${log.timestamp.toLocaleTimeString()}</span>
            <span class="log-type-${log.type}">[${log.type}]</span>
            <span>${log.message}</span>
        </div>`
    ).join('');
}

function showAlert(title, message, isError) {
    elements.alertTitle.textContent = title;
    elements.alertMessage.textContent = message;
    elements.alertIconContainer.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>`;
    elements.alertCloseButton.className = `dialog-action ${isError ? 'destructive' : ''}`;
    elements.alertDialog.style.display = 'flex';
}

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

function formatCountdown(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// --- EVENT LISTENERS ---
function initializeApp() {
    checkAuth();
    if(isAdmin()) {
        initializeCharts();
    }
    renderUI();
    addLog('Hệ thống giám sát đã sẵn sàng.', 'SYSTEM');
    
    // Main data fetch interval
    mainInterval = setInterval(async () => {
      if (state.tripState === 'ready') return;
      try {
        const response = await fetch(`${API_BASE}/status`);
        if (!response.ok) {
            console.warn(`Lỗi kết nối backend: ${response.status}.`);
            // Don't switch to demo mode automatically
            addLog(`Lỗi kết nối backend, không nhận được dữ liệu.`, 'WARNING');
        } else {
            const data = await response.json();
            handleDataFetch(data);
        }
      } catch (e) {
        console.warn(`Lỗi kết nối backend: ${e.message}.`);
        addLog(`Lỗi kết nối backend, không nhận được dữ liệu.`, 'WARNING');
      }
    }, DATA_FETCH_INTERVAL);

    // Button Listeners
    elements.checkinButton.addEventListener('click', startTrip);
    elements.pauseButton.addEventListener('click', () => setTripState('stopped'));
    elements.checkoutButton.addEventListener('click', () => setTripState('checking-out'));
    elements.resumeButton.addEventListener('click', resumeTrip);
    elements.alertCloseButton.addEventListener('click', () => {
        elements.alertDialog.style.display = 'none';
        if(state.tripState === 'alert') {
            addLog('Cảnh báo đã được xác nhận bởi người dùng.', 'MANUAL');
        }
    });

    // TTS Listener
    elements.speakButton.addEventListener('click', () => {
        const text = elements.ttsInput.value;
        if (text.trim()) {
            addLog(`Phát thông báo: "${text}"`, 'MANUAL');
            speak(text);
            elements.ttsInput.value = '';
        }
    });
    
    // GPS Listener (admin only)
    if (elements.manualGpsButton) {
        elements.manualGpsButton.addEventListener('click', () => {
            const lat = elements.latInput.value;
            const lng = elements.lngInput.value;
            addLog(`GPS được cập nhật thủ công: ${lat}, ${lng}`, 'MANUAL');
            if (window.map && window.marker) {
                const newLatLng = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
                window.marker.setPosition(newLatLng);
                window.map.setCenter(newLatLng);
            }
        });
    }

    if (elements.mockDataButton) {
        elements.mockDataButton.addEventListener('click', mockDataGenerator);
    }
}

function mockDataGenerator() {
    if (state.tripState !== 'in-progress' && state.tripState !== 'stopped') return;

    const newGetOn = Math.random() > 0.5 ? Math.floor(Math.random() * 3) : 0;
    const newGetOff = (state.counts.getOn > state.counts.getOff) && Math.random() > 0.6 ? 1 : 0;

    if (newGetOn === 0 && newGetOff === 0 && state.counts.getOn > 0) { // Ensure there's some activity if possible
        mockDataGenerator(); // try again
        return;
    }
    
    const mockData = {
        get_on: state.counts.getOn + newGetOn,
        get_off: state.counts.getOff + newGetOff
    };
    addLog(`Tạo dữ liệu giả: Lên: ${newGetOn}, Xuống: ${newGetOff}`, 'MANUAL');
    handleDataFetch(mockData);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initializeApp);
