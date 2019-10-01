#/usr/bin/env bash

echo 'var filesToCache = {'

rootDir="/games2d/"

for game in */
do

	game=${game%*/}
	if [ $game = "dist" ]; then
		continue
	fi
	if [[ $game = phaser-* ]]; then
		continue
	fi
	echo "\"${game}\": ["
  
	echo "	\"${rootDir}\","
	echo "	\"${rootDir}index.html\","
	echo "	\"${rootDir}main.css\","
	for file in phaser-*/*; do
		echo "	\"${rootDir}$file\","
	done

	for file in $game/assets/*
	do
		echo "	\"${rootDir}$file\","
	done

	for file in $game/*.ts
	do
		echo "	\"${rootDir}${file%.ts}.js\","
	done
	echo "	\"${rootDir}${game}/manifest.webmanifest\","
	echo "	\"${rootDir}${game}/index.html\","
	echo "	\"${rootDir}${game}/\","
	echo '],'
done   

echo '}'
