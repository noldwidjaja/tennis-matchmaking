#!/bin/bash

# Tennis Tinder - Docker Build Script
set -e

echo "🎾 Tennis Tinder - Docker Build Script"
echo "======================================"

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t tennis-tinder:latest .

echo "✅ Docker image built successfully!"
echo ""

# Display image information
echo "📊 Image Information:"
docker images tennis-tinder:latest

echo ""
echo "🚀 To run the container:"
echo "  docker run -p 3000:3000 --env-file .env.production.example tennis-tinder:latest"
echo ""
echo "🐳 Or use docker-compose:"
echo "  docker-compose up -d"
echo ""
echo "🌐 The app will be available at http://localhost:3000"