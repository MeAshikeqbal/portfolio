import React, { useState, useEffect } from "react";
import { AiFillEye } from "react-icons/ai";
import { motion } from "framer-motion";
import { AppWrap, MotionWrap } from "../../wrapper";
import { urlFor, client } from "../../client";
import "./Blog.scss";
import { Link } from "react-router-dom";
import { images } from "../../constants";

const BlogPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [filterBlog, setFilterBlog] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [animateCard, setAnimateCard] = useState({ y: 0, opacity: 1 });

  useEffect(() => {
    const query =
      '*[_type == "blogs"]{ title, excerpt, imgUrl, tags, postLink}';

    client.fetch(query).then((data) => {
      setBlogs(data);
      setFilterBlog(data);
    });
  }, []);

  const handleBlogFilter = (item) => {
    setActiveFilter(item);
    setAnimateCard([{ y: 100, opacity: 0 }]);

    setTimeout(() => {
      setAnimateCard([{ y: 0, opacity: 1 }]);

      if (item === "All") {
        setFilterBlog(blogs);
      } else {
        setFilterBlog(blogs.filter((blog) => blog.tags.includes(item)));
      }
    }, 500);
  };

  return (
    <>
      <head>
        <title>Blog</title>
      </head>

      <div className="app__blog">
        <h2 className="app__blog-text head-text">
          My <span>Blog</span>
        </h2>
      </div>

      <div className="app__blog-filter">
        {["Technology", "AI", "Tech Update", "Cyber Security", "All"].map(
          (itemB, indexB) => (
            <div
              key={indexB}
              onClick={() => handleBlogFilter(itemB)}
              className={`app__blog-filter-item app__flex p-text ${
                activeFilter === itemB ? "item-active" : ""
              }`}
            >
              {itemB}
            </div>
          )
        )}
      </div>

      <motion.div
        animate={animateCard}
        transition={{ duration: 0.5, delayChildren: 0.5 }}
        className="app__blog-portfolio"
      >
        {filterBlog.map((blog, index) => (
          <Link to={`/blog/${blog.postLink.current}`}>
            <div className="app__blog-item app__flex" key={index}>
              <div className="app__blog-img app__flex">
                <img src={urlFor(blog.imgUrl)} alt={blog.name} />

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
            </div>
          </Link>
        ))}
      </motion.div>
    </>
  );
};

export default BlogPage;
