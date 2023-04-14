import React, { useState, useEffect } from "react";
import { AiFillEye } from "react-icons/ai";
import { motion } from "framer-motion";
import { AppWrap, MotionWrap } from "../wrapper";
import { urlFor, client } from "../client";
import Link from "next/link";
import Image from "next/image";

const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [animateCard] = useState({ y: 0, opacity: 1 });

  useEffect(() => {
    const query =
      '*[_type == "blogs"][0...4]{ title, excerpt, imgUrl, tags, postLink}';

    client.fetch(query).then((data) => setBlogs(data));
  }, []);

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <>
        <h2 className="head-text">
          Latest <span>Blog</span>
        </h2>

        <motion.div
          animate={animateCard}
          transition={{ duration: 0.5, delayChildren: 0.5 }}
          className="app__blog-portfolio"
        >
          {blogs.map((blog, index) => (
            <div className="app__blog-item app__flex" key={index}>
              <Link href={`/blog/${blog.postLink.current}`}>
                <div className="app__blog-img app__flex">
                  <Image 
                  src={urlFor(blog.imgUrl).url()} 
                  alt={blog.name} 
                  width={500}
                  height={500}
                  loading="lazy"
                  />

                  <motion.div
                    whileHover={{ opacity: [0, 1] }}
                    transition={{
                      duration: 0.25,
                      ease: "easeInOut",
                      staggerChildren: 0.5,
                    }}
                    className="app__blog-hover app__flex"
                  >
                    <motion.div
                      whileInView={{ scale: [0, 1] }}
                      whileHover={{ scale: [1, 0.9] }}
                      transition={{ duration: 0.25 }}
                      className="app__flex"
                    >
                      <AiFillEye />
                    </motion.div>
                  </motion.div>
                </div>

                <div className="app__blog-content app__flex">
                  <h4 className="bold-text">{blog.title}</h4>
                  <p className="p-text" style={{ marginTop: 10 }}>
                    {blog.excerpt}
                  </p>

                  <div className="app__blog-tag app__flex">
                    <p className="p-text">{blog.tags[0]}</p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </motion.div>

        <div className="app__blog-btn app__flex">
          <Link href="/blog">
            <button>Read More</button>
          </Link>
        </div>
      </>
    </React.Suspense>
  );
};

export default AppWrap(MotionWrap(Blog, "app__blogs"), "blog", "app__whitebg");