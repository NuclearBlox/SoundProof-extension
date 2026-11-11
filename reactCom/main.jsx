import React from 'react'
import ReactDOM from 'react-dom/client'
import Card from './app.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="stack">
    <img src="Examples/HeroShot.png" alt="A description of the image"></img>
    <Card />
    </div>
  </React.StrictMode>,
)