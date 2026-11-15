#!/usr/bin/env python3
import asyncio
import sys
import edge_tts

async def main():
    if len(sys.argv) < 2:
        return
    text = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else "en-GB-RyanNeural"
    
    # Clean up text for speech
    cleaned = text.replace("*", "").replace("#", "").replace("`", "").strip()
    if not cleaned:
        return

    communicate = edge_tts.Communicate(cleaned, voice, rate="+2%")
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            sys.stdout.buffer.write(chunk["data"])

if __name__ == "__main__":
    asyncio.run(main())
