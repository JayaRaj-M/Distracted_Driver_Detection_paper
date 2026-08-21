from pathlib import Path
from PIL import Image
from concurrent.futures import ProcessPoolExecutor
from collections import Counter

SOURCE_DIR = Path("./imgs")
OUTPUT_DIR = Path("./imgs_96_grayscale")

TARGET_SIZE = (96, 96)
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def process_single_image(args):
    """Resize a single image, convert it to grayscale, and save it."""
    img_path, relative_path = args
    try:
        dest_path = OUTPUT_DIR / relative_path

        if dest_path.exists():
            return True

        dest_path.parent.mkdir(parents=True, exist_ok=True)

        with Image.open(img_path) as img:
            processed_img = img.convert("L").resize(TARGET_SIZE, Image.Resampling.LANCZOS)
            processed_img.save(dest_path, optimize=True)

        return True
    except Exception as exc:
        print(f"Error processing {img_path}: {exc}")
        return False


def collect_tasks():
    tasks = []
    class_counts = Counter()

    train_dir = SOURCE_DIR / "train"
    if train_dir.exists():
        for class_folder in sorted(train_dir.iterdir()):
            if not class_folder.is_dir() or not class_folder.name.startswith("c"):
                continue

            for img_file in class_folder.glob("*"):
                if img_file.suffix.lower() in IMAGE_EXTENSIONS:
                    rel_path = img_file.relative_to(SOURCE_DIR)
                    tasks.append((img_file, rel_path))
                    class_counts[class_folder.name] += 1

    # State Farm's test folder contains loose images, not c0-c9 subfolders.
    test_dir = SOURCE_DIR / "test"
    if test_dir.exists():
        for img_file in test_dir.glob("*"):
            if img_file.suffix.lower() in IMAGE_EXTENSIONS:
                rel_path = img_file.relative_to(SOURCE_DIR)
                tasks.append((img_file, rel_path))

    return tasks, class_counts


def main():
    if not SOURCE_DIR.exists():
        print(f"ERROR: Source folder '{SOURCE_DIR}' not found.")
        print("Place this script next to your 'imgs' folder.")
        return

    print("Scanning directory structure for processing tasks...", flush=True)
    tasks, class_counts = collect_tasks()

    total_images = len(tasks)
    print(f"Found {total_images} images. Processing on all available CPU cores...", flush=True)

    if class_counts:
        print("Training class counts:", flush=True)
        for class_name in sorted(class_counts):
            print(f"  {class_name}: {class_counts[class_name]}", flush=True)

    success_count = 0
    with ProcessPoolExecutor() as executor:
        for result in executor.map(process_single_image, tasks):
            if result:
                success_count += 1
            if success_count and success_count % 1000 == 0:
                print(f"Processed {success_count}/{total_images} images...", flush=True)

    print()
    print("=======================================================")
    print(f"Success! Processed {success_count}/{total_images} images.")
    print(f"Target outputs saved here: {OUTPUT_DIR.resolve()}")
    print("Training output format: imgs_96_grayscale/train/c0 ... c9")
    print("Test output format: imgs_96_grayscale/test/*.jpg")
    print("=======================================================")


if __name__ == "__main__":
    main()
