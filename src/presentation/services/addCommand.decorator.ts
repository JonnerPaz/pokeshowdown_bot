export function addCommand(method: any, context: ClassMethodDecoratorContext) {
  if (context.kind !== "method") {
    throw new Error("addCommand decorator can only be used on methods");
  }

  context.addInitializer(function (this: any) {
    if (!this.botCommands) {
      this.botCommands = new Map<string, Function>();
    }
    const commandName = context.name.toString().toLowerCase();
    this.botCommands.set(commandName, method.bind(this));
  });
}
