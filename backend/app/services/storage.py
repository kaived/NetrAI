from __future__ import annotations

import json
import re
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

    def save_output_bytes(
        self,
        case_id: str,
        filename: str,
        content: bytes,
        content_type: str | None = None,
    ) -> str:
        object_name = f"outputs/cases/{case_id}/{safe_filename(filename)}"
        if self.settings.gcs_enabled:
            return self._upload_bytes(self.settings.gcs_output_bucket, object_name, content, content_type=content_type)

        path = self.local_dir / object_name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return str(path)

    def read_uri(self, uri: str) -> bytes:
        if uri.startswith("gs://"):
            bucket_name, blob_name = parse_gcs_uri(uri)
            allowed_buckets = {
                bucket
                for bucket in (self.settings.gcs_input_bucket, self.settings.gcs_output_bucket)
                if bucket
            }
            if allowed_buckets and bucket_name not in allowed_buckets:
                raise FileNotFoundError("Storage bucket is not allowed.")
            client = self._get_storage_client()
            return client.bucket(bucket_name).blob(blob_name).download_as_bytes()

        path = Path(uri)
        if not path.is_absolute():
            path = Path.cwd() / path
        resolved_path = path.resolve()
        storage_root = self.local_dir.resolve()
        try:
            resolved_path.relative_to(storage_root)
        except ValueError as exc:
            raise FileNotFoundError("Storage path is not allowed.") from exc
        return resolved_path.read_bytes()

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
    name = Path(filename).name.strip().replace(" ", "_")
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    name = name.strip("._")
    return name[:120] or "file"


def parse_gcs_uri(uri: str) -> tuple[str, str]:
    if not uri.startswith("gs://"):
        raise ValueError("GCS URI must start with gs://")

    path = uri.removeprefix("gs://")
    bucket_name, separator, blob_name = path.partition("/")
    if not bucket_name or not separator or not blob_name:
        raise ValueError("GCS URI must look like gs://bucket/path/to/object")

    return bucket_name, blob_name
