#!/bin/bash
set -e

# Default IMAGE_TAG from VERSION file if not provided
if [ -z "$IMAGE_TAG" ]; then
    IMAGE_TAG=$(node -e "console.log(require('./package.json').version)")
    if [ "$IMAGE_TAG" == "undefined" ]; then
        echo "Error: Could not determine version from package.json" >&2
        exit 1
    fi
fi

if [ -z "$DEPLOY_MODE" ]; then
    DEPLOY_MODE="production"
fi

# Repository and image definitions
# GCP_IMAGE="us-docker.pkg.dev/fw-ai-cp-prod/inference/aiml-runtime-server:${IMAGE_TAG}"
# ECR_REPO="794651314743.dkr.ecr.us-east-1.amazonaws.com"
# AWS_IMAGE="${ECR_REPO}/aiml-runtime-server:${IMAGE_TAG}"
OCIR_REPO="us-chicago-1.ocir.io"
OCI_IMAGE="${OCIR_REPO}/axhaeqbjwexc/inference/aiml-runtime-server:${IMAGE_TAG}"

# Default OCI_USER if not provided
if [ -z "$OCI_USER" ]; then
    OCI_USER="${USER}@fireworks.ai"
fi

# Function to build Docker images
docker_build() {
    echo "Building Docker images..."
    # docker build -t "${GCP_IMAGE}" -t "${AWS_IMAGE}" -t "${OCI_IMAGE}" .
    
    cd ../..
    # Check if docker buildx is being used
    if docker buildx version &>/dev/null; then
        echo "Using Docker Buildx..."
        docker buildx build --load -t "${OCI_IMAGE}" --platform linux/amd64 --build-arg DEPLOY_MODE="${DEPLOY_MODE}" -f ./apps/server/Dockerfile .
    else
        echo "Using standard Docker build..."
        docker build -t "${OCI_IMAGE}"--platform linux/amd64 --build-arg DEPLOY_MODE="${DEPLOY_MODE}" -f ./apps/server/Dockerfile .
    fi
    cd -
}

# Function to push Docker images
docker_push() {
    echo "Pushing Docker images..."
    
    # No need to build again as we already build in the deploy case
    docker image push "${OCI_IMAGE}"
    # docker image push "${AWS_IMAGE}"
    # docker image push "${GCP_IMAGE}"
}

# Function to login to Docker registries
docker_login() {
    echo "Logging into Docker registries..."
    # Use password-stdin to avoid interactive prompt and command-line password exposure
    echo "${OCI_AUTH_TOKEN}" | docker login --username "axhaeqbjwexc/${OCI_USER}" --password-stdin "${OCIR_REPO}"
    # aws ecr get-login-password --profile prod --region us-east-1 | docker login --username AWS --password-stdin "${ECR_REPO}"
}


# Command line argument handling
case "$1" in
    docker-build)
        docker_build
        ;;
    docker-push)
        docker_push
        ;;
    deploy)
        docker_build
        docker_push
        ;;
    docker-login)
        docker_login
        ;;
    *)
        echo "Usage: $0 {docker-build|docker-push|deploy|docker-login}"
        exit 1
        ;;
esac
