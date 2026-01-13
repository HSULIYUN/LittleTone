import base64
from PIL import Image
import io

class ImageService:
    @staticmethod
    def process_and_compress_base64(base64_str):
        """
        接收前端的 Base64 字串，進行縮放與壓縮，再回傳優化後的 Base64。
        目的：防範流量浪費、節省 OpenAI Token 成本。
        """
        if not base64_str:
            return None

        try:
            # 1. 將 Base64 解碼為圖片物件
            img_data = base64.b64decode(base64_str)
            img = Image.open(io.BytesIO(img_data))
            
            # 紀錄原始大小 (除錯用)
            original_size = len(base64_str)

            # 2. 強制縮放：將長邊限制在 800px
            # 截圖在此尺寸下 GPT-4o 仍能清楚辨識文字，但 Token 消耗會大幅降低
            max_size = 800
            if max(img.width, img.height) > max_size:
                img.thumbnail((max_size, max_size), Image.LANCZOS)

            # 3. 壓縮並轉檔
            buffered = io.BytesIO()
            # 轉成 RGB (避免 PNG 的透明層出錯) 並儲存為 JPEG
            # quality=70 是兼顧清晰度與檔案大小的高CP值設定
            img.convert("RGB").save(buffered, format="JPEG", quality=70, optimize=True)
            
            # 4. 重新編碼為 Base64
            compressed_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
            
            # 紀錄壓縮後大小
            compressed_size = len(compressed_str)
            reduction = (1 - compressed_size / original_size) * 100
            print(f"[ImageService] 圖片優化完成：縮小了 {reduction:.1f}% 資料量")

            return compressed_str

        except Exception as e:
            print(f"[ImageService] 圖片處理出錯: {e}")
            return None

    def encode_local_image_to_base64(self, image_path):
        """
        (備用) 若需要讀取伺服器本地圖片時使用
        """
        try:
            with open(image_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            print(f"[ImageService] 本地檔案讀取失敗: {e}")
            return None