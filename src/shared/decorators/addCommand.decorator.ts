export function addCommand(
  target: any,
  key: string,
  descriptor: PropertyDescriptor
) {
  const constructor = target.constructor

  if (!constructor._controllerMethods) {
    constructor._controllerMethods = new Set()
  }

  constructor._controllerMethods.add(key)

  return descriptor
}
