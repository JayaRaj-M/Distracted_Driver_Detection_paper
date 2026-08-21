from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
scripts = [
    "train_student_from_mobilenet_v3_small_teacher.py",
    "train_student_from_efficientnet_b0_teacher.py",
    "train_student_from_resnet50_teacher.py",
    "train_student_from_convnext_teacher.py",
]

for script in scripts:
    print(f"\n=== Running {script} ===", flush=True)
    code = subprocess.call([sys.executable, str(ROOT / script)])
    if code != 0:
        raise SystemExit(code)
