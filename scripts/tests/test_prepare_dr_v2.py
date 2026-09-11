import contextlib
import csv
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from prepare_dr_v2 import CLASSES, image_hash, prepare, read_rows


class PrepareV2Tests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix="netrai-v2-test-")
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.counter = 0

    def image(self, folder):
        self.counter += 1
        path = self.root / folder / f"image_{self.counter}.png"
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (8, 8), (self.counter % 256, self.counter // 256, 17)).save(path)
        return path

    def write_csv(self, relative, rows):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)

    def test_partitions_quarantine_duplicates_and_conflicts_reproducibly(self):
        aptos, idrid, messidor = [], [], []
        for source, target in [("aptos2019", aptos), ("idrid", idrid)]:
            for grade in range(5):
                for index in range(10):
                    path = self.image("images")
                    split = ("train" if index < 8 else "validation") if source == "aptos2019" else ("training" if index < 8 else "testing")
                    target.append(dict(image_path=str(path), label=grade, image_id=path.stem, split=split))
        duplicate_path = aptos[8]["image_path"]
        aptos.append(dict(image_path=duplicate_path, label=0, image_id="duplicate_train", split="train"))
        conflict_path = aptos[0]["image_path"]
        aptos.append(dict(image_path=conflict_path, label=1, image_id="conflicting_label", split="train"))
        for grade in range(5):
            path = self.image("data/raw/messidor2/images")
            messidor.append(dict(image_id=path.name, adjudicated_dr_grade=grade, adjudicated_gradable=1))
        messidor.append(dict(image_id="ungradeable.png", adjudicated_dr_grade="", adjudicated_gradable=0))
        self.write_csv("data/splits/aptos2019_split_v1.csv", aptos)
        self.write_csv("data/indexes/idrid_disease_grading.csv", idrid)
        self.write_csv("data/raw/messidor2/messidor_data.csv", messidor)
        with contextlib.redirect_stdout(io.StringIO()):
            prepare(self.root)
        path = self.root / "data/indexes/multidataset_dr_v2.csv"
        first = path.read_bytes()
        rows = read_rows(path)
        active = [row for row in rows if not row["split"].startswith("excluded_")]
        self.assertEqual(len(active), len({row["image_sha256"] for row in active}))
        self.assertEqual({row["split"] for row in active}, {"train", "validation", "calibration", "external_holdout", "external_test"})
        self.assertEqual(sum(row["split"] == "excluded_label_conflict" for row in rows), 2)
        self.assertEqual(sum(row["split"] == "excluded_duplicate" for row in rows), 1)
        self.assertEqual(next(row for row in rows if row["image_id"] == "duplicate_train")["split"], "excluded_duplicate")
        self.assertTrue(all(row["split"] == "external_test" for row in rows if row["source_dataset"] == "messidor2"))
        self.assertTrue(all(row["label_name"] == CLASSES[int(row["label"])] for row in rows))
        audit = json.loads((self.root / "reports/dr_v2_data_audit.json").read_text())
        self.assertEqual(audit["messidor_ungradeable_excluded"], 1)
        with contextlib.redirect_stdout(io.StringIO()):
            prepare(self.root)
        self.assertEqual(path.read_bytes(), first)

    def test_pixel_hash_ignores_png_metadata(self):
        from PIL.PngImagePlugin import PngInfo
        path = self.image("images")
        other = path.with_name("metadata.png")
        metadata = PngInfo()
        metadata.add_text("description", "Same pixels, different metadata")
        with Image.open(path) as image:
            image.save(other, pnginfo=metadata)
        self.assertNotEqual(path.read_bytes(), other.read_bytes())
        self.assertEqual(image_hash(path), image_hash(other))


if __name__ == "__main__":
    unittest.main()
