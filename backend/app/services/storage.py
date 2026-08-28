from __future__ import annotations

import json
from pathlib import Path

from app.config import Settings


class StorageService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.local_dir = Path(settings.local_storage_dir)
        self.local_dir.mkdir(parents=True, exist_ok=True)
        self._storage_client = None

    def save_input(self, case_id: str, filename: str, content: bytes) -> str:
        object_name = f"inputs/cases/{case_id}/{safe_filename(filename)}"
        if self.settings.gcs_enabled:
            return self._upload_bytes(self.settings.gcs_input_bucket, object_name, content)

        path = self.local_dir / object_name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return str(path)

    def save_output_json(self, case_id: str, filename: str, data: dict) -> str:
        object_name = f"outputs/cases/{case_id}/{safe_filename(filename)}"
        content = json.dumps(data, indent=2).encode("utf-8")
        if self.settings.gcs_enabled:
            return self._upload_bytes(
                self.settings.gcs_output_bucket,
                object_name,
                content,
                content_type="application/json",
            )

        path = self.local_dir / object_name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return str(path)

    def _upload_bytes(
        self,
        bucket_name: str,
        object_name: str,
        content: bytes,
        content_type: str | None = None,
    ) -> str:
        if not bucket_name:
            raise RuntimeError("GCS bucket name is required when GCS is enabled.")

        client = self._get_storage_client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(object_name)
        blob.upload_from_string(content, content_type=content_type)
        return f"gs://{bucket_name}/{object_name}"

    def _get_storage_client(self):
        if self._storage_client is None:
            from google.cloud import storage

            self._storage_client = storage.Client(project=self.settings.gcp_project_id or None)
        return self._storage_client


def safe_filename(filename: str) -> str:
    return Path(filename).name.replace(" ", "_") or "file"
