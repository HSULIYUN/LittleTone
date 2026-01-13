import os
import asyncio
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

# 1. 載入環境變數
load_dotenv()

# 2. 從 services 模組導入
from services import get_little_tone_final_response

app = Flask(__name__)
CORS(app)

# --- 安全性配置 ---
# 限制伺服器接收的請求大小上限為 5MB，防止惡意上傳超大檔案攻擊伺服器
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 

@app.route('/api/chat', methods=['POST'])
async def chat_endpoint():
    """
    接收前端 Payload 並回傳 LittleTone 建議。
    包含對圖片 Base64 的初步長度檢查以防止資源濫用。
    """
    try:
        # 取得前端 Payload
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "無效的請求內容"}), 400

        user_text = data.get('message', '')
        image_base64 = data.get('image', None)  

        # 驗證內容：必須有文字或圖片
        if not user_text and not image_base64:
            return jsonify({"status": "error", "message": "請提供文字訊息或圖片截圖"}), 400

        # --- 第一道防線：Base64 字串長度檢查 ---
        # 如果 Base64 字串過長（例如超過約 4MB），直接拒絕處理以節省伺服器頻寬
        if image_base64 and len(image_base64) > 4 * 1024 * 1024:
            print(f"[Security] 拒絕過大的圖片請求 (長度: {len(image_base64)})")
            return jsonify({"status": "error", "message": "圖片檔案過大，請選擇較小的截圖"}), 413

        # 3. 呼叫核心服務 (內部將會執行 ImageService 的強制壓縮)
        has_image = "有" if image_base64 else "無"
        print(f"[App] 正在處理請求: {user_text[:20]}... | 圖片內容: {has_image}")
        
        # 執行異步函式取得 AI 的完整 JSON 結果
        ai_json_result = await get_little_tone_final_response(user_text, image_base64)

        # 4. 回傳結果
        return jsonify({
            "status": "success",
            "data": ai_json_result
        })

    except Exception as e:
        print(f"[App] 伺服器發生錯誤: {str(e)}")
        return jsonify({"status": "error", "message": "伺服器忙碌中，請稍後再試"}), 500

@app.route('/', methods=['GET'])
def index():
    """
    導向網頁介面，並注入 LINE_LIFF_ID 到前端。
    """
    liff_id = os.getenv('LINE_LIFF_ID', '')
    # 這裡保留基本的 Debug log，方便確認環境變數是否有讀取成功
    if not liff_id:
        print("[Warning] .env 中未設定 LINE_LIFF_ID")
    
    return render_template('index.html', liff_id=liff_id)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "alive", "service": "LittleTone", "version": "2.0"})

# 錯誤處理：當檔案超過 MAX_CONTENT_LENGTH 時觸發
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"status": "error", "message": "上傳內容過大，已遭系統攔截"}), 413

if __name__ == '__main__':
    # host='0.0.0.0' 確保同區網設備或 ngrok 穿透能正常存取
    app.run(host='0.0.0.0', port=5000, debug=True)