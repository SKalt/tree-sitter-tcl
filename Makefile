.PHONY: generate test playground wasm

all: test wasm

./src/grammar.json: ./grammar/grammar.ts ./grammar/index.ts ./grammar/core_tcl.ts
	./node_modules/.bin/esbuild --bundle --format=iife --platform=node --target=node14 ./grammar/grammar.ts > /tmp/bundle.js
	node /tmp/bundle.js > ./src/grammar.json

./src/parser.c: ./src/grammar.json
	./node_modules/.bin/tree-sitter generate ./src/grammar.json

./tree-sitter-tcl.wasm: ./src/parser.c
	./node_modules/.bin/tree-sitter build-wasm

test: ./src/parser.c
	./node_modules/.bin/tree-sitter test

scratch: ./src/parser.c
	./node_modules/.bin/tree-sitter test --filter scratch

generate: ./src/parser.c
wasm: ./tree-sitter-tcl.wasm
playground: ./tree-sitter-tcl.wasm
	./node_modules/.bin/tree-sitter playground

