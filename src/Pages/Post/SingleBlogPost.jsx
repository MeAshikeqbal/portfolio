import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { client } from "../../client";
import imageUrlBuilder from "@sanity/image-url";
import BlockContent from "@sanity/block-content-to-react";
import { SlCalender } from "react-icons/sl";
import { BsFacebook } from "react-icons/bs";
import { FaFacebookMessenger, FaTwitter } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { motion, useScroll } from "framer-motion";
import {
  EmailShareButton,
  FacebookShareButton,
  FacebookMessengerShareButton,
  TwitterShareButton,
} from "react-share";
import moment from "moment";
import "./SingleBlogPost.scss";

const builder = imageUrlBuilder(client);
// eslint-disable-next-line no-unused-vars
function urlFor(source) {
  return builder.image(source);
}

export default function SingleBlogPost() {
  const [singleBlogPost, setSingalBlogPost] = useState(null);
  const { postLink } = useParams();
  const { scrollYProgress } = useScroll();
  const url = window.location.href;

  useEffect(() => {
    client
      .fetch(
        `*[postLink.current == "${postLink}"] {
            title,
            date,
            excerpt,
            postLink,
            imgUrl {
              asset-> {
                _id,
                url
              }
            },
            tags,
            content,
          }`
      )
      .then((data) => setSingalBlogPost(data[0]))
      .catch(console.error);
  }, [postLink]);

  if (!singleBlogPost) return <div>Loading...</div>;

  return (
    <>
      <head>
        <title>{singleBlogPost.title}</title>
        <meta name={singleBlogPost.title} content={singleBlogPost.excerpt} />
      </head>
      <div className="app__post-page">
        <div className="app__post">
          <div className="app__post-img">
            <img
              src={singleBlogPost.imgUrl.asset.url}
              alt={singleBlogPost.title}
            />
          </div>
          <div className="app__post-title">
            <h1>{singleBlogPost.title}</h1>
          </div>
          <div className="app__post-shere">
            <FacebookShareButton url={url}>
              <BsFacebook />
            </FacebookShareButton>
            <FacebookMessengerShareButton url={url}>
              <FaFacebookMessenger />
            </FacebookMessengerShareButton>
            <TwitterShareButton url={url}>
              <FaTwitter />
            </TwitterShareButton>
            <EmailShareButton url={url}>
              <MdEmail />
            </EmailShareButton>
          </div>
          <div className="app__post-tags">
            <h3>Topic:</h3>
            {singleBlogPost.tags.map((tag) => (
              <h3 key={tag}>{tag}</h3>
            ))}
          </div>
          <div className="app__post-date">
            <div className="app__post-date">
              <SlCalender />
            </div>
            <moment>
              {moment(singleBlogPost.date).format("MMM Do YYYY")}
            </moment>
          </div>
          <BlockContent
            className="app__post-content"
            blocks={singleBlogPost.content}
          />
        </div>
        <motion.div
          className="progress-bar"
          style={{ scaleX: scrollYProgress }}
        />
      </div>
    </>
  );
}
