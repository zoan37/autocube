import { useEffect, useState } from 'react'
import './App.css'
// @ts-ignore
import { startGenDemo } from "./gen_demo.js";
import GenerateInput from './GenerateInput.tsx';
import PlyViewer from './PlyViewer.tsx';
import Screenshotter from './Screenshotter.tsx';

interface GeneratedObject {
  id: string;
  prompt: string;
  plyURI: string;
  screenshotDataURI: string;
}

function App() {
  const [generatedObjects, setGeneratedObjects] = useState([] as GeneratedObject[]);
  const [screenshotObject, setScreenshotObject] = useState({} as GeneratedObject);

  function handleScreenshot(screenshotDataUri: string) {
    const clonedObjects : GeneratedObject[] = generatedObjects.slice();
    const screenshotObjectIndex = clonedObjects.findIndex((object) => object.id === screenshotObject.id);
    clonedObjects[screenshotObjectIndex].screenshotDataURI = screenshotDataUri;
    setGeneratedObjects(clonedObjects);
  }

  useEffect(() => {
    startGenDemo({
      setGenerateObjectsHandler: (objects: GeneratedObject[]) => {
        const clonedObjects = objects.slice();
        setGeneratedObjects(clonedObjects);
        console.log('setGeneratedObjects', clonedObjects);
      },
      setScreenshotObjectHandler: (object: GeneratedObject) => {
        setScreenshotObject(object);
      }
    });
  }, []);

  return (
    <>
      <div className="info-bar">
        World Generation Demo using <a href="https://windowai.io/" target="_blank">window.ai</a>
        <br />
        Generate environments and objects with natural language
        <br />
        MOUSE to look around and to throw balls
        <br />
        WASD to move and SPACE to jump
        <br />
        ESC to see your mouse
      </div>
      <PlyViewer
        generatedObjects={generatedObjects}
      />
      <GenerateInput />
      <Screenshotter object={screenshotObject} handleScreenshot={handleScreenshot}/>
      <div>
        <a className="code-button" target="_blank"
          href="https://github.com/zoan37/world-generation-demo"
          title="View source code on GitHub">
          <img src="/svg/ic_code_black_24dp.svg" />
        </a>
      </div>
    </>
  )
}

export default App
