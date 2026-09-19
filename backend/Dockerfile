FROM python:3.11-slim

WORKDIR /app

# Install system deps for Playwright + DeepFace
RUN apt-get update && apt-get install -y \
    curl wget git build-essential \
    libgl1-mesa-glx libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN playwright install chromium --with-deps

# Install spaCy model
RUN python -m spacy download en_core_web_trf

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
