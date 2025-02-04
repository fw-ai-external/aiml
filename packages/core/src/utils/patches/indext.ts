import { generateAnnotatedTextMap } from './annotations';
import { type AfterLine, compilePatches } from './compile';

export function replaceWithString(text: string, searchTerm: string, replaceWith: string) {
  return text.replace(
    searchTerm,
    // `<mark className="bg-purple-100">${replaceWith}</mark>`
    replaceWith,
  );
}

function replaceWithMark(text: string, searchTerm: string, replaceWith: string) {
  return text.replace(searchTerm, `<mark className="bg-purple-100">${replaceWith}</mark>`);
}

export const applyPatches = (text: string, replacements: string, highlightEnabled = false) => {
  const patches = compilePatches(replacements);
  const annotated = generateAnnotatedTextMap(text);

  let result = '';
  patches
    .filter((patch) => patch.type === 'replace' || patch.type === 'deleteLine' || patch.type === 'deleteSentence')
    .forEach((patch) => {
      if (patch.type === 'replace') {
        const { lineIndex, sentenceIndex, pattern, replacementText } = patch;
        const sentence = annotated.get(lineIndex)?.get(sentenceIndex);

        if (sentence) {
          let nextText: string;
          if (highlightEnabled) {
            nextText = replaceWithMark(sentence, pattern, replacementText);
          } else {
            nextText = replaceWithString(sentence, pattern, replacementText);
          }

          annotated.get(lineIndex)!.set(sentenceIndex, nextText);
        }
      } else if (patch.type === 'deleteLine') {
        annotated.delete(patch.lineIndex);
      } else if (patch.type === 'deleteSentence') {
        const line = annotated.get(patch.lineIndex);
        line?.delete(patch.sentenceIndex);
      }
    });

  const maxIndex = Math.max(...Array.from(annotated.keys()));

  const lineAddPatches = patches.filter((patch) => patch.type === 'afterLine') as AfterLine[];

  let index = 1;
  while (index <= maxIndex) {
    if (annotated.has(index)) {
      const sentences = Array.from(annotated.get(index)!.values());
      result += sentences.join(' ') + '\n';
    } else {
      result += '\n';
    }

    if (lineAddPatches.some((patch) => patch.lineIndex === index)) {
      const linePatch = lineAddPatches.filter((patch) => patch.lineIndex === index);
      linePatch.forEach((patch) => {
        result += patch!.text + '\n';
      });
    }
    index += 1;
  }

  return result;
};
