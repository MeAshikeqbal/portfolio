import sanityClient from '@sanity/client'
import sanityUrlBuilder from '@sanity/image-url'


export const client = sanityClient({
    projectId: '0oqq6f9z',
    dataset: 'production',
    useCdn: true,
    apiVersion: '2022-02-01',
    token: 'skzuFc181oMGqLs39r38TnrXb0Xy62tO3nW1qb1j73WoptBTJ0tiApkvi91jHR35HWXowamcr2rToBI7eo9zfqbztFed8XworLrxWp83guDMzd07g5f1JSTni5rZmDgWRCRQOfxwcQTB5sXpINK9ALtmn2ckWOGPDj7zPe22dZLOr1Y0TQGc',
    ignoreBrowserTokenWarning: true
})

const builder = sanityUrlBuilder(client)

export const urlFor = (source) => {
    return builder.image(source)
}