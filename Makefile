SRC_DIR=src
GEN_DIR=gen

zip:
	if ! [[ -d "$(GEN_DIR)" ]]; then mkdir $(GEN_DIR); fi
	cd $(SRC_DIR); zip -r -FS ../$(GEN_DIR)/ff_extension.zip * -x '*/.*' '_metadata/*'
	zip -r -FS $(GEN_DIR)/chrome_src.zip src -x '*/.*' 'src/_metadata/*'

.PHONY: clean

clean:
	rm $(GEN_DIR)/*.zip
