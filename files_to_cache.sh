#/usr/bin/env bash

echo 'let filesToCache = {'

rootDir="/games2d/"

for game in */
do

	game=${game%*/}
	if [ $game = "dist" ]; then
		continue
	fi
	if [ $game = "assets" ]; then
		continue
	fi
	if [[ $game = phaser-* ]]; then
		continue
	fi
	echo "\"${game}\": ["

	echo "	\"${rootDir}\","
	echo "	\"${rootDir}index.html\","
	echo "	\"${rootDir}main.css\","
	echo "	\"${rootDir}games2d.js\","
	echo "	\"${rootDir}manifest.webmanifest\","
	for file in phaser-*/*; do
		if [ -e $file ]; then
			echo "	\"${rootDir}$file\","
		fi
	done

	for file in assets/*
	do
		if [ -e $file ]; then
			echo "	\"${rootDir}$file\","
		fi
	done

	for file in $game/assets/*
	do
		if [ -e $file ]; then
			echo "	\"${rootDir}$file\","
		fi
	done

	for file in $game/*.ts
	do
		if [ -e $file ]; then
			echo "	\"${rootDir}${file%.ts}.js\","
		fi
	done
	echo "	\"${rootDir}${game}/index.html\","
	echo "	\"${rootDir}${game}/\","
	echo '],'
done

echo '}'
