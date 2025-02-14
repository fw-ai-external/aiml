import { Hover, MarkdownString, Position } from "vscode";
import { BaseLanguageClient } from "vscode-languageclient";
import { TextDocument } from "vscode-languageserver-textdocument";

export class HoverController {
  constructor(private client: BaseLanguageClient) {}

  public async getHover(doc: TextDocument, pos: Position) {
    const hoverResponse: any = await this.client.sendRequest(
      "scxml.hoverRequest",
      {
        url: doc.uri.toString(),
        position: doc.offsetAt(pos),
      }
    );
    if (!hoverResponse) {
      return null;
    }
    return new Hover(
      <MarkdownString>{
        value: hoverResponse.contents,
        isTrusted: true,
      },
      hoverResponse.range
    );
  }
}
