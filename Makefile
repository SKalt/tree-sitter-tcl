.PHONY: generate test web-ui wasm


generate: ./src/parser.c
./src/parser.c: ./src/grammar.json
	if test -e /tmp/generate.err; then mv /tmp/generate.err /tmp/generate.err.old; fi
	./node_modules/.bin/tree-sitter generate ./src/grammar.json 2>&1
test: ./src/parser.c
	./node_modules/.bin/tree-sitter test
playground: ./tree-sitter-tcl.wasm
	./node_modules/.bin/tree-sitter playground
wasm: ./tree-sitter-tcl.wasm

./tree-sitter-tcl.wasm: ./src/parser.c
	./node_modules/.bin/tree-sitter build-wasm
./src/grammar.json: ./grammar/grammar.ts ./grammar/index.ts ./grammar/core_tcl.ts
	./node_modules/.bin/esbuild --bundle --format=iife --platform=node --target=node14 ./grammar/grammar.ts > /tmp/bundle.js
	node /tmp/bundle.js > ./src/grammar.json
scratch: ./src/parser.c
		./node_modules/.bin/tree-sitter test --filter scratch
