# LittleTone | 基於在地化 RAG 之 AI 社交溝通教練 💬

[![Award](https://img.shields.io/badge/Award-LINE%20FRESH%202025%20Finalist-green?style=for-the-badge)](https://github.com/YourAccount/LittleTone)
[![Python](https://img.shields.io/badge/Backend-Flask-lightgrey?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![LINE](https://img.shields.io/badge/Platform-LINE%20LIFF-blue?style=flat-square&logo=line)](https://developers.line.biz/zh-hant/docs/liff/)

> **「語氣雖小，卻能改變一段關係。」** —— LittleTone 致力於將 AI 轉化為數位溝通中的「情緒緩衝區」與「語氣教練」。

## 🏆 榮譽肯定
* **LINE FRESH 2025 校園競賽 - 決賽入圍 (Top 10 / 200+ 隊伍)**。

---

## 📖 專案背景
在台灣，LINE 是最主要的社交與職場連繫橋樑。然而，純文字溝通缺乏聲調輔助，常導致訊息被解讀為冷淡或不耐煩，進而引發「表達癱瘓」的社交焦慮 。

**LittleTone** 透過 **LINE LIFF** 原生整合，讓使用者無須跨 App 切換，即可在對話當下進行語氣調整與情緒診斷，大幅提升人際關係的「容錯率」。

---

## ✨ 技術核心與亮點

### 1. 台灣在地化社交知識庫
針對台灣特有的「委婉語境」與「社交客套」（例如：辨識「下次約吃飯」是真心邀約還是客套）建立專屬話術庫。使 AI 回覆不再生硬，而是更符合台灣社會禮儀。

### 2. 輕量化高效 RAG 檢索架構
為了優化行動裝置的執行效率，實作了基於 **JSON 格式的輕量化 RAG 系統**：
* **精準檢索**：將社交情境與非暴力溝通模型結構化，確保毫秒級的回應速度 。
* **增強生成**：透過動態 Prompt 工程，產出具備「情緒共情」與「核心洞察」的高質量建議。

### 3. 多重系統安全防禦
* **流量限制**：後端實作 **HTTP 429 Rate Limiting**，精準攔截惡意頻繁請求。
* **資產保護**：前端腳本經過混淆處理，並將核心 AI 邏輯與 API 金鑰嚴格封裝於伺服器端。
* **圖片預處理**：內建截圖壓縮與 Base64 編碼邏輯，優化 Vision 模型的傳輸負擔。

---


## 🎨 主要負責項目 (Core Contributions)
<p align="center">
   <img width="30%" alt="littletone_ux" src="https://github.com/user-attachments/assets/7734d911-d11b-40f5-b841-1922154f277d" />
   <img width="30%" alt="littletone_ui" src="https://github.com/user-attachments/assets/ac6fdd86-1337-48c0-bba8-7836985aa7a3" />
</p>

我主要製作了「情緒安定感」出發的介面設計，以及支撐 RAG 系統運作的核心在地化知識庫。
### 1. 具「情緒緩衝」作用的視覺語彙
在面對社交焦慮的情境下，過於刺眼或複雜的介面會增加壓力。因此在 **Figma** 流程設計中：
* **色調選擇**：選用了大量的白色與淺灰色作為基底，搭配具有生命力的「嫩綠色」作為點綴（如 logo 中的圖標與發送鍵）。綠色在心理學上代表成長與平靜，能有效降低使用者在尋求情緒分析時的焦慮感。
* **低負擔體驗**：優化了從截圖上傳到結果產出的互動路徑，確保使用者在焦慮當下能以最少的操作獲得精準建議。

### 2. 基於學術常模的 500+ 在地化語料庫
為了讓 AI 的「診斷」不再只是生硬的翻譯，我建立了專屬的 RAG 知識底座：
* **學術實證對齊**：參考 **《台灣地區華人情緒與相關心理生理資料庫——中文情緒詞常模研究》**，將學術界針對台灣華人情緒向度（如正負向性、激發水準）的規範，融入資料標註邏輯中。
* **500 筆親自灌錄語料**：
    * **拒絕冷冰冰的 AI 感**：不同於市面上通用的對話模型，我手動整理並錄入了 500 筆以上台灣特有的「社交委婉語」與「客套話」場景（例如：辨識職場上的『再看看』與朋友間的『下次約』之微差）。
    * **在地化語氣校準**：這份知識庫讓 AI 能更精準地識別台灣社會特有的語境微差，確保產出的回覆建議具備「台式人情世故」的溫度，而非機械式的改寫。

---

## 🛠️ 技術堆疊 (Tech Stack)

* **Full-stack Dev**: Python Flask (後端), JavaScript (前端), Tailwind CSS。
* **AI Models**: OpenAI GPT-4o (Text & Vision 多模態處理)。
* **Framework**: LINE Front-end Framework (LIFF)。
* **Infrastructure**: Vercel Serverless Architecture。

---

## 📂 專案結構
```text
LittleTone/
├── app.py              # 應用程式入口：含後端速率限制機制
├── services/           # 核心邏輯層
│   ├── chat_service.py # 整合 OpenAI 與複雜 Prompt 策略
│   ├── rag_service.py  # 實作輕量化知識檢索
│   └── image_service.py# 處理圖片編碼與 Vision 分析
├── data/               # 核心知識庫 (台灣在地化社交話術)
├── static/             # 靜態資源 (含前端邏輯與 UI 樣式)
└── templates/          # 前端 HTML 模板
```

---

<details>
<summary>🚀 點擊展開：開發環境配置與快速開始 (Quick Start)</summary>

### 1. 安裝依賴項目
建議使用 **Python 3.9+** 環境，並執行以下指令安裝必要套件（包含 Flask、OpenAI、python-dotenv 等）：

```bash
# 安裝所有必要套件
pip install -r requirements.txt
```
### 2. 設定環境變數

請在專案根目錄建立 `.env` 檔案，並填入以下資訊（可參考 `.env.example`）：

```ini
OPENAI_API_KEY=your_openai_api_key_here
LINE_LIFF_ID=your_liff_id_here
```
### 3. 啟動伺服器

```bash
python app.py
```

伺服器預設將在 `http://localhost:5000` 啟動。
</details>

---

## 👥 團隊成員與分工 (Team & Contributions)

本專案為 **LINE FRESH 2025** 參賽作品，由團隊 5 人共同協作完成：

* **Kinomoo** | **核心開發與系統架構 (Lead Developer)**
  * 負責全端程式碼撰寫、RAG 系統設計、AI 模型整合以及伺服器部署。
* **Eva** | **專案組長與報告 (Project Lead & Presentation)**
  * 負責專案時程統籌、產品定位開發及決賽現場簡報報告。
* **Hiu** | **介面設計與資料整理 (UI Design & Data Collection)**
  * 負責 Figma 介面原型設計及 RAG 資料庫設計。
* **Momo** | **AI 提示詞設計 (AI Prompt Design)**
  * 負責對話情境架構規劃與 AI 提示詞 (Prompt) 策略設計。
* **Sherry** | **使用者研究與測試 (User Research & Testing)**
  * 負責目標族群訪談招募、使用者回饋收集與決賽現場演示。
  
---
> **附註**：基於隱私考量，團隊成員均以英文名/代稱顯示。本儲存庫中所有原始碼之技術實作與維護由 **Kinomoo** 獨立完成。

<p align="center">
  © 2025 LittleTone Team. All Rights Reserved.
</p>
