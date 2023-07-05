// @ts-nocheck
import { useState, useEffect } from 'react';
import CanvasComponent from './Canvas';
import './Screenshotter.css';

const Screenshotter = (
    {
        object,
        handleScreenshot
    }
) => {
    return (
        <>
            <div className="screenshotter_view">
                Screenshotter
                <CanvasComponent key={object.id} objectLink={object.plyURI} onScreenshotReady={handleScreenshot} />
            </div>
        </>
    );
};

export default Screenshotter;