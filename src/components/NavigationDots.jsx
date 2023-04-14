import React from "react";

const NavigationDots = ({ active }) => (
  <div className="app__navigation">
    {["home", "about", "skills", "blog", "contact"].map((item, index) => (
      <a
        href={`#${item}`}
        key={item + index}
        className="app__navigation-dot"
        style={active === item ? { backgroundColor: "#505050" } : {}}
      />
    ))}
  </div>
);

export default NavigationDots;