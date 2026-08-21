#include <Arduino.h>
#include <math.h>

#include "../images/test_image.h"
#include "../model/model.h"

struct DualSerialLogger {
  void begin(unsigned long baud) {
    ::Serial.begin(baud);
    ::Serial1.begin(baud);
  }

  template <typename... Args>
  void print(Args... args) {
    ::Serial.print(args...);
    ::Serial1.print(args...);
  }

  void println() {
    ::Serial.println();
    ::Serial1.println();
  }

  template <typename... Args>
  void println(Args... args) {
    ::Serial.println(args...);
    ::Serial1.println(args...);
  }
};

DualSerialLogger DebugSerial;
#ifdef Serial
#undef Serial
#endif
#define Serial DebugSerial

#if __has_include("tensorflow/lite/micro/all_ops_resolver.h")
#include "tensorflow/lite/micro/all_ops_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"
#define HAS_TFLITE_MICRO 1
#else
#define HAS_TFLITE_MICRO 0
#endif

namespace {

constexpr uint8_t GREEN_LED_PIN = 12;
constexpr uint8_t RED_LED_PIN = 13;
constexpr int kClassCount = 10;
constexpr size_t kTensorArenaSize = 200 * 1024;
constexpr float kEstimatedWokwiToHardwareSpeedRatio = 20.0f;
constexpr const char *kClassNames[kClassCount] = {
    "c0_safe_driving",
    "c1_texting_right",
    "c2_talking_phone_right",
    "c3_texting_left",
    "c4_talking_phone_left",
    "c5_operating_radio",
    "c6_drinking",
    "c7_reaching_behind",
    "c8_hair_and_makeup",
    "c9_talking_to_passenger",
};

struct InferenceResult {
  int classIndex;
  float score;
  float probabilities[kClassCount];
  bool modelRan;
};

bool isDistraction(int classIndex) {
  return classIndex > 0;
}

void setResultLeds(bool distraction) {
  digitalWrite(GREEN_LED_PIN, distraction ? HIGH : LOW);
  digitalWrite(RED_LED_PIN, distraction ? LOW : HIGH);
}

void setLedsOff() {
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
}

void blinkBootStatus(bool modelCanTry) {
  const uint8_t pin = modelCanTry ? GREEN_LED_PIN : RED_LED_PIN;
  for (int i = 0; i < 3; ++i) {
    digitalWrite(pin, HIGH);
    delay(150);
    digitalWrite(pin, LOW);
    delay(150);
  }
}

#if HAS_TFLITE_MICRO
alignas(16) static uint8_t tensorArena[kTensorArenaSize];

void printTensorShape(const char *label, const TfLiteTensor *tensor) {
  Serial.print(label);
  Serial.print(" shape:");
  for (int i = 0; i < tensor->dims->size; ++i) {
    Serial.print(' ');
    Serial.print(tensor->dims->data[i]);
  }
  Serial.print(" type=");
  Serial.println(static_cast<int>(tensor->type));
}

struct SourceImageShape {
  int width;
  int height;
  int channels;
};

SourceImageShape inferSourceImageShape() {
  const int graySide = static_cast<int>(sqrtf(IMAGE_ELEMENT_COUNT));
  if (graySide * graySide == IMAGE_ELEMENT_COUNT) {
    return {graySide, graySide, 1};
  }

  if (IMAGE_ELEMENT_COUNT % 3 == 0) {
    const int rgbPixels = IMAGE_ELEMENT_COUNT / 3;
    const int rgbSide = static_cast<int>(sqrtf(rgbPixels));
    if (rgbSide * rgbSide * 3 == IMAGE_ELEMENT_COUNT) {
      return {rgbSide, rgbSide, 3};
    }
  }

  return {0, 0, 0};
}

float readGrayscalePixel(const SourceImageShape &shape, int x, int y) {
  if (shape.channels == 1) {
    return test_image_data[y * shape.width + x];
  }

  const int index = (y * shape.width + x) * 3;
  const float red = test_image_data[index];
  const float green = test_image_data[index + 1];
  const float blue = test_image_data[index + 2];
  return 0.299f * red + 0.587f * green + 0.114f * blue;
}

float readChannelPixel(const SourceImageShape &shape, int x, int y, int channel) {
  if (shape.channels == 1) {
    return test_image_data[y * shape.width + x];
  }

  const int index = (y * shape.width + x) * shape.channels;
  return test_image_data[index + constrain(channel, 0, shape.channels - 1)];
}

float readResizedPixel(const SourceImageShape &shape, int outputX, int outputY, int outputWidth,
                       int outputHeight, int channel, bool grayscale) {
  const float sourceYFloat =
      ((static_cast<float>(outputY) + 0.5f) * shape.height / outputHeight) - 0.5f;
  const float sourceXFloat =
      ((static_cast<float>(outputX) + 0.5f) * shape.width / outputWidth) - 0.5f;

  const float clampedY = constrain(sourceYFloat, 0.0f, static_cast<float>(shape.height - 1));
  const float clampedX = constrain(sourceXFloat, 0.0f, static_cast<float>(shape.width - 1));
  const int y0 = static_cast<int>(floorf(clampedY));
  const int x0 = static_cast<int>(floorf(clampedX));
  const int y1 = min(y0 + 1, shape.height - 1);
  const int x1 = min(x0 + 1, shape.width - 1);
  const float yWeight = clampedY - y0;
  const float xWeight = clampedX - x0;

  const float topLeft = grayscale ? readGrayscalePixel(shape, x0, y0) : readChannelPixel(shape, x0, y0, channel);
  const float topRight = grayscale ? readGrayscalePixel(shape, x1, y0) : readChannelPixel(shape, x1, y0, channel);
  const float bottomLeft = grayscale ? readGrayscalePixel(shape, x0, y1) : readChannelPixel(shape, x0, y1, channel);
  const float bottomRight = grayscale ? readGrayscalePixel(shape, x1, y1) : readChannelPixel(shape, x1, y1, channel);
  const float top = topLeft + (topRight - topLeft) * xWeight;
  const float bottom = bottomLeft + (bottomRight - bottomLeft) * xWeight;
  return top + (bottom - top) * yWeight;
}

void fillInputFromTestImage(TfLiteTensor *input) {
  const int batch = input->dims->size > 0 ? input->dims->data[0] : 1;
  const int inputHeight = input->dims->size > 1 ? input->dims->data[1] : 0;
  const int inputWidth = input->dims->size > 2 ? input->dims->data[2] : 0;
  const int inputChannels = input->dims->size > 3 ? input->dims->data[3] : 1;
  const SourceImageShape source = inferSourceImageShape();

  if (batch != 1 || inputHeight <= 0 || inputWidth <= 0 || inputChannels <= 0 ||
      source.width <= 0 || source.height <= 0) {
    Serial.println("Unsupported image/input shape.");
    return;
  }

  Serial.print("Source image shape: ");
  Serial.print(source.height);
  Serial.print(" x ");
  Serial.print(source.width);
  Serial.print(" x ");
  Serial.println(source.channels);

  if (source.height != inputHeight || source.width != inputWidth || source.channels != inputChannels) {
    Serial.print("Converting test image to model input: ");
    Serial.print(inputHeight);
    Serial.print(" x ");
    Serial.print(inputWidth);
    Serial.print(" x ");
    Serial.println(inputChannels);
  }

  if (input->type == kTfLiteFloat32) {
    for (int y = 0; y < inputHeight; ++y) {
      for (int x = 0; x < inputWidth; ++x) {
        for (int channel = 0; channel < inputChannels; ++channel) {
          input->data.f[(y * inputWidth + x) * inputChannels + channel] =
              readResizedPixel(source, x, y, inputWidth, inputHeight, channel, inputChannels == 1);
        }
      }
    }
    return;
  }

  if (input->type == kTfLiteInt8) {
    for (int y = 0; y < inputHeight; ++y) {
      for (int x = 0; x < inputWidth; ++x) {
        for (int channel = 0; channel < inputChannels; ++channel) {
          const float pixel =
              readResizedPixel(source, x, y, inputWidth, inputHeight, channel, inputChannels == 1);
          const int quantized = static_cast<int>(roundf(pixel / input->params.scale)) + input->params.zero_point;
          input->data.int8[(y * inputWidth + x) * inputChannels + channel] =
              static_cast<int8_t>(constrain(quantized, -128, 127));
        }
      }
    }
    return;
  }

  Serial.println("Unsupported input tensor type.");
}

float readOutputScore(const TfLiteTensor *output, int index) {
  if (output->type == kTfLiteFloat32) {
    return output->data.f[index];
  }

  if (output->type == kTfLiteInt8) {
    return (output->data.int8[index] - output->params.zero_point) * output->params.scale;
  }

  if (output->type == kTfLiteUInt8) {
    return (output->data.uint8[index] - output->params.zero_point) * output->params.scale;
  }

  return -3.4028235e38f;
}

void softmaxOutput(const TfLiteTensor *output, float *probabilities, int count) {
  float maxScore = readOutputScore(output, 0);
  for (int i = 1; i < count; ++i) {
    maxScore = max(maxScore, readOutputScore(output, i));
  }

  float sum = 0.0f;
  for (int i = 0; i < count; ++i) {
    probabilities[i] = expf(readOutputScore(output, i) - maxScore);
    sum += probabilities[i];
  }

  if (sum <= 0.0f) {
    return;
  }

  for (int i = 0; i < count; ++i) {
    probabilities[i] /= sum;
  }
}
#endif

InferenceResult runDistractionModel() {
#if HAS_TFLITE_MICRO
  const tflite::Model *model = tflite::GetModel(g_distraction_model);
  if (model->version() != TFLITE_SCHEMA_VERSION) {
    Serial.println("TFLite schema version mismatch.");
    return {-1, 0.0f, {}, false};
  }

  static tflite::AllOpsResolver resolver;
  static tflite::MicroInterpreter interpreter(
      model, resolver, tensorArena, kTensorArenaSize);

  Serial.print("Tensor arena address: 0x");
  Serial.println(reinterpret_cast<uintptr_t>(tensorArena), HEX);
  Serial.print("Tensor arena bytes: ");
  Serial.println(kTensorArenaSize);

  if (interpreter.AllocateTensors() != kTfLiteOk) {
    Serial.println("AllocateTensors failed. RP2040 SRAM is likely too small for this model.");
    return {-1, 0.0f, {}, false};
  }

  TfLiteTensor *input = interpreter.input(0);
  TfLiteTensor *output = interpreter.output(0);
  printTensorShape("Input", input);
  printTensorShape("Output", output);

  Serial.print("Test image elements: ");
  Serial.println(IMAGE_ELEMENT_COUNT);
  fillInputFromTestImage(input);

  Serial.println("Running inference...");
  const unsigned long inferenceStartMs = millis();
  if (interpreter.Invoke() != kTfLiteOk) {
    Serial.println("Model Invoke failed.");
    return {-1, 0.0f, {}, false};
  }
  const unsigned long inferenceDelayMs = millis() - inferenceStartMs;

  const float actualLatencyMs = inferenceDelayMs / kEstimatedWokwiToHardwareSpeedRatio;
  Serial.print("sim-latency: ");
  Serial.print(inferenceDelayMs);
  Serial.println(" ms");
  Serial.print("Actual-latency: about ");
  Serial.print(actualLatencyMs, 1);
  Serial.println(" ms estimated for real RP2040 hardware");

  float probabilities[kClassCount] = {};
  softmaxOutput(output, probabilities, kClassCount);

  int bestClass = 0;
  float bestScore = probabilities[0];
  for (int i = 1; i < kClassCount; ++i) {
    if (probabilities[i] > bestScore) {
      bestScore = probabilities[i];
      bestClass = i;
    }
  }

  InferenceResult result = {bestClass, bestScore, {}, true};
  for (int i = 0; i < kClassCount; ++i) {
    result.probabilities[i] = probabilities[i];
  }
  return result;
#else
  Serial.println("TensorFlow Lite Micro headers were not found for RP2040.");
  Serial.println("This PlatformIO Pico environment needs a RP2040-compatible TFLite Micro library.");
  return {-1, 0.0f, {}, false};
#endif
}

void printTopScores(const InferenceResult &result) {
  bool used[kClassCount] = {};
  Serial.println("Top scores:");
  for (int rank = 0; rank < 5; ++rank) {
    int best = -1;
    for (int i = 0; i < kClassCount; ++i) {
      if (!used[i] && (best < 0 || result.probabilities[i] > result.probabilities[best])) {
        best = i;
      }
    }

    if (best < 0) {
      return;
    }

    used[best] = true;
    Serial.print("  ");
    Serial.print(best);
    Serial.print(" ");
    Serial.print(kClassNames[best]);
    Serial.print(" ");
    Serial.println(result.probabilities[best], 4);
  }
}

void printResult(const InferenceResult &result) {
  Serial.println();
  Serial.println("Driver distraction inference");

  if (!result.modelRan || result.classIndex < 0 || result.classIndex >= kClassCount) {
    Serial.println("Result: MODEL NOT RUNNING");
    Serial.println("LED: red");
    return;
  }

  const bool distraction = isDistraction(result.classIndex);
  Serial.println("Single image: images/test_image.h");
  Serial.print("Class: ");
  Serial.println(kClassNames[result.classIndex]);
  Serial.print("Confidence: ");
  Serial.println(result.score, 6);
  printTopScores(result);
  Serial.print("Result: ");
  Serial.println(distraction ? "DISTRACTION" : "NO DISTRACTION");
  Serial.print("LED: ");
  Serial.println(distraction ? "green" : "red");
}

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(2500);

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  setLedsOff();

  Serial.println();
  Serial.println("====================================");
  Serial.println("   RP2040 PICO ONLINE - INITIALIZING");
  Serial.println("====================================");
  Serial.println("Booting driver distraction classifier...");
  Serial.println("Board target: Raspberry Pi Pico / RP2040 TinyML classifier");
  Serial.println("SRAM: 264 KB total");
  Serial.print("Model bytes: ");
  Serial.println(g_distraction_model_len);
  Serial.print("Configured tensor arena bytes: ");
  Serial.println(kTensorArenaSize);

  blinkBootStatus(HAS_TFLITE_MICRO);

  const InferenceResult result = runDistractionModel();
  setResultLeds(result.modelRan && isDistraction(result.classIndex));
  printResult(result);
}

void loop() {
  delay(1000);
}
