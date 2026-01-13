import os
import json
import re
from openai import AsyncOpenAI
from .prompts import get_formatted_prompt
from .rag_service import retrieve_social_knowledge
from .image_service import ImageService

# 初始化 OpenAI 客戶端
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ChatService:
    @staticmethod
    async def get_little_tone_final_response(user_text, image_base64=None, history=None):
        """
        核心邏輯：整合 RAG 檢索、歷史紀錄、圖片壓縮與 OpenAI 生成。
        """
        try:
            # 1. 執行 RAG 檢索 (維持你的內部自動呼叫邏輯)
            context_info = retrieve_social_knowledge(user_text)
            
            # 2. 產生成含有在地化知識的 System Prompt
            system_prompt = get_formatted_prompt(context_info)
            messages = [{"role": "system", "content": system_prompt}]
            
            # 3. 注入對話紀錄 (採納組員的 History 管理，維持連貫性)
            if history and isinstance(history, list):
                # 取最近 6 則訊息以維持上下文記憶
                messages.extend(history[-6:])
            
            # 4. 構建當前的使用者輸入內容
            user_content = []
            if user_text:
                user_content.append({"type": "text", "text": user_text})
            elif image_base64:
                # 若僅有圖片，給予預設指令
                user_content.append({"type": "text", "text": "請幫我分析這張截圖的社交脈絡。"})
                
            # 5. 處理圖片壓縮 (維持你的效能優化邏輯)
            if image_base64:
                # 呼叫 ImageService 進行二次壓縮，節省成本
                compressed_image = ImageService.process_and_compress_base64(image_base64)
                user_content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{compressed_image}",
                        "detail": "high" # 確保 AI 能看清截圖文字
                    }
                })

            messages.append({"role": "user", "content": user_content})

            # 6. 呼叫 OpenAI
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                response_format={"type": "json_object"}, # 確保輸出格式
                temperature=0.4 # 取中間值，兼顧穩定與創意
            )

            # 7. 使用組員的 JSON 清理機制解析結果
            return ChatService._parse_json_content(response.choices[0].message.content)

        except Exception as e:
            print(f"[ChatService Error]: {str(e)}")
            return ChatService._get_error_response()

    @staticmethod
    def _parse_json_content(content: str) -> dict:
        """
        解析並清理 AI 回傳的 JSON，移除可能干擾的標籤。
        """
        try:
            # 採納組員的正規表達式清理機制
            clean_str = re.sub(r"```json\n?|\n?```", "", content).strip()
            return json.loads(clean_str)
        except Exception:
            return ChatService._get_error_response()

    @staticmethod
    def _get_error_response() -> dict:
        """
        系統錯誤時的預設回傳，Key 值已修正為符合你的前端格式。
        """
        return {
            "reply": "不好意思，我剛剛稍微走神了...可以請你再說一次嗎？🌱",
            "key_change": "💡 核心洞察：伺服器連線暫時不穩。",
            "suggested_scenarios": [], # 維持你的欄位名稱
            "analysis": "Error",
            "tip": "建議檢查 API Key 餘額或網路連線。"
        }

# 確保 app.py 的調用接口正常運作
get_little_tone_final_response = ChatService.get_little_tone_final_response