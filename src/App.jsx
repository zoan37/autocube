import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import SingleChat from './SingleChat.jsx'
// @ts-ignore
import { startGenDemo } from "./gen_demo.js";

// TODO: bug, useEffect called twice for some reason
function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('App.jsx useEffect')
    startGenDemo();
  }, []);

  return (
    <>
    </>
  )
}

export default App
