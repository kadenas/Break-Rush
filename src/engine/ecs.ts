export interface Entity {
  update(dt: number): void;
  render(alpha: number): void;
  active: boolean;
}

export class EntityPool<T extends Entity> {
  private entities: T[] = [];

  add(entity: T): void {
    this.entities.push(entity);
  }

  update(dt: number): void {
    this.entities.forEach((entity) => {
      if (entity.active) {
        entity.update(dt);
      }
    });
    this.entities = this.entities.filter((entity) => entity.active);
  }

  render(alpha: number): void {
    this.entities.forEach((entity) => {
      if (entity.active) {
        entity.render(alpha);
      }
    });
  }

  clear(): void {
    this.entities = [];
  }

  get all(): readonly T[] {
    return this.entities;
  }
}
