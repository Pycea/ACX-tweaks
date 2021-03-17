SRC_DIR=src
GEN_DIR=gen

zip:
	if ! [[ -d "$(GEN_DIR)" ]]; then mkdir $(GEN_DIR); fi
	cd $(SRC_DIR); zip -r -FS ../$(GEN_DIR)/ff_extension.zip * -x '*/.*'
	zip -r -FS $(GEN_DIR)/chrome_src.zip src -x '*/.*'

.PHONY: clean

clean:
	rm $(GEN_DIR)/*.zip