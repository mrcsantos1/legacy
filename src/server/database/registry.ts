import { DatabaseError } from "./errors";
import type {
  DatabaseAdapter,
  DatabaseProvider,
  AdapterRegistry
} from "./types";

export class DatabaseAdapterRegistry implements AdapterRegistry {
  private readonly adapters = new Map<DatabaseProvider, DatabaseAdapter>();

  getAdapter(provider: DatabaseProvider): DatabaseAdapter {
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new DatabaseError(`No database adapter registered for ${provider}`, 500);
    }

    return adapter;
  }

  register(provider: DatabaseProvider, adapter: DatabaseAdapter): void {
    this.adapters.set(provider, adapter);
  }
}
