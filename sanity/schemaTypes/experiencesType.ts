import {CaseIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const experiencesType = defineType({
    name: 'experiences',
    title: 'Experiences',
    type: 'document',
    icon: CaseIcon,
    fields:[
        defineField({
            name: 'year',
            type: 'string'
        }),
        defineField({
            name: 'works',
            type: 'array',
            of: [
                defineArrayMember({
                    name: 'workExperience',
                    type: "document",
                    fields:[
                        defineField({
                            name: 'name',
                            type: 'string'
                        }),
                        defineField({
                            name: 'company',
                            type: 'string'
                        }),
                        defineField({
                            name: 'copmanyLogo',
                            type: 'image',
                            options: {
                                hotspot: true
                            },
                        }),
                        defineField({
                            name: 'desc',
                            type:'string'
                        })
                    ]
                })
            ]
        })
    ]
})