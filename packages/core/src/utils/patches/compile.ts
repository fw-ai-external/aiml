// <r:p1s1> quick brown fox => quick fox
// <r:p1s2> quick cat => swift cat
// <r:p2s1> fast => quick
// <d:p2s1>
// <a:p2> The car is blue.

const prefixGenericPattern = /^<([rad]):p(\d+)(s(\d+))?>/;
const replacementPattern = /^<r:p(\d+)s(\d+)> (.+) => (.+)$/;
const deleteLinePattern = /^<d:p(\d+)>$/;
const deleteSentencePattern = /^<d:p(\d+)s(\d+)>$/;
const afterLinePattern = /^<a:p(\d+)> (.+)$/;

export type Replacement = {
  type: "replace";
  lineIndex: number;
  sentenceIndex: number;
  pattern: string;
  replacementText: string;
};

export type DeleteLine = {
  type: "deleteLine";
  lineIndex: number;
};

export type DeleteSentence = {
  type: "deleteSentence";
  lineIndex: number;
  sentenceIndex: number;
};

export type AfterLine = {
  type: "afterLine";
  lineIndex: number;
  text: string;
};

export type Patch = Replacement | DeleteLine | DeleteSentence | AfterLine;

export function compilePatches(patches: string) {
  const allReplacements = patches
    .split("\n")
    .filter((a) => a.match(prefixGenericPattern));

  return allReplacements
    .map((patch) => {
      if (patch.match(replacementPattern)) {
        const [, lineIndex, sentenceIndex, pattern, replacementText] =
          patch.match(replacementPattern)!;
        return {
          type: "replace",
          lineIndex: parseInt(lineIndex || "0"),
          sentenceIndex: parseInt(sentenceIndex || "0"),
          pattern,
          replacementText,
        } as Replacement;
      } else if (patch.match(deleteLinePattern)) {
        const [, lineIndex] = patch.match(deleteLinePattern)!;
        return {
          type: "deleteLine",
          lineIndex: parseInt(lineIndex || "0"),
        } as DeleteLine;
      } else if (patch.match(deleteSentencePattern)) {
        const [, lineIndex, sentenceIndex] = patch.match(
          deleteSentencePattern
        )!;
        return {
          type: "deleteSentence",
          lineIndex: parseInt(lineIndex || "0"),
          sentenceIndex: parseInt(sentenceIndex || "0"),
        } as DeleteSentence;
      } else if (patch.match(afterLinePattern)) {
        const [, lineIndex, text] = patch.match(afterLinePattern)!;
        return {
          type: "afterLine",
          lineIndex: parseInt(lineIndex || "0"),
          text,
        } as AfterLine;
      }

      return null;
    })
    .filter(Boolean) as Patch[];
}
