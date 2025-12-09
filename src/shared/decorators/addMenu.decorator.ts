export function addMenu(
  target: any,
  key: string,
  descriptor: PropertyDescriptor
) {
  const constructor = target.constructor

  if (!constructor._menus) {
    constructor._menus = new Set()
  }

  constructor._menus.add(key)

  return descriptor
}
