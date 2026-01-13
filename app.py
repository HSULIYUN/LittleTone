import os
import asyncio
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

# 1. 載入環境變數
load_dotenv()

# 2. 從 services 模組導入
# 確保 chat_service.py 裡面有定義 async def get_little_tone_final_response
from services import get_little_tone_final_response

app = Flask(__name__)
CORS(app)  # 處理跨來源請求

@app.route('/api/chat', methods=['POST'])
async def chat_endpoint():
    """
    接收前端 Payload 並回傳 LittleTone 建議。
    注意：Flask 2.0+ 支援在路由函式前加上 async
    """
    try:
        # 取得前端 Payload
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "無效的請求內容"}), 400

        user_text = data.get('message', '')
        image_base64 = data.get('image', None)  

        if not user_text and not image_base64:
            return jsonify({"status": "error", "message": "請提供文字訊息或圖片截圖"}), 400

        # 3. 呼叫核心服務 (必須使用 await)
        has_image = "有" if image_base64 else "無"
        print(f"[App] 正在處理請求: {user_text[:20]}...")
        
        # 執行異步函式取得 AI 的完整 JSON 結果
        ai_json_result = await get_little_tone_final_response(user_text, image_base64)

        # 4. 回傳結果
        # 因為 ai_json_result 本身就是一個 dict (包含 reply, options, key_change 等)
        # 我們直接將其合併回傳即可
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
    導向原本的網頁介面，並將 .env 中的 LINE_LIFF_ID 傳遞給前端
    """
    # 修正點：讀取正確的環境變數名稱 LINE_LIFF_ID
    liff_id = os.getenv('LINE_LIFF_ID', '')
    
    # 偵錯用：在終端機印出是否有讀到（測試完可以刪除）
    print(f"[Debug] 讀取到的 LIFF ID: {liff_id}")
    
    # 透過 render_template 將變數傳給 index.html
    return render_template('index.html', liff_id=liff_id)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "alive", "service": "LittleTone"})

if __name__ == '__main__':
    # host='0.0.0.0' 確保 ngrok 與同區網設備可以存取
    app.run(host='0.0.0.0', port=5000, debug=True)