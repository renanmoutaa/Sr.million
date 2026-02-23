import asyncio
import json
import base64
from elevenlabs.client import ElevenLabs

# Load env or settings to get the key
with open('data/settings.json', 'r') as f:
    settings = json.load(f)

eleven_key = settings.get("elevenlabs_api_key")
voice_id = settings.get("elevenlabs_voice_id", "Daniel")

print(f"Key loaded: {eleven_key[:8]}... Voice: {voice_id}")

async def test_tts():
    try:
        def _tts():
            eleven = ElevenLabs(api_key=eleven_key)
            audio_gen = eleven.text_to_speech.convert(
                voice_id=voice_id,
                text="Testando o áudio localmente.",
                model_id="eleven_flash_v2_5"
            )
            return b"".join(audio_gen)

        audio_bytes = await asyncio.get_event_loop().run_in_executor(None, _tts)
        print(f"Success! Audio length: {len(audio_bytes)}")
    except Exception as e:
        import traceback
        print(f"TTS Error: {e}")
        traceback.print_exc()

asyncio.run(test_tts())
