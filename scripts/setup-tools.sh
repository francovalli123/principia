#!/bin/bash

set -e

echo "Setting up development tools..."

if [ ! -f "tools/emsdk" ]; then
    echo "Cloning Emscripten..."
    git clone https://github.com/emscripten-core/emsdk.git tools/emsdk
else
    echo "Emscripten already exists."
fi

echo "Installing Emscripten..."
cd tools/emsdk
./emsdk install latest
./emsdk activate latest
cd ../..

echo "Emscripten setup complete."
