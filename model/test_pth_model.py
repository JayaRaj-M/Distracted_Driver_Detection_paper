import argparse
import csv
import json
import time
from pathlib import Path

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
except ImportError as exc:
    raise SystemExit(
        "PyTorch is required. Install it first, for example:\n"
        "  pip install torch torchvision pillow scikit-learn\n"
    ) from exc

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow is required. Install it with: pip install pillow") from exc


DEFAULT_CLASSES = [
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
]


class DWBlock(nn.Module):
    def __init__(self, in_ch, out_ch, stride=1):
        super().__init__()
        self.dw = nn.Conv2d(in_ch, in_ch, 3, stride=stride, padding=1, groups=in_ch, bias=False)
        self.bn1 = nn.BatchNorm2d(in_ch)
        self.pw = nn.Conv2d(in_ch, out_ch, 1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_ch)
        self.act = nn.ReLU(inplace=True)

    def forward(self, x):
        x = self.act(self.bn1(self.dw(x)))
        x = self.act(self.bn2(self.pw(x)))
        return x


class NemoStudent(nn.Module):
    """
    Reconstructed from best_nemo_student_from_ConvNeXt_Tiny.pth parameter names/shapes.

    If your original training code used different strides or activations, place that class
    here instead. The state_dict names are matched to this module.
    """

    def __init__(self, num_classes=10, block_strides=(1, 2, 2, 2)):
        super().__init__()
        self.prototype_memory = nn.Parameter(torch.zeros(num_classes, 128), requires_grad=False)
        self.stem = nn.Sequential(
            nn.Conv2d(3, 24, 3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(24),
            nn.ReLU(inplace=True),
        )
        self.block1 = DWBlock(24, 48, stride=block_strides[0])
        self.block2 = DWBlock(48, 64, stride=block_strides[1])
        self.early_pool = nn.AdaptiveAvgPool2d(1)
        self.early_fc = nn.Linear(64, num_classes)
        self.block3 = DWBlock(64, 96, stride=block_strides[2])
        self.block4 = DWBlock(96, 128, stride=block_strides[3])
        self.final_pool = nn.AdaptiveAvgPool2d(1)
        self.projector = nn.Sequential(
            nn.Linear(128, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(inplace=True),
        )
        self.classifier = nn.Linear(128, num_classes)

    def forward_features(self, x):
        x = self.stem(x)
        x = self.block1(x)
        x = self.block2(x)
        early_logits = self.early_fc(self.early_pool(x).flatten(1))
        x = self.block3(x)
        x = self.block4(x)
        x = self.final_pool(x).flatten(1)
        features = self.projector(x)
        logits = self.classifier(features)
        return logits, early_logits, features

    def forward(self, x):
        logits, _, _ = self.forward_features(x)
        return logits


def clean_state_dict(obj):
    if isinstance(obj, dict):
        for key in ("state_dict", "model_state_dict", "model"):
            if key in obj and isinstance(obj[key], dict):
                obj = obj[key]
                break
    return {k.replace("module.", "", 1): v for k, v in obj.items() if k != "_metadata"}


def load_model(checkpoint, device, block_strides):
    ckpt = torch.load(checkpoint, map_location=device)
    state = clean_state_dict(ckpt)
    num_classes = int(state["classifier.bias"].numel())
    model = NemoStudent(num_classes=num_classes, block_strides=block_strides).to(device)
    missing, unexpected = model.load_state_dict(state, strict=False)
    if missing or unexpected:
        print("Load warnings:")
        if missing:
            print("  missing:", missing)
        if unexpected:
            print("  unexpected:", unexpected)
    model.eval()
    return model, num_classes


def preprocess_image(path, image_size):
    image = Image.open(path).convert("RGB").resize((image_size, image_size))
    data = torch.frombuffer(bytearray(image.tobytes()), dtype=torch.uint8)
    data = data.view(image_size, image_size, 3).permute(2, 0, 1).float().div(255.0)
    mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
    std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
    return (data - mean) / std


def read_class_names(path, num_classes):
    if not path:
        return DEFAULT_CLASSES[:num_classes] if num_classes == 10 else [f"class_{i}" for i in range(num_classes)]
    names = [line.strip() for line in Path(path).read_text().splitlines() if line.strip()]
    if len(names) != num_classes:
        raise ValueError(f"{path} has {len(names)} names, but model has {num_classes} classes.")
    return names


def iter_imagefolder(root, image_size, class_names):
    root = Path(root)
    class_to_idx = {name: i for i, name in enumerate(class_names)}
    for class_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        if class_dir.name not in class_to_idx:
            continue
        label = class_to_idx[class_dir.name]
        for path in sorted(class_dir.rglob("*")):
            if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}:
                yield preprocess_image(path, image_size), label, path


def iter_csv(csv_path, image_size):
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if "path" not in reader.fieldnames or "label" not in reader.fieldnames:
            raise ValueError("CSV must contain columns: path,label")
        base = Path(csv_path).resolve().parent
        for row in reader:
            path = Path(row["path"])
            if not path.is_absolute():
                path = base / path
            yield preprocess_image(path, image_size), int(row["label"]), path


@torch.no_grad()
def predict_one(model, image_path, image_size, class_names, device):
    x = preprocess_image(image_path, image_size).unsqueeze(0).to(device)
    logits = model(x)
    probs = F.softmax(logits, dim=1)[0]
    score, pred = probs.max(dim=0)
    topk = min(5, probs.numel())
    top_scores, top_indices = probs.topk(topk)
    print(f"\nSingle image: {image_path}")
    print(f"Prediction: {class_names[pred.item()]}  confidence={score.item():.4f}")
    print("Top scores:")
    for idx, val in zip(top_indices.tolist(), top_scores.tolist()):
        print(f"  {idx:2d} {class_names[idx]:28s} {val:.4f}")


@torch.no_grad()
def evaluate(model, samples, batch_size, device, num_classes):
    total = 0
    correct1 = 0
    correct5 = 0
    y_true = []
    y_pred = []
    batch_x = []
    batch_y = []
    start = time.perf_counter()

    def flush():
        nonlocal total, correct1, correct5, batch_x, batch_y
        if not batch_x:
            return
        x = torch.stack(batch_x).to(device)
        y = torch.tensor(batch_y, device=device)
        logits = model(x)
        pred = logits.argmax(dim=1)
        correct1 += (pred == y).sum().item()
        k = min(5, num_classes)
        correct5 += (logits.topk(k, dim=1).indices == y[:, None]).any(dim=1).sum().item()
        total += y.numel()
        y_true.extend(y.cpu().tolist())
        y_pred.extend(pred.cpu().tolist())
        batch_x = []
        batch_y = []

    for image, label, _ in samples:
        batch_x.append(image)
        batch_y.append(label)
        if len(batch_x) == batch_size:
            flush()
    flush()

    elapsed = time.perf_counter() - start
    if total == 0:
        print("\nNo labeled images found.")
        return

    print("\nDataset metrics:")
    print(f"Images:        {total}")
    print(f"Accuracy@1:    {correct1 / total:.4f}")
    print(f"Accuracy@5:    {correct5 / total:.4f}")
    print(f"Throughput:    {total / elapsed:.2f} images/sec")

    cm = torch.zeros(num_classes, num_classes, dtype=torch.int64)
    for t, p in zip(y_true, y_pred):
        cm[t, p] += 1
    print("Confusion matrix rows=true cols=pred:")
    print(cm.tolist())


def count_params(model):
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    return total, trainable


def profile_flops(model, image_size, device):
    flops = 0
    handles = []

    def conv_hook(module, inputs, output):
        nonlocal flops
        batch = output.shape[0]
        out_ch, out_h, out_w = output.shape[1:]
        kernel_ops = module.kernel_size[0] * module.kernel_size[1] * (module.in_channels // module.groups)
        flops += batch * out_ch * out_h * out_w * kernel_ops * 2
        if module.bias is not None:
            flops += batch * out_ch * out_h * out_w

    def linear_hook(module, inputs, output):
        nonlocal flops
        batch = output.shape[0]
        flops += batch * module.in_features * module.out_features * 2
        if module.bias is not None:
            flops += batch * module.out_features

    for module in model.modules():
        if isinstance(module, nn.Conv2d):
            handles.append(module.register_forward_hook(conv_hook))
        elif isinstance(module, nn.Linear):
            handles.append(module.register_forward_hook(linear_hook))

    with torch.no_grad():
        model(torch.zeros(1, 3, image_size, image_size, device=device))
    for handle in handles:
        handle.remove()
    return flops / 1e9


@torch.no_grad()
def benchmark_latency(model, image_size, device, runs=50, warmup=10):
    x = torch.randn(1, 3, image_size, image_size, device=device)
    for _ in range(warmup):
        model(x)
    if device.type == "cuda":
        torch.cuda.synchronize()
    start = time.perf_counter()
    for _ in range(runs):
        model(x)
    if device.type == "cuda":
        torch.cuda.synchronize()
    return (time.perf_counter() - start) * 1000.0 / runs


def main():
    parser = argparse.ArgumentParser(description="Test/evaluate best_nemo_student_from_ConvNeXt_Tiny.pth")
    parser.add_argument("--checkpoint", default="best_nemo_student_from_ConvNeXt_Tiny.pth")
    parser.add_argument("--image", default="img_99469.jpg", help="Single image to score.")
    parser.add_argument("--data", help="ImageFolder test directory, e.g. test/c0_safe_driving/*.jpg")
    parser.add_argument("--csv", help="CSV with columns path,label for labeled evaluation.")
    parser.add_argument("--classes", help="Text file with one class name per line.")
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    parser.add_argument("--block-strides", default="1,2,2,2", help="Depthwise block strides.")
    parser.add_argument("--json-out", help="Write model summary metrics to JSON.")
    args = parser.parse_args()

    device = torch.device(args.device)
    block_strides = tuple(int(x) for x in args.block_strides.split(","))
    if len(block_strides) != 4:
        raise ValueError("--block-strides must contain 4 comma-separated integers.")

    model, num_classes = load_model(args.checkpoint, device, block_strides)
    class_names = read_class_names(args.classes, num_classes)
    total_params, trainable_params = count_params(model)
    gflops = profile_flops(model, args.image_size, device)
    latency_ms = benchmark_latency(model, args.image_size, device)

    summary = {
        "checkpoint": str(args.checkpoint),
        "device": str(device),
        "image_size": args.image_size,
        "num_classes": num_classes,
        "total_parameters": total_params,
        "trainable_parameters": trainable_params,
        "gflops_conv_linear_only": gflops,
        "latency_ms_batch1": latency_ms,
    }

    print("\nModel summary:")
    print(f"Classes:       {num_classes}")
    print(f"Parameters:    {total_params:,} total / {trainable_params:,} trainable")
    print(f"GFLOPs:        {gflops:.6f} for 1x3x{args.image_size}x{args.image_size} (conv+linear, multiply-add=2 FLOPs)")
    print(f"Latency:       {latency_ms:.3f} ms/image on {device}")

    if args.image and Path(args.image).exists():
        predict_one(model, args.image, args.image_size, class_names, device)

    if args.data:
        evaluate(model, iter_imagefolder(args.data, args.image_size, class_names), args.batch_size, device, num_classes)
    elif args.csv:
        evaluate(model, iter_csv(args.csv, args.image_size), args.batch_size, device, num_classes)
    else:
        print("\nAccuracy needs labeled test data. Use --data ImageFolderDir or --csv labels.csv.")

    if args.json_out:
        Path(args.json_out).write_text(json.dumps(summary, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
