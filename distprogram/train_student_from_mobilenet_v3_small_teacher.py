from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
cmd = [
    sys.executable,
    str(ROOT / "distill_from_tflite_teacher.py"),
    "--teacher",
    str(ROOT / "teacher Candidates" / "SFD_mobilenet_v3_small_global_float16.tflite"),
    "--output-dir",
    str(ROOT / "distilled_from_mobilenet_v3_small_outputs"),
    "--teacher-preprocess",
    "imagenet_torch",
    "--student-size",
    "96",
    "--student-channels",
    "3",
    "--student-width",
    "10",
]
raise SystemExit(subprocess.call(cmd))
