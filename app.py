import os
import asyncio
import traceback
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

# 1. 載入環境變數
load_dotenv()

# 2. 從 services 模組導入核心函式
from services import get_little_tone_final_response

app = Flask(__name__)
CORS(app)

# --- [安全性配置] 維持你的第一道防線 ---
# 限制請求大小上限為 5MB
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 

@app.route('/api/chat', methods=['POST'])
async def chat_endpoint():
    """
    接收前端 Payload 並回傳 AI 建議。
    整合了組員的對話記憶 (History) 與你的安全檢查。
    """
    try:
        # 取得前端 JSON 資料
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "無效的請求內容"}), 400

        # 讀取參數 (包含組員新增的 history)
        user_text = data.get('message', '')
        image_base64 = data.get('image', None)  
        chat_history = data.get('history', []) 

        # 驗證內容
        if not user_text and not image_base64:
            return jsonify({"status": "error", "message": "請提供文字訊息或圖片截圖"}), 400

        # --- [第二道防線] Base64 字串長度檢查 ---
        # 如果字串長度異常 (超過約 4MB)，直接攔截以節省頻寬
        if image_base64 and len(image_base64) > 4 * 1024 * 1024:
            print(f"[Security] 攔截過大的 Base64 請求 (長度: {len(image_base64)})")
            return jsonify({"status": "error", "message": "圖片檔案過大，請選擇較小的截圖"}), 413

        # 紀錄 Log 方便 Debug
        has_image = "有" if image_base64 else "無"
        print(f"[App] 處理請求: {user_text[:15]}... | 歷史紀錄: {len(chat_history)} 則 | 圖片: {has_image}")
        
        # 3. 呼叫核心服務：帶入 history 讓 AI 擁有記憶
        ai_json_result = await get_little_tone_final_response(
            user_text, 
            image_base64, 
            history=chat_history
        )

        # 4. 回傳結果
        return jsonify({
            "status": "success",
            "data": ai_json_result
        })

    except Exception as e:
        # 使用組員推薦的 traceback 列印詳細錯誤，方便開發階段 Debug
        traceback.print_exc()
        print(f"[App] 伺服器錯誤: {str(e)}")
        return jsonify({"status": "error", "message": "伺服器忙碌中，請稍後再試"}), 500

@app.route('/', methods=['GET'])
def index():
    """ 渲染首頁並傳遞 LIFF ID 給前端 """
    liff_id = os.getenv('LINE_LIFF_ID', '')
    if not liff_id:
        print("[Warning] .env 中未設定 LINE_LIFF_ID")
    return render_template('index.html', liff_id=liff_id)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "alive", "service": "LittleTone", "version": "2.5"})

# 錯誤處理：檔案超過 5MB 時自動回傳 413
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"status": "error", "message": "上傳內容過大，已遭系統攔截"}), 413

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)