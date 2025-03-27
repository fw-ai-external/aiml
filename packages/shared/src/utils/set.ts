export class ObjectSet<T> extends Set<T> {
  private uniqueField: keyof T;
  constructor(items: T[] = [], uniqueField: keyof T) {
    super(items);
    this.uniqueField = uniqueField;
  }

  add(item: T) {
    const existingItem = Array.from(this.values()).find(
      (i) => i[this.uniqueField] === item[this.uniqueField]
    );
    if (existingItem) {
      return this;
    }
    return super.add(item);
  }
}
