# ==============================================================================
# OmniTrans LIVE - 무료 Qwen-TTS 보이스 클로닝 백엔드 서버 (Google Colab / Local GPU)
# 
# [실행 방법]
# 1. Google Colab (무료 T4 GPU 환경)을 엽니다.
# 2. 첫 번째 셀에서 필요한 패키지를 설치합니다:
#    !pip install -q -U qwen-tts soundfile fastapi uvicorn pyngrok nest_asyncio python-multipart
# 3. 이 스크립트를 Colab에서 실행하면 무료 퍼블릭 ngrok URL이 생성됩니다.
# 4. 생성된 URL (예: https://xxxx.ngrok-free.app)을 OmniTrans 웹앱 설정창에 넣으시면 끝!
# ==============================================================================

import os
import io
import base64
import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from qwen_tts import Qwen3TTSModel
import uvicorn
import nest_asyncio

app = FastAPI(title="OmniTrans Qwen-TTS Voice Clone API")

# CORS 허용 (OmniTrans 웹앱과 통신)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. GPU 및 Qwen3-TTS 모델 로드
print("⏳ Qwen3-TTS 모델을 로딩 중입니다...")
assert torch.cuda.is_available(), "GPU가 필요합니다. Colab 런타임 유형을 T4 GPU로 변경하세요."
dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16

# 0.6B 초경량 고속 모델 로드
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
    device_map="cuda:0",
    dtype=dtype
)
print("✅ Qwen3-TTS 모델 로드 완료!")

class VoiceCloneRequest(BaseModel):
    text: str
    language: str = "Korean"
    ref_audio_base64: str
    ref_text: str = "모든 기회는 위기를 내포하고, 모든 위기는 기회를 내포합니다. 언어의 장벽을 넘어 전 세계와 자유롭게 소통합니다."

@app.get("/")
def read_root():
    return {"status": "ok", "message": "OmniTrans Qwen-TTS Voice Clone Engine is Running!"}

@app.post("/generate_voice_clone")
async def generate_voice_clone(req: VoiceCloneRequest):
    try:
        # 1. Base64 오디오 디코딩
        raw_base64 = req.ref_audio_base64.split(",")[-1]
        audio_bytes = base64.b64decode(raw_base64)
        
        temp_ref_path = "temp_ref_voice.wav"
        with open(temp_ref_path, "wb") as f:
            f.write(audio_bytes)

        # 2. Qwen-TTS 제로샷 보이스 클로닝 실행
        wavs, sr = model.generate_voice_clone(
            text=req.text,
            language=req.language,
            ref_audio=temp_ref_path,
            ref_text=req.ref_text,
        )

        # 3. 결과 오디오를 Base64로 인코딩하여 반환
        out_buffer = io.BytesIO()
        sf.write(out_buffer, wavs[0], sr, format="WAV")
        out_buffer.seek(0)
        out_base64 = base64.b64encode(out_buffer.read()).decode("utf-8")

        return {
            "status": "success",
            "audio_base64": f"data:audio/wav;base64,{out_base64}",
            "sample_rate": sr
        }

    except Exception as e:
        print("Error during voice clone:", e)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    nest_asyncio.apply()
    # 로컬 실행: uvicorn.run(app, host="0.0.0.0", port=8000)
    print("🚀 OmniTrans Qwen-TTS 서버가 8000번 포트에서 준비되었습니다.")
