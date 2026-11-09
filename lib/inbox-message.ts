/**
 * Builds the Sanity document for a contact-form message, stored in the private inbox dataset.
 * Kept free of I/O so it can be unit-tested.
 */
export interface ContactSubmission {
  name: string
  email: string
  message: string
}

export interface MessageDocument extends ContactSubmission {
  _id: string
  _type: "message"
  status: "unread"
  receivedAt: string
}

export function buildMessageDocument(
  submission: ContactSubmission,
  { id, now = new Date() }: { id: string; now?: Date },
): MessageDocument {
  return {
    _id: id,
    _type: "message",
    status: "unread",
    receivedAt: now.toISOString(),
    name: submission.name,
    email: submission.email,
    message: submission.message,
  }
}
