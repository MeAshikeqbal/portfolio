import { DocumentTextIcon } from "@sanity/icons";
import { defineType, defineField } from "sanity";

export const educationType = defineType({
    name: 'education',
    title: 'Education',
    type: 'document',
    icon: DocumentTextIcon,
    fields:[
        defineField({
            name: 'year',
            type: 'string'
        }),
        defineField({
            name: 'degree',
            type: 'string'
        }),
        defineField({
            name: 'school',
            type: 'string'
        }),
        defineField({
            name: 'schoolLogo',
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