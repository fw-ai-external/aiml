# ===== Stage 1: Builder =====
FROM oven/bun:latest AS builder

# FROM frolvlad/alpine-glibc AS builder
# COPY --from=bun /usr/local/bin/bun /usr/local/bin

# Install build dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    gzip \
    xz-utils \
    curl \
    dpkg \
    && rm -rf /var/lib/apt/lists/*

# Determine architecture and download correct proto version
ARG PROTO_VERSION=v0.40.2
RUN ARCH=$(dpkg --print-architecture) && \
    case ${ARCH} in \
    amd64) PROTO_ARCH="x86_64-unknown-linux-gnu" ;; \
    arm64) PROTO_ARCH="aarch64-unknown-linux-musl" ;; \
    musl-linux-arm64) PROTO_ARCH="aarch64-unknown-linux-musl" ;; \
    *) echo "Unsupported architecture: ${ARCH}"; exit 1 ;; \
    esac && \
    echo "Downloading proto for ${ARCH} (${PROTO_ARCH})..." && \
    curl -fsSL "https://github.com/moonrepo/proto/releases/download/${PROTO_VERSION}/proto_cli-${PROTO_ARCH}.tar.xz" -o proto.tar.xz && \
    mkdir -p proto_temp && \
    tar -xJf proto.tar.xz -C proto_temp && \
    find proto_temp -type f -executable -name "proto" -exec mv {} /usr/local/bin/ \; && \
    find proto_temp -type f -executable -name "proto-shim" -exec mv {} /usr/local/bin/ \; && \
    rm -rf proto_temp proto.tar.xz

# Set environment variables for proto
ENV PROTO_HOME="/root/.proto"
ENV PATH="${PROTO_HOME}/shims:${PROTO_HOME}/bin:${PATH}"

# Set working directory
WORKDIR /app

COPY . .

# Install dependencies
# Check if proto is installed correctly
RUN proto --version
# Run proto use and then check environment
# RUN proto use -vvv
# RUN echo "Proto environment setup complete. PATH=$PATH" && env | grep PROTO
# Run bun install separately
RUN bun install --filter '!aiml-ui' --filter '!landing-page' --filter '!vscode-plugin' --filter '!vscode'

# Build the application
RUN bun run build -- --filter=server...

RUN ls -la .


# ===== Stage 2: Runtime =====
FROM oven/bun:latest
RUN rm -rf /usr/local/bin/bunx
# COPY --from=bun /usr/local/bin/bun /usr/local/bin
COPY --from=builder /usr/local/bin/proto /usr/local/bin/proto
COPY --from=builder /usr/local/bin/proto-shim /usr/local/bin/proto-shim
COPY --from=builder /app /app

# Set environment variables for proto
ENV PROTO_HOME="/root/.proto"
ENV PATH="${PROTO_HOME}/shims:${PROTO_HOME}/bin:${PATH}"


# Set working directory for runtime
WORKDIR /app/apps/server

# Set environment variables (consider passing sensitive data at runtime)
ARG DEPLOY_MODE
ENV ENVIRONMENT=${DEPLOY_MODE}
ENV FIREWORKS_BASE_URL="https://api.fireworks.ai/inference/v1"

CMD ["bun", "run", "start"]