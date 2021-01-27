SRC_DIR=src
GEN_DIR=gen

zip: 
	cd src; zip -r -FS ../$(GEN_DIR)/extension.zip * -x '*/.*'

.PHONY: clean

clean:
	rm $(GEN_DIR)/*.zip