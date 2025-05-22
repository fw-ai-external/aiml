#!/bin/bash

# AIML VSCode Extension Debug Script
# This script helps debug connection issues between client and server

set -e  # Exit on any error

echo "🔧 AIML VSCode Extension Debug Helper"
echo "======================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists bun; then
    echo "❌ Error: bun is not installed or not in PATH"
    exit 1
fi

if ! command_exists npx; then
    echo "❌ Error: npx is not installed or not in PATH" 
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
VSCODE_DIR="$PROJECT_ROOT/packages/vscode"

echo "📁 Working directories:"
echo "   Project root: $PROJECT_ROOT"
echo "   VSCode extension: $VSCODE_DIR"
echo ""

# Step 1: Build workspace dependencies
echo "🏗️  Step 1: Building workspace dependencies..."
cd "$PROJECT_ROOT"

echo "   Installing workspace dependencies..."
bun install

echo "   Building @aiml/parser..."
cd packages/parser
bun run build

echo "   Building @aiml/shared..." 
cd ../shared
bun run build

echo "✅ Workspace dependencies built"
echo ""

# Step 2: Build VSCode extension components
echo "🏗️  Step 2: Building VSCode extension..."
cd "$VSCODE_DIR"

echo "   Installing VSCode extension dependencies..."
bun install

echo "   Building client..."
cd client
if [ -f "tsconfig.tsbuildinfo" ]; then
    rm -f tsconfig.tsbuildinfo
fi
npx tsc --build --force

echo "   Building server..."
cd ../server
if [ -f "tsconfig.tsbuildinfo" ]; then
    rm -f tsconfig.tsbuildinfo
fi
npx tsc --build --force

echo "✅ VSCode extension built"
echo ""

# Step 3: Verify build outputs
echo "🔍 Step 3: Verifying build outputs..."
cd "$VSCODE_DIR"

CLIENT_OUT="$VSCODE_DIR/client/out/extension.js"
SERVER_OUT="$VSCODE_DIR/server/out/server.js"

if [ -f "$CLIENT_OUT" ]; then
    echo "✅ Client output exists: $CLIENT_OUT"
    echo "   Size: $(du -h "$CLIENT_OUT" | cut -f1)"
    echo "   Modified: $(stat -f "%Sm" "$CLIENT_OUT" 2>/dev/null || stat -c "%y" "$CLIENT_OUT" 2>/dev/null)"
else
    echo "❌ Client output missing: $CLIENT_OUT"
    exit 1
fi

if [ -f "$SERVER_OUT" ]; then
    echo "✅ Server output exists: $SERVER_OUT"
    echo "   Size: $(du -h "$SERVER_OUT" | cut -f1)"
    echo "   Modified: $(stat -f "%Sm" "$SERVER_OUT" 2>/dev/null || stat -c "%y" "$SERVER_OUT" 2>/dev/null)"
else
    echo "❌ Server output missing: $SERVER_OUT"
    exit 1
fi

echo ""

# Step 4: Package extension (optional)
echo "📦 Step 4: Packaging extension..."
cd "$VSCODE_DIR"

if command_exists vsce; then
    echo "   Creating .vsix package..."
    npx vsce package --no-dependencies
    echo "✅ Extension packaged successfully"
else
    echo "ℹ️  vsce not found, skipping package creation"
fi

echo ""

# Step 5: Display debugging instructions
echo "🐛 Debugging Instructions:"
echo "========================="
echo ""
echo "1. Open VSCode to the project root directory:"
echo "   code $PROJECT_ROOT"
echo ""
echo "2. Press F5 to start debugging the extension, or:"
echo "   - Open Command Palette (Cmd/Ctrl+Shift+P)"
echo "   - Run 'Debug: Start Debugging'"
echo "   - Select 'Launch Extension'"
echo ""
echo "3. In the new Extension Development Host window:"
echo "   - Open a .aiml file or create one"
echo "   - Check the 'AIML Language Server' output channel for logs"
echo ""
echo "4. View logs:"
echo "   - View > Output"
echo "   - Select 'AIML Language Server' from dropdown"
echo ""
echo "5. Check Developer Console for client logs:"
echo "   - Help > Toggle Developer Tools"
echo "   - Look for extension activation logs"
echo ""
echo "6. Common issues to check:"
echo "   - Dependencies built: ✅"
echo "   - Client compiled: ✅" 
echo "   - Server compiled: ✅"
echo "   - Server module path correct in package.json"
echo "   - No TypeScript compilation errors"
echo ""
echo "📝 Tip: Look for lines starting with:"
echo "   '=== AIML Extension Activation Started ===' (client)"
echo "   '=== AIML Language Server Starting ===' (server)"
echo ""
echo "🎉 Debug setup complete! Happy debugging! 🚀"
