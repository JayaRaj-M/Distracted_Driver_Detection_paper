from pathlib import Path
import tensorflow as tf

MODEL_PATH = Path("micro_model_artifacts/tiny_driver_distraction_96_gray_int8.tflite")


def main():
    interpreter = tf.lite.Interpreter(model_path=str(MODEL_PATH))
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()[0]
    output_details = interpreter.get_output_details()[0]

    print("Input shape:", input_details["shape"])
    print("Input dtype:", input_details["dtype"])
    print("Input quantization:", input_details["quantization"])
    print("Output shape:", output_details["shape"])
    print("Output dtype:", output_details["dtype"])
    print("Output quantization:", output_details["quantization"])


if __name__ == "__main__":
    main()
