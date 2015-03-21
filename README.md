# L.TileLayer.Cordova
Leaflet TileLayer subclass which caches to local filesystem, for Cordova/Phonegap

Includes a test/demo application for Cordova/Phonegap, walking through the basics. See its own README file.

#Usage
See _test/www/_ for a functional application as well as JavaScript source code.

A basic example as as follows:

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

    // calculate a tile pyramid starting at a lat/lon and going down to a stated range of zoom levels
    var tile_list = BASE.calculateXYZListFromPyramid(LAT, LNG, CACHE_ZOOM_MIN, CACHE_ZOOM_MAX);
    BASE.downloadXYZList(
        // 1st param: a list of XYZ objects indicating tiles to download
        tile_list,
        // 2nd param: overwrite existing tiles on disk?
        // if no then a tile already on disk will be kept, which can be a big time saver
        true,
        // 3rd param: progress callback
        // receives the number of tiles downloaded and the number of tiles total
        // caller can calculate a percentage, update progress bar, etc.
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

When running under Cordova/Phonegap this tile layer will behave much as usual, but has special behaviors such as the ability to cache sets of tiles, then to switch between "online mode" and "offline mode"

#Constructor and Options
In Leaflet tradition, there is a constructor for use with _new_ and also a utility function. They have an identical outcome:
    var layer = new L.TileLayer.Cordova(url,options)
    var layer = L.tileLayerCordova(url,options)

Most options are passed through to L.TileLayer and will be supported as is typical. This would include maxZoom, attributions, TMS, the {x}{y}{z}{s} markups in the IURL template, and so on.
In addition, these config options are supported:
* *folder* -- REQUIRED. A folder path under which tiles are stored. The name of your app may be good, e.g. "My Trail App"
* *name* -- REQUIRED. A unique name for this TileLayer, for naming the tiles and then fetching them later. Keep it brief, e.g. "terrain"
* *debug* -- If true (defaults to false), extra console.log() calls are made to show progress and debugging.

#Methods - Toggling State
*goOffline()*
Set the layer to offline mode. This sets the URL pattern to load tiles from the offline on-device cache. Online tiles will no longer be used. Naturally, this is most effective if you have in fact cached any tiles.

*goOnline()*
Set the layer to online mode. This sets the URL pattern to load tiles from the HTTP service indicated in your URL string. On-device offline tiles will no longer be used.

#Methods - Caching and Calculations
Much of this is based on the concept of _xyz objects_ An XYZ object is simply a JavaScript object with the attributes _x_, _y_, and _z_ used to describe the ordinates of a tile. Combined with the layer's URL template you provided in the constructor, or with the offline filesystem URL generated internally, an XYZ can be used to cmpose the URL of a specific tile in both offline state and online state.

*downloadAndStoreTile(x,y,z,success_callback,error_callback)*
Given the XYZ ordinates of one single tile, download this one tile and store it into the offline cache. This method forms the basis of other download wrappers.
The _success_callback_ is called if it worked out. No parameters are given.
The _error_callback_ will be called if it failed. This callback is passed one parameter: an error message string.

*downloadXYZList(xyzlist,overwrite,progress_callback,complete_callback,error_callback)*
Given a list of _xyz objects_ representing tile ordinates, download all of these tiles and save them to the on-device cache.
The _overwrite_ flag specifies whether tiles already in the on-device cache will be skipped and retained or else downloaded and overwritten. Setting overwrite to false can be a big time-saver, if someone has already cached an overlapping area.
The _progress_callback_ is called as each tile is downloaded and saved. The callback is passed two parameters: the number of tiles now comlpeted (integer) and the number of tiles to be downloaded (integer). This is suitable for displaying a progress bar, for example.
The _complete_callback_ is called when all tiles have been downloaded and saved. It is passed no parameters. This would be suitable for supressing a progress message, or displaying a Done! message, for example.
The _error_callback_ is called in the event of an error. It is passed one parameter: an error message string.

*calculateXYZListFromPyramid(lat,lon,zmin,zmax)*
Given a _latitude_ and _longitude_, calculate the tile which contains it. Then, for the (inclusive) range of zoom levels _zmin_ through _zmax_ calculate the pyramid downward.
The return is a list of _xyz objects_ suitable for use with downloadXYZList()

#Methods - Cache Management

*getDiskUsage(usage_callback)*
Calculate the disk usage of this L.TileLayer.Cordova instance. The _usage_callback_ is passed two parameters: The count of files, and the count of bytes.

