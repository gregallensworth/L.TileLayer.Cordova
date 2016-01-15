var LAT  = 44.5667;
var LNG  = -123.2833;
var ZOOM = 13;

var CACHE_ZOOM_MIN = 13, CACHE_ZOOM_MAX = 16;

var MAP, BASE;

function startMap() {
    MAP = L.map('map', {
        minZoom:CACHE_ZOOM_MIN,
        maxZoom:CACHE_ZOOM_MAX
    });

    try {
        BASE = L.tileLayerCordova('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            // these options are perfectly ordinary L.TileLayer options
            maxZoom: 18,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright/">OpenStreetMap contributors</a>',
            // these are specific to L.TileLayer.Cordova and mostly specify where to store the tiles on disk
            folder: 'LTileLayerCordovaExample',
            name:   'example',
            debug:   true
        }, function() {
			updateStatus();
		}).addTo(MAP);
    } catch (e) {
        alert(e);
    }

    MAP.setView([LAT,LNG],ZOOM);
    MAP.on('moveend', function () {
		updateStatus();
    }).fire('moveend');
}

function updateStatus() {
	document.getElementById('status').innerHTML =  MAP.getCenter().lat.toFixed(5) + ' x ' + MAP.getCenter().lng.toFixed(5) + ' @ ' + MAP.getZoom() + (BASE.isOnline() ? ' (ONLINE)' : BASE.isOffline() ? ' (OFFLINE)' : '');
}

function startButtons() {
    document.getElementById('test_cache_pyramid').addEventListener('click', testCachingPyramid);
    document.getElementById('test_cache_bounds').addEventListener('click', testCachingBounds);
    document.getElementById('test_offline').addEventListener('click', testOffline);
    document.getElementById('test_online').addEventListener('click', testOnline);
    document.getElementById('test_usage').addEventListener('click', testUsage);
    document.getElementById('test_browse_cache').addEventListener('click', testBrowseCache);
    document.getElementById('test_empty').addEventListener('click', testEmpty);
}

function testCachingPyramid() {
	testCaching('pyramid');
}

function testCachingBounds() {
	testCaching('bounds');
}

function testCaching(which) {
    var lat       = MAP.getCenter().lat;
    var lng       = MAP.getCenter().lng;
    var zmin      = MAP.getZoom();
    var zmax      = CACHE_ZOOM_MAX;
    var tile_list = (which == 'pyramid' ? BASE.calculateXYZListFromPyramid(lat, lng, zmin, zmax) : BASE.calculateXYZListFromBounds(MAP.getBounds(), zmin, zmax));
    var message   = "Preparing to cache tiles.\n" + "Zoom level " + zmin + " through " + zmax + "\n" + tile_list.length + " tiles total." + "\nClick OK to proceed.";
    var ok        = confirm(message);
    if (! ok) return false;

    var status_block = document.getElementById('status');

    BASE.downloadXYZList(
        // 1st param: a list of XYZ objects indicating tiles to download
        tile_list,
        // 2nd param: overwrite existing tiles on disk? if no then a tile already on disk will be kept, which can be a big time saver
        false,
        // 3rd param: progress callback
        // receives the number of tiles downloaded and the number of tiles total; caller can calculate a percentage, update progress bar, etc.
        function (done,total) {
            var percent = Math.round(100 * done / total);
            status_block.innerHTML = done  + " / " + total + " = " + percent + "%";
        },
        // 4th param: complete callback
        // no parameters are given, but we know we're done!
        function () {
            // for this demo, on success we use another L.TileLayer.Cordova feature and show the disk usage
            testUsage();
        },
        // 5th param: error callback
        // parameter is the error message string
        function (error) {
            alert("Failed\nError code: " + error.code);
        }
    );
}

function testOffline() {
    BASE.goOffline();
	updateStatus();
}

function testOnline() {
    BASE.goOnline();
	updateStatus();
}

function testUsage() {
    var status_block = document.getElementById('status');
    BASE.getDiskUsage(function (filecount,bytes) {
        var kilobytes = Math.round( bytes / 1024 );
        status_block.innerHTML = "Cache status" + "<br/>" + filecount + " files" + "<br/>" + kilobytes + " kB";
    });
}

function testBrowseCache() {
	BASE.getCacheContents(function(cache) {
		console.log(cache);
		alert("Look in console for cache contents");
	});
}

function testEmpty() {
    BASE.emptyCache(function (oks,fails) {
        var message = "Cleared cache.\n" + oks + " deleted OK\n" + fails + " failed";
        alert(message);
        testUsage();
    })
}

