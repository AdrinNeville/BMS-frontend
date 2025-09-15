#!/bin/bash
set -e

# Try direct node execution first
echo "Building with Vite..."
if command -v node >/dev/null 2>&1; then
    node node_modules/vite/bin/vite.js build
else
    echo "Node not found, trying npx..."
    npx vite build
fi

echo "Build completed!"