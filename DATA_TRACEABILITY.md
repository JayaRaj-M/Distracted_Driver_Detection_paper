# DATA_TRACEABILITY.md

| Manuscript Item | Value/Figure | Source File | Notes |
|---|---|---|---|
| Dataset table | 22,424 total images and c0-c9 counts | res/tables/dataset_class_image_counts.docx | Newer authoritative dataset-count table |
| Driver-wise validation split | 17,382 train and 5,042 validation images | C:/Users/HP/Downloads/state-farm-distracted-driver-detection/distilled_from_*_outputs/driver_wise_split_summary.csv | Same split reported across four teacher-derived student folders |
| Preliminary table | Teacher and three candidate students, accuracy/F1/FLOPs/latency | res/tables/Preliminary_Transfer_Learning_Results_and_Deployment_Metrics.docx | Used for student-selection section |
| Four-model metrics | ConvNeXt, EfficientNet-B0, MobileNetV3-Small, ResNet50 accuracy/precision/recall/F1 | res/tables/Our_Four_Distilled_Model_Accuracy_Precision_Recall_F1.docx and model_training_graphs/*.csv | Newer tables retained; older duplicate prose shortened |
| Shared student profile | 17 Keras layers; 10 learnable layers; 0.00553M parameters; 7.81M FLOPs | res/tables/Four_Distilled_Models_Performance_on_Each_Hardware.docx | Reported as deployment-table value; FLOPs convention stated as multiply-add = 2 FLOPs |
| Model size | 22,728 bytes for four 96 RGB student TFLite files | model/student_*_96_rgb_int8.tflite and res tables | Matches four shared-profile artifacts |
| RP2040 hardware timing | 43.4 ms, 23.04 FPS | res/tables/Representational_Four_Model_Hardware_Performance.docx | Used as hardware-table evidence; simulator claims excluded |
| Accuracy/loss figure | Four-student convergence curves | res/imgs/models_accuracy_loss_only.png | Placed in training-behavior section |
| Radar metrics figure | Four-student macro metric comparison | res/imgs/models_radar_metrics.png | Placed after four-model metric table |
| Confusion matrices | Four-student confusion matrices | res/imgs/models_confusion_matrices.png | Placed after classification-performance discussion |
| Architecture figure | Student-teacher architecture diagram | res/imgs/Student_Teacher_Architecture_Diagram.converted.png | Placed in architecture section |
| Literature comparison | Reported metrics for related work | referal papers/*.pdf plus cited DOI/publisher links | NR used when metrics were not located |

Unresolved caveat: the generic Keras width-10 source reconstruction can yield a different parameter count from the deployment tables depending on bias settings. The manuscript keeps the mandatory deployment profile from res and records the caveat rather than silently changing the value.
