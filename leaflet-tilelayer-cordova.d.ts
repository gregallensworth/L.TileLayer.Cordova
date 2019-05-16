// Type definitions for leaflet-tilelayer-cordova
// By rwev <https://github.com/rwev>

import * as L from 'leaflet';

declare module 'leaflet' {

    interface TileLayerCordovaOptions extends L.TileLayerOptions {
        folder?: string; // REQUIRED. A folder path under which tiles are stored.
        name?: string; // REQUIRED. A unique name for this TileLayer, for naming the tiles and then fetching them later.
        debug?: boolean; // If true (defaults to false), extra console.log() calls are made to show progress and debugging. 
    }

    function tileLayerCordova(
        url: string,
        options: L.TileLayerCordovaOptions,
        success_callback: Function): L.TileLayerCordova;
    
    
    class TileLayerCordova extends L.TileLayer {
            
        initialize(url: string, options: TileLayerCordovaOptions, success_callback: Function): TileLayerCordova
        
        goOnline(): void;
        goOnline(): void;
        
        isOnline(): boolean;
        isOffline(): boolean;
        
        calculateXYZListFromPyramid(lat: number, lon: number, zmin: number, zmax: number): Array<XYZ>
        calculateXYZListFromBounds(bounds: L.Bounds, zmin: number, zmax: number): Array<XYZ>
        
        getX(lon: number, z: number): number;
        getY(lat: number, z: number): number;
        
        getLng(x: number, z: number): number;
        getLat(y: number, z: number): number;
        
        downloadAndStoreTile(x: number, y: number, z: number, success_callback: Function, error_callback: Function): void
        downloadXYZList(xyzlist: Array<XYZ>, overwrite: boolean, progress_callback: Function, complete_callback: Function, error_callback: Function): void
        
        getDiskUsage(callback: Function): void
        emptyCache(callback: Function): void
        getCacheContents(done_callback: Function): void
        
        
    }
    
    interface XYZ {
        x: number;
        y: number;
        z: number
    }
}

