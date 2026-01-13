// --- 全域變數 ---
let isLiffReady = false;
let currentTone = '溫和';
let hiddenOptions = [];
let currentCoachData = null;
let currentImageBase64 = null; // 儲存圖片 Base64

// --- 1. 初始化邏輯 ---
document.addEventListener('DOMContentLoaded', () => {
    // 檢查引導紀錄
    if (localStorage.getItem('hasLearnedMinimize') === 'true') {
        const guide = document.getElementById('minimize-guide');
        if (guide) guide.remove();
    }

    // 初始化 LIFF (支援本地開發模式)
    initializeLiff();
});

async function initializeLiff() {
    try {
        // 從 window 全域物件中讀取我們剛才注入的變數
        const liffId = window.MY_LIFF_ID;

        if (!liffId || liffId === "") {
            console.warn("⚠️ [LIFF] 未偵測到 LINE_LIFF_ID，進入純網頁測試模式");
            return;
        }

        // 檢查 LIFF SDK 是否正常載入
        if (typeof liff === 'undefined') {
            console.error("❌ [LIFF] 找不到 LIFF SDK，請確認 HTML 內有引入 CDN 連結");
            return;
        }

        await liff.init({ liffId });
        isLiffReady = true;

    } catch (error) {
        console.warn("❌ [LIFF] 初始化失敗:", error.message);
    }
}

// --- 2. 核心對話邏輯 (合併並修正後的 sendEmotion) ---
async function sendEmotion() {
    const inputElement = document.getElementById('emotion-input');
    const text = inputElement.value.trim();

    if (!text && !currentImageBase64) {
        Swal.fire({ icon: 'info', title: '請輸入訊息或上傳圖片喔！' });
        return;
    }

    const oldBtn = document.getElementById('btn-ready-container');
    if (oldBtn) oldBtn.remove();

    // --- 新增：如果使用者有傳圖片，先在聊天室顯示圖片 ---
    if (currentImageBase64) {
        addMessage(currentImageBase64, 'user', false, true);
    }

    // 顯示文字訊息
    if (text) {
        addMessage(text, 'user');
    }

    const loadingHtml = `
    <div class="flex space-x-1.5 h-6 items-center px-1">
        <div class="w-2 h-2 rounded-full bg-brand animate-bounce-dot"></div>
        <div class="w-2 h-2 rounded-full bg-brand animate-bounce-dot delay-100"></div>
        <div class="w-2 h-2 rounded-full bg-brand animate-bounce-dot delay-200"></div>
    </div>
`;
    const loadingId = addMessage(loadingHtml, 'system', true);
    // 準備 Payload
    const payload = {
        message: text,
        // 只傳送逗號後面的純 Base64 字串給後端處理
        image: currentImageBase64 ? currentImageBase64.split(',')[1] : null
    };

    try {
        inputElement.value = "";
        updateCount();
        clearImage(); // 傳送後清空預覽

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const jsonResponse = await res.json();
        removeMessage(loadingId);

        if (jsonResponse.status === "success") {
            const data = jsonResponse.data;
            addMessage(data.reply, 'system');
            if (data.key_change) addHighlightBubble(data.key_change);
            hiddenOptions = data.options || [];
            currentCoachData = { analysis: data.analysis, tip: data.tip };
            addReadyButton();
        }
    } catch (e) {
        removeMessage(loadingId);
        addMessage('連線不穩，請再試一次。', 'system');
    }
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
            currentImage64 = e.target.result; // 這邊會包含 data:image/jpeg;base64,...
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
    if (input) input.value = "";
    const container = document.getElementById('image-preview-container');
    if (container) container.classList.add('hidden');
}

// --- 4. UI 輔助函式 ---
function addMessage(content, sender, isHtml = false, isImage = false) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    const id = 'msg-' + Math.random().toString(36).substr(2, 9);
    div.id = id;
    div.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-5 animate-fade-in-up`;

    const bubble = document.createElement('div');
    bubble.className = `px-5 py-3 text-[15px] max-w-[88%] rounded-2xl shadow-sm leading-relaxed ${sender === 'user'
        ? 'bg-gradient-to-br from-brand to-brand-dark text-white rounded-tr-none shadow-brand/20'
        : 'bg-white dark:bg-[#2D2D2D] text-gray-700 dark:text-gray-200 rounded-tl-none border border-gray-100/50 dark:border-gray-800'
        }`;

    if (isImage) {
        // 如果是圖片，創建一個 img 標籤
        const img = document.createElement('img');
        img.src = content; // 這裡傳入完整的 data:image/... base64
        img.className = "rounded-lg max-w-full h-auto mt-1 cursor-pointer";
        img.onclick = () => window.open(content); // 點擊可看大圖
        bubble.appendChild(img);
    } else if (isHtml) {
        bubble.innerHTML = content;
    } else {
        bubble.innerText = content;
    }

    div.appendChild(bubble);
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

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
    if (hiddenOptions && hiddenOptions.length > 0) {
        addOptionCards(hiddenOptions);
    }
    if (currentCoachData) {
        addCoachCardToHistory(currentCoachData.analysis, currentCoachData.tip);
    }
    const btnContainer = document.getElementById('btn-ready-container');
    if (btnContainer) btnContainer.remove();
}

function addOptionCards(options) {
    const history = document.getElementById('chat-history');
    const container = document.createElement('div');
    container.className = "flex flex-col space-y-3 mt-2 ml-2 mb-6 animate-fade-in-up";

    options.forEach((opt) => {
        const safeContent = opt.content.replace(/'/g, "\\'").replace(/\n/g, "\\n");
        const card = document.createElement('div');
        card.className = "option-card bg-white dark:bg-[#2D2D2D] border border-gray-100 dark:border-gray-800 p-4 rounded-2xl shadow-sm mb-3";

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

function addCoachCardToHistory(analysis, tip) {
    const history = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.className = "mb-6 animate-fade-in-up ml-2";
    const accordionId = 'coach-' + Date.now();
    div.innerHTML = renderAccordionHTML(accordionId, analysis, tip);
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