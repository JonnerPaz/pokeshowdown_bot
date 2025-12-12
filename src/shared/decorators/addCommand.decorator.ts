export function addCommand(
  target: any,
  key: string,
  descriptor: PropertyDescriptor
) {
  const constructor = target.constructor
  const originalMethod = descriptor.value

  if (!constructor._controllerMethods) {
    constructor._controllerMethods = new Set()
  }

  constructor._controllerMethods.add(key)

  descriptor.value = function (...args: any[]) {
    return originalMethod.apply(this, args)
  }

  return descriptor
}
