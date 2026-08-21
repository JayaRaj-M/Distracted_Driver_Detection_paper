# Tiny CNN Transfer Learning Framework

This folder contains a microcontroller-focused training framework for the State Farm distracted-driver dataset.

## Goal

Train a small model that is much easier to run on microcontrollers than the current 224x224 RGB model.

Target:

```text
Input: 96 x 96 x 1 grayscale
Output: 10 driver-distraction classes
Quantization: full INT8
Expected ESP32-S3 tensor arena: much smaller than the current ~4.9 MB
```

## Why This Is Transfer Learning

This is not ImageNet transfer learning. A normal ImageNet model such as MobileNetV2 expects RGB images and is still larger than ideal for a tiny microcontroller model.

Instead, this framework uses **self-supervised transfer learning**:

1. A tiny CNN encoder first learns useful visual features from the driver images using an autoencoder task.
2. The encoder learns the structure of the dataset: cabin layout, driver pose, hands, face, steering wheel, dashboard, etc.
3. The learned encoder weights are transferred into a 10-class classifier.
4. The classifier is trained and then fine-tuned.
5. The final model is converted to full INT8 TFLite for microcontrollers.

This is transfer learning because the encoder weights learned from one task, image reconstruction, are reused/transferred to another task, driver-distraction classification.

## Files

```text
preprocess.py
train_tiny_transfer_cnn.py
inspect_tflite.py
imgs_96_grayscale/
```

## Run

Use a Python environment with TensorFlow installed.

```powershell
python train_tiny_transfer_cnn.py
python inspect_tflite.py
```

Outputs:

```text
micro_model_artifacts/tiny_encoder_pretrained.keras
micro_model_artifacts/tiny_driver_distraction_96_gray.keras
micro_model_artifacts/tiny_driver_distraction_96_gray_int8.tflite
micro_model_artifacts/class_names.json
```

## Important Check

After conversion, `inspect_tflite.py` should show:

```text
Input shape: [ 1 96 96 1 ]
Input dtype: int8
Output shape: [ 1 10 ]
Output dtype: int8
```

Only then should the model be converted to `model.h` and tested on ESP32-S3.

## Faster 64x64 Experiment

The 96x96 INT8 model runs on normal ESP32, but the measured real delay was still about:

```text
1886 ms
```

For a faster benchmark, run:

```powershell
python train_tiny_transfer_cnn_64.py
python inspect_tflite_64.py
```

This trains a smaller transferred Tiny CNN:

```text
Input: 64 x 64 x 1 grayscale
Output: 10 classes
Quantization: full INT8
Artifact folder: micro_model_artifacts_64
```

This model is expected to be faster and use less tensor arena memory than the 96x96 model, but classification accuracy may be lower because the image has less detail and the CNN has fewer filters.
