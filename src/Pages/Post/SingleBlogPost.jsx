import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { client } from "../../client";
import imageUrlBuilder from "@sanity/image-url";
import BlockContent from "@sanity/block-content-to-react";
import { SlCalender } from "react-icons/sl";
import { AiOutlineMail } from "react-icons/ai";
import {
  EmailShareButton,
  FacebookShareButton,
  LinkedinShareButton,
  RedditShareButton,
  TelegramShareButton,
  TwitterShareButton,
  WhatsappShareButton,
} from "react-share";
import {
  FacebookShareCount,
  HatenaShareCount,
  OKShareCount,
  PinterestShareCount,
  RedditShareCount,
  TumblrShareCount,
  VKShareCount,
} from "react-share";
import "./SingleBlogPost.scss";

const builder = imageUrlBuilder(client);
// eslint-disable-next-line no-unused-vars
function urlFor(source) {
  return builder.image(source);
}

export default function SingleBlogPost() {
  const [singleBlogPost, setSingalBlogPost] = useState(null);
  const { postLink } = useParams();

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
          <div className="app__post-date">
            <div className="app__post-date">
              <SlCalender />
            </div>
            <h3>{singleBlogPost.date}</h3>
          </div>
          <div className="app__post-share">
            <FacebookShareCount >
              {(shareCount) => (
                <span className="myShareCountWrapper">{shareCount}</span>
              )}
            </FacebookShareCount>{" "}
          </div>
          <BlockContent
            className="app__post-content"
            blocks={singleBlogPost.content}
          />
        </div>
      </div>
    </>
  );
}
