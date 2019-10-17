SHELL:=/bin/bash


all: compile 4snakes copy files_to_cache_array

compile:
	tsc

4snakes:

files_to_cache_array:
	$(eval temp_file := $(shell mktemp))
	$(eval temp_file2 := $(shell mktemp))
	bash files_to_cache.sh > $(temp_file)
	cat dist/service_worker.js | sed '/FILES_TO_CACHE/r $(temp_file)' > $(temp_file2)
	mv $(temp_file2) dist/service_worker.js
	rm $(temp_file)

copy: 
	mkdir -p dist
	$(shell cat index.html | sed "s/G2D_STRIPE_PUBLIC_KEY/$$G2D_STRIPE_PUBLIC_KEY/" | sed "s/G2D_STRIPE_SKU_2/$$G2D_STRIPE_SKU_2/" | sed "s/G2D_STRIPE_SKU_5/$$G2D_STRIPE_SKU_5/" | sed "s/G2D_STRIPE_SKU_10/$$G2D_STRIPE_SKU_10/" > dist/index.html)
	cp thanks.html dist
	cp main.css dist
	cp manifest.webmanifest dist
	#cp *.ts dist
	cp -a assets dist
	cp -a --parents */assets dist
	cp -a --parents */*.html dist
	#cp -a --parents */*.ts dist
	cp -a --parents */*.js dist
	cp -r phaser* dist
	cp -a --parents */*.webmanifest dist
	rm -rf dist/dist

local:
	cd dist; python3 -m http.server 8003&
