# -*- coding: utf-8 -*-
"""Генерация озвучки фраз через Edge TTS (бесплатно).
Читает data/phrases.js, берёт все фразы с непустым pinyin и сохраняет
audio/<id>.mp3 китайским голосом. Уже существующие файлы пропускает.
Запуск: python _gen_audio.py
"""
import re
import os
import asyncio
import edge_tts

VOICE = "zh-CN-YunxiNeural"   # мужской голос Юньси (выбор Виктора)
RATE = "-10%"                  # чуть медленнее для разборчивости
SRC = "data/phrases.js"
OUT = "audio"

text = open(SRC, encoding="utf-8").read()
# каждая фраза — в одну строку: id: "..", ru: "..", zh: "..", pinyin: "..", read: ".."
pat = re.compile(r'id:\s*"([^"]+)".*?zh:\s*"([^"]+)".*?pinyin:\s*"([^"]*)"')
all_items = [(m.group(1), m.group(2), m.group(3)) for m in pat.finditer(text)]
items = [(i, zh) for (i, zh, py) in all_items if py.strip()]

os.makedirs(OUT, exist_ok=True)

async def gen(_id, zh):
    out = os.path.join(OUT, _id + ".mp3")
    if os.path.exists(out):
        return "skip"
    comm = edge_tts.Communicate(zh, VOICE, rate=RATE)
    await comm.save(out)
    return "ok"

async def main():
    ok = skip = 0
    for _id, zh in items:
        res = await gen(_id, zh)
        if res == "ok":
            ok += 1
        else:
            skip += 1
        print(f"{_id}: {zh} -> {res}")
    print(f"\nГотово. Озвучено: {ok}, пропущено (уже было): {skip}, всего фраз с озвучкой: {len(items)}")

if __name__ == "__main__":
    asyncio.run(main())
