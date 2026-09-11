# NetrAI V2 Candidate

V2 is a research classifier candidate. The active website/APK model remains
`aptos-baseline-v1`. The older `aptos-resnet18-stable-v2` experiment is not this
new candidate and was not an improvement over the recorded baseline.

## Prepared Data (September 9, 2026)

The completed audit read 5,922 labeled images. It quarantined 103 duplicate rows
and 68 rows with conflicting labels on identical pixels. Four ungradeable
Messidor images were excluded before classifier indexing.

| Partition | Unique Active Images |
|---|---:|
| Training, before oversampling | 2,648 |
| Validation | 782 |
| Calibration | 479 |
| IDRiD historical benchmark | 102 |
| Messidor-2 external test | 1,740 |

Audit details are in `reports/dr_v2_data_audit.json`. Two Python data-preparation
regression tests passed. MATLAB regression tests, the smoke test, and full
training have not been run; the project owner will run them in MATLAB.

## What This Run Changes

- Train on APTOS and the training portion of IDRiD, with separate calibration data.
- Preserve the APTOS validation partition, except quarantined duplicate/conflicting images.
- Include an IDRiD validation subset for checkpoint selection.
- Reserve IDRiD testing as a historical benchmark and Messidor-2 as external testing.
- Audit exact decoded-pixel duplicates before splitting and quarantine label conflicts.
- Start from ImageNet-pretrained ResNet-18; stop if pretrained weights are unavailable.
- Scale the pretrained input mean/std to match RGB inputs in the 0-1 range.
- Oversample Grades 3/4 and apply mild blur, illumination, color and vignette augmentation.
- Use mild residual class weights, an 8-image batch and the best validation checkpoint.
- Fit temperature and referral threshold only on the calibration partition.
- Report sensitivity, specificity, Grade 3/4 recall, macro F1, QWK, ROC AUC,
  Brier score, ECE, uncertainty rate, and binomial 95% intervals per dataset.
- Save case-level false-negative/undergrading lists for review.

The current device augmentation does not yet simulate every camera, optical
artifact or JPEG compression setting. The confidence/manual-review rule is
provisional and does not detect every out-of-distribution image.

## Run

From PowerShell at the repository root:

```powershell
.\backend\.venv\Scripts\python.exe scripts\prepare_dr_v2.py
```

Then in MATLAB:

```matlab
cd('D:\RetinaScan AI\matlab')
startup
results = runtests('tests/test_dr_v2.m');
assertSuccess(results)
[net,info] = train_multidataset_dr_v2([],1,struct('SmokeTest',true));
% After the smoke test succeeds:
[net,info,validation,external] = train_multidataset_dr_v2([],12);
```

Each run writes under `models/runs/multidataset_dr_v2_<timestamp>/`, including
the split manifest, settings, checkpoints, `model.mat`, calibration/metrics JSON,
prediction CSVs and `dr_classifier_v2.onnx`. Smoke runs are labeled `_smoke` and
must never be used as trained candidates. The v1 serving files are not replaced.

The first full run prepares a reusable image cache. Training uses MATLAB green
CLAHE, resize to 224, uint8 quantization, and RGB unit scaling. The ImageNet mean
and standard deviation are embedded in the network. Runtime preprocessing must
match this contract before promotion; merely copying the ONNX file is insufficient.

The calibrated temperature and referral threshold are separate from the ONNX
classifier. A future release must apply both consistently in the backend and
offline app. Current v1 runtime code is not modified by these experiments.

## Generalization And Field Pilot

Dataset-only results cannot demonstrate reliable use on arbitrary new cameras.
We currently have no independently graded hospital/PHC images. A supervised
pilot should evaluate new images from the actual portable/tabletop cameras and
target phones, with ophthalmologist grading of both AI positives and negatives.

Measure quality-gate rejection/recapture rate, false negatives, false positives,
per-grade recall, image/device subgroups, review workload, and total time from
image import to result. Record median and p95 latency, peak memory, and success
rate in airplane mode as well as online. Check the entire screening workflow,
including rejected images, rather than evaluating only the classifier's inputs.

Promotion requires recorded improvement against a matched baseline, false-negative
review, MATLAB/ONNX/browser prediction parity, phone memory/latency testing and
prospective camera testing. The problem statement's referable sensitivity >90%
and specificity >85% are targets, not guaranteed results or proof of clinical readiness.

Known evaluation limitations:

- APTOS/IDRiD patient IDs are not available in the current indexes, so patient-disjoint
  partitions are not established. Exact-pixel checks do not rule out near duplicates.
- The old baseline training script used a randomized split without recording its
  image membership. Its later fixed-split metrics must not be called a clean,
  directly comparable v2 test result.
- IDRiD testing was previously used for threshold exploration. It is not a pristine
  external test and must not be reused to choose v2 thresholds.
- Messidor ungradeable images are counted as excluded from classifier evaluation.
  This is not a quality-gate evaluation or a field rejection-rate estimate.
- If test results guide another training decision, that test set has become a
  development benchmark and another untouched test set is needed.

References: [MathWorks pretrained input ranges](https://www.mathworks.com/help/deeplearning/ref/imagepretrainednetwork.html),
[MathWorks weighted cross-entropy](https://www.mathworks.com/help/deeplearning/ref/dlarray.crossentropy.html),
[Good Machine Learning Practice principles](https://www.fda.gov/medical-devices/software-medical-device-samd/good-machine-learning-practice-medical-device-development-guiding-principles).
