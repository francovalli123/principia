import os
import re
import sys
from pathlib import Path


module_path = Path(sys.argv[1])
newline = os.linesep.encode()
original_source = module_path.read_bytes()
module_source = original_source.replace(b"\r\n", b"\n").replace(b"\n", newline)
module_source = re.sub(rb"[ \t]+(?=\r?$)", b"", module_source, flags=re.MULTILINE)
module_source = module_source.rstrip(b"\r\n") + newline
handler = b"  onKeydown:(event) => {" + newline + b"        GLFW.onKeyChanged"
guard = (
    b"  onKeydown:(event) => {"
    + newline
    + b"        if (event.target instanceof HTMLElement && "
    + b"(event.target.isContentEditable || event.target.matches('input, textarea, select'))) return;"
    + newline
    + b"        GLFW.onKeyChanged"
)

if guard in module_source:
    if module_source != original_source:
        module_path.write_bytes(module_source)
    raise SystemExit(0)

if module_source.count(handler) != 1:
    raise SystemExit("Could not locate the expected Emscripten GLFW keydown handler")

module_path.write_bytes(module_source.replace(handler, guard, 1))
