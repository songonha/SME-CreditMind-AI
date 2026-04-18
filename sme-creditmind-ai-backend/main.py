"""
ASGI app entry for `uvicorn main:app` when run from this directory.

Preferred: `python run.py` or `uvicorn app.main:app --reload`.
"""

from app.main import app

__all__ = ["app"]
