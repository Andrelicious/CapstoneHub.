# Dockerfile to run CapstoneHub with native tesseract and image processing libs
FROM node:20-bullseye-slim

# Use noninteractive frontend to avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system packages: tesseract (native CLI), poppler for PDF rasterization,
# libvips for sharp. Also install the English traineddata package. Remove apt
# lists afterwards to keep the image small.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    libvips-dev \
    build-essential \
    python3 \
  && rm -rf /var/lib/apt/lists/*

# Ensure Tesseract knows where to find tessdata; system packages place tessdata
# under /usr/share/tessdata on Debian-based images.
ENV TESSDATA_PREFIX=/usr/share/tessdata

WORKDIR /app

# Copy only package manifests first for caching
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install JS deps (use npm; respects package-lock if present)
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy application
COPY . .

# Build Next app
RUN npm run build

EXPOSE 3000

# Use the project's start script (worker uses scripts/start.mjs)
CMD ["npm", "start"]
