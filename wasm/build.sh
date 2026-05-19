#!/usr/bin/env bash
set -euo pipefail

echo "使用 wasm-pack 构建 WASM..."
wasm-pack build --target web --out-dir ../src/pkg --release

wasm_file="../src/pkg/wasm_bg.wasm"
original_size=$(stat -c%s "$wasm_file" 2>/dev/null || stat -f%z "$wasm_file")
echo "原始大小: $((original_size / 1024)) KB"

if command -v wasm-opt &>/dev/null; then
  echo "运行 wasm-opt..."
  wasm-opt -Oz --enable-bulk-memory --enable-nontrapping-float-to-int \
    "$wasm_file" -o "${wasm_file}.opt.wasm"
  mv "${wasm_file}.opt.wasm" "$wasm_file"

  final_size=$(stat -c%s "$wasm_file" 2>/dev/null || stat -f%z "$wasm_file")
  reduction=$((100 - final_size * 100 / original_size))
  echo "最终大小: $((final_size / 1024)) KB"
  echo "缩减: ${reduction}%"
else
  echo "跳过 wasm-opt（未安装）。安装: pacman -S wasm-opt"
fi
