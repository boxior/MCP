"use client"

import React, {useEffect} from "react";


export const MapExample = () => {
    useEffect( () => {
        (async () => {
            // Dynamically import the library only on the client side
            const {createMap} = await import("@milemaker/milemaker-js");

            const map = await createMap({
                container: "map",
                accessToken: process.env.NEXT_PUBLIC_MILEMAKER_ACCESS_TOKEN ?? "",
            });
            console.log("map", map);
            map.controls.createBaseLayerControl();
            map.controls.createOverlayLayerControl();
        })()
    }, [])

    return (
        <div id={"map"} style={{width: 600, height: 600}}></div>
    )
}