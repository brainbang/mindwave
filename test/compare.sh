#!/bin/bash

# this will compare 2 wasi runtimes, native c, and js implementations

# build C native & wasm
gcc test/parse.c -o test/testc
wasicc test/parse.c -w -o test/parse.wasm

echo "Wasmer"
time cat test/log.bin | ~/.wasmer/bin/wasmer test/parse.wasm > test/test_wasmer.txt
wc -l test/test_wasmer.txt
echo ""

echo "WASI (node)"
time cat test/log.bin | node --no-warnings --experimental-wasi-unstable-preview1 test/runwasi.js > test/test_wasijs.txt
wc -l test/test_wasijs.txt
echo ""

echo "Native (C)"
time cat test/log.bin | ./test/testc > test/test_c.txt
wc -l test/test_c.txt
echo ""

echo "Plain JS"
time cat test/log.bin | node test/runjs.js > test/test_js.txt
wc -l test/test_js.txt
echo ""

echo "Diff from Wasmer to WASI (node)"
diff --color test/test_wasmer.txt test/test_wasijs.txt

echo "Diff from Wasmer to Native (C)"
diff --color test/test_wasmer.txt test/test_c.txt

# echo "Diff from Wasmer to Plain JS"
# diff --color test/test_wasmer.txt test/test_js.txt