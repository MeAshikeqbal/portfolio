import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { client } from "../../client";
import imageUrlBuilder from "@sanity/image-url";
import BlockContent from "@sanity/block-content-to-react";
import { SlCalender } from "react-icons/sl";
import "./SingleBlogPost.scss";


const builder = imageUrlBuilder(client);
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
        <BlockContent
          className="app__post-content"
          blocks={singleBlogPost.content}
        />
      </div>
    </div>
  );
}
