from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
cmd = [
    sys.executable,
    str(ROOT / "distill_from_tflite_teacher.py"),
    "--teacher",
    str(ROOT / "teacher Candidates" / "SFD_resnet50_global.tflite"),
    "--output-dir",
    str(ROOT / "distilled_from_resnet50_outputs"),
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
