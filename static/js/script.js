
let isLiffReady = false;


window.onload = function () {
    // 檢查是否曾經學會過最小化
    if (localStorage.getItem('hasLearnedMinimize') === 'true') {
        const guide = document.getElementById('minimize-guide');
        if (guide) guide.remove();
    }

    if (typeof MY_LIFF_ID !== 'undefined') {
        initializeLiff(MY_LIFF_ID);
    }
};

async function initializeLiff(myLiffId) {
    try {
        await liff.init({ liffId: myLiffId });
        isLiffReady = true;
        console.log("LIFF 初始化成功！");
    } catch (error) {
        console.error("LIFF 初始化失敗", error);
    }
}

let currentTone = '溫和';
let hiddenOptions = [];
// 新增：暫存情緒模式的教練資料
let currentCoachData = null;

// --- 分頁切換邏輯 (維持不變) ---
function switchTab(tab) {
    const btn1 = document.getElementById('btn-tab1');
    const btn2 = document.getElementById('btn-tab2');
    const container = document.getElementById('views-container');
    if (tab === 'emotion') {
        container.classList.remove('-translate-x-1/2');
        container.classList.add('translate-x-0');
        updateTabBtnStyle(btn1, true);
        updateTabBtnStyle(btn2, false);
    } else {
        container.classList.remove('translate-x-0');
        container.classList.add('-translate-x-1/2');
        updateTabBtnStyle(btn2, true);
        updateTabBtnStyle(btn1, false);
    }
}

function updateTabBtnStyle(btn, isActive) {
    if (isActive) {
        btn.classList.add('bg-white', 'text-brand-dark', 'shadow-sm');
        btn.classList.remove('text-gray-400', 'hover:text-gray-600');
    } else {
        btn.classList.remove('bg-white', 'text-brand-dark', 'shadow-sm');
        btn.classList.add('text-gray-400', 'hover:text-gray-600');
    }
}

// --- 2. 聊聊情緒邏輯 ---
async function sendEmotion() {
    // 移除上一次留下的按鈕
    const oldBtn = document.getElementById('btn-ready-container');
    if (oldBtn) oldBtn.remove();

    const input = document.getElementById('emotion-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';

    const loadingHtml = `<div class="flex space-x-1.5 h-6 items-center px-1">
        <div class="w-2 h-2 rounded-full animate-bounce-dot"></div>
        <div class="w-2 h-2 rounded-full animate-bounce-dot delay-100"></div>
        <div class="w-2 h-2 rounded-full animate-bounce-dot delay-200"></div>
    </div>`;
    const loadingId = addMessage(loadingHtml, 'system', true);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();

        // 精確移除 Loading 氣泡
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        // 顯示 AI 回覆
        addMessage(data.reply, 'system');

        // 顯示亮點
        if (data.key_change) addHighlightBubble(data.key_change);

        // 【關鍵】將最新的資料存入全域變數，供 showOptions 使用
        hiddenOptions = data.options || [];
        currentCoachData = {
            analysis: data.analysis || "",
            tip: data.tip || ""
        };

        // 產生這一輪新的按鈕
        addReadyButton();

    } catch (e) {
        console.error("錯誤:", e);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();
        addMessage('抱歉，LittleTone 現在有點累。', 'system');
    }
}

// 在對話框中加入亮點小泡泡
function addHighlightBubble(text) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.className = "flex justify-start mb-2 animate-fade-in-up";
    div.innerHTML = `<div class="bg-yellow-50 border border-yellow-200 text-yellow-800 text-[11px] px-3 py-1 rounded-full shadow-sm ml-2">
        ${text}
    </div>`;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

function showOptions() {
    if (hiddenOptions && hiddenOptions.length > 0) {
        addOptionCards(hiddenOptions);
    }
    if (currentCoachData) {
        addCoachCardToHistory(currentCoachData.analysis, currentCoachData.tip);
    }

    const btnContainer = document.getElementById('btn-ready-container');
    if (btnContainer) btnContainer.remove();
}

// 情緒模式專用的教練卡片（放入對話紀錄中）
function addCoachCardToHistory(analysis, tip) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.className = "mb-6 animate-fade-in-up ml-2";
    const accordionId = 'coach-' + Date.now();

    div.innerHTML = renderAccordionHTML(accordionId, analysis, tip);
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

// --- 3. 轉化語氣邏輯 ---
async function generateTone() {
    const text = document.getElementById('tone-input').value;
    const btn = document.getElementById('btn-generate');
    const coachContainer = document.getElementById('coach-container');
    if (!text) {
        Swal.fire({ icon: 'warning', title: '請先輸入文字', confirmButtonColor: '#80CBC4' });
        return;
    };

    btn.innerHTML = '正在轉化中...';
    btn.disabled = true;
    coachContainer.innerHTML = ''; // 清空舊的教練內容

    try {
        const res = await fetch('/api/tone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, tone: currentTone })
        });
        const data = await res.json();

        // 顯示結果 (data 現在是包含 result 的物件)
        document.getElementById('result-text').innerText = data.result;

        // 渲染教練 UI (亮點 + 摺疊卡片)
        renderToneCoachUI(data);

        document.getElementById('result-area').classList.remove('hidden');
        document.getElementById('result-area').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
        Swal.fire({ icon: 'error', title: '糟糕，失敗了', confirmButtonColor: '#80CBC4' });
    } finally {
        btn.innerHTML = '✨ 一鍵調整語氣';
        btn.disabled = false;
    }
}

// 語氣模式專用的教練 UI 渲染
function renderToneCoachUI(data) {
    const container = document.getElementById('coach-container');
    const accordionId = 'tone-coach-' + Date.now();

    container.innerHTML = `
        <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded-lg animate-fade-in-up">
            ${data.key_change}
        </div>
        <div class="animate-fade-in-up">
            ${renderAccordionHTML(accordionId, data.analysis, data.tip)}
        </div>
    `;
}

// 通用的摺疊元件 HTML 模板
function renderAccordionHTML(id, analysis, tip) {
    return `
        <div class="bg-white dark:bg-[#2D2D2D] border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <button onclick="toggleCoach('${id}')" class="w-full flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/50">
                <span class="text-[11px] font-bold text-gray-400">💡 為什麼 LittleTone 這樣說？</span>
                <svg id="icon-${id}" class="w-4 h-4 text-gray-300 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            <div id="${id}" class="hidden p-4 space-y-3 text-[13px] border-t border-gray-50 dark:border-gray-800">
                <div>
                    <span class="text-brand-dark font-bold text-[10px] block mb-1">🔍 診斷分析</span>
                    <p class="text-gray-600 dark:text-gray-300 leading-relaxed">${analysis}</p>
                </div>
                <div class="pt-2 border-t border-gray-50 dark:border-gray-800">
                    <span class="text-brand-dark font-bold text-[10px] block mb-1">🎓 深度學習</span>
                    <p class="text-gray-600 dark:text-gray-300 leading-relaxed">${tip}</p>
                </div>
            </div>
        </div>
    `;
}

function toggleCoach(id) {
    const content = document.getElementById(id);
    const icon = document.getElementById('icon-' + id);
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        content.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
}

// --- 其餘輔助函式 (addMessage, addOptionCards, selectTone, copyText 等維持不變) ---

function addMessage(content, sender, isHtml = false) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    // 使用更長的隨機字串確保 ID 唯一性
    const id = 'msg-' + Math.random().toString(36).substr(2, 9);
    div.id = id;
    div.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-5 animate-fade-in-up`;

    const bubble = document.createElement('div');
    bubble.className = `px-5 py-3 text-[15px] max-w-[88%] rounded-2xl shadow-sm leading-relaxed whitespace-pre-wrap ${sender === 'user'
        ? 'bg-gradient-to-br from-brand to-brand-dark text-white rounded-tr-none shadow-brand/20'
        : 'bg-white dark:bg-[#2D2D2D] text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100/50 dark:border-gray-800'
        }`;

    if (isHtml) {
        bubble.innerHTML = content;
    } else {
        bubble.innerText = content;
    }

    div.appendChild(bubble);
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
    return id; // 這裡回傳的 ID 會給 sendEmotion 用來移除 Loading
}

function addReadyButton() {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.id = 'btn-ready-container';
    div.className = "flex justify-end mt-3 mb-6 animate-fade-in-up";
    div.innerHTML = `<button onclick="showOptions()" class="bg-brand-light text-brand-dark px-5 py-2.5 rounded-full text-sm font-bold shadow-sm hover:bg-brand-light/80 transition active:scale-95 flex items-center space-x-1">
        <span>生成語氣</span> <span></span>
    </button>`;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

function addOptionCards(options) {
    const history = document.getElementById('chat-history');
    const container = document.createElement('div');
    container.className = "flex flex-col space-y-3 mt-2 ml-2 mb-6 animate-fade-in-up";

    options.forEach((opt) => {
        // --- 1. 強化字串處理：確保 HTML 屬性能正確包容所有字元 ---
        const safeContent = opt.content
            .replace(/'/g, "\\'")
            .replace(/\n/g, "\\n");

        const card = document.createElement('div');
        card.className = "option-card bg-white dark:bg-[#2D2D2D] border border-gray-100 dark:border-gray-800 p-4 rounded-2xl shadow-sm mb-3";

        // --- 2. 修改重點：將按鈕文字改為「一鍵複製」，符合最小化方案 ---
        card.innerHTML = `
        <div class="flex items-center mb-2">
            <span class="option-badge bg-brand-light/50 dark:bg-brand-dark/30 text-brand-dark dark:text-brand-light text-xs font-bold px-2 py-1 rounded-md mr-2">${opt.title}</span>
        </div>
        <div class="option-text text-[15px] text-gray-700 dark:text-gray-100 mb-4 leading-relaxed">${opt.content}</div>
        
        <button onclick="sendToLine('${safeContent}')" 
                class="w-full py-2.5 bg-brand text-white text-sm rounded-xl font-bold transition border border-brand active:scale-95 shadow-md shadow-brand/20 flex items-center justify-center gap-1">
            <span>一鍵複製建議 ✨</span>
        </button>`;

        container.appendChild(card);
    });

    history.appendChild(container);
    history.scrollTop = history.scrollHeight;
}

function selectTone(tone, btn) {
    currentTone = tone;
    document.querySelectorAll('.tone-btn').forEach(b => {
        b.classList.remove('border-brand', 'bg-brand-light', 'text-brand-dark');
        b.classList.add('border-transparent', 'text-gray-500');
    });
    btn.classList.remove('border-transparent', 'text-gray-500');
    btn.classList.add('border-brand', 'bg-brand-light', 'text-brand-dark');
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({
            icon: 'success', title: '已複製！', html: '文字已複製到剪貼簿。', timer: 2000, showConfirmButton: false,
            background: '#E8F5F3', color: '#4DB6AC', iconColor: '#80CBC4',
            willClose: () => { if (liff.isInClient()) liff.closeWindow(); }
        });
    });
}

function copyResult() {
    const text = document.getElementById('result-text').innerText;
    copyText(text);
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// --- 設定選單邏輯 ---
function toggleSettings() {
    const drawer = document.getElementById('settings-drawer');
    const overlay = document.getElementById('settings-overlay');
    drawer.classList.toggle('translate-x-full');
    overlay.classList.toggle('hidden');
}

function setTheme(mode) {
    const html = document.documentElement;
    const body = document.body;

    if (mode === 'dark') {
        html.classList.add('dark');
        body.classList.add('dark-mode');
    } else {
        html.classList.remove('dark');
        body.classList.remove('dark-mode');
    }
}

function setFontSize(size) {
    const body = document.body;
    const btnStd = document.getElementById('btn-font-std');
    const btnLrg = document.getElementById('btn-font-lrg');

    if (size === 'large') {
        body.classList.add('large-font');
        btnLrg.classList.add('bg-white', 'shadow-sm', 'text-brand-dark');
        btnStd.classList.remove('bg-white', 'shadow-sm', 'text-brand-dark');
    } else {
        body.classList.remove('large-font');
        btnStd.classList.add('bg-white', 'shadow-sm', 'text-brand-dark');
        btnLrg.classList.remove('bg-white', 'shadow-sm', 'text-brand-dark');
    }
}

function shareToFriends() {
    if (liff.isApiAvailable('shareTargetPicker')) {
        liff.shareTargetPicker([
            {
                type: "text",
                text: "推薦給你這個好用的溝通練習工具：LittleTone！幫你把心裡話說得更好聽 🌱"
            }
        ]).then(() => console.log("分享成功")).catch(err => console.log("分享取消或失敗", err));
    } else {
        copyText("https://nonblasphemously-unquelled-betsey.ngrok-free.dev/");
        Swal.fire({ icon: 'info', title: '連結已複製', text: '您可以直接傳送給好友！' });
    }
}

// --- 計算字數 ---
function updateCount(type) {
    const input = document.getElementById('emotion-input');
    const display = document.getElementById('emotion-count');

    if (input && display) {
        const length = input.value.length;
        // 更新 UI 上的字數顯示
        display.innerText = `${length}/100`;

        // 如果超過 100 字，讓文字變紅作為警告
        if (length >= 100) {
            display.classList.add('text-red-400');
        } else {
            display.classList.remove('text-red-400');
        }
    }
}

function sendToLine(text) {
    if (!text) return;

    // 1. ✨ 自動隱藏邏輯：紀錄使用者已學會操作
    localStorage.setItem('hasLearnedMinimize', 'true');

    // 2. ✨ 立刻從畫面上移除引導條 (帶有淡出效果)
    const guide = document.getElementById('minimize-guide');
    if (guide) {
        guide.style.transition = 'opacity 0.5s ease';
        guide.style.opacity = '0';
        setTimeout(() => guide.remove(), 500);
    }

    // 3. 執行複製功能
    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({
            icon: 'success',
            title: '建議已複製！',
            html: `
                <div class="text-sm text-gray-600 space-y-2">
                    <p>文字已就緒，請依以下步驟貼上：</p>
                    <div class="bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300">
                        <b class="text-brand-dark">按住頂部橫槓往下滑</b><br>
                        將程式最小化為懸浮圓標 ✨
                    </div>
                    <p class="text-gray-500 text-[11px]">(或是點擊右上角 ✕ 關閉視窗)</p>
                    <p class="text-brand-dark font-bold pt-1">回到聊天室長按「貼上」即可！</p>
                </div>
            `,
            confirmButtonText: '我學會了！',
            confirmButtonColor: '#4DB6AC'
        });
    });
}

function confirmResetChat() {
    Swal.fire({
        title: '確定要清空嗎？',
        text: "目前的對話建議將會消失喔！",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#80CBC4',
        cancelButtonColor: '#ffabb2',
        confirmButtonText: '確定清空',
        cancelButtonText: '取消'
    }).then((result) => {
        if (result.isConfirmed) {
            resetChat();
            toggleSettings(); // 關閉設定選單
        }
    });
}

function resetChat() {
    const history = document.getElementById('chat-history');

    // 1. 清空所有內容
    history.innerHTML = '';

    // 2. 重新放入初始歡迎訊息
    const welcomeHtml = `
        <div class="flex items-start animate-fade-in-up">
            <div class="bg-white dark:bg-[#2D2D2D] border border-gray-100 dark:border-gray-800 rounded-2xl rounded-tl-none px-5 py-3 text-sm max-w-[85%] shadow-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                嗨！我是 LittleTone。<br>我們開始一段新的對話吧！今天有什麼想聊的嗎？🌱
            </div>
        </div>
    `;
    history.innerHTML = welcomeHtml;

    // 3. 重置全域變數
    hiddenOptions = [];
    currentCoachData = null;

    // 4. (選用) 如果後端有 Session，可以發送請求清除
    // fetch('/api/reset', { method: 'POST' });

    Swal.fire({
        icon: 'success',
        title: '已重置',
        timer: 1000,
        showConfirmButton: false
    });
}
