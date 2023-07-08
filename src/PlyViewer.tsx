// @ts-nocheck
import { useState, useEffect } from 'react';
import CanvasComponent from './Canvas';
import './PlyViewer.css';

const PlyViewer = (
  {
    generatedObjects
  }
) => {
  function downloadPly(object) {
    const prompt = object.prompt;
    const plyURI = object.plyURI;

    const filename = `${prompt}.ply`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = plyURI;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>
      <div className="modal fade" id="plyViewerModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="exampleModalLabel">Generation History</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <table className="ply_view_table">
                <tbody>
                  {generatedObjects.slice().reverse().map((object) => (
                    <tr key={object.id}>
                      {
                        // TODO: We are not displaying a list of CanvasComponents, because when there are too many
                        // canvas contexts, we get the error "WARNING: Too many active WebGL contexts. Oldest context will be lost."
                        // and the main Three.js canvas will go blank.
                        //
                        // We could display a list of screenshots instead, and enable 3D preview selectively without going over the
                        // WebGL context limit.
                        /*
                        <td>
                          <CanvasComponent key={object.id} objectLink={object.plyURI} onScreenshotReady={() => null} />
                        </td>
                        */
                      }
                      <td>
                        <img src={object.screenshotDataURI} />
                      </td>
                      <td>
                        {object.prompt}
                      </td>
                      <td>
                        <button className="btn btn-light" type="button"
                          onClick={() => {
                            downloadPly(object);
                          }}>
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlyViewer;