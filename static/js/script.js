// --- 1. 全域變數與狀態管理 ---
let chatHistory = [];
let currentSuggestedScenarios = [];
let currentCoachData = null;
let currentImageBase64 = null;
let isLiffReady = false;

// --- 2. 初始化邏輯 ---
document.addEventListener('DOMContentLoaded', () => {
    // 檢查引導紀錄
    if (localStorage.getItem('hasLearnedMinimize') === 'true') {
        const guide = document.getElementById('minimize-guide');
        if (guide) guide.remove();
    }
    initializeLiff();
});

async function initializeLiff() {
    try {
        const liffId = window.MY_LIFF_ID;
        if (!liffId) return;
        await liff.init({ liffId });
        isLiffReady = true;
    } catch (error) {
        console.warn("LIFF 初始化失敗");
    }
}

const LOADING_HTML = `
    <div class="flex space-x-1.5 h-6 items-center px-1">
        <div class="w-2 h-2 rounded-full bg-brand animate-bounce-dot"></div>
        <div class="w-2 h-2 rounded-full bg-brand animate-bounce-dot delay-100"></div>
        <div class="w-2 h-2 rounded-full bg-brand animate-bounce-dot delay-200"></div>
    </div>
`;


// --- 2. 核心對話邏輯 (合併並修正後的 sendEmotion) ---
async function sendEmotion() {
    const inputElement = document.getElementById('emotion-input');
    const text = inputElement.value.trim();

    if (!text && !currentImageBase64) {
        Swal.fire({ icon: 'info', title: '請輸入訊息或上傳截圖喔！' });
        return;
    }

    resetScenarioUI(); // 重置 UI

    const payloadText = text;
    const payloadImage = currentImageBase64;

    inputElement.value = "";
    clearImage();
    updateCount();

    if (payloadImage) addMessage(payloadImage, 'user', false, true);
    if (payloadText) addMessage(payloadText, 'user');

    const loadingId = addMessage('<div class="flex space-x-1.5 h-6 items-center px-1"><div class="w-2 h-2 rounded-full animate-bounce bg-brand"></div><div class="w-2 h-2 rounded-full animate-bounce delay-100 bg-brand"></div><div class="w-2 h-2 rounded-full animate-bounce delay-200 bg-brand"></div></div>', 'system', true);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: payloadText,
                image: payloadImage ? payloadImage.split(',')[1] : null,
                history: chatHistory
            })
        });

        const jsonResponse = await res.json();
        removeMessage(loadingId);

        if (jsonResponse.status === "success") {
            const data = jsonResponse.data;
            addMessage(data.reply, 'system');
            if (data.key_change) addHighlightBubble(data.key_change);

            // 更新記憶庫：確保 AI 能記得剛才聊過什麼
            chatHistory.push({ "role": "user", "content": payloadText || "📷 [發送截圖分析]" });
            chatHistory.push({ "role": "assistant", "content": data.reply });

            currentSuggestedScenarios = data.suggested_scenarios || [];
            currentCoachData = { analysis: data.analysis, tip: data.tip };

            // 診斷分流 UI
            if (data.status === "diagnosing") {
                addQuickReplyChips(currentSuggestedScenarios);
            } else {
                addReadyButton();
            }
        }
    } catch (e) {
        removeMessage(loadingId);
        addMessage('連線不穩，請再試一次。', 'system');
    }
}

// 診斷階段的快捷按鈕 (Chip)
function addQuickReplyChips(options) {
    const history = document.getElementById('chat-history');
    const container = document.createElement('div');
    container.className = "suggested-scenarios-container flex flex-wrap gap-2 mt-2 mb-4 animate-fade-in-up ml-2";

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = "px-4 py-2 bg-white dark:bg-gray-800 border border-brand text-brand-dark text-[13px] rounded-full shadow-sm active:scale-95 transition-all";
        btn.innerText = opt.title;
        btn.onclick = () => {
            // ✨ 修正：引導按鈕點擊後將 example 填入並自動發送
            document.getElementById('emotion-input').value = opt.example || opt.content;
            sendEmotion();
            container.remove();
        };
        container.appendChild(btn);
    });
    history.appendChild(container);
    history.scrollTop = history.scrollHeight;
}

// 資訊充足後的生成按鈕
function addReadyButton() {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.id = 'btn-ready-container';
    div.className = "flex justify-end mt-3 mb-6 animate-fade-in-up";
    div.innerHTML = `<button onclick="showFinalScenarios()" class="bg-brand-light text-brand-dark px-5 py-2.5 rounded-full text-sm font-bold shadow-sm active:scale-95 flex items-center space-x-1">
        <span>生成建議語氣 ✨</span>
    </button>`;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

function showFinalScenarios() {
    const oldBtn = document.getElementById('btn-ready-container');
    if (oldBtn) oldBtn.remove();
    addOptionCards(currentSuggestedScenarios);
    if (currentCoachData) addCoachCardToHistory(currentCoachData.analysis, currentCoachData.tip);
}

// --- 3. 圖片處理邏輯 ---
function handleImagePreview(input) {
    const file = input.files[0];
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');

    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({ icon: 'error', title: '圖片太大了', text: '請選擇 5MB 以下的檔案' });
            clearImage();
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            currentImageBase64 = e.target.result;
            previewImage.src = e.target.result;
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function clearImage() {
    currentImageBase64 = null;
    const input = document.getElementById('image-input');
    if (input) input.value = ""; // 清空檔案選擇器

    const container = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');

    if (container) {
        container.classList.add('hidden'); // 隱藏預覽容器
    }
    if (previewImg) {
        previewImg.src = ""; // 清空圖片路徑
    }
}

// --- 4. UI 輔助函式 ---
function addMessage(content, sender, isHtml = false, isImage = false) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.id = 'msg-' + Math.random().toString(36).substr(2, 9);
    div.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-5 animate-fade-in-up`;

    const bubble = document.createElement('div');
    bubble.className = `px-5 py-3 text-[15px] max-w-[88%] rounded-2xl shadow-sm leading-relaxed ${sender === 'user'
        ? 'bg-gradient-to-br from-brand to-brand-dark text-white rounded-tr-none shadow-brand/20'
        : 'bg-white dark:bg-[#2D2D2D] text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100/50'}`;

    if (isImage) {
        const img = document.createElement('img');
        img.src = content;
        img.className = "rounded-lg max-w-full h-auto cursor-pointer";
        img.onclick = () => window.open(content);
        bubble.appendChild(img);
    } else if (isHtml) {
        bubble.innerHTML = content;
    } else {
        bubble.innerText = content;
    }

    div.appendChild(bubble);
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
    return div.id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function addHighlightBubble(text) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.className = "flex justify-start mb-2 animate-fade-in-up";
    div.innerHTML = `<div class="bg-yellow-50 border border-yellow-200 text-yellow-800 text-[11px] px-3 py-1 rounded-full shadow-sm ml-2">${text}</div>`;
    history.appendChild(div);
}

function addReadyButton() {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.id = 'btn-ready-container';
    div.className = "flex justify-end mt-3 mb-6 animate-fade-in-up";
    div.innerHTML = `<button onclick="showOptions()" class="bg-brand-light text-brand-dark px-5 py-2.5 rounded-full text-sm font-bold shadow-sm hover:bg-brand-light/80 transition active:scale-95 flex items-center space-x-1">
        <span>生成建議語氣 ✨</span>
    </button>`;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
}

function showOptions() {
    if (!currentSuggestedScenarios || currentSuggestedScenarios.length < 2) return;

    const history = document.getElementById('chat-history');
    const container = document.createElement('div');
    // 使用新的 Class 以便精確控制樣式
    container.className = "suggested-scenarios-container space-y-2 mt-2 mb-6 animate-fade-in-up ml-2";

    container.innerHTML = `
        <p class="text-[10px] text-gray-400 font-bold mb-1 ml-1 tracking-wider">💡 猜你想處理的情境是：</p>
        <div class="flex flex-wrap gap-2">
            ${currentSuggestedScenarios.map((scen, i) => `
                <button onclick="handleScenarioSelection(${i})" 
                    class="bg-white dark:bg-[#2D2D2D] border border-brand/30 text-brand-dark dark:text-brand-light px-3 py-1.5 rounded-full text-[13px] font-medium shadow-sm active:scale-90 transition-all">
                    🎯 ${scen.title}
                </button>
            `).join('')}
            <button onclick="handleNeitherSelection(this)" 
                class="bg-gray-50 dark:bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full text-[13px] active:scale-90 transition-all">
                都不是
            </button>
        </div>
    `;

    history.appendChild(container);
    history.scrollTop = history.scrollHeight;
}

function handleScenarioSelection(index) {
    if (!currentSuggestedScenarios || !currentSuggestedScenarios[index]) return;
    const scenario = currentSuggestedScenarios[index];
    resetScenarioUI();

    addOptionCards([{
        title: scenario.title,
        example: scenario.example
    }]);

    if (currentCoachData) {
        addCoachCardToHistory(currentCoachData.analysis, currentCoachData.tip);
    }
}

// 處理情境選擇 (1 or 2)
function handleNeitherSelection(btnElement) {
    const parent = btnElement.parentElement;
    // 隱藏原本的按鈕群
    parent.classList.add('hidden');

    const inputContainer = document.createElement('div');
    inputContainer.className = "flex items-center space-x-2 mt-2 animate-fade-in";
    inputContainer.innerHTML = `
        <input type="text" id="custom-tone-input" placeholder="想要什麼語氣？(例：更強硬一點)" 
            class="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand">
        <button onclick="sendCustomToneRequest()" class="text-brand p-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
        </button>
    `;
    parent.parentElement.appendChild(inputContainer);
    document.getElementById('custom-tone-input').focus();
}

// 處理使用者手動輸入的特定語氣要求
async function sendCustomToneRequest() {
    const customInput = document.getElementById('custom-tone-input');
    const toneText = customInput.value.trim();
    if (!toneText) return;

    resetScenarioUI();
    addMessage(`希望能調整成這個語氣：${toneText}`, 'user');
    customInput.parentElement.remove();
    const loadingId = addMessage(LOADING_HTML, 'system', true);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `(指令：請針對目前的社交脈絡，直接以「${toneText}」的語氣產出一組回覆範例。內容請放在 JSON 的 "reply" 欄位。)`,
                image: null,
                history: chatHistory
            })
        });
        const jsonResponse = await res.json();
        removeMessage(loadingId);

        if (jsonResponse.status === "success") {
            const data = jsonResponse.data;
            addOptionCards([{ title: `✨ ${toneText}語氣建議`, example: data.reply }]);
            if (data.analysis && data.tip) addCoachCardToHistory(data.analysis, data.tip);
        }
    } catch (e) {
        removeMessage(loadingId);
        addMessage('語氣調整失敗。', 'system');
    }
}

function addOptionCards(options) {
    const history = document.getElementById('chat-history');
    const container = document.createElement('div');
    container.className = "flex flex-col space-y-3 mt-2 ml-2 mb-6 animate-fade-in-up";

    options.forEach((opt) => {
        // ✨ 強大防呆：解決 replace 報錯的核心修正
        const rawContent = opt.example || opt.content || "";
        if (!rawContent) return;

        const safeContent = rawContent.replace(/'/g, "\\'").replace(/\n/g, "\\n");
        const card = document.createElement('div');
        card.className = "option-card bg-white dark:bg-[#2D2D2D] border border-gray-100 dark:border-gray-800 p-4 rounded-2xl shadow-sm mb-3";
        card.innerHTML = `
            <div class="flex items-center mb-2">
                <span class="option-badge bg-brand-light/50 text-brand-dark text-xs font-bold px-2 py-1 rounded-md mr-2">${opt.title}</span>
            </div>
            <div class="option-text text-[15px] text-gray-700 dark:text-gray-100 mb-4 leading-relaxed">${rawContent}</div>
            <button onclick="sendToLine('${safeContent}')" class="w-full py-2.5 bg-brand text-white text-sm rounded-xl font-bold active:scale-95">一鍵複製建議 ✨</button>`;
        container.appendChild(card);
    });
    history.appendChild(container);
    history.scrollTop = history.scrollHeight;
}

function addCoachCardToHistory(analysis, tip) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.className = "mb-6 animate-fade-in-up ml-2";
    const id = 'coach-' + Date.now();
    div.innerHTML = `
        <div class="bg-white dark:bg-[#2D2D2D] border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <button onclick="toggleCoach('${id}')" class="w-full flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/50">
                <span class="text-[11px] font-bold text-gray-400">💡 為什麼 LittleTone 這樣說？</span>
                <svg id="icon-${id}" class="w-4 h-4 text-gray-300 transform transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div id="${id}" class="hidden p-4 space-y-3 text-[13px] border-t border-gray-50">
                <div><span class="text-brand-dark font-bold text-[10px] block mb-1">🔍 診斷分析</span><p class="text-gray-600 dark:text-gray-300">${analysis}</p></div>
                <div class="pt-2 border-t border-gray-50"> <span class="text-brand-dark font-bold text-[10px] block mb-1">🎓 深度學習</span><p class="text-gray-600 dark:text-gray-300">${tip}</p></div>
            </div>
        </div>`;
    history.appendChild(div);
}

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
    content.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
}

// --- 5. 其他功能 (切換 Tab, 複製, 字數統計) ---
function switchTab(tab) {
    const btn1 = document.getElementById('btn-tab1');
    const btn2 = document.getElementById('btn-tab2');
    const container = document.getElementById('views-container');

    // 如果找不到切換容器，直接跳出不執行
    if (!container) return;

    if (tab === 'emotion') {
        container.classList.remove('-translate-x-1/2');
        container.classList.add('translate-x-0');
        if (btn1) updateTabBtnStyle(btn1, true);
        if (btn2) updateTabBtnStyle(btn2, false);
    } else {
        container.classList.remove('translate-x-0');
        container.classList.add('-translate-x-1/2');
        if (btn2) updateTabBtnStyle(btn2, true);
        if (btn1) updateTabBtnStyle(btn1, false);
    }
}

function updateTabBtnStyle(btn, isActive) {
    if (isActive) {
        btn.classList.add('bg-white', 'text-brand-dark', 'shadow-sm');
        btn.classList.remove('text-gray-400');
    } else {
        btn.classList.remove('bg-white', 'text-brand-dark', 'shadow-sm');
        btn.classList.add('text-gray-400');
    }
}

function updateCount() {
    const input = document.getElementById('emotion-input');
    const display = document.getElementById('emotion-count');
    if (input && display) {
        const len = input.value.length;
        display.innerText = `${len}/100`;
        display.classList.toggle('text-red-400', len >= 100);
    }
}

function sendToLine(text) {
    localStorage.setItem('hasLearnedMinimize', 'true');
    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({
            icon: 'success',
            title: '建議已複製！',
            html: '<div class="text-sm">按住頂部橫槓往下滑，最小化程式回到聊天室長按貼上即可！</div>',
            confirmButtonText: '我學會了！',
            confirmButtonColor: '#4DB6AC'
        });
    });
}

async function selectImageFromGallery() {
    // 檢查是否在 LIFF 環境
    if (!liff.isInClient()) {
        // 若不在 LINE 內，回退到原本的隱藏 input
        document.getElementById('image-input').click();
        return;
    }

    // 注意：部分 LIFF 版本支援原生選擇，若無則仍需使用過濾機制
    // 下面提供通用的「前端過濾」機制
    document.getElementById('image-input').click();
}

function handleImagePreview(input) {
    const file = input.files[0];
    const previewContainer = document.getElementById('image-preview-container');
    const previewImage = document.getElementById('image-preview');

    if (file) {
        // 1. 防範流量浪費：限制檔案大小 (限制為 5MB，節省傳輸流量)
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            Swal.fire({
                icon: 'warning',
                title: '檔案太大了',
                text: '為了幫你省流量，請選擇 5MB 以下的截圖喔！',
                confirmButtonColor: '#80CBC4'
            });
            clearImage();
            return;
        }

        // 2. 格式檢查 (只允許常見圖片格式)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            Swal.fire({ icon: 'error', title: '格式不符', text: '僅支援相簿中的 JPG 或 PNG 圖片。' });
            clearImage();
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            currentImageBase64 = e.target.result;
            previewImage.src = e.target.result;
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
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

function resetScenarioUI() {
    currentSuggestedScenarios = [];
    const oldOptions = document.querySelector('.suggested-scenarios-container');
    if (oldOptions) oldOptions.remove();
    const oldBtn = document.getElementById('btn-ready-container');
    if (oldBtn) oldBtn.remove();
}