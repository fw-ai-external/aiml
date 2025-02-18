export const CLOSE_ELEMENT_SYMBOL = "◪◪";
export const CLOSE_ELEMENT_SYMBOL_PATTERN = /◪◪/g;

// https://regex101.com/r/T0QMif/1
export const SINGLE_COMPONENT_REGEX =
  /<([A-Z][a-zA-Z_]*)(\s*(?:(?:'[^']*'|"[^"]*"|[^'">])*)\/>)|<([A-Z][a-z_]*)\b([^>]*)>*(?:>([\s\S]*?)<\/\3>|\s?\/?>)/gm;
// https://regex101.com/r/rK6kVF/1
export const COMPONENT_REGEX =
  /<([A-Z][a-zA-Z_]*)(\s*(:?(?:'[^']*'|"[^"]*"|[^'">])*)\/>)(\s*(:?(?:'[^']*'|"[^"]*"|[^'">])*)\/>)?|<([A-Z][a-z-zA-Z__]*)\b([^>]*)>*(?:>([\s\S]*?)<\/\6>|\s?\/?>)/gm;

export const TRAILING_CLOSE = /\/>$/;

interface Component {
  index?: number;
  name: string;
  propsRaw: string;
  children?: string;
  match: string;
}

export function findComponent(block: string): Component | undefined {
  let matches: RegExpExecArray | null;
  let component: Component | undefined;
  while ((matches = SINGLE_COMPONENT_REGEX.exec(block)) !== null) {
    if (matches.index === SINGLE_COMPONENT_REGEX.lastIndex) {
      SINGLE_COMPONENT_REGEX.lastIndex++; // avoid infinite loops with zero-width matches
    }
    const [_match, name, body, otherName, props, children] = matches;
    component = {
      name: name!,
      propsRaw: body.replace(TRAILING_CLOSE, ""),
      match: _match,
    };
  }
  return component;
}

export function findComponents(block: string): Component[] {
  let matches: RegExpExecArray | null;
  const components: Component[] = [];
  while ((matches = COMPONENT_REGEX.exec(block)) !== null) {
    if (matches.index === COMPONENT_REGEX.lastIndex) {
      COMPONENT_REGEX.lastIndex++; // avoid infinite loops with zero-width matches
    }

    const [
      _match,
      name,
      bodyToSelfCloseTag,
      x,
      y,
      rest,
      nameWithChildren,
      props,
      children,
    ] = matches;

    /* Count instances of components */
    const componentCount = _match.match(SINGLE_COMPONENT_REGEX);

    if (!componentCount || !componentCount.length) {
      continue;
    }

    if (componentCount.length === 1) {
      if (nameWithChildren) {
        components.push({
          index: matches.index,
          name: nameWithChildren,
          propsRaw: props,
          children,
          match: _match,
        });
        continue;
      }

      const text = bodyToSelfCloseTag
        ? `<${name}${bodyToSelfCloseTag}`
        : _match;

      const restContent = bodyToSelfCloseTag + (rest || "");
      const propsRaw = restContent.replace(TRAILING_CLOSE, "");

      components.push({
        index: matches.index,
        name: name!,
        propsRaw,
        match: text,
      });
      continue;
    }

    /* Original regex match caught too many elements. fix it */
    for (let count = 0; count < componentCount.length; count++) {
      const element = componentCount[count];
      const inner = findComponent(element);
      if (inner) {
        components.push(inner);
      }
    }
  }

  return components;
}
