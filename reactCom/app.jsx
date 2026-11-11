import React from 'react'
import './styles.css'
import { useState } from 'react';

function Chip({word}) {

  const [isActive, setIsActive] = useState(false);
  const handleClick = () => {
    console.log('Button clicked!');
    setIsActive(!isActive);
  }
    return(
       <button className={isActive ? 'chip-active' : 'chip-inactive'}
        onClick={handleClick}
        >
          {word}
        </button>
    );
}

function TopBar() {
  return(
    <div className="top-bar">
      
    </div>
    );
}

export default function Card() {
  return (
    
    <div className="main" >

      <TopBar />
      <div className="selectors">

        <text className="selection-text">Terms</text> <text className="selection-subtext">select a term to block it</text>
        <div className="grid">
        <Chip word='dragoniteeeeee'/>
        <Chip word='flareon' />
        <Chip word='mew' />
        <Chip word='meggggggggggggggg' />
        <Chip word='mew' />
        <Chip word='pikachu' />
        <Chip word='dragonite'/>
        <Chip word='flareon' />
        <Chip word='mew' />
        <Chip word='pikachu' />
      </div>
        <div className="grid">
        <Chip word='Artist' /><Chip word='This song' /> 
        </div>
        <div className="divider"></div>
              
      </div>
    </div>
  );
}



