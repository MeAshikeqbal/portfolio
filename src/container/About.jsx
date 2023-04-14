import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppWrap, MotionWrap } from "../wrapper/index";
import { urlFor, client } from "../client";
import Image from "next/image";

const About = () => {
  const [abouts, setAbouts] = useState([]);

  useEffect(() => {
    const query = '*[_type == "abouts"]';

    client.fetch(query).then((data) => {
      setAbouts(data);
    });
  }, []);

  return (
    <>
      <h2 className="head-text">
        About <span>Me</span>
      </h2>

      <div className="app__profiles">
        {abouts.map((about, i) => (
          <motion.div
            whileInView={{ opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.5, type: "tween" }}
            className="app__profile-item"
            key={about.title + i}
          >
            <Image
              src={urlFor(about.imgUrl).url()}
              alt={about.title}
              width={500}
              height={300}
              loading="lazy"
            />
            <h2 className="bold-text" style={{ marginTop: 20 }}>
              {about.title}
            </h2>
            <p className="p-text" style={{ marginTop: 10 }}>
              {about.description}
            </p>
          </motion.div>
        ))}
      </div>
    </>
  );
};

export default AppWrap(
  MotionWrap(About, "app__about"),
  "about",
  "app__whitebg"
);
