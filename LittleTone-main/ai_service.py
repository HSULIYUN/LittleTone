# ai_service.py
# 這裡負責跟 OpenAI 連線，勿動

from openai import OpenAI
import os
import json
from dotenv import load_dotenv
import prompts # 匯入prompts.py

# 初始化
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_emotion_response(messages_history):
    """
    處理聊聊情緒的邏輯：
    接收包含對話歷史的列表，回傳包含 reply, options, key_change, analysis, tip 的字典。
    """
    try:
        # 組合系統角色指令與對話歷史
        # messages_history 格式為 [{"role": "user", "content": "..."}, ...]
        full_messages = [
            {"role": "system", "content": prompts.EMOTION_SYSTEM_PROMPT}
        ] + messages_history

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=full_messages # 傳送完整的對話上下文
        )
        
        # 解析 AI 回傳的 JSON 字串
        return json.loads(response.choices[0].message.content)
        
    except Exception as e:
        print(f"Error in emotion: {e}")
        # 保底回傳，確保欄位存在防止前端崩潰
        return {
            "reply": "抱歉，我現在有點累，能請您再說一次嗎？", 
            "options": [], 
            "key_change": "連線不穩定", 
            "analysis": "系統暫時無法分析", 
            "tip": "請稍後再嘗試與我聊聊。"
        }

def get_tone_rewrite(text, tone, modifier):
    """處理語氣轉化的邏輯：改為回傳 JSON 字典以包含教練資訊"""
    user_prompt = prompts.get_tone_prompt(text, tone, modifier)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"}, # 新增：要求 JSON 格式回傳
            messages=[
                {"role": "system", "content": prompts.TONE_SYSTEM_ROLE},
                {"role": "user", "content": user_prompt}
            ]
        )
        # 解析 AI 回傳的 JSON 字串為 Python 字典
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error in tone: {e}")
        # 保底回傳格式
        return {
            "result": "改寫失敗，請稍後再試。", 
            "key_change": "連線問題", 
            "analysis": "", 
            "tip": ""
        }