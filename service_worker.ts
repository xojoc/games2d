// copyright: AGPLv3 or later

//// xojoc: see https://github.com/microsoft/TypeScript/issues/14877
export default null;

// variable `filesToCache` will be added at the beginning of this file by files_to_cache.sh
let FILES_TO_CACHE;

declare var self: ServiceWorkerGlobalScope;

declare let filesToCache: { [key: string]: string[] };

// offline handling for all games

let CacheName = "games2d-v32"

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
    self.skipWaiting();

    let gameName = parameters()["game_name"]
    let files: string[] = [];
    if (gameName == "games2d") {
        for (let key in filesToCache) {
            files = files.concat(filesToCache[key])
        }
    } else {
        files = filesToCache[gameName]
    }
    // remove duplicates
    files = files.filter(function(elem, index, self) {
        return index === self.indexOf(elem);
    })
    console.log(`${gameName}: cache name: ${CacheName}`)
    console.log(`${gameName}: [Service Worker] Install`)
    e.waitUntil(
        caches.open(CacheName).then((cache) => {
            console.log(`${gameName}: [Service Worker] Caching all`);
            console.log(files)
            return cache.addAll(files);
        })
    );
});


self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.open(CacheName).then((cache) => {
            return cache.match(e.request).then((r) => {
                console.log('[Service Worker] Fetching resource: ' + e.request.url);
                if (r) {
                    console.log("Resource is cached");
                } else {
                    console.log("Resource not cached");
                }
                return r || fetch(e.request)
            });
        })
    );
});


self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cn) {
                    if (cn != CacheName) {
                        console.log(`[Service Worker] Delete old cache ${cn}`)
                        return caches.delete(cn)
                    }
                })
            )
        })
    )
})
