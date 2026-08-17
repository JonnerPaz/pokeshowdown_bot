// eslint-disable-next-line @typescript-eslint/no-explicit-any -- decorator plumbing needs dynamic method types
export function addCommand(method: any, context: ClassMethodDecoratorContext) {
  if (context.kind !== "method") {
    throw new Error("addCommand decorator can only be used on methods");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- decorator plumbing needs dynamic this binding
  context.addInitializer(function (this: any) {
    if (!this.botCommands) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- dynamic command registry
      this.botCommands = new Map<string, Function>();
    }
    const commandName = context.name.toString().toLowerCase();
    this.botCommands.set(commandName, method.bind(this));
  });
}
