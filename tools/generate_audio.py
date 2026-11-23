#!/usr/bin/env python3
"""Tạo file mp3 còn thiếu trong thư mục audio/ từ nội dung js/lessons.js.

Cần: Node.js, ffmpeg, Python 3.10+  (Ubuntu: sudo apt install ffmpeg python3-pip)
Cài thư viện:  pip install -r tools/requirements.txt
Chạy:          python3 tools/generate_audio.py          (chỉ tạo file còn thiếu)
               python3 tools/generate_audio.py --all    (tạo lại toàn bộ)

Lần đầu chạy, script tự tải mô hình giọng đọc Kokoro bản đầy đủ (~330 MB) vào tools/models/.
Sau khi tạo lại toàn bộ, tăng AUDIO_V trong js/app.js để trình duyệt không dùng file cũ đã cache.
"""
import json, os, subprocess, sys, tempfile, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'audio')
MODELS = os.path.join(ROOT, 'tools', 'models')
BASE = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'
# Dùng bản fp32 đầy đủ: bản int8 nhẹ hơn nhưng tiếng bị rè, mờ phụ âm.
FILES = {'kokoro-v1.0.onnx': 'kokoro-v1.0.onnx', 'voices.bin': 'voices-v1.0.bin'}

# Tốc độ đọc: quá chậm (<0.85) làm Kokoro kéo dài nguyên âm, tiếng bị nhoè.
SPEED_WORD, SPEED_SENTENCE = 0.9, 0.92

# Lọc âm thanh: cắt khoảng lặng hai đầu, bỏ ù tần số thấp, tăng nhẹ dải 3–5 kHz
# cho phụ âm rõ, rồi chuẩn hoá âm lượng để mọi file to đều nhau.
FILTERS = ','.join([
    'silenceremove=start_periods=1:start_threshold=-55dB',
    'areverse', 'silenceremove=start_periods=1:start_threshold=-55dB', 'areverse',
    'highpass=f=80',
    'equalizer=f=4000:t=q:w=1.2:g=3',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
    'apad=pad_dur=0.15',
])


def ensure_models():
    os.makedirs(MODELS, exist_ok=True)
    for local, remote in FILES.items():
        dst = os.path.join(MODELS, local)
        if not os.path.exists(dst):
            print(f'Đang tải {remote} ...')
            urllib.request.urlretrieve(BASE + remote, dst)


def main():
    redo = '--all' in sys.argv
    items = json.loads(subprocess.check_output(
        ['node', os.path.join(ROOT, 'tools', 'list-texts.js')], text=True))
    todo = [it for it in items if redo or not os.path.exists(os.path.join(AUDIO, it['file']))]
    if not todo:
        print(f'Đủ cả {len(items)} file âm thanh, không cần tạo thêm.')
        return
    ensure_models()
    from kokoro_onnx import Kokoro
    import soundfile as sf
    k = Kokoro(os.path.join(MODELS, 'kokoro-v1.0.onnx'), os.path.join(MODELS, 'voices.bin'))
    os.makedirs(AUDIO, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'x.wav')
        for n, it in enumerate(todo, 1):
            single = len(it['text'].split()) == 1
            text = it['text'] + '.' if single else it['text']
            samples, sr = k.create(text, voice=it['voice'], speed=SPEED_WORD if single else SPEED_SENTENCE, lang='en-us')
            sf.write(wav, samples, sr)
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', FILTERS,
                            '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '96k',
                            os.path.join(AUDIO, it['file'])], check=True)
            print(f'[{n}/{len(todo)}] {it["file"]}  ←  "{it["text"]}"')
    print('Xong!')


if __name__ == '__main__':
    main()
