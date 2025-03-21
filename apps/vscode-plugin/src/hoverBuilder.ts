import type { Range } from 'vscode-languageserver';

export class HoverBuilder {
  public static createPopup(range: Range, word: string, value: string): any {
    const builder = new HoverBuilder();
    return builder.createPopup(range, word, value);
  }

  private createPopup(range: Range, word: string, value: string): any {
    return {
      range: range,
      contents: value,
    };
  }
}
