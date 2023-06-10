import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
// @ts-ignore
import { startDemo } from "./demo.js";

function App() {
  const [count, setCount] = useState(0)

  startDemo();

  return (
    <>
      <div>
      </div>
    </>
  )
}

export default App
