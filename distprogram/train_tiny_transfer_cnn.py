from pathlib import Path
import json

import tensorflow as tf

DATA_DIR = Path("imgs_96_grayscale")
TRAIN_DIR = DATA_DIR / "train"
TEST_DIR = DATA_DIR / "test"
ARTIFACT_DIR = Path("micro_model_artifacts")

IMG_SIZE = (96, 96)
CHANNELS = 1
NUM_CLASSES = 10
BATCH_SIZE = 64
SEED = 42

PRETRAIN_EPOCHS = 8
CLASSIFIER_EPOCHS = 25
FINE_TUNE_EPOCHS = 8


def ensure_dirs():
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def normalize_image(image):
    return tf.cast(image, tf.float32) / 255.0


def load_unlabeled_image(path):
    image = tf.io.read_file(path)
    image = tf.io.decode_image(image, channels=CHANNELS, expand_animations=False)
    image = tf.image.resize(image, IMG_SIZE)
    image = normalize_image(image)
    return image, image


def make_unlabeled_dataset():
    patterns = [str(TRAIN_DIR / "*" / "*"), str(TEST_DIR / "*")]
    files = []
    for pattern in patterns:
        files.append(tf.data.Dataset.list_files(pattern, shuffle=True, seed=SEED))

    dataset = files[0].concatenate(files[1])
    dataset = dataset.shuffle(10000, seed=SEED, reshuffle_each_iteration=True)
    dataset = dataset.map(load_unlabeled_image, num_parallel_calls=tf.data.AUTOTUNE)
    dataset = dataset.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
    return dataset


def make_classifier_datasets():
    train_ds = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        validation_split=0.2,
        subset="training",
        seed=SEED,
        image_size=IMG_SIZE,
        color_mode="grayscale",
        batch_size=BATCH_SIZE,
        label_mode="int",
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        validation_split=0.2,
        subset="validation",
        seed=SEED,
        image_size=IMG_SIZE,
        color_mode="grayscale",
        batch_size=BATCH_SIZE,
        label_mode="int",
    )

    class_names = train_ds.class_names

    train_ds = train_ds.map(
        lambda image, label: (normalize_image(image), label),
        num_parallel_calls=tf.data.AUTOTUNE,
    ).prefetch(tf.data.AUTOTUNE)

    val_ds = val_ds.map(
        lambda image, label: (normalize_image(image), label),
        num_parallel_calls=tf.data.AUTOTUNE,
    ).prefetch(tf.data.AUTOTUNE)

    return train_ds, val_ds, class_names


def build_tiny_encoder(name="tiny_encoder"):
    inputs = tf.keras.layers.Input(shape=(96, 96, 1))

    x = tf.keras.layers.Conv2D(16, 3, strides=2, padding="same", use_bias=False)(inputs)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)

    x = tf.keras.layers.DepthwiseConv2D(3, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)
    x = tf.keras.layers.Conv2D(24, 1, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)

    x = tf.keras.layers.DepthwiseConv2D(3, strides=2, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)
    x = tf.keras.layers.Conv2D(32, 1, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)

    x = tf.keras.layers.DepthwiseConv2D(3, strides=2, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)
    x = tf.keras.layers.Conv2D(48, 1, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)

    x = tf.keras.layers.DepthwiseConv2D(3, strides=2, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.ReLU()(x)
    x = tf.keras.layers.Conv2D(64, 1, padding="same", use_bias=False)(x)
    x = tf.keras.layers.BatchNormalization()(x)
    outputs = tf.keras.layers.ReLU()(x)

    return tf.keras.Model(inputs, outputs, name=name)


def build_autoencoder(encoder):
    inputs = tf.keras.layers.Input(shape=(96, 96, 1))
    x = encoder(inputs)

    x = tf.keras.layers.UpSampling2D(2)(x)
    x = tf.keras.layers.Conv2D(48, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.UpSampling2D(2)(x)
    x = tf.keras.layers.Conv2D(32, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.UpSampling2D(2)(x)
    x = tf.keras.layers.Conv2D(16, 3, padding="same", activation="relu")(x)
    x = tf.keras.layers.UpSampling2D(2)(x)
    outputs = tf.keras.layers.Conv2D(1, 3, padding="same", activation="sigmoid")(x)

    return tf.keras.Model(inputs, outputs, name="tiny_autoencoder")


def build_classifier(encoder):
    inputs = tf.keras.layers.Input(shape=(96, 96, 1))
    x = encoder(inputs)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.15)(x)
    outputs = tf.keras.layers.Dense(NUM_CLASSES)(x)
    return tf.keras.Model(inputs, outputs, name="tiny_driver_distraction_classifier")


def representative_dataset(train_ds):
    for images, _ in train_ds.take(150):
        yield [tf.cast(images, tf.float32)]


def convert_to_int8(model, train_ds):
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = lambda: representative_dataset(train_ds)
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8
    return converter.convert()


def main():
    ensure_dirs()

    print("Loading datasets...")
    unlabeled_ds = make_unlabeled_dataset()
    train_ds, val_ds, class_names = make_classifier_datasets()

    with open(ARTIFACT_DIR / "class_names.json", "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)

    print("Stage 1: self-supervised transfer pretraining with tiny autoencoder")
    encoder = build_tiny_encoder()
    autoencoder = build_autoencoder(encoder)
    autoencoder.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="mse",
    )
    autoencoder.fit(unlabeled_ds, epochs=PRETRAIN_EPOCHS)
    encoder.save(ARTIFACT_DIR / "tiny_encoder_pretrained.keras")

    print("Stage 2: transfer encoder into 10-class classifier")
    classifier = build_classifier(encoder)
    encoder.trainable = False
    classifier.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
        metrics=["accuracy"],
    )
    classifier.fit(train_ds, validation_data=val_ds, epochs=CLASSIFIER_EPOCHS)

    print("Stage 3: fine-tune the transferred encoder")
    encoder.trainable = True
    classifier.compile(
        optimizer=tf.keras.optimizers.Adam(1e-4),
        loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=True),
        metrics=["accuracy"],
    )
    classifier.fit(train_ds, validation_data=val_ds, epochs=FINE_TUNE_EPOCHS)

    keras_path = ARTIFACT_DIR / "tiny_driver_distraction_96_gray.keras"
    classifier.save(keras_path)

    print("Converting to full INT8 TFLite...")
    tflite_model = convert_to_int8(classifier, train_ds)
    tflite_path = ARTIFACT_DIR / "tiny_driver_distraction_96_gray_int8.tflite"
    with open(tflite_path, "wb") as f:
        f.write(tflite_model)

    print("Done.")
    print(f"Keras model: {keras_path}")
    print(f"INT8 TFLite model: {tflite_path}")
    print(f"INT8 TFLite size: {len(tflite_model)} bytes")
    print("Expected microcontroller input: 1 x 96 x 96 x 1 int8")


if __name__ == "__main__":
    main()
