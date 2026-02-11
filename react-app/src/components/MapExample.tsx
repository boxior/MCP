"use client"

import React, {useEffect} from "react";
import {initMap} from "@/src/components/example";


export const MapExample = () => {
    useEffect( () => {
        (async () => {
            initMap().then(({addRoute, removeRoute}) => {
                document.getElementById("ADD_BUTTON_ID")?.addEventListener("click", addRoute);
                document.getElementById("REMOVE_BUTTON_ID")?.addEventListener("click", removeRoute);
            });
        })()
    }, [])

    return (
        <div>
            <div id={"map"} style={{width: 600, height: 600}}/>

            <button id="ADD_BUTTON_ID">Add</button>
            <br/>
            <button id="REMOVE_BUTTON_ID">Remove</button>
        </div>

    )
}