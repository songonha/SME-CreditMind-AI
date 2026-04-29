import os
import pathlib

# Must run before `app` package imports Settings.
_root = pathlib.Path(__file__).resolve().parents[1]
_test_db = _root / "pytest_creditmind.db"
if _test_db.exists():
    _test_db.unlink()
os.environ["CREDITMIND_DATABASE_URL"] = f"sqlite:///{_test_db.as_posix()}"
os.environ["CREDITMIND_JWT_SECRET_KEY"] = "pytest-jwt-secret-not-for-production"
