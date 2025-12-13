/**
 * @description - This decorator is used to add a conversation to the bot
 */
export function conversation(
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
