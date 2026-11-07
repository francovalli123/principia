#!/bin/bash
# Runs the WebAssembly build under Bash.

set -e # Stops immediately if a build command fails.

if [[ -n "${EMSDK:-}" && -f "${EMSDK}/emsdk_env.sh" ]]; then
  source "${EMSDK}/emsdk_env.sh" # Loads the configured Emscripten SDK.
elif [[ -f tools/emsdk/emsdk_env.sh ]]; then
  source tools/emsdk/emsdk_env.sh # Loads the repository-local Emscripten SDK.
elif ! command -v emcc >/dev/null 2>&1; then
  echo "Emscripten is required. Set EMSDK or add emcc to PATH." >&2
  exit 1
fi

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

mkdir -p frontend/public/wasm/obliqueProjectile # Prepares the static asset directory served by Angular.
cp frontend/src/wasm/obliqueProjectile/index.wasm frontend/public/wasm/obliqueProjectile/index.wasm # Keeps the fetched binary in sync with its generated JavaScript glue.

echo "Oblique Projectile Motion WASM build completed." # Confirms successful completion to the caller.
