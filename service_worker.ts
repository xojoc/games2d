// copyright: AGPLv3 or later

// variable `filesToCache` will be added at the beginning of this file by files_to_cache.sh


// offline handling for all games

interface StringMap {
    [key: string]: string
}

function parameters(): StringMap {
    let p: StringMap = {};
    for (let kv of location.search.slice(1).split("&")) {
        let values = kv.split("=")
        p[values[0]] = values[1]
    }
    return p
}

self.addEventListener('install', (e) => {
    let gameName = parameters()["game_name"]
    let files: string[] = [];
    if (gameName == "games2d") {
        for (let key in filesToCache) {
            files = files.concat(filesToCache[key])
        }
    } else {
        files = filesToCache[gameName]
    }
    files = files.filter(function(elem, index, self) {
        return index === self.indexOf(elem);
    })
    console.log(`${gameName}: [Service Worker] Install`);
    e.waitUntil(
        caches.open("games2d").then((cache) => {
            console.log(`${gameName}: [Service Worker] Caching all`);
            console.log(files)
            return cache.addAll(files);
        })
    );
});


self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((r) => {
            console.log('[Service Worker] Fetching resource: ' + e.request.url);
            if (r) {
                console.log("Resource is cached");
            } else {
                console.log("Resource not cached");
            }
            return r || fetch(e.request).then((response) => {

                return response;
                /*
                                return caches.open("games2d").then((cache) => {
                                    console.log('[Service Worker] Caching new resource: ' + e.request.url);
                                    cache.put(e.request, response.clone());
                                    return response;
                                });
                */
            });
        })
    );
});



