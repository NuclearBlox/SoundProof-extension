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
export default function Card() {
  return (
    
    <div className="main" >


      <div className="grid">
       <Chip word='dragoniteeeeee'/>
        <Chip word='flareon' />
        <Chip word='mew' />
        <Chip word='meggggggg' />
        <Chip word='mew' />
        <Chip word='pikachu' />
        <Chip word='dragonite'/>
        <Chip word='flareon' />
        <Chip word='mew' />
        <Chip word='pikachu' />
      </div>
    </div>
  );
}



