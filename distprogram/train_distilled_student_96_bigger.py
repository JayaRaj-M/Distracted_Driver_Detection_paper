import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split


ROOT = Path(__file__).resolve().parent
TRAIN_DIR = ROOT / "imgs" / "train"
TEACHER_DIR = ROOT / "distracted_driver_teacher_outputs"
TEACHER_PATH = TEACHER_DIR / "best_teacher_model.keras"
SANITIZED_TEACHER_PATH = TEACHER_DIR / "best_teacher_model_sanitized.keras"
CLASS_NAMES_PATH = TEACHER_DIR / "class_names.json"
CACHE_DIR = ROOT / "distilled_student_96_outputs"
OUTPUT_DIR = ROOT / "distilled_student_96_bigger_outputs"

TEACHER_SIZE = (224, 224)
STUDENT_SIZE = (96, 96)
BATCH_SIZE = 32
EPOCHS = 70
TEMPERATURE = 4.0
ALPHA = 0.50
RANDOM_STATE = 42


OUTPUT_DIR.mkdir(exist_ok=True)


def load_class_names():
    if CLASS_NAMES_PATH.exists():
        with CLASS_NAMES_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)

    return sorted([p.name for p in TRAIN_DIR.iterdir() if p.is_dir()])


CLASS_NAMES = load_class_names()
CLASS_TO_ID = {name: index for index, name in enumerate(CLASS_NAMES)}
NUM_CLASSES = len(CLASS_NAMES)


def build_split():
    rows = []
    for class_name in CLASS_NAMES:
        class_dir = TRAIN_DIR / class_name
        for image_path in sorted(class_dir.glob("*.jpg")):
            rows.append({"path": str(image_path), "label": class_name, "label_id": CLASS_TO_ID[class_name]})

    df = pd.DataFrame(rows)
    train_df, val_df = train_test_split(
        df,
        test_size=0.2,
        stratify=df["label_id"],
        random_state=RANDOM_STATE,
    )

    train_df = train_df.reset_index(drop=True)
    val_df = val_df.reset_index(drop=True)
    train_df.to_csv(OUTPUT_DIR / "train_split.csv", index=False)
    val_df.to_csv(OUTPUT_DIR / "val_split.csv", index=False)

    print("Train class counts:")
    print(train_df["label"].value_counts().sort_index())
    print("\nValidation class counts:")
    print(val_df["label"].value_counts().sort_index())
    return train_df, val_df


def load_teacher_image(path):
    image = tf.io.read_file(path)
    image = tf.image.decode_jpeg(image, channels=3)
    image = tf.image.resize(image, TEACHER_SIZE)
    return tf.keras.applications.efficientnet.preprocess_input(image)


def teacher_dataset(paths):
    ds = tf.data.Dataset.from_tensor_slices(paths)
    ds = ds.map(load_teacher_image, num_parallel_calls=tf.data.AUTOTUNE)
    return ds.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)


def cache_teacher_probabilities(teacher, df, name):
    cache_path = CACHE_DIR / f"{name}_teacher_probs.npy"
    if cache_path.exists():
        print(f"Loading cached teacher probabilities: {cache_path}")
        return np.load(cache_path)

    print(f"Creating teacher probabilities for {name} split. This is the slow one-time step.")
    probs = teacher.predict(teacher_dataset(df["path"].values), verbose=1)
    probs = np.asarray(probs, dtype=np.float32)

    row_sums = probs.sum(axis=1, keepdims=True)
    if not np.allclose(row_sums.mean(), 1.0, atol=1e-2):
        probs = tf.nn.softmax(probs, axis=1).numpy().astype(np.float32)

    np.save(cache_path, probs)
    return probs


def ensure_sanitized_teacher():
    if SANITIZED_TEACHER_PATH.exists():
        return SANITIZED_TEACHER_PATH

    print("Creating sanitized teacher model for local Keras loading.")
    print("Replacing Colab Lambda augmentation layer with a linear no-op layer.")
    with ZipFile(TEACHER_PATH, "r") as zin, ZipFile(SANITIZED_TEACHER_PATH, "w", ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "config.json":
                config = json.loads(data)
                for top_layer in config["config"]["layers"]:
                    if top_layer.get("class_name") != "Sequential":
                        continue

                    for index, layer in enumerate(top_layer["config"]["layers"]):
                        if layer.get("class_name") == "Lambda":
                            name = layer.get("config", {}).get("name", "lambda_noop")
                            top_layer["config"]["layers"][index] = {
                                "module": "keras.layers",
                                "class_name": "Activation",
                                "config": {
                                    "name": name,
                                    "trainable": True,
                                    "dtype": "float32",
                                    "activation": "linear",
                                },
                                "registered_name": None,
                                "build_config": layer.get(
                                    "build_config", {"input_shape": [None, 224, 224, 3]}
                                ),
                            }

                data = json.dumps(config).encode("utf-8")
            zout.writestr(item, data)

    return SANITIZED_TEACHER_PATH


def load_student_image(path):
    image = tf.io.read_file(path)
    image = tf.image.decode_jpeg(image, channels=3)
    image = tf.image.rgb_to_grayscale(image)
    image = tf.image.resize(image, STUDENT_SIZE)
    image = tf.cast(image, tf.float32) / 255.0
    return image


def student_dataset(df, teacher_probs, training=False):
    paths = df["path"].values
    labels = df["label_id"].values.astype(np.int32)
    probs = teacher_probs.astype(np.float32)

    ds = tf.data.Dataset.from_tensor_slices((paths, labels, probs))

    def load(path, label, soft):
        return load_student_image(path), {"hard_label": label, "soft_label": soft}

    ds = ds.map(load, num_parallel_calls=tf.data.AUTOTUNE)
    if training:
        ds = ds.shuffle(5000, seed=RANDOM_STATE)
    return ds.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)


def build_student():
    inputs = tf.keras.Input(shape=(96, 96, 1), name="student_input")

    x = tf.keras.layers.Conv2D(16, 3, padding="same", activation="relu")(inputs)
    x = tf.keras.layers.MaxPooling2D()(x)

    x = tf.keras.layers.DepthwiseConv2D(3, padding="same", activation="relu")(x)
    x = tf.keras.layers.Conv2D(24, 1, activation="relu")(x)
    x = tf.keras.layers.MaxPooling2D()(x)

    x = tf.keras.layers.DepthwiseConv2D(3, padding="same", activation="relu")(x)
    x = tf.keras.layers.Conv2D(32, 1, activation="relu")(x)
    x = tf.keras.layers.MaxPooling2D()(x)

    x = tf.keras.layers.DepthwiseConv2D(3, padding="same", activation="relu")(x)
    x = tf.keras.layers.Conv2D(48, 1, activation="relu")(x)

    x = tf.keras.layers.DepthwiseConv2D(3, padding="same", activation="relu")(x)
    x = tf.keras.layers.Conv2D(64, 1, activation="relu")(x)

    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.25)(x)
    outputs = tf.keras.layers.Dense(NUM_CLASSES, name="logits")(x)
    return tf.keras.Model(inputs, outputs, name="distilled_bigger_student_96_gray")


class Distiller(tf.keras.Model):
    def __init__(self, student):
        super().__init__()
        self.student = student
        self.hard_loss_fn = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True)
        self.soft_loss_fn = tf.keras.losses.KLDivergence()
        self.loss_tracker = tf.keras.metrics.Mean(name="loss")
        self.hard_loss_tracker = tf.keras.metrics.Mean(name="hard_loss")
        self.soft_loss_tracker = tf.keras.metrics.Mean(name="distill_loss")
        self.acc = tf.keras.metrics.SparseCategoricalAccuracy(name="accuracy")

    @property
    def metrics(self):
        return [self.loss_tracker, self.hard_loss_tracker, self.soft_loss_tracker, self.acc]

    def compile(self, optimizer, alpha=ALPHA, temperature=TEMPERATURE):
        super().compile(optimizer=optimizer)
        self.alpha = alpha
        self.temperature = temperature

    def train_step(self, data):
        images, targets = data
        hard_labels = targets["hard_label"]
        teacher_probs = targets["soft_label"]

        with tf.GradientTape() as tape:
            student_logits = self.student(images, training=True)
            hard_loss = self.hard_loss_fn(hard_labels, student_logits)

            softened_teacher = tf.pow(tf.clip_by_value(teacher_probs, 1e-7, 1.0), 1.0 / self.temperature)
            softened_teacher = softened_teacher / tf.reduce_sum(softened_teacher, axis=1, keepdims=True)
            softened_student = tf.nn.softmax(student_logits / self.temperature, axis=1)
            soft_loss = self.soft_loss_fn(softened_teacher, softened_student) * (self.temperature**2)

            loss = self.alpha * hard_loss + (1.0 - self.alpha) * soft_loss

        gradients = tape.gradient(loss, self.student.trainable_variables)
        self.optimizer.apply_gradients(zip(gradients, self.student.trainable_variables))

        self.loss_tracker.update_state(loss)
        self.hard_loss_tracker.update_state(hard_loss)
        self.soft_loss_tracker.update_state(soft_loss)
        self.acc.update_state(hard_labels, student_logits)
        return {metric.name: metric.result() for metric in self.metrics}

    def test_step(self, data):
        images, targets = data
        hard_labels = targets["hard_label"]
        student_logits = self.student(images, training=False)
        hard_loss = self.hard_loss_fn(hard_labels, student_logits)

        self.loss_tracker.update_state(hard_loss)
        self.hard_loss_tracker.update_state(hard_loss)
        self.soft_loss_tracker.update_state(0.0)
        self.acc.update_state(hard_labels, student_logits)
        return {metric.name: metric.result() for metric in self.metrics}


class SaveBestStudent(tf.keras.callbacks.Callback):
    def __init__(self, student, path):
        super().__init__()
        self.student = student
        self.path = path
        self.best = -np.inf

    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        val_accuracy = logs.get("val_accuracy")
        if val_accuracy is not None and val_accuracy > self.best:
            self.best = val_accuracy
            print(f"\nSaving best student to {self.path} with val_accuracy={val_accuracy:.4f}")
            self.student.save(self.path)


def evaluate_student(student, val_df):
    val_images = tf.data.Dataset.from_tensor_slices(val_df["path"].values)
    val_images = val_images.map(load_student_image, num_parallel_calls=tf.data.AUTOTUNE).batch(BATCH_SIZE)
    logits = student.predict(val_images, verbose=1)
    y_pred = np.argmax(logits, axis=1)
    y_true = val_df["label_id"].values

    print("\n--- Student Classification Report ---")
    print(classification_report(y_true, y_pred, target_names=CLASS_NAMES, zero_division=0))
    print("\nConfusion matrix:")
    print(confusion_matrix(y_true, y_pred))


def predict_one(student, image_path):
    image = tf.expand_dims(load_student_image(str(image_path)), axis=0)
    logits = student.predict(image, verbose=0)[0]
    probs = tf.nn.softmax(logits).numpy()
    order = np.argsort(probs)[::-1]

    print(f"\n--- Student prediction for {Path(image_path).name} ---")
    print(f"Predicted Class: {CLASS_NAMES[order[0]]}")
    print(f"Confidence: {probs[order[0]]:.4f}")
    print("Top 5 Class Probabilities:")
    for index in order[:5]:
        print(f"  {CLASS_NAMES[index]}: {probs[index]:.4f}")


def convert_int8(student, train_df):
    saved_model_path = OUTPUT_DIR / "final_distilled_student_96_gray_bigger.keras"
    tflite_path = OUTPUT_DIR / "distilled_student_96_gray_bigger_int8.tflite"
    student.save(saved_model_path)

    def representative_data():
        for image_path in train_df["path"].values[:300]:
            image = tf.expand_dims(load_student_image(image_path), axis=0)
            yield [image]

    converter = tf.lite.TFLiteConverter.from_keras_model(student)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_data
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8

    tflite_model = converter.convert()
    tflite_path.write_bytes(tflite_model)
    print(f"\nSaved INT8 model: {tflite_path}")
    print(f"INT8 model bytes: {len(tflite_model)}")


def main():
    print("TensorFlow:", tf.__version__)
    print("Teacher:", TEACHER_PATH)
    print("Classes:", CLASS_NAMES)

    train_df, val_df = build_split()
    teacher_path = ensure_sanitized_teacher()
    teacher = tf.keras.models.load_model(teacher_path, compile=False)
    teacher.trainable = False

    train_probs = cache_teacher_probabilities(teacher, train_df, "train")
    val_probs = cache_teacher_probabilities(teacher, val_df, "val")
    del teacher

    train_ds = student_dataset(train_df, train_probs, training=True)
    val_ds = student_dataset(val_df, val_probs, training=False)

    student = build_student()
    student.summary()

    distiller = Distiller(student)
    distiller.compile(optimizer=tf.keras.optimizers.Adam(1e-3), alpha=ALPHA, temperature=TEMPERATURE)

    best_student_path = OUTPUT_DIR / "best_distilled_student_96_gray_bigger.keras"
    callbacks = [
        SaveBestStudent(student, best_student_path),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=8,
            mode="max",
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=3, min_lr=1e-6, verbose=1),
        tf.keras.callbacks.CSVLogger(OUTPUT_DIR / "student_training_history.csv"),
    ]

    distiller.fit(train_ds, validation_data=val_ds, epochs=EPOCHS, callbacks=callbacks)

    if best_student_path.exists():
        student = tf.keras.models.load_model(best_student_path)

    evaluate_student(student, val_df)

    important_image = TRAIN_DIR / "c5" / "img_99469.jpg"
    if important_image.exists():
        predict_one(student, important_image)

    harder_image = TRAIN_DIR / "c2" / "img_9992.jpg"
    if harder_image.exists():
        predict_one(student, harder_image)

    convert_int8(student, train_df)


if __name__ == "__main__":
    main()
