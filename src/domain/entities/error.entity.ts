export class ErrorEntity {
  constructor(public readonly message: string) {}

  public dbError(message: string): ErrorEntity {
    return new ErrorEntity(message);
  }
}
