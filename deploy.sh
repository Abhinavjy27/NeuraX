#!/usr/bin/env bash
# ==============================================================================
# NeuraX Cloud Deployment Script
# Targets: Ubuntu 22.04 / 24.04 LTS (AWS EC2, DigitalOcean, GCP, Hetzner)
# ==============================================================================
set -euo pipefail

echo "========================================================"
echo "          🚀 NeuraX Cloud VPS Deployment Setup          "
echo "========================================================"

# 1. Check Root / Sudo
if [ "$EUID" -ne 0 ]; then
  echo "⚠️  Please run with sudo: sudo ./deploy.sh"
  exit 1
fi

# 2. Update System Packages
echo "📦 Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git jq htop ufw

# 3. Configure Swap Space (Crucial for AI models & Playwright on <=4GB RAM VPS)
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_MB=$((TOTAL_RAM_KB / 1024))
echo "🧠 Detected RAM: ${TOTAL_RAM_MB} MB"

if [ "$TOTAL_RAM_MB" -lt 7000 ] && [ ! -f /swapfile ]; then
  echo "⚡ Creating 4GB swap file to prevent OOM errors during DeepFace / Playwright execution..."
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "✅ 4GB Swap configured successfully."
fi

# 4. Install Docker & Docker Compose Plugin if missing
if ! command -v docker &> /dev/null; then
  echo "🐳 Installing Docker Engine..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "✅ Docker installed."
else
  echo "✅ Docker is already installed."
fi

# 5. Verify .env file exists
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "⚠️  No .env found. Copying .env.example -> .env..."
    cp .env.example .env
    echo "❗ IMPORTANT: Please edit .env with your real API keys before starting!"
    echo "   Required keys: OPENAI_API_KEY, SCRAPER_API_KEY"
  else
    echo "❌ Error: Neither .env nor .env.example was found. Please check repo files."
    exit 1
  fi
fi

# 6. Configure Firewall (UFW)
echo "🛡️  Configuring Firewall (UFW)..."
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 5173/tcp comment 'NeuraX Frontend'
ufw --force enable

# 7. Build and Launch Containers
echo "🏗️  Building and launching NeuraX containers..."
docker compose up -d --build

# 8. Install Cloudflare Tunnel (cloudflared)
if ! command -v cloudflared &> /dev/null; then
  echo "🌐 Installing Cloudflare Tunnel (cloudflared)..."
  curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  dpkg -i cloudflared.deb || apt-get install -f -y
  rm -f cloudflared.deb
  echo "✅ cloudflared installed."
fi

echo ""
echo "========================================================"
echo "          🎉 NeuraX Deployment Complete!               "
echo "========================================================"
echo ""
echo "Container Status:"
docker compose ps
echo ""
echo "To expose your deployment with a permanent free HTTPS URL, run:"
echo "  cloudflared tunnel --url http://localhost:5173"
echo ""
