#!/bin/bash

# Docker build script for Server Monitoring Bot

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="server-monitoring-bot"
TAG=${1:-"latest"}
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

echo -e "${BLUE}🐳 Docker Build Script for Server Monitoring Bot${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running!${NC}"
    echo -e "${YELLOW}💡 Please start Docker Desktop or Docker daemon${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo -e "${YELLOW}💡 Creating .env from template...${NC}"
    
    if [ -f "env.example" ]; then
        cp env.example .env
        echo -e "${GREEN}✅ Created .env from env.example${NC}"
        echo -e "${YELLOW}🔧 Please edit .env file with your configuration before running the container${NC}"
    else
        echo -e "${RED}❌ env.example not found!${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}📦 Building Docker image: ${FULL_IMAGE_NAME}${NC}"
echo ""

# Build the image
docker build \
    --tag "${FULL_IMAGE_NAME}" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VCS_REF="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
    .

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Docker image built successfully!${NC}"
    echo -e "${GREEN}📋 Image: ${FULL_IMAGE_NAME}${NC}"
    
    # Show image size
    IMAGE_SIZE=$(docker images --format "table {{.Size}}" "${FULL_IMAGE_NAME}" | tail -n 1)
    echo -e "${GREEN}📏 Size: ${IMAGE_SIZE}${NC}"
    
    echo ""
    echo -e "${BLUE}🚀 Next steps:${NC}"
    echo -e "   ${YELLOW}1.${NC} Configure your .env file"
    echo -e "   ${YELLOW}2.${NC} Run with Docker Compose: ${GREEN}docker-compose up -d${NC}"
    echo -e "   ${YELLOW}3.${NC} Or run directly: ${GREEN}docker run -d --name server-monitor --env-file .env ${FULL_IMAGE_NAME}${NC}"
    echo -e "   ${YELLOW}4.${NC} View logs: ${GREEN}docker logs -f server-monitor${NC}"
    
else
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi
