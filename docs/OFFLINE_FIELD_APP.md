# Offline Field App Plan

NetrAI uses the current `aptos-baseline-v1` ONNX model for the first offline implementation. Model improvement is a separate track after the offline app foundation is stable.

## Delivery Modes

| Mode | Purpose | Distribution |
|---|---|---|
| Website | Public/current access | Cloudflare Pages |
| Installable PWA | Rural field use | Install from browser |
| Android APK | Pilot deployment | Direct signed APK install |

## Offline Architecture

```text
Fundus camera capture
    -> USB / Bluetooth / Wi-Fi / file import
NetrAI PWA or Android app
    -> local quality gate
    -> local preprocessing
    -> local aptos-baseline-v1 ONNX inference
    -> local attention heatmap
    -> local PDF/report
    -> IndexedDB pending sync queue
Internet returns
    -> POST /sync/cases
    -> Firestore case record + GCS artifacts
```

## Current Implementation

The frontend now includes:

1. PWA manifest and service worker.
2. ONNX Runtime Web support.
3. Generated ONNX Runtime WASM assets under `frontend/public/ort`.
4. Optional offline model path: `frontend/public/offline-models/dr_classifier.onnx`.
5. Native IndexedDB storage for offline case snapshots.
6. Online/offline screening engine:
   - online: call `POST /predict`
   - offline or network failure: run local `aptos-baseline-v1`
7. Backend sync endpoint: `POST /sync/cases`.

## Local Offline Setup

From the frontend folder:

```powershell
npm install
npm run build:offline
```

`sync:offline-model` copies:

```text
backend/models/dr_classifier.onnx
```

to:

```text
frontend/public/offline-models/dr_classifier.onnx
```

The copied model is ignored by Git.

For Cloudflare Pages, use the normal `npm run build`. It intentionally excludes the local copied ONNX model from the web output so Pages does not reject the deployment for exceeding the 25 MiB asset limit. The production website downloads the offline model from `VITE_OFFLINE_MODEL_URL` instead.

## Production PWA Setup

For the public production website, deploy the PWA code to Cloudflare Pages and serve the ONNX model from a separate asset bucket.

Cloudflare Pages should use:

```text
Build command: npm run build
Build output: dist
Root directory: frontend
```

Environment variables:

```text
VITE_API_BASE_URL=https://retinascan-api-58990504584.asia-south1.run.app
VITE_API_ACCESS_KEY=<pilot key if backend API_ACCESS_KEY is enabled>
VITE_OFFLINE_MODEL_URL=https://storage.googleapis.com/retinascan-ai-f620e-offline-assets/models/aptos-baseline-v1/dr_classifier.onnx
VITE_PREFETCH_OFFLINE_MODEL=true
VITE_ANDROID_APK_URL=https://storage.googleapis.com/retinascan-ai-f620e-app-downloads/android/netrai-latest.apk
```

For the backend, keep the website and installed-app origins in Cloud Run CORS:

```text
API_CORS_ORIGINS=https://netr-ai.orbionixtech.com,https://www.netr-ai.orbionixtech.com,https://localhost,capacitor://localhost
```

Publish the current APTOS v1 model before deploying the PWA:

```powershell
.\infra\gcp\publish-offline-model.ps1
```

Do not upload `dr_classifier.onnx` directly to Cloudflare Pages. The current model is about 42.7 MB, which is larger than the Pages 25 MiB per-file asset limit.

## Important Notes

1. MATLAB is not required on the field device.
2. The offline app uses the exported ONNX model.
3. The first offline model is `aptos-baseline-v1`.
4. Offline inference should be tested with known APTOS validation images before field use.
5. Cloud sync should not rerun inference; it stores the already completed offline result.
6. Offline cases are stored on the device until sync. Field devices should use screen lock, device encryption, and controlled operator access.

## Recovering Failed Cloud Sync

The queue's Online badge means the health endpoint is reachable. A case is marked
Synced only after its upload and database save succeed. Failed cases remain in the
device's offline database and can be opened or retried; do not uninstall the app
or clear its data while unsynced cases are present.

The September 2026 sync fix replaces inline heatmaps with protected API links
before saving case metadata in Firestore. Images and heatmaps are kept separately
in Cloud Storage. This avoids oversized Firestore records, including payloads
sent by already installed APKs. Storage errors now return a readable response.

Deploy the backend fix first. The installed APK can then retry its saved cases
without reinstalling. Rebuild and publish the APK for the clearer failure messages
and smaller sync request payloads. No model replacement is needed.

Backend regression checks (from `backend`, with development `httpx` installed):

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

## Direct APK Path

The Capacitor Android wrapper is configured under `frontend/android`.

Create the signing key once:

```powershell
cd frontend
npm run android:keystore
```

Build the signed release APK:

```powershell
cd frontend
$env:NETRAI_API_ACCESS_KEY="<same value as backend API_ACCESS_KEY>"
npm run android:apk
```

Publish the APK to Cloud Storage for direct pilot download:

```powershell
cd frontend
npm run android:publish
```

The APK output is:

```text
frontend/android/app/build/outputs/apk/release/app-release.apk
```

Share only the signed release APK. Keep `frontend/android/signing/` backed up securely and never commit it; Android updates must use the same keystore.

If the backend uses `API_ACCESS_KEY`, build the APK with the matching `NETRAI_API_ACCESS_KEY` or `VITE_API_ACCESS_KEY` value. Treat this as pilot protection only; a production clinical app should use named operator accounts and audit logs.

## Device Connectivity

NetrAI is camera-agnostic. It can accept retinal images from:

1. Portable handheld fundus cameras.
2. Smartphone-attached retinal cameras.
3. Tabletop/non-portable hospital fundus cameras.
4. USB-connected cameras.
5. Camera apps that transfer captures via Bluetooth, Wi-Fi Direct, camera hotspot, shared folder, SD card, or gallery import.

The camera-to-app connection is local. Internet is only needed later for cloud sync and remote ophthalmologist review.

## Hardware Workflow Page

The app and website now include a dedicated hardware workflow view from the landing page.

It explains:

1. Retinal capture happens on a fundus camera, not the mobile camera.
2. Rural PHC teams can use portable fundus cameras and transfer images to the installed app.
3. Eye hospitals can use non-portable tabletop systems and export images from a workstation.
4. NetrAI can import the transferred fundus file from USB, Bluetooth, Wi-Fi/hotspot, SD card, gallery, file manager, or hospital computer export.
5. Offline screening stores the completed case on the device and syncs later when internet returns.
