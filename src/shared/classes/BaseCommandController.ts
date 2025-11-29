import { CommandGroup } from "@grammyjs/commands";
import { CommandsGroupContext } from "../../shared/types";

export abstract class BaseCommandController<
  T extends CommandsGroupContext,
> extends CommandGroup<T> {
  constructor() {
    super();
  }

  async init() {
    const methodNames: string[] = Array.from(
      (this.constructor as any)._loopableMethods || [],
    );
    const methods = methodNames.map((key) => (this as any)[key]());
    this.add(methods);
    return;
  }
}
