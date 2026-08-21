import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import GroupShuffleSplit


ROOT = Path(__file__).resolve().parent
TRAIN_DIR = ROOT / "imgs" / "train"
DRIVER_CSV = ROOT / "driver_imgs_list.csv"

CLASS_NAMES = [f"c{i}" for i in range(10)]
CLASS_TO_ID = {name: index for index, name in enumerate(CLASS_NAMES)}
NUM_CLASSES = len(CLASS_NAMES)


def softmax_np(logits):
    logits = logits.astype(np.float32)
    logits = logits - np.max(logits, axis=1, keepdims=True)
    exp = np.exp(logits)
    return exp / np.sum(exp, axis=1, keepdims=True)


def normalize_probs(outputs):
    outputs = np.asarray(outputs, dtype=np.float32)
    if outputs.ndim != 2:
        outputs = outputs.reshape(outputs.shape[0], -1)
    row_sums = outputs.sum(axis=1, keepdims=True)
    if np.all(outputs >= 0.0) and np.allclose(row_sums.mean(), 1.0, atol=1e-2):
        return outputs
    return softmax_np(outputs)


def load_rgb_224(path):
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.resize(img, (224, 224))
    return tf.cast(img, tf.float32)


def preprocess_teacher_image(path, mode):
    img = load_rgb_224(path)
    if mode == "zero_to_one":
        img = img / 255.0
    elif mode == "minus_one_to_one":
        img = (img / 127.5) - 1.0
    elif mode == "imagenet_torch":
        img = img / 255.0
        mean = tf.constant([0.485, 0.456, 0.406], dtype=tf.float32)
        std = tf.constant([0.229, 0.224, 0.225], dtype=tf.float32)
        img = (img - mean) / std
    elif mode == "raw":
        pass
    else:
        raise ValueError(f"Unknown teacher preprocess mode: {mode}")
    return img


def build_driver_wise_split(output_dir, val_fraction=0.2, random_state=42):
    metadata = pd.read_csv(DRIVER_CSV)
    metadata = metadata.rename(columns={"classname": "label"})
    metadata["path"] = metadata.apply(
        lambda row: str(TRAIN_DIR / row["label"] / row["img"]),
        axis=1,
    )
    metadata = metadata[metadata["path"].map(lambda p: Path(p).exists())].reset_index(drop=True)
    metadata["label_id"] = metadata["label"].map(CLASS_TO_ID).astype("int32")

    best_score = float("inf")
    best = None
    for seed in range(random_state, random_state + 300):
        splitter = GroupShuffleSplit(n_splits=1, test_size=val_fraction, random_state=seed)
        train_idx, val_idx = next(splitter.split(metadata, groups=metadata["subject"]))
        train_df = metadata.iloc[train_idx].reset_index(drop=True)
        val_df = metadata.iloc[val_idx].reset_index(drop=True)
        counts = val_df["label"].value_counts().reindex(CLASS_NAMES, fill_value=0)
        expected = len(val_df) / NUM_CLASSES
        score = float(np.abs(counts - expected).sum() / len(val_df)) + float((counts == 0).sum())
        if score < best_score:
            best_score = score
            best = seed, train_df, val_df

    seed, train_df, val_df = best
    overlap = set(train_df["subject"]).intersection(set(val_df["subject"]))
    if overlap:
        raise RuntimeError(f"Driver leakage detected: {sorted(overlap)}")

    output_dir.mkdir(parents=True, exist_ok=True)
    train_df.to_csv(output_dir / "driver_wise_train_split.csv", index=False)
    val_df.to_csv(output_dir / "driver_wise_val_split.csv", index=False)
    with (output_dir / "class_names.json").open("w", encoding="utf-8") as f:
        json.dump(CLASS_NAMES, f, indent=2)

    summary = pd.DataFrame({
        "train_count": train_df["label"].value_counts().reindex(CLASS_NAMES, fill_value=0),
        "val_count": val_df["label"].value_counts().reindex(CLASS_NAMES, fill_value=0),
    })
    summary["val_fraction"] = summary["val_count"] / (summary["train_count"] + summary["val_count"])
    summary.to_csv(output_dir / "driver_wise_split_summary.csv")

    print(f"Driver-wise split seed: {seed}")
    print(f"Train images: {len(train_df)} from {train_df['subject'].nunique()} drivers")
    print(f"Validation images: {len(val_df)} from {val_df['subject'].nunique()} drivers")
    print("Validation drivers:", sorted(val_df["subject"].unique()))
    print(summary)
    return train_df, val_df


class TFLiteTeacher:
    def __init__(self, model_path, preprocess_mode, num_threads=4):
        self.model_path = Path(model_path)
        self.preprocess_mode = preprocess_mode
        self.interpreter = tf.lite.Interpreter(model_path=str(self.model_path), num_threads=num_threads)
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()[0]
        self.output_details = self.interpreter.get_output_details()[0]
        self.input_shape = list(self.input_details["shape"])
        self.input_dtype = self.input_details["dtype"]
        self.input_scale, self.input_zero = self.input_details.get("quantization", (0.0, 0))

        print("Teacher:", self.model_path)
        print("Teacher input:", self.input_details["name"], self.input_shape, self.input_dtype)
        print("Teacher output:", self.output_details["name"], self.output_details["shape"], self.output_details["dtype"])
        print("Teacher preprocess:", self.preprocess_mode)

    def prepare(self, image_path):
        img = preprocess_teacher_image(str(image_path), self.preprocess_mode).numpy()

        if self.input_shape == [1, 3, 224, 224]:
            img = np.transpose(img, (2, 0, 1))
        elif self.input_shape == [1, 224, 224, 3]:
            pass
        else:
            raise ValueError(f"Unsupported teacher input shape: {self.input_shape}")

        img = np.expand_dims(img, axis=0).astype(np.float32)
        if np.issubdtype(self.input_dtype, np.integer):
            if self.input_scale == 0:
                raise ValueError("Quantized teacher input has zero scale.")
            img = np.round(img / self.input_scale + self.input_zero)
            info = np.iinfo(self.input_dtype)
            img = np.clip(img, info.min, info.max).astype(self.input_dtype)
        return img

    def predict_one(self, image_path):
        self.interpreter.set_tensor(self.input_details["index"], self.prepare(image_path))
        self.interpreter.invoke()
        out = self.interpreter.get_tensor(self.output_details["index"])
        return normalize_probs(out)[0]


def cache_teacher_probs(teacher, df, output_dir, split_name):
    cache_path = output_dir / f"{split_name}_teacher_probs.npy"
    if cache_path.exists():
        print(f"Loading cached teacher probabilities: {cache_path}")
        return np.load(cache_path)

    print(f"Creating {split_name} teacher probabilities. This is the slow one-time step.")
    probs = np.zeros((len(df), NUM_CLASSES), dtype=np.float32)
    for i, image_path in enumerate(df["path"].values):
        probs[i] = teacher.predict_one(image_path)
        if (i + 1) % 250 == 0 or (i + 1) == len(df):
            print(f"  {split_name}: {i + 1}/{len(df)}")
    np.save(cache_path, probs)
    return probs


def load_student_image(path, student_size, rgb=True):
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.resize(img, student_size)
    if not rgb:
        img = tf.image.rgb_to_grayscale(img)
    return tf.cast(img, tf.float32) / 255.0


def student_dataset(df, teacher_probs, student_size, rgb, batch_size, training):
    ds = tf.data.Dataset.from_tensor_slices((
        df["path"].values,
        df["label_id"].values.astype(np.int32),
        teacher_probs.astype(np.float32),
    ))

    def load(path, label, soft):
        return load_student_image(path, student_size, rgb), {"hard_label": label, "soft_label": soft}

    ds = ds.map(load, num_parallel_calls=tf.data.AUTOTUNE)
    if training:
        ds = ds.shuffle(min(len(df), 5000), seed=42, reshuffle_each_iteration=True)
    return ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)


def build_student(student_size, rgb, width):
    channels = 3 if rgb else 1
    inputs = tf.keras.Input(shape=(student_size[0], student_size[1], channels), name="student_input")

    x = tf.keras.layers.Conv2D(width, 3, padding="same", activation="relu")(inputs)
    x = tf.keras.layers.MaxPooling2D()(x)

    for filters in [width * 2, width * 3, width * 4]:
        x = tf.keras.layers.DepthwiseConv2D(3, padding="same", activation="relu")(x)
        x = tf.keras.layers.Conv2D(filters, 1, activation="relu")(x)
        x = tf.keras.layers.MaxPooling2D()(x)

    x = tf.keras.layers.DepthwiseConv2D(3, padding="same", activation="relu")(x)
    x = tf.keras.layers.Conv2D(width * 5, 1, activation="relu")(x)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(NUM_CLASSES, name="logits")(x)
    color = "rgb" if rgb else "gray"
    return tf.keras.Model(inputs, outputs, name=f"student_{student_size[0]}_{color}_w{width}")


class Distiller(tf.keras.Model):
    def __init__(self, student):
        super().__init__()
        self.student = student
        self.hard_loss_fn = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True)
        self.soft_loss_fn = tf.keras.losses.KLDivergence()
        self.loss_tracker = tf.keras.metrics.Mean(name="loss")
        self.hard_loss_tracker = tf.keras.metrics.Mean(name="hard_loss")
        self.distill_loss_tracker = tf.keras.metrics.Mean(name="distill_loss")
        self.acc = tf.keras.metrics.SparseCategoricalAccuracy(name="accuracy")

    @property
    def metrics(self):
        return [self.loss_tracker, self.hard_loss_tracker, self.distill_loss_tracker, self.acc]

    def compile(self, optimizer, alpha, temperature):
        super().compile(optimizer=optimizer)
        self.alpha = alpha
        self.temperature = temperature

    def train_step(self, data):
        images, targets = data
        hard_labels = targets["hard_label"]
        teacher_probs = targets["soft_label"]

        with tf.GradientTape() as tape:
            logits = self.student(images, training=True)
            hard_loss = self.hard_loss_fn(hard_labels, logits)

            softened_teacher = tf.pow(tf.clip_by_value(teacher_probs, 1e-7, 1.0), 1.0 / self.temperature)
            softened_teacher = softened_teacher / tf.reduce_sum(softened_teacher, axis=1, keepdims=True)
            softened_student = tf.nn.softmax(logits / self.temperature, axis=1)
            distill_loss = self.soft_loss_fn(softened_teacher, softened_student) * (self.temperature ** 2)

            loss = self.alpha * hard_loss + (1.0 - self.alpha) * distill_loss

        grads = tape.gradient(loss, self.student.trainable_variables)
        self.optimizer.apply_gradients(zip(grads, self.student.trainable_variables))

        self.loss_tracker.update_state(loss)
        self.hard_loss_tracker.update_state(hard_loss)
        self.distill_loss_tracker.update_state(distill_loss)
        self.acc.update_state(hard_labels, logits)
        return {m.name: m.result() for m in self.metrics}

    def test_step(self, data):
        images, targets = data
        hard_labels = targets["hard_label"]
        logits = self.student(images, training=False)
        hard_loss = self.hard_loss_fn(hard_labels, logits)

        self.loss_tracker.update_state(hard_loss)
        self.hard_loss_tracker.update_state(hard_loss)
        self.distill_loss_tracker.update_state(0.0)
        self.acc.update_state(hard_labels, logits)
        return {m.name: m.result() for m in self.metrics}


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


def evaluate_student(student, val_df, output_dir, student_size, rgb, batch_size):
    ds = tf.data.Dataset.from_tensor_slices(val_df["path"].values)
    ds = ds.map(lambda p: load_student_image(p, student_size, rgb), num_parallel_calls=tf.data.AUTOTUNE)
    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)

    logits = student.predict(ds, verbose=1)
    probs = tf.nn.softmax(logits, axis=1).numpy()
    y_pred = np.argmax(probs, axis=1)
    y_true = val_df["label_id"].values

    report = classification_report(y_true, y_pred, target_names=CLASS_NAMES, zero_division=0)
    print("\n--- Student Classification Report ---")
    print(report)
    (output_dir / "classification_report.txt").write_text(report, encoding="utf-8")
    pd.DataFrame(classification_report(y_true, y_pred, target_names=CLASS_NAMES, output_dict=True, zero_division=0)).T.to_csv(
        output_dir / "classification_report.csv"
    )

    cm = confusion_matrix(y_true, y_pred, labels=list(range(NUM_CLASSES)))
    pd.DataFrame(cm, index=CLASS_NAMES, columns=CLASS_NAMES).to_csv(output_dir / "confusion_matrix.csv")
    plt.figure(figsize=(9, 7))
    plt.imshow(cm, cmap="Blues")
    plt.title("Student confusion matrix")
    plt.xlabel("Predicted")
    plt.ylabel("True")
    plt.xticks(range(NUM_CLASSES), CLASS_NAMES, rotation=45)
    plt.yticks(range(NUM_CLASSES), CLASS_NAMES)
    plt.colorbar()
    plt.tight_layout()
    plt.savefig(output_dir / "confusion_matrix.png", dpi=200)
    plt.close()


def predict_one(student, image_path, student_size, rgb):
    image = tf.expand_dims(load_student_image(str(image_path), student_size, rgb), axis=0)
    logits = student.predict(image, verbose=0)[0]
    probs = tf.nn.softmax(logits).numpy()
    order = np.argsort(probs)[::-1]

    print(f"\n--- Student prediction for {Path(image_path).name} ---")
    print(f"Predicted Class: {CLASS_NAMES[order[0]]}")
    print(f"Confidence: {probs[order[0]]:.4f}")
    print("Top 5 Class Probabilities:")
    for idx in order[:5]:
        print(f"  {CLASS_NAMES[idx]}: {probs[idx]:.4f}")


def convert_int8(student, train_df, output_dir, student_size, rgb):
    keras_path = output_dir / "final_student.keras"
    tflite_path = output_dir / f"student_{student_size[0]}_{'rgb' if rgb else 'gray'}_int8.tflite"
    student.save(keras_path)

    def representative_data():
        for image_path in train_df["path"].values[:400]:
            yield [tf.expand_dims(load_student_image(image_path, student_size, rgb), axis=0)]

    converter = tf.lite.TFLiteConverter.from_keras_model(student)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_data
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8

    model_bytes = converter.convert()
    tflite_path.write_bytes(model_bytes)
    print(f"\nSaved INT8 model: {tflite_path}")
    print(f"INT8 model bytes: {len(model_bytes)}")


def run(args):
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    config = vars(args).copy()
    config["teacher"] = str(Path(args.teacher).resolve())
    (output_dir / "run_config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")

    print("TensorFlow:", tf.__version__)
    print("Output dir:", output_dir)
    train_df, val_df = build_driver_wise_split(output_dir, args.val_fraction, args.random_state)
    if args.max_train_images:
        train_df = train_df.groupby("label", group_keys=False).head(max(1, args.max_train_images // NUM_CLASSES))
        train_df = train_df.reset_index(drop=True)
        print(f"Debug limit active. Train images reduced to {len(train_df)}.")
    if args.max_val_images:
        val_df = val_df.groupby("label", group_keys=False).head(max(1, args.max_val_images // NUM_CLASSES))
        val_df = val_df.reset_index(drop=True)
        print(f"Debug limit active. Validation images reduced to {len(val_df)}.")

    teacher = TFLiteTeacher(args.teacher, args.teacher_preprocess, args.teacher_threads)
    train_probs = cache_teacher_probs(teacher, train_df, output_dir, "train")
    val_probs = cache_teacher_probs(teacher, val_df, output_dir, "val")
    del teacher

    student_size = (args.student_size, args.student_size)
    rgb = args.student_channels == 3
    train_ds = student_dataset(train_df, train_probs, student_size, rgb, args.batch_size, training=True)
    val_ds = student_dataset(val_df, val_probs, student_size, rgb, args.batch_size, training=False)

    student = build_student(student_size, rgb, args.student_width)
    student.summary()

    distiller = Distiller(student)
    distiller.compile(
        optimizer=tf.keras.optimizers.Adam(args.learning_rate),
        alpha=args.alpha,
        temperature=args.temperature,
    )

    best_path = output_dir / "best_student.keras"
    callbacks = [
        SaveBestStudent(student, best_path),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            mode="max",
            patience=args.patience,
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.3,
            patience=3,
            min_lr=1e-6,
            verbose=1,
        ),
        tf.keras.callbacks.CSVLogger(output_dir / "student_training_history.csv"),
    ]

    distiller.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)

    if best_path.exists():
        student = tf.keras.models.load_model(best_path)

    evaluate_student(student, val_df, output_dir, student_size, rgb, args.batch_size)

    for sample in [
        TRAIN_DIR / "c5" / "img_99469.jpg",
        ROOT / "img_9992.jpg",
    ]:
        if sample.exists():
            predict_one(student, sample, student_size, rgb)

    convert_int8(student, train_df, output_dir, student_size, rgb)


def parse_args():
    parser = argparse.ArgumentParser(description="Distill an ESP32 student from a TFLite teacher.")
    parser.add_argument("--teacher", required=True, help="Path to teacher .tflite model.")
    parser.add_argument("--output-dir", required=True, help="Folder for this teacher's student outputs.")
    parser.add_argument(
        "--teacher-preprocess",
        default="imagenet_torch",
        choices=["imagenet_torch", "zero_to_one", "minus_one_to_one", "raw"],
        help="Preprocessing used before feeding the TFLite teacher.",
    )
    parser.add_argument("--teacher-threads", type=int, default=4)
    parser.add_argument("--student-size", type=int, default=96)
    parser.add_argument("--student-channels", type=int, default=3, choices=[1, 3])
    parser.add_argument("--student-width", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--temperature", type=float, default=4.0)
    parser.add_argument("--alpha", type=float, default=0.45)
    parser.add_argument("--patience", type=int, default=8)
    parser.add_argument("--val-fraction", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--max-train-images", type=int, default=0, help="Optional smoke-test limit. Default uses all images.")
    parser.add_argument("--max-val-images", type=int, default=0, help="Optional smoke-test limit. Default uses all images.")
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
