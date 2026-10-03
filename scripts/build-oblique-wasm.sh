#!/bin/bash
# Runs the WebAssembly build under Bash.

set -e # Stops immediately if a build command fails.

source tools/emsdk/emsdk_env.sh # Adds the Emscripten compiler tools to PATH.

mkdir -p frontend/src/wasm/obliqueProjectile # Ensures the generated module directory exists.

EMCC_ARGS=( # Stores compiler inputs so every option can be documented independently.
  simulador/tiroOblicuo.c # Compiles the projectile simulation source.
  -o frontend/src/wasm/obliqueProjectile/index.js # Writes the generated ES module.
  -Itools/raylib/src # Adds Raylib headers to the include search path.
  tools/raylib/src/libraylib.web.a # Links the Raylib WebAssembly library.
  -s USE_GLFW=3 # Enables the GLFW-compatible browser window backend.
  -s ASYNCIFY # Supports asynchronous browser operations used by Raylib.
  -s MODULARIZE=1 # Exports a factory that creates isolated module instances.
  -s EXPORT_ES6=1 # Emits an ES module for the frontend dynamic import.
  -s EXPORTED_FUNCTIONS='["_main","_pauseSim","_resetSim","_getSimTime","_getSimX","_getSimY","_getSimStatus"]' # Keeps C entry points and state getters callable from JavaScript.
)

emcc "${EMCC_ARGS[@]}" # Compiles and links the module using the declared options.

echo "Oblique Projectile Motion WASM build completed." # Confirms successful completion to the caller.
