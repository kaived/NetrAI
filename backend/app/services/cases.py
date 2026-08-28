from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.config import Settings
from app.schemas import CaseResult


class CaseRepository:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.local_dir = Path(settings.local_storage_dir) / "cases"
        self.local_dir.mkdir(parents=True, exist_ok=True)
        self._firestore_client = None
        self.collection_name = settings.firestore_cases_collection

    def new_case_id(self) -> str:
        timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
        return f"case_{timestamp}_{uuid4().hex[:8]}"

    def create_case(self, case_id: str, filename: str, status: str) -> None:
        self._write_case(
            case_id,
            {
                "case_id": case_id,
                "filename": filename,
                "status": status,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

    def update_case(self, case_id: str, **updates: object) -> None:
        case = self.get_case(case_id) or {"case_id": case_id}
        case.update(updates)
        case["updated_at"] = datetime.now(UTC).isoformat()
        self._write_case(case_id, case)

    def save_result(self, result: CaseResult) -> None:
        data = result.model_dump(mode="json")
        data["updated_at"] = datetime.now(UTC).isoformat()
        self._write_case(result.case_id, data)

    def get_case(self, case_id: str) -> dict | None:
        if self.settings.firestore_enabled:
            client = self._get_firestore_client()
            doc = client.collection(self.collection_name).document(case_id).get()
            return doc.to_dict() if doc.exists else None

        path = self.local_dir / f"{case_id}.json"
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def _write_case(self, case_id: str, data: dict) -> None:
        if self.settings.firestore_enabled:
            client = self._get_firestore_client()
            client.collection(self.collection_name).document(case_id).set(data, merge=True)
            return

        path = self.local_dir / f"{case_id}.json"
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def _get_firestore_client(self):
        if self._firestore_client is None:
            import firebase_admin
            from firebase_admin import credentials, firestore

            try:
                firebase_admin.get_app()
            except ValueError:
                options = {}
                project_id = self.settings.firebase_project_id or self.settings.gcp_project_id
                if project_id:
                    options["projectId"] = project_id

                if self.settings.firebase_credentials_path:
                    cred = credentials.Certificate(self.settings.firebase_credentials_path)
                    firebase_admin.initialize_app(cred, options)
                else:
                    firebase_admin.initialize_app(options=options or None)

            self._firestore_client = firestore.client()
        return self._firestore_client
