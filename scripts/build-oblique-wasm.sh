#!/bin/bash

set -e

source tools/emsdk/emsdk_env.sh

mkdir -p frontend/src/wasm/obliqueProjectile

emcc simulador/tiroOblicuo.c\
  -o frontend/src/wasm/obliqueProjectile/index.js \
  -Itools/raylib/src \
  tools/raylib/src/libraylib.web.a \
  -s USE_GLFW=3 \
  -s ASYNCIFY \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s EXPORTED_FUNCTIONS='["_main","_pauseSim","_resetSim"]'

echo "Oblique Projectile Motion WASM build completed."
