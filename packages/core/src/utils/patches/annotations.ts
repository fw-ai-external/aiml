import sentensize from "@stdlib/nlp-sentencize";

export function generateAnnotatedTextMap(text: string) {
  const map: Map<number, Map<number, string>> = new Map();

  text.split("\n").forEach((line, index) => {
    sentensize(line).forEach((sentence: string, sentenceIndex: number) => {
      if (!map.has(index + 1)) {
        map.set(index + 1, new Map());
      }

      map.get(index + 1)!.set(sentenceIndex + 1, sentence);
    });
  });

  return map;
}

export function generateAnnotatedText(text: string) {
  return text
    .split("\n")
    .flatMap((line, index) => {
      return sentensize(line).map((sentence: string, sentenceIndex: number) => {
        return `[[p${index + 1}s${sentenceIndex + 1}]]: ${sentence}`;
      });
    })
    .join("\n");
}
