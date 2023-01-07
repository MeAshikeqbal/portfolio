import sanityClient from '@sanity/client'
import sanityUrlBuilder from '@sanity/image-url'


export const client = sanityClient({
    projectId: process.env.REACT_APP__SANITY_PROJECT_ID,
    dataset: 'production',
    useCdn: true,
    apiVersion: '2022-02-01',
    token: process.env.REACT_APP__SANITY_TOKEN,
    ignoreBrowserTokenWarning: true
})

const builder = sanityUrlBuilder(client)

export const urlFor = (source) => {
    return builder.image(source)
}