"""
Them SME [DEMO LUONG] + giao dich + cham diem vao DB hien tai (khong xoa bang).

Yeu cau: da co org tu lan seed day du truoc (python app/seed.py).
Chay:
  cd sme-creditmind-ai-backend
  .venv\\Scripts\\python.exe -m app.seed_workflow_demo
"""

from app.seed import ensure_workflow_demo_merchant

if __name__ == "__main__":
    ensure_workflow_demo_merchant()
