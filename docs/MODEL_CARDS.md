# Model cards

Three independent models power Pawlytics. This document records, for each one, what it was trained on, how it
was trained, how well it performs on **held-out test data**, and where it is likely to fail. Every number is
copied from the output cells of the notebooks in [`../notebooks`](../notebooks) — nothing here is estimated.

| | Text | Audio | Image |
|---|---|---|---|
| Task | Symptom description → condition | Dog sound → condition / normal sound | Photo → visual condition |
| Classes | 20 | 8 | 9 |
| Architecture | Bio_ClinicalBERT + MLP head | YAMNet embeddings + MLP | EfficientNet-B0 |
| Framework | PyTorch | TensorFlow / Keras | PyTorch |
| Test accuracy | **63.8 %** | **71.9 %** | **73.2 %** |
| Notebook | [`text-model-training`](../notebooks/text-model/text-model-training.ipynb) | [`audio-model-training`](../notebooks/audio-model/audio-model-training.ipynb) | [`image-model-training`](../notebooks/image-model/image-model-training.ipynb) |

> All three are **decision-support prototypes**, not diagnostic tools. See each model's limitations and the
> project-level [responsible-use notes](../README.md#limitations--responsible-use).

---

## 1 · Text model — symptom description → condition

**Data.** Dog Aging Project (2022 release): the owner-reported *health conditions* table (119,271 rows) joined
with the *dog overview* table (breed, sex, age) and the project codebook (329 condition codes). After mapping codes to
names and keeping the 20 most frequent conditions, 51,841 records remained.

| Split | Records | Dogs |
|---|---|---|
| Train | 36,401 | 17,950 |
| Validation | 7,651 | 3,847 |
| Test | 7,789 | 3,847 |

Splitting is **by dog**, so the same animal never appears in two splits.

**Classes (20).** Kennel cough, cataracts, chocolate ingestion, cruciate ligament rupture, dental calculus,
dog bite, ear infection, extracted teeth, food / medicine skin allergies, fractured teeth, giardia, gingivitis,
laceration, heart murmur, osteoarthritis, other trauma, pruritis, seasonal allergies, sebaceous cysts, torn / broken toenail.

**Model.** `emilyalsentzer/Bio_ClinicalBERT` encoder → `[CLS]` representation → dropout (0.3) → 256-unit ReLU layer →
dropout → 20-way linear classifier. Max sequence length 128, plain cross-entropy loss (no class weighting), AdamW with
a linear warm-up schedule, early stopping on validation accuracy (patience 5; training stopped after 10 epochs).

**Symptom text.** The dataset records *diagnoses*, not symptom descriptions, so natural-language symptom text was
produced from each diagnosis with rule-based templates (e.g. ear infection → "head shaking, ear scratching, red ears …"),
conditioned on breed, age and sex. Severity (mild → critical) and treatment suggestions are rule-based lookups on
keywords, applied *after* classification.

**Results.**

| Experiment | Test accuracy |
|---|---|
| Generated structured symptom text (main model) | **63.8 %** (test loss 0.777) |
| Noisier, more realistic text variants | 42.2 % (test loss 1.777) |

**Limitations.**
- Because the input text is generated from the label, the 63.8 % reflects how well the model recovers that
  mapping, **not** performance on messy real owner descriptions — the 42.2 % realistic-text run is a better hint.
- Many conditions share symptoms (several skin / allergy classes), putting a ceiling on achievable accuracy.
- Severity and treatment output are keyword rules, not learned.
- Owner-reported diagnoses are themselves noisy.

---

## 2 · Audio model — dog sounds → condition

**Data.** 953 three-second clips gathered from public online videos — see
[`audio-dataset-collection`](../notebooks/audio-model/audio-dataset-collection.ipynb). Pipeline: search queries per class →
`yt-dlp` download → FFmpeg conversion to mono 16 kHz WAV → overlapping 3-second slices → silence trimming (librosa) and an
RMS-energy filter → YAMNet-based filter that keeps clips dominated by dog-sound classes and rejects speech / music through a
blocklist → pitch-shift / time-stretch / noise augmentation to top up small classes. After processing, 925 clips were split
592 / 148 / 185 (train / validation / test) with a stratified split.

| Class | Clips collected |
|---|---|
| Normal barking | 155 |
| Normal howling | 152 |
| Normal whining | 150 |
| Kennel cough | 120 |
| Reverse sneeze | 117 |
| Normal playing | 103 |
| Tracheal collapse | 94 |
| Normal breathing | 62 |

**Model.** Audio resampled to 16 kHz, padded / cropped to 3 s, passed through the **frozen YAMNet** network to get
a 1,024-dimensional embedding; a small classifier (Dense 512 → 256 → 128 with BatchNorm and Dropout 0.5 / 0.4 / 0.3,
softmax over 8 classes) is trained on top. Class weights compensate for imbalance; Adam, `ReduceLROnPlateau`, early
stopping (best epoch 31).

**Results (185 test clips).** Accuracy **71.9 %**, macro-F1 0.71, weighted-F1 0.71.

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| Kennel cough | 0.71 | 0.65 | 0.68 | 23 |
| Normal barking | 0.69 | 0.87 | 0.77 | 31 |
| Normal breathing | 0.92 | 0.85 | 0.88 | 13 |
| Normal howling | 0.78 | 0.83 | 0.81 | 30 |
| Normal playing | 0.60 | 0.33 | 0.43 | 18 |
| Normal whining | 0.75 | 0.70 | 0.72 | 30 |
| Reverse sneeze | 0.59 | 0.73 | 0.65 | 22 |
| Tracheal collapse | 0.75 | 0.67 | 0.71 | 18 |

**Limitations.**
- Small dataset (a few hundred clips per split); the test set has only 13–31 clips per class, so per-class numbers
  are noisy.
- Training accuracy ran well above validation accuracy (≈ 0.89 vs ≈ 0.65 in late epochs) — the model overfits.
- *Normal playing* is the weakest class (recall 0.33) and is often confused with other vocalisations.
- Clips come from online videos, so recording quality and breed mix are uncontrolled. Check source licences
  before redistributing the dataset.

---

## 3 · Image model — photo → visual condition

**Data.** More than 20 public skin / eye / nose datasets were cleaned and label-normalised
([`cleaning-datasets`](../notebooks/image-model/cleaning-datasets.ipynb)) — invalid files dropped, class names unified
(e.g. every healthy variant → `healthy`), split folders repaired, exact duplicates removed by content hash (SHA-256 / MD5)
and near-duplicates by perceptual hash — then merged in groups and finally into one 9-class dataset
([`merging-datasets`](../notebooks/image-model/merging-datasets.ipynb)). The training notebook verifies **zero file
overlap** between train, validation and test.

| Class | Train | Validation | Test |
|---|---|---|---|
| Healthy | 4,717 | 547 | 297 |
| Fungal infection | 3,926 | 755 | 290 |
| Dermatitis | 3,219 | 579 | 163 |
| Bacterial infection | 1,750 | 305 | 63 |
| Eye redness | 1,716 | 439 | 352 |
| Mange | 1,365 | 402 | 180 |
| Nasal discharge | 1,221 | 403 | 194 |
| Keratosis | 1,155 | 383 | 195 |
| Fleas | 195 | 12 | 18 |
| **Total** | **19,264** | **3,825** | **1,752** |

**Model.** ImageNet-pre-trained **EfficientNet-B0** with a new classifier head (dropout 0.4 + linear, 9 classes).
Cross-entropy with **class weights** and **label smoothing 0.1**, AdamW (lr 3e-4, weight decay 1e-3) with a
cosine-annealing schedule, mixed-precision training, 224 × 224 inputs, augmentation (random resized crop, flip, colour
jitter, RandAugment).

Two training setups appear in the notebook, and they are **not the same model**:

| Setup | Backbone | Schedule | Used for |
|---|---|---|---|
| **Final model** | Frozen — only the classifier head is trained | up to 13 epochs, early stopping with patience 2 (best checkpoint at epoch 7, stopped at epoch 9) | validation 74.0 %, **held-out test 73.2 %**; this checkpoint is the one exported to the app |
| **3-fold cross-validation** | Frozen for the first epoch, then gradual unfreezing from epoch 2 | 8 epochs per fold | 94.1 % ± 0.2 % |

The gradual-unfreezing step indexes individual parameter tensors rather than blocks, so it unfreezes much more of the
backbone than the "last 3 blocks" its comment suggests. Fine-tuning the backbone of the *final* model is an obvious next
experiment.

**Results.**

| Measure | Value |
|---|---|
| Final model — validation accuracy (best epoch) | 74.0 % |
| **Final model — held-out test accuracy (1,752 images)** | **73.2 %** |
| 3-fold cross-validation (folds of the training split) | 94.1 % ± 0.2 % |

The cross-validation score is measured on folds of the *training* data with a different training setup, and is far
above the held-out score; the held-out test accuracy is the honest estimate of real-world performance.

**Medical advice layer.** Each predicted class maps to a curated protocol in
[`medical_protocols.json`](../app/imagemodelW/model_assets/medical_protocols.json) (treatments, urgency, emergency
flag). If the top-1 confidence is low, the response says so explicitly ("Low confidence diagnosis — consult a
professional") and lists differential diagnoses.

**Limitations.**
- *Fleas* has very few examples (195 train / 12 validation / 18 test) — treat that class as unreliable.
- Visually similar classes (dermatitis, fungal and bacterial infection) are easily confused.
- Images come from many different sources; photos taken with a phone in a different environment may perform worse.
- Output is a visual classification only — it cannot replace skin cytology, culture or a vet's examination.

---

## Reproducing the results

1. Open the notebooks on Kaggle with a GPU; attach the datasets listed in the [README](../README.md#datasets).
2. Run in order: *dataset* notebooks → *training* notebook for each modality.
3. Export the trained weights and copy them into `app/<modality>/…` as described in the README.

Random seeds are fixed (42) in all three notebooks.
