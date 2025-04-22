# ===== Stage 1: Builder =====
FROM oven/bun:latest AS builder

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
    arm64) PROTO_ARCH="aarch64-unknown-linux-gnu" ;; \
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
RUN bun install

# Build the application
RUN bun run build -- --filter=server...

RUN ls -la .

# ===== Stage 2: Runtime =====
FROM oven/bun:latest

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    tini \
    xz-utils \
    dpkg \
    && rm -rf /var/lib/apt/lists/*

# Determine architecture and download correct proto version (if required at runtime)
ARG PROTO_VERSION=v0.40.2
RUN ARCH=$(dpkg --print-architecture) && \
    case ${ARCH} in \
    amd64) PROTO_ARCH="x86_64-unknown-linux-gnu" ;; \
    arm64) PROTO_ARCH="aarch64-unknown-linux-gnu" ;; \
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


# Copy built artifacts from the builder stage
COPY --from=builder /app /app

# Set working directory for runtime
WORKDIR /app/apps/server

# Set environment variables (consider passing sensitive data at runtime)
ARG DEPLOY_MODE
ENV ENVIRONMENT=${DEPLOY_MODE}
ENV FIREWORKS_BASE_URL="https://api.fireworks.ai/inference/v1"

# Define entrypoint (runs from WORKDIR /app)
ENTRYPOINT ["/usr/bin/tini", "--", "bun", "run", "start"]
