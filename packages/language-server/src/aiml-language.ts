import type { CodeMapping, LanguagePlugin, VirtualCode } from '@volar/language-core';
import type { IScriptSnapshot } from 'typescript';

export const language = {
  createVirtualCode(fileId, languageId, snapshot) {
    if (languageId !== 'aiml') return;

    return new AimlLanguageVirtualCode(snapshot);
  },
  updateVirtualCode(_fileId, languageCode: AimlLanguageVirtualCode, snapshot) {
    languageCode.update(snapshot);
    return languageCode;
  },
  getLanguageId(scriptId: any) {
    return 'aiml';
  },
} satisfies LanguagePlugin<AimlLanguageVirtualCode>;

export class AimlLanguageVirtualCode implements VirtualCode {
  id = 'root';
  languageId = 'aiml';
  mappings = [];
  embeddedCodes: VirtualCode[] = [];

  constructor(public snapshot: IScriptSnapshot) {
    this.onSnapshotUpdated();
  }

  public update(newSnapshot: IScriptSnapshot) {
    this.snapshot = newSnapshot;
    this.onSnapshotUpdated();
  }

  onSnapshotUpdated() {
    const snapshotContent = this.snapshot.getText(0, this.snapshot.getLength());

    // Find embedded languages
    const embeddedLanguages = _findEmbeddedLanguages(snapshotContent);

    // Create virtual code objects for embedded languages
    this.embeddedCodes = embeddedLanguages.map((embeddedLanguage) => {
      return {
        id: embeddedLanguage.id,
        languageId: embeddedLanguage.languageId,
        mappings: [],
        snapshot: {
          getText: (start, end) => embeddedLanguage.content.substring(start, end),
          getLength: () => embeddedLanguage.content.length,
          getChangeRange: () => undefined,
        },
      };
    });
  }
}

function _findEmbeddedLanguages(content: string): {
  id: string;
  languageId: string;
  content: string;
  mappings: CodeMapping[];
}[] {
  let template;

  const mappings = [];

  const scriptTagMatches = content.match(/<script[^>]*>/g) || [];

  for (const scriptTagMatch of scriptTagMatches) {
    const scriptTagStart = scriptTagMatch.indexOf(scriptTagMatch) + scriptTagMatch.length;
    const scriptTagEnd = content.lastIndexOf('</script>');
    // get the language attribute from the script tag as language="", and language={''} style onm the matched script tag
    let language = scriptTagMatch.match(/language=["']([^"']+)["']/)?.[1];

    if (!language) {
      language = 'javascript';
    } else if (language !== 'javascript' && language !== 'python') {
      // we only support javascript and python for now
      continue;
    }

    template = content.substring(scriptTagStart, scriptTagEnd);

    mappings.push({
      id: `script-${language}-${scriptTagStart}-${scriptTagEnd}`,
      languageId: language,
      content: template,
      mappings: [
        {
          sourceOffsets: [scriptTagStart],
          lengths: [scriptTagEnd - scriptTagStart],
          generatedOffsets: [0],
          data: {
            completion: true,
            semantic: true,
          },
        },
      ],
    });
  }

  return mappings;
}
