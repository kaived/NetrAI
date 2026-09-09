import base64
import copy
import importlib
import json
import os
import random
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from PIL import Image


class OfflineSyncTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory(prefix="netrai-sync-test-")
        cls.environment = patch.dict(os.environ, {
            "ENVIRONMENT": "test",
            "INFERENCE_MODE": "stub",
            "FIRESTORE_ENABLED": "false",
            "GCS_ENABLED": "false",
            "API_ACCESS_KEY": "sync-test-key",
            "API_CORS_ORIGINS": "https://localhost,https://netr-ai.orbionixtech.com",
            "LOCAL_STORAGE_DIR": cls.temp_dir.name,
        })
        cls.environment.start()
        cls.main = importlib.import_module("app.main")

        image = Image.new("RGB", (8, 8), color="green")
        cls.image_url, cls.image_bytes = cls.data_url(image)
        # A realistic-size heatmap whose base64 encoding exceeds the document limit.
        heatmap = Image.frombytes("RGB", (900, 900), random.Random(7).randbytes(900 * 900 * 3))
        cls.heatmap_url, cls.heatmap_bytes = cls.data_url(heatmap)

    @classmethod
    def tearDownClass(cls):
        cls.environment.stop()
        cls.temp_dir.cleanup()

    @staticmethod
    def data_url(image):
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        content = buffer.getvalue()
        return "data:image/png;base64," + base64.b64encode(content).decode("ascii"), content

    def setUp(self):
        self.client = TestClient(self.main.app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)
        self.headers = {"Origin": "https://localhost", "X-NetrAI-API-Key": "sync-test-key"}
        self.document = Mock()

        def save_document(data, **_kwargs):
            serialized = json.dumps(data)
            self.assertNotIn("data:image", serialized)
            self.assertLess(len(serialized.encode("utf-8")), 20_000)
            self.saved_document = copy.deepcopy(data)

        self.document.set.side_effect = save_document
        self.document.get.side_effect = lambda: Mock(exists=True, to_dict=lambda: self.saved_document)
        firestore = Mock()
        firestore.collection.return_value.document.return_value = self.document
        repository = self.main.CaseRepository(self.main.settings.model_copy(update={"firestore_enabled": True}))
        repository._firestore_client = firestore
        repository_patch = patch.object(self.main, "case_repository", repository)
        repository_patch.start()
        self.addCleanup(repository_patch.stop)

    def payload(self, inline=True):
        eyes = {}
        for eye in ("OD", "OS"):
            eyes[eye] = {
                "eye": eye,
                "status": "completed",
                "patient": {"eye": eye, "patient_age": "40", "diabetes_type": "Type 2 DM"},
                "quality": {"is_gradeable": True, "focus_score": 2, "brightness": 0.5, "contrast": 0.2},
                "prediction": {
                    "icdr_grade": 0, "label": "No DR", "referable_dr": False,
                    "confidence": 0.8, "model_version": "test-model",
                },
                "explanation": {
                    "method": "test-attention", "text": "Synthetic test heatmap",
                    "heatmap_url": self.heatmap_url if inline else None,
                },
                "report": {"summary": "Test", "recommendation": "Test", "disclaimer": "Test"},
                "storage": {
                    "input_uri": self.image_url if inline else None,
                    "heatmap_uri": self.heatmap_url if inline else None,
                    "report_uri": None,
                },
            }
        case = {
            **copy.deepcopy(eyes["OS"]),
            "case_id": "CASE-20260909-000000-ABCDEF",
            "runtime": "offline", "sync_status": "failed",
            "completed_eyes": ["OD", "OS"], "is_case_complete": True,
            "eyes": eyes,
        }
        case.pop("eye")
        return {
            "case": case,
            "images": {eye: self.image_url for eye in eyes},
            "heatmaps": {eye: self.heatmap_url for eye in eyes},
        }

    def test_old_apk_large_inline_heatmaps_are_replaced_before_firestore_write(self):
        payload = self.payload()
        self.assertGreater(len(json.dumps(payload["case"])), 1_048_576)
        response = self.client.post("/sync/cases", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertEqual(result["sync_status"], "synced")
        self.assertEqual(result["prediction"], self.saved_document["prediction"])
        self.assertEqual(result["explanation"], result["eyes"]["OS"]["explanation"])
        self.assertEqual(result["storage"]["input_uri"], result["eyes"]["OS"]["storage"]["input_uri"])
        self.assertEqual(response.headers["access-control-allow-origin"], "https://localhost")
        for eye in ("OD", "OS"):
            heatmap_url = result["eyes"][eye]["explanation"]["heatmap_url"]
            self.assertEqual(self.client.get(heatmap_url, headers=self.headers).content, self.heatmap_bytes)
            input_url = f"/cases/{result['case_id']}/eyes/{eye}/input"
            self.assertEqual(self.client.get(input_url, headers=self.headers).content, self.image_bytes)
        report = Path(result["storage"]["report_uri"]).read_text(encoding="utf-8")
        self.assertNotIn("data:image", report)
        self.assertLess(len(report), 20_000)

    def test_compact_payload_and_retry_keep_one_case_id(self):
        payload = self.payload(inline=False)
        for _ in range(2):
            response = self.client.post("/sync/cases", json=payload, headers=self.headers)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["case_id"], payload["case"]["case_id"])
        self.assertEqual(self.document.set.call_count, 2)

    def test_missing_patient_and_heatmap_do_not_leave_inline_urls(self):
        payload = self.payload()
        payload["case"]["patient"] = None
        payload["heatmaps"] = {}
        response = self.client.post("/sync/cases", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIsNone(response.json()["explanation"]["heatmap_url"])
        self.assertIsNotNone(response.json()["storage"]["input_uri"])

    def test_firestore_failure_is_readable_and_retry_succeeds(self):
        save_document = self.document.set.side_effect
        self.document.set.side_effect = RuntimeError("Synthetic storage failure")
        with self.assertLogs(self.main.logger, level="ERROR"):
            response = self.client.post("/sync/cases", json=self.payload(inline=False), headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertIn("remains saved on your device", response.json()["detail"])
        self.assertEqual(response.headers["access-control-allow-origin"], "https://localhost")
        self.document.set.side_effect = save_document
        response = self.client.post("/sync/cases", json=self.payload(inline=False), headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)

    def test_unauthorized_sync_has_cors_headers_for_app_and_website(self):
        for origin in ("https://localhost", "https://netr-ai.orbionixtech.com"):
            response = self.client.post("/sync/cases", json={}, headers={"Origin": origin})
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.headers["access-control-allow-origin"], origin)
        self.document.set.assert_not_called()

    def test_invalid_heatmap_is_rejected_without_marking_case_synced(self):
        payload = self.payload(inline=False)
        payload["heatmaps"]["OD"] = "data:image/png;base64,bm90IGFuIGltYWdl"
        response = self.client.post("/sync/cases", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 400)
        self.document.set.assert_not_called()


if __name__ == "__main__":
    unittest.main()
