all: 4snakes

4snakes: copy

copy:
	mkdir -p dist
	cp -a --parents */assets dist
	cp -a --parents */*.html dist
	cp index.html dist
	cp main.css dist
	cp manifest.webmanifest dist
	cp -a --parents */*.ts dist
	cp -r phaser* dist
	cp -a --parents */*.webmanifest dist


