#!/bin/bash
set -e

#echo "==> Compilando raylib para WebAssembly..."

cd /app/raylib/src
make PLATFORM=PLATFORM_WEB

#echo "==> Compilando tiroOblicuo..."

cd /app
mkdir -p build

emcc simulador/tiroOblicuo.c 5 45 20 \
    -o build/index.html \
    -I/app/raylib/src \
    /app/raylib/src/libraylib.web.a \
    -s USE_GLFW=3 \
    -s ASYNCIFY \
    -s ALLOW_MEMORY_GROWTH=1

#echo "==> Compilación terminada correctamente"

#echo "Archivos generados:"
#ls -lh build
