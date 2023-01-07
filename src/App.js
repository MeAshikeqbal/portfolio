import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components';
import { Footer, Home } from './container/index'
import { SingleBlogPost, Error } from './Pages';
import './App.scss'

const App = () => {
  return (
    <div className="app">
      <BrowserRouter>
        <Navbar />
          <Routes>
            <Route path="/" exact element={<Home />} />
            <Route path="/blog/:postLink" element={<SingleBlogPost />} />
            <Route path="*" element={<Error />} />
          </Routes>
        <Footer />
      </BrowserRouter>
    </div>
  )
};


export default App;