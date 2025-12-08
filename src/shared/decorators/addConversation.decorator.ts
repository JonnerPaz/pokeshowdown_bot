export function addConversation(
  target: any,
  key: string,
  descriptor: PropertyDescriptor
) {
  const constructor = target.constructor

  if (!constructor._conversations) {
    constructor._conversations = new Set()
  }

  constructor._conversations.add(key)

  return descriptor
}
