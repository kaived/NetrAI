# Dataset Collection Guide

Collect datasets in this order. This keeps the project useful even if downloads, accounts, or labels take time.

## Priority 1: APTOS 2019

Use for the first M3 diabetic retinopathy classifier baseline.

Official source:
- https://www.kaggle.com/competitions/aptos2019-blindness-detection/data

Place files here:

```text
data/raw/aptos2019/
  train.csv
  test.csv
  sample_submission.csv
  train_images/
  test_images/
```

Notes:
- Requires Kaggle login and competition rule acceptance.
- Labels use a 0 to 4 DR severity scale.
- Good first training dataset because the file layout is simple.

If Kaggle redirects you to Rules:

1. Open the APTOS page in your browser while logged in.
2. Go to the Rules tab and accept the competition rules.
3. Complete phone verification if Kaggle asks for it.
4. Return to the Data tab and use Kaggle CLI or kagglehub.

The API cannot bypass this step. If rules are not accepted, CLI downloads usually fail with a permission or forbidden error.

Suggested command after Kaggle CLI setup:

```bash
kaggle competitions download -c aptos2019-blindness-detection -p data/raw/aptos2019
```

For the MVP, download only what you need first:

```bash
kaggle competitions download -c aptos2019-blindness-detection -f train.csv -p "data/raw/aptos2019"
kaggle competitions download -c aptos2019-blindness-detection -f train_images.zip -p "data/raw/aptos2019"
```

## Priority 2: IDRiD

Use for India-specific grounding and lesion-mask validation.

Official sources:
- https://ieee-dataport.org/open-access/indian-diabetic-retinopathy-image-dataset-idrid
- https://idrid.grand-challenge.org/

Place files here:

```text
data/raw/idrid/
  disease_grading/
  segmentation/
  localization/
```

Notes:
- This is the most important dataset for the proposal story because it is Indian-specific.
- Use grading labels for DR severity work.
- Use segmentation masks only when making lesion-level claims.

## Priority 3: Messidor-2

Use for external validation if you can obtain both images and labels.

Official image source:
- https://www.adcis.net/en/third-party/messidor2/

Useful public label source:
- https://www.kaggle.com/datasets/google-brain/messidor2-dr-grades

Place files here:

```text
data/raw/messidor2/
  images/
  labels/
```

Notes:
- The official image package is not enough for sensitivity/specificity unless you also have trusted labels.
- If labels are not available, do not claim Messidor-2 validation. Use it only for demo imagery or postpone it.
- Messidor-2 images are distributed as a split zip archive. Download all parts into the same folder before extracting:

```text
IMAGES.zip.001
IMAGES.zip.002
IMAGES.zip.003
IMAGES.zip.004
```

Extract only `IMAGES.zip.001` with 7-Zip. Do not extract `.002`, `.003`, or `.004` directly. If 7-Zip reports corruption, one part is usually missing, incomplete, or renamed.

Suggested label command after Kaggle CLI setup:

```bash
kaggle datasets download -d google-brain/messidor2-dr-grades -p data/raw/messidor2/labels
```

## Priority 4: DRIVE

Use only for vessel segmentation validation.

Official source:
- https://drive.grand-challenge.org/

Place files here:

```text
data/raw/drive/
  training/
  test/
```

Notes:
- DRIVE is not a diabetic retinopathy grading dataset.
- Keep it optional until the classifier and explanation demo are stable.

## Minimal Hackathon Dataset Set

If time or bandwidth is limited, collect only:

```text
APTOS 2019 + IDRiD
```

That is enough to build:

- A classifier baseline
- India-specific narrative
- Some lesion/explanation validation

Add Messidor-2 later when you are ready to report external validation.

## After Downloading

Create expected folders:

```bash
python scripts/check_datasets.py --init
```

Check what is still missing:

```bash
python scripts/check_datasets.py
```

Do not commit dataset files. The repository tracks only empty folders, config, and manifests.
