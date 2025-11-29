export function addCommand(
  target: any,
  key: string,
  descriptor: PropertyDescriptor,
) {
  const constructor = target.constructor;

  if (!constructor._loopableMethods) {
    constructor._loopableMethods = new Set();
  }

  constructor._loopableMethods.add(key);

  return descriptor;
}
