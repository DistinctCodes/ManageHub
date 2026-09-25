/**
 * Creates a lazy object proxy for a synchronous factory.
 *
 * Nest providers must resolve to a value while the application is starting,
 * but constructing a network/SDK client at that point makes module
 * initialization depend on the client's own availability. This proxy keeps
 * the provider's public type and method surface intact while postponing the
 * factory until the first property or prototype access. Its `getPrototypeOf`
 * trap delegates to the real instance so `instanceof` remains useful.
 *
 * The factory is memoized after its first successful call. If it throws,
 * the same error is retained and rethrown on every later access rather than
 * silently retrying a broken or unavailable client. The factory is expected
 * to return a non-null object; callers that support a disabled feature should
 * return `null` before calling this helper, as the Soroban providers do.
 */
export function createLazy<T extends object>(factory: () => T): T {
  let initialized = false;
  let instance!: T;
  let initializationError: unknown;
  let failed = false;

  const initialize = (): T => {
    if (failed) {
      throw initializationError;
    }
    if (!initialized) {
      initialized = true;
      try {
        instance = factory();
      } catch (error) {
        failed = true;
        initializationError = error;
        throw error;
      }
    }
    return instance;
  };

  return new Proxy(Object.create(null) as T, {
    get: (_target, property) => {
      const resolved = initialize();
      const value = Reflect.get(resolved as object, property, resolved);
      return typeof value === 'function' ? value.bind(resolved) : value;
    },
    set: (_target, property, value) => {
      const resolved = initialize();
      return Reflect.set(resolved as object, property, value, resolved);
    },
    has: (_target, property) => Reflect.has(initialize() as object, property),
    deleteProperty: (_target, property) =>
      Reflect.deleteProperty(initialize() as object, property),
    getPrototypeOf: () => Reflect.getPrototypeOf(initialize() as object),
  });
}
