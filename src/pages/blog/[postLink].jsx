import React from "react";
import { client } from "../../client";
import imageUrlBuilder from "@sanity/image-url";
import BlockContent from "@sanity/block-content-to-react";
import { SlCalender } from "react-icons/sl";
import { BsFacebook } from "react-icons/bs";
import { FaFacebookMessenger, FaTwitter } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { motion, useViewportScroll } from "framer-motion";
import {
  EmailShareButton,
  FacebookShareButton,
  FacebookMessengerShareButton,
  TwitterShareButton,
} from "react-share";
import moment from "moment";
import Head from "next/head";
import Image from "next/image";

const builder = imageUrlBuilder(client);
// eslint-disable-next-line no-unused-vars
function urlFor(source) {
  return builder.image(source);
}

export default function SingleBlogPost({ singleBlogPost }) {
  const { scrollYProgress } = useViewportScroll();
  const url = typeof window !== 'undefined' ? window.location.href : '';

  if (!singleBlogPost) return <div>Loading...</div>;

  return (
    <>
      <Head>
        <title>{singleBlogPost.title}</title>
        <meta name="title" content={singleBlogPost.title} />
        <meta name="description" content={singleBlogPost.excerpt} />
        <meta name="keywords" content={singleBlogPost.tags} />
        <meta name="author" content={singleBlogPost.author} />
      </Head>
      <div className="app__post-page">
        <div className="app__post">
          <div className="app__post-img">
            <Image
              src={urlFor(singleBlogPost.imgUrl).url()}
              alt={singleBlogPost.title}
              width={1000}
              height={500}
            />
          </div>
          <div className="app__post-title">
            <h1>{singleBlogPost.title}</h1>
          </div>
          <div className="app__post-author">
            <h3>Author: {singleBlogPost.author}</h3>
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
            <SlCalender />
            {moment(singleBlogPost.date).format("MMM Do YYYY")}
          </div>

          {typeof window !== "undefined" && (
            <>
              {" "}
              <BlockContent
                className="app__post-content"
                blocks={singleBlogPost.content}
              />{" "}
              <motion.div
                className="progress-bar"
                style={{ scaleX: scrollYProgress }}
              />{" "}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Fetch data server-side
export async function getServerSideProps(context) {
  const { postLink } = context.query;

  if (!postLink) {
    return {
      notFound: true,
    };
  }

  const data = await client.fetch(
    `*[postLink.current == "${postLink}"] {
          title,
          author,
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
  );

  return {
    props: { singleBlogPost: data[0] || null },
  };
}