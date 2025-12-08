const serviceRegistry = new Map<string, any>()

export function registerService<T>(token: string | Function, service: T): void {
  // saves the name of the service as a string,
  // be like a token itself or func name
  const key = typeof token === 'string' ? token : token.name
  serviceRegistry.set(key, service)
}

export function getService<T>(token: string | Function): T {
  const key = typeof token === 'string' ? token : token.name
  const service = serviceRegistry.get(key)

  if (!service) {
    throw new Error(`Service ${key} not found`)
  }

  return service
}

/**
 * @param token - Will be the name of the service to inject
 * @description - When used as a decorator, it will inject the service. Must be
 * on top of the class. target param is the class, propertyKey is the property
 */
export function Inject(token?: string | Function): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    // "desing:type" is the type of the property. eg. "string" or DatabaseService
    const propertyType = Reflect.getMetadata('design:type', target, propertyKey)
    const serviceToken = token || propertyType

    // define getter that lazy-loads the service
    // service only fetched when needed
    Object.defineProperty(target, propertyKey, {
      get() {
        const service = getService(serviceToken)

        // If it's a class, bind methods:
        if (typeof service === 'object' && service !== null) {
          return service
        }

        return service
      },
      enumerable: true,
      configurable: true,
    })
  }
}

// export function Injectable(): ClassDecorator {
//   return function (constructor: Function) {
//     return constructor
//   }
// }
