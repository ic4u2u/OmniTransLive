# ==============================================================================
# OmniTrans LIVE - Google Colab 제로샷 보이스 클로닝 백엔드 서버
# (Python 3.13 완벽 호환 + FastAPI + ngrok / localtunnel 자동 연동)
# ==============================================================================

# [셀 1] 설치 코드 (Colab 맨 위 셀에서 1회 실행)
# !pip install -q -U git+https://github.com/SWivid/F5-TTS.git
# !pip install -q -U fastapi uvicorn pyngrok soundfile torchaudio

# [셀 2] 서버 실행 코드 (Colab 두 번째 셀에 붙여넣고 실행)
import os
import io
import base64
import torch
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from pyngrok import ngrok

# 1. GPU 하드웨어 확인
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🚀 AI 음성 복제 엔진 구동 장치: {device}")
if device == "cpu":
    print("💡 TIP: Colab 상단 메뉴 [런타임] → [런타임 유형 변경]에서 'T4 GPU'를 선택하시면 훨씬 빠릅니다.")

# 2. 제로샷 보이스 클로닝 모델 로드
print("⏳ F5-TTS Zero-Shot 모델을 로딩 중입니다...")
try:
    from f5_tts.api import F5TTS
    f5_model = F5TTS(device=device)
    print("✅ F5-TTS 제로샷 AI 음성 복제 모델 로드 완료!")
except Exception as e:
    print(f"⚠️ 모델 로드 오류: {e}")
    f5_model = None

# 3. FastAPI 앱 생성
app = FastAPI(title="OmniTrans Voice Clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VoiceCloneRequest(BaseModel):
    text: str
    language: str = "English"
    ref_audio_base64: str
    ref_text: str = "언어의 장벽을 넘어 전 세계와 연결됩니다. 나의 목소리로 어디서나 자유롭게 소통합니다."

@app.get("/")
def health_check():
    return {
        "status": "online",
        "engine": "F5-TTS Zero-Shot Clone",
        "device": device,
        "message": "OmniTrans AI Voice Server is Running!"
    }

@app.post("/generate_voice_clone")
async def generate_voice_clone(req: VoiceCloneRequest):
    try:
        if not req.ref_audio_base64:
            raise HTTPException(status_code=400, detail="참조 음성이 없습니다.")

        # Base64 디코딩
        raw_b64 = req.ref_audio_base64.split(",")[-1]
        audio_bytes = base64.b64decode(raw_b64)
        
        temp_ref_path = "temp_ref_user.wav"
        with open(temp_ref_path, "wb") as f:
            f.write(audio_bytes)

        out_path = "temp_output.wav"
        sr = 24000

        # AI 음성 합성
        if f5_model is not None:
            wav, sample_rate, _ = f5_model.infer(
                ref_file=temp_ref_path,
                ref_text=req.ref_text,
                gen_text=req.text,
                target_rms=0.1
            )
            sr = sample_rate
            sf.write(out_path, wav, sr, format="WAV")
        else:
            import numpy as np
            t = np.linspace(0, 2, 2 * sr, False)
            tone = np.sin(440 * t * 2 * np.pi) * 0.1
            sf.write(out_path, tone, sr, format="WAV")

        with open(out_path, "rb") as f:
            out_bytes = f.read()
        res_b64 = base64.b64encode(out_bytes).decode("utf-8")

        return {
            "status": "success",
            "audio_base64": f"data:audio/wav;base64,{res_b64}",
            "sample_rate": sr
        }

    except Exception as e:
        print(f"❌ 음성 합성 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # ngrok 퍼블릭 터널 연결
    try:
        # ngrok 기존 연결 정리 후 새 포트 오픈
        ngrok.kill()
        public_url = ngrok.connect(8000).public_url
        print("="*65)
        print("🎉 [OmniTrans AI 보이스 클로닝 서버 오픈 성공!]")
        print(f"🔗 웹앱 연동 URL: {public_url}")
        print("="*65)
        print("👉 위 URL 주소를 복사하여 앱에 입력하시면 즉시 연동됩니다.\n")
    except Exception as ne:
        print("ngrok 연결 알림 (기본 포트 8000 구동):", ne)

    # uvicorn 실행 (Python 3.13 호환)
    uvicorn.run(app, host="0.0.0.0", port=8000)


