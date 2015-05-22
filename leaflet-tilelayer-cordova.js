/*
 * L.TileLayer.Cordova
 * A subclass of L.TileLayer which provides caching of tiles to a local filesystem using Cordova's File API
 * as well as methods for "switching" the layer between online mode (load from URLs) or offline mode (load from local stash)
 * Intended use is with Cordova/Phonegap applications, to cache tiles for later use.
 *
 * This plugin requires the following Cordova/Phonegap plugins:
 * File                 cordova plugins add org.apache.cordova.file
 * File-Transfer        cordova plugins add org.apache.cordova.file-transfer
 * Additionally, these Cordova/Phonegap plugins are invaluable for development and debugging:
 * Console              cordova plugins add org.apache.cordova.console
 *
 * It accepts the usual L.TileLayer options, plus the following (some are REQUIRED).
 * folder       REQUIRED. A folder path under which tiles are stored. The name of your app may be good, e.g. "My Trail App"
 * name         REQUIRED. A unique name for this TileLayer, for naming the tiles and then fetching them later. Keep it brief, e.g. "terrain"
 * debug        Boolean indicating whether to display verbose debugging out to console. Defaults to false. Great for using GapDebug, logcat, Xcode console, ...
 */

L.tileLayerCordova = function (url,options) {
    return new L.TileLayer.Cordova(url,options);
}

L.TileLayer.Cordova = L.TileLayer.extend({
    initialize: function (url, options) {
        // check required options or else choke and die
        options = L.extend({
            folder: null,
            name: null,
            autocache: false,
            debug: false
        }, options);
        if (! options.folder) throw "L.TileLayer.Cordova: missing required option: folder";
        if (! options.name)   throw "L.TileLayer.Cordova: missing required option: name";
        L.TileLayer.prototype.initialize.call(this, url, options);
        L.setOptions(this, options);

        // connect to the filesystem or else die loudly
        // save a handle to the filesystem, and also use it to open a directory handle to our stated folder
        // thus: self.fshandle and self.dirhandle
        //
        // also set the ._url for both online and offline use
        // we have two versions of URL which may be the _url at any given time: offline and online
        // online is the HTTP one we were given as the 'url' parameter here to initialize()
        // offline is underneath the local filesystem: /path/to/sdcard/FOLDER/name-z-x-y.png
        // tip: the file extension isn't really relevant; using .png works fine without juggling file extensions from their URL templates
        var myself = this;
        if (! window.requestFileSystem && this.options.debug) console.log("L.TileLayer.Cordova: device does not support requestFileSystem");
        if (! window.requestFileSystem) throw "L.TileLayer.Cordova: device does not support requestFileSystem";
        if (myself.options.debug) console.log("Opening filesystem");
        window.requestFileSystem(
            LocalFileSystem.PERSISTENT,
            0,
            function (fshandle) {
                if (myself.options.debug) console.log("requestFileSystem OK " + options.folder);
                myself.fshandle = fshandle;
                myself.fshandle.root.getDirectory(
                    options.folder,
                    { create:true, exclusive:false },
                    function (dirhandle) {
                        if (myself.options.debug) console.log("getDirectory OK " + options.folder);
                        myself.dirhandle = dirhandle;
                        myself.dirhandle.setMetadata(null, null, { "com.apple.MobileBackup":1});

                        // Android's toURL() has a trailing / but iOS does not; better to have 2 than to have 0 !
                        myself._url_online  = myself._url;
                        myself._url_offline = dirhandle.toURL() + '/' + [ myself.options.name,'{z}','{x}','{y}' ].join('-') + '.png';
                    },
                    function (error) {
                        if (myself.options.debug) console.log("getDirectory failed (code " + error.code + ")" + options.folder);
                        throw "L.TileLayer.Cordova: " + options.name + ": getDirectory failed with code " + error.code;
                    }
                );
            },
            function (error) {
                if (myself.options.debug) console.log("requestFileSystem failed (code " + error.code + ")" + options.folder);
                throw "L.TileLayer.Cordova: " + options.name + ": requestFileSystem failed with code " + error.code;
            }
        );

        // done, return ourselves because method chaining is cool
        return this;
    },

    /*
     * Toggle between online and offline functionality
     * essentially this just calls setURL() with either the ._url_online or ._url_offline, and lets L.TileLayer reload the tiles... or try, anyway
     */

    goOnline: function () {
        // use this layer in online mode
        this.setUrl( this._url_online );
    },
    goOffline: function () {
        // use this layer in online mode
        this.setUrl( this._url_offline );
    },

    /*
     * A set of functions to do the tile downloads, and to provide suporting calculations related thereto
     * In particular, a user interface for downloading tiles en masse, would call calculateXYZListFromPyramid() to egt a list of tiles,
     * then make decisions about whether this is a good idea (e.g. too many tiles), then call downloadXYZList() with success/error callbacks
     */

    calculateXYZListFromPyramid: function (lat,lon,zmin,zmax) {
        // given a latitude and longitude, and a range of zoom levels, return the list of XYZ trios comprising that view
        // the caller may then call downloadXYZList() with progress and error callbacks to do that fetching

        var xyzlist = [];
        for (z=zmin; z<=zmax; z++) {
            var t_x = this.getX(lon, z);
            var t_y = this.getY(lat, z);

            var radius = z==zmin ? 0 : Math.pow(2 , z - zmin - 1);
            if (this.options.debug) console.log("Calculate pyramid: Z " + z + " : " + "Radius of " + radius );

            for (var x=t_x-radius; x<=t_x+radius; x++) {
                for (var y=t_y-radius; y<=t_y+radius; y++) {
                    xyzlist.push({ x:x, y:y, z:z });
                }
            }
        }

        // done!
        return xyzlist;
    },

	calculateXYZListFromBounds: function(bounds, zmin, zmax) {
		// Given a bounds (such as that obtained by calling MAP.getBounds()) and a range of zoom levels, returns the list of XYZ trios comprising that view.
		// The caller may then call downloadXYZList() with progress and error callbacks to do the fetching.
		
		var xyzlist = [];
		
		for (z = zmin; z <= zmax; z++) {
			
			// Figure out the tile for the northwest point of the bounds.
			t1_x = this.getX(bounds.getNorthWest().lng, z);
			t1_y = this.getY(bounds.getNorthWest().lat, z);
			
			// Figure out the tile for the southeast point of the bounds.
			t2_x = this.getX(bounds.getSouthEast().lng, z);
			t2_y = this.getY(bounds.getSouthEast().lat, z);
			
			// Now that we have the coordinates of the two opposing points (in the correct order!), we can iterate over the square.
			for (var x = t1_x; x <= t2_x; x++) {
				for (var y = t1_y; y <= t2_y; y++) {
					xyzlist.push({ x:x, y:y, z:z });
				}
			}
				
		}
		
		return xyzlist;
		
	},
	
	getX: function(lon, z) {
		return Math.floor((lon+180)/360*Math.pow(2,z));
	},
	
	getY: function(lat, z) {
		return Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,z));
	},
	
    downloadAndStoreTile: function (x,y,z,success_callback,error_callback) {
        var myself    = this;
        var filename  = myself.dirhandle.toURL() + '/' + [ myself.options.name, z, x, y ].join('-') + '.png';
        var sourceurl = myself._url_online.replace('{z}',z).replace('{x}',x).replace('{y}',y);
        if (myself.options.subdomains) {
            var idx   = Math.floor(Math.random() * myself.options.subdomains.length);
            var dom   = myself.options.subdomains[idx];
            sourceurl = sourceurl.replace('{s}',dom);
        }
        if (myself.options.debug) console.log("Download " + sourceurl + " => " + filename);

        var transfer = new FileTransfer();
        transfer.download(
            sourceurl,
            filename,
            function(file) {
                // tile downloaded OK; set the iOS "don't back up" flag then move on
                file.setMetadata(null, null, { "com.apple.MobileBackup":1 });
                if (success_callback) success_callback();
            },
            function(error) {
                var errmsg;
                switch (error.code) {
                    case FileTransferError.FILE_NOT_FOUND_ERR:
                        errmsg = "One of these was not found:\n";
                        errmsg += urls[index].url + "\n";
                        errmsg += urls[index].filename;
                        break;
                    case FileTransferError.INVALID_URL_ERR:
                        errmsg = "Invalid URL:\n";
                        errmsg += urls[index].url + "\n";
                        errmsg += urls[index].filename;
                        break;
                    case FileTransferError.CONNECTION_ERR:
                        errmsg = "Connection error at the web server.\n";
                        break;
                }
                if (error_callback) error_callback(errmsg);
            }
        );
    },

    downloadXYZList: function (xyzlist,overwrite,progress_callback,complete_callback,error_callback) {
        var myself = this;

        function runThisOneByIndex(xyzs,index,cbprog,cbdone,cberr) {
            var x = xyzs[index].x;
            var y = xyzs[index].y;
            var z = xyzs[index].z;

            // thanks to closures this function would call downloadAndStoreTile() for this XYZ, then do the callbacks and all...
            // all we need to do is call it below, depending on the overwrite outcome
            function doneWithIt() {
                // the download was skipped and not an error, so call the progress callback; then either move on to the next one, or else call our success callback
                if (cbprog) cbprog(index,xyzs.length);

                if (index+1 < xyzs.length) {
                    runThisOneByIndex(xyzs,index+1,cbprog,cbdone,cberr);
                } else {
                    if (cbdone) cbdone();
                }
            }
            function yesReally() {
                myself.downloadAndStoreTile(
                    x,y,z,
                    doneWithIt,
                    function (errmsg) {
                        // an error in downloading, so we bail on the whole process and run the error callback
                        if (cberr) cberr(errmsg);
                    }
                );
            }

            // trick: if 'overwrite' is true we can just go ahead and download
            // BUT... if overwrite is false, then test that the file doesn't exist first by failing to open it
            if (overwrite) {
                if (myself.options.debug) console.log("Tile " + z + '/' + x + '/' + y + " -- " + "Overwrite=true so proceeding.");
                yesReally();
            } else {
                var filename = [ myself.options.name, z, x, y ].join('-') + '.png';
                myself.dirhandle.getFile(
                    filename,
                    { create:false },
                    function () { // opened the file OK, and we didn't ask for overwrite... we're done here, same as if we had downloaded properly
                        if (myself.options.debug) console.log(filename + " exists. Skipping.");
                        doneWithIt();
                    },
                    function () { // failed to open file, guess we are good to download it since we don't have it
                        if (myself.options.debug) console.log(filename + " missing. Fetching.");
                        yesReally();
                    }
                );

            }
        }
        runThisOneByIndex(xyzlist,0,progress_callback,complete_callback,error_callback);
    },

    /*
     *
     * Other maintenance functions, e.g. count up the cache's usage, and empty the cache
     *
     */

    getDiskUsage: function (callback) {
        var myself    = this;
        var dirReader = myself.dirhandle.createReader();
        dirReader.readEntries(function (entries) {
            // a mix of files & directories. In our case we know it's all files and all cached tiles, so just add up the filesize
            var files = 0;
            var bytes = 0;

            function processFileEntry(index) {
                if (index >= entries.length) {
                    if (callback) callback(files,bytes);
                    return;
                }

                // if (myself.options.debug) console.log( entries[index] );
                entries[index].file(
                    function (fileinfo) {
                        bytes += fileinfo.size;
                        files++;
                        processFileEntry(index+1);
                    },
                    function () {
                        // failed to get file info? impossible, but if it somehow happens just skip on to the next file
                        processFileEntry(index+1);
                    }
                );
            }
            processFileEntry(0);
        }, function () {
            throw "L.TileLayer.Cordova: getDiskUsage: Failed to read directory";
        });
    },

    emptyCache: function (callback) {
        var myself = this;
        var dirReader = myself.dirhandle.createReader();
        dirReader.readEntries(function (entries) {
            var success = 0;
            var failed  = 0;

            function processFileEntry(index) {
                if (index >= entries.length) {
                    if (callback) callback(success,failed);
                    return;
                }

                // if (myself.options.debug) console.log( entries[index] );
                entries[index].remove(
                    function () {
                        success++;
                        processFileEntry(index+1);
                    },
                    function () {
                        failed++;
                        processFileEntry(index+1);
                    }
                );
            }
            processFileEntry(0);
        }, function () {
            throw "L.TileLayer.Cordova: emptyCache: Failed to read directory";
        });
    }

}); // end of L.TileLayer.Cordova class
