# Distill Students From TFLite Teacher Candidates

Run these from:

```powershell
(.venv) PS C:\Users\HP\Downloads\state-farm-distracted-driver-detection>
```

## Train One Student

```powershell
.\.venv\Scripts\python.exe train_student_from_mobilenet_v3_small_teacher.py
.\.venv\Scripts\python.exe train_student_from_efficientnet_b0_teacher.py
.\.venv\Scripts\python.exe train_student_from_resnet50_teacher.py
.\.venv\Scripts\python.exe train_student_from_convnext_teacher.py
```

## Train All Four Students

```powershell
.\.venv\Scripts\python.exe train_all_tflite_teacher_students.py
```

This will take a long time on the laptop because each TFLite teacher must run once over the dataset to cache soft probabilities.

## Output Folders

- `distilled_from_mobilenet_v3_small_outputs`
- `distilled_from_efficientnet_b0_outputs`
- `distilled_from_resnet50_outputs`
- `distilled_from_convnext_outputs`

Each output folder contains:

- `driver_wise_train_split.csv`
- `driver_wise_val_split.csv`
- `driver_wise_split_summary.csv`
- `train_teacher_probs.npy`
- `val_teacher_probs.npy`
- `best_student.keras`
- `final_student.keras`
- `student_training_history.csv`
- `classification_report.txt`
- `classification_report.csv`
- `confusion_matrix.csv`
- `confusion_matrix.png`
- `student_96_rgb_int8.tflite`

## Important

The split is driver-wise using `driver_imgs_list.csv`, not random image-wise splitting. This avoids train/validation leakage from the same driver.

Default student:

- Input: `96 x 96 x 3`
- Quantized output: INT8 TFLite
- Designed for ESP32 / ESP32-S3 benchmark testing

For a quick smoke test:

```powershell
.\.venv\Scripts\python.exe distill_from_tflite_teacher.py `
  --teacher "teacher Candidates\SFD_mobilenet_v3_small_global_float16.tflite" `
  --output-dir smoke_tflite_teacher_test `
  --epochs 1 `
  --max-train-images 20 `
  --max-val-images 10 `
  --batch-size 4
```
