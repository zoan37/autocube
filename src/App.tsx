import { useEffect, useState } from 'react'
import './App.css'
// @ts-ignore
import { startGenDemo } from "./gen_demo.js";
import GenerateInput from './GenerateInput.tsx';
import PlyViewer from './PlyViewer.tsx';
import Screenshotter from './Screenshotter.tsx';
import Chatbox from './Chatbox.tsx';
import Settings from './Settings.tsx';

interface GeneratedObject {
  id: string;
  prompt: string;
  plyURI: string;
  screenshotDataURI: string;
}

export interface ChatMessage {
  text: string;
  timestamp: Date;
  username: string;
}

function App() {
  const [generatedObjects, setGeneratedObjects] = useState([] as GeneratedObject[]);
  const [screenshotObject, setScreenshotObject] = useState({} as GeneratedObject);
  const [username, setUsername] = useState('Guest');
  const [chatMessages, setChatMessages] = useState([] as ChatMessage[]);

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
      },
      setChatMessagesHandler: (messages: ChatMessage[]) => {
        const clonedMessages = messages.slice();
        setChatMessages(clonedMessages);
        console.log('setChatMessagesHandler', clonedMessages);
      }
    });
  }, []);

  return (
    <>
      <div className="info-bar">
        Welcome to AutoCube!
        <br />
        This is a multiplayer sandbox demo (assume all generated objects will not be saved)
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
      <Settings username={username} setUsername={setUsername} />
      <div className="overall_container">
        <Chatbox
          username={username}
          chatMessages={chatMessages}
        />
        <GenerateInput />
      </div>
      <Screenshotter object={screenshotObject} handleScreenshot={handleScreenshot}/>
      <div>
        <a className="code-button" target="_blank"
          href="https://github.com/zoan37/AutoCube"
          title="View source code on GitHub">
          <img src="/svg/ic_code_black_24dp.svg" />
        </a>
      </div>
    </>
  )
}

export default App
