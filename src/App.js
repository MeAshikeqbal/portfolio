import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar, FooterGit } from './components';
import { Home } from './container/index'
import { SingleBlogPost, Error, Blog } from './Pages';
import './App.scss'
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";



const App = () => {
  return (
    <div className="app">
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" exact element={<Home />} />
          <Route path="/blog/:postLink" element={<SingleBlogPost />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="*" element={<Error />} />
        </Routes>
        <FooterGit />
      </BrowserRouter>
    </div>
  )
};


const firebaseConfig = {
  apiKey: "AIzaSyAwzHmK37rqD0VJ4lJje5RftNehBscTsNU",
  authDomain: "itsashik-info.firebaseapp.com",
  projectId: "itsashik-info",
  storageBucket: "itsashik-info.appspot.com",
  messagingSenderId: "307624946048",
  appId: "1:307624946048:web:48ac209d93f476fbda3965",
  measurementId: "G-FY3432HZ50"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default App;