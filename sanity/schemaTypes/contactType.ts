import { AddCommentIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const contactType = defineType({
    name: 'contact',
    title: 'Contact',
    type: 'document',
    icon: AddCommentIcon,
    fields:[
        defineField({
            name: 'name',
            type: 'string'
        }),
        defineField({
            name: 'email',
            type: 'string'
        }),
        defineField({
            name: 'message',
            type: 'text'
        })
    ]
})