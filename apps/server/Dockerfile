# ===== Stage 1: Builder =====
FROM oven/bun:latest AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    gzip \
    xz-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download and install proto
RUN curl -fsSL https://github.com/moonrepo/proto/releases/download/v0.40.2/proto_cli-x86_64-unknown-linux-gnu.tar.xz -o proto.tar.xz \
    && mkdir -p proto_temp \
    && tar -xJf proto.tar.xz -C proto_temp \
    && find proto_temp -type f -executable -name "proto" -exec mv {} /usr/local/bin/ \; \
    && find proto_temp -type f -executable -name "proto-shim" -exec mv {} /usr/local/bin/ \; \
    && rm -rf proto_temp proto.tar.xz

# Set environment variables for proto
ENV PROTO_HOME="/root/.proto"
ENV PATH="${PROTO_HOME}/shims:${PROTO_HOME}/bin:${PATH}"

# Set working directory
WORKDIR /app

COPY . .

# Install dependencies
RUN proto use && bun install

# Build the application
RUN bun run build

# ===== Stage 2: Runtime =====
FROM oven/bun:latest

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    tini \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Download and install proto (if required at runtime)
RUN curl -fsSL https://github.com/moonrepo/proto/releases/download/v0.40.2/proto_cli-x86_64-unknown-linux-gnu.tar.xz -o proto.tar.xz \
    && mkdir -p proto_temp \
    && tar -xJf proto.tar.xz -C proto_temp \
    && find proto_temp -type f -executable -name "proto" -exec mv {} /usr/local/bin/ \; \
    && find proto_temp -type f -executable -name "proto-shim" -exec mv {} /usr/local/bin/ \; \
    && rm -rf proto_temp proto.tar.xz

# Set environment variables for proto
ENV PROTO_HOME="/root/.proto"
ENV PATH="${PROTO_HOME}/shims:${PROTO_HOME}/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy built artifacts from the builder stage
COPY --from=builder /app/apps/server /app/apps/server
COPY --from=builder /app/node_modules/pyodide /app/node_modules/pyodide

# Set environment variables (consider passing sensitive data at runtime)
ENV ENVIRONMENT=${DEPLOY_MODE}
ENV FIREWORKS_BASE_URL="https://api.fireworks.ai/inference/v1"

# Define entrypoint
WORKDIR /app/apps/server 

ENTRYPOINT ["/usr/bin/tini", "--", "bun", "run", "start"]
