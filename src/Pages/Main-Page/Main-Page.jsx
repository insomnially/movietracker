import { NavLink } from 'react-router';
import './Main-Page.css'
import { useState } from 'react';

function MainPage() {
    const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='body-main-page'>
    <div className="wrapper-main-page">
            <div className="sidebar">
              <ul className="ul-main-page">
                <li
                  className={`burger-menu ${isOpen ? 'active' : ''}`}
                  onClick={() => setIsOpen(!isOpen)}
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </li>

                <li className="main-logo">RELATIONSHIPS</li>
                <li>Login</li>
              </ul>
            </div>

            <div className={`mobile-menu ${isOpen ? 'open' : ''}`}>
              <ul>
                <li><NavLink to="/movietracker">MOVIETRACKER</NavLink></li>
                <li><NavLink to="/datetracker">DATETRACKER</NavLink></li>
                <li><NavLink to="/datetracker">TRACKER</NavLink></li>
                <li><NavLink to="/datetracker">TRACKER</NavLink></li>
              </ul>
            </div>

            {isOpen && (
              <div
                className="overlay"
                onClick={() => setIsOpen(false)}
              ></div>
            )}
      <div className="wrapper-main-image">
        <div className="main-image">
            <img className='main-image-img' src='./images/main-photo.jpg' alt="" />
        </div>
        <div className="main-image">
            <img className='main-image-img' src='./images/main-photo2.jpg' alt="" />
        </div>
        <div className="main-image">
            <img className='main-image-img' src='./images/main-photo3.jpg' alt="" />
        </div>
         <div className="main-image">
            <img className='main-image-img' src='./images/main-photo4.jpg' alt="" />
        </div>
         <div className="main-image">
            <img className='main-image-img' src='./images/main-photo5.jpg' alt="" />
        </div>
        <div className="main-image">
            <img className='main-image-img' src='./images/main-photo6.jpg' alt="" />
        </div>
      </div>
    </div>
    </div>
  )
}

export default MainPage