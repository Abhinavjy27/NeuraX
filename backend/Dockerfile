FROM python:3.11-slim

WORKDIR /app

# Install system deps for Playwright, DeepFace, and pyreqwest-impersonate (requires libclang)
RUN apt-get update && apt-get install -y \
    curl wget git build-essential cmake clang libclang-dev \
    libgl1 libglib2.0-0 libnss3 libatk-bridge2.0-0 libxcomposite1 \
    libxdamage1 libxrandr2 libgbm1 libxkbcommon0 libasound2 \
    libcups2 libxfixes3 libpango-1.0-0 libcairo2 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --default-timeout=1000 --progress-bar off --no-cache-dir -r requirements.txt

# Install Playwright browsers (without --with-deps since we manually installed Debian-compatible deps)
RUN playwright install chromium

# Install spaCy model directly to bypass 404 versioning bug
RUN pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1.tar.gz

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
