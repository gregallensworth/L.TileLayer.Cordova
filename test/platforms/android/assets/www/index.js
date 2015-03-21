var LAT  = 44.5667;
var LNG  = -123.2833;
var ZOOM = 13;

var CACHE_ZOOM_MIN = 13, CACHE_ZOOM_MAX = 16;

var OVERWRITE = true;

var MAP, BASE;

function startCordovaTileTest() {
    MAP = L.map('map');

    try {
        BASE = L.tileLayerCordova('https://{s}.tiles.mapbox.com/v3/examples.map-i875mjb7/{z}/{x}/{y}.png', {
            // these options are perfectly ordinary L.TileLayer options
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                         '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                         'Imagery © <a href="http://mapbox.com">Mapbox</a>',
            // these are specific to L.TileLayer.Cordova and mostly specify where to store the tiles on disk
            folder: 'LTileLayerCordovaExample',
            name:   'example',
            debug:   true
        }).addTo(MAP);
    } catch (e) {
        alert(e);
    }

    MAP.setView([LAT,LNG],ZOOM);
    document.getElementById('status').innerHTML =  LAT + ' x ' + LNG + ' @ ' + ZOOM;

    setTimeout(startCachingTest, 3000);
}

function startCachingTest() {
    var status_block = document.getElementById('status');
    var tile_list = BASE.calculateXYZListFromPyramid(LAT, LNG, CACHE_ZOOM_MIN, CACHE_ZOOM_MAX);

    var message = "Preparing to cache tiles." + "<br/>" + "Zoom level " + CACHE_ZOOM_MIN + " through " + CACHE_ZOOM_MAX + "<br/>" + tile_list.length + " tiles total.";
    console.log(message);
    status_block.innerHTML = message;

    BASE.downloadXYZList(
        // 1st param: a list of XYZ objects indicating tiles to download
        tile_list,
        // 2nd param: overwrite existing tiles on disk? if no then a tile already on disk will be kept, which can be a big time saver
        OVERWRITE,
        // 3rd param: progress callback
        // receives the number of tiles downloaded and the number of tiles total; caller can calculate a percentage, update progress bar, etc.
        function (done,total) {
            var percent = Math.round(100 * done / total);
            status_block.innerHTML = done  + " / " + total + " = " + percent + "%";
        },
        // 4th param: complete callback
        // no parameters are given, but we know we're done!
        function () {
            // for this demo, on success we use another L.TileLayer.Cordova feature and show the disk usage!
            BASE.getDiskUsage(function (filecount,bytes) {
                var kilobytes = Math.round( bytes / 1024 );
                status_block.innerHTML = "Done" + "<br/>" + filecount + " files" + "<br/>" + kilobytes + " kB";
            });
        },
        // 5th param: error callback
        // parameter is the error message string
        function (error) {
            alert("Failed\nError code: " + error.code);
        }
    );
}
