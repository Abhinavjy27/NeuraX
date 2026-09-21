import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Try loading .env if present
try:
    from dotenv import load_dotenv
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if env_file.exists():
        load_dotenv(env_file)
except ImportError:
    pass

# Ensure dummy defaults for tests if not provided
if not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = "mock-openai-key-for-tests"
