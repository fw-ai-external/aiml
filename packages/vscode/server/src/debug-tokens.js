// Debug script to see what tokens are generated
const { TextDocument } = require("vscode-languageserver-textdocument");

// Mock the semantic highlighting function
function createTextDocument(content, uri = "test://test.aiml") {
  return TextDocument.create(uri, "aiml", 1, content);
}

function decodeSemanticTokens(tokens, document) {
  const result = [];
  let line = 0;
  let character = 0;

  for (let i = 0; i < tokens.length; i += 5) {
    const deltaLine = tokens[i];
    const deltaChar = tokens[i + 1];
    const length = tokens[i + 2];
    const tokenType = tokens[i + 3];
    const tokenModifiers = tokens[i + 4];

    line += deltaLine;
    if (deltaLine > 0) {
      character = deltaChar;
    } else {
      character += deltaChar;
    }

    const tokenTypes = [
      "namespace",
      "class",
      "enum",
      "interface",
      "struct",
      "typeParameter",
      "parameter",
      "variable",
      "property",
      "enumMember",
      "event",
      "function",
      "method",
      "macro",
      "keyword",
      "modifier",
      "comment",
      "string",
      "number",
      "regexp",
      "operator",
    ];

    result.push({
      line,
      character,
      length,
      tokenType: tokenTypes[tokenType] || `unknown(${tokenType})`,
      tokenModifiers,
    });
  }

  return result;
}

function getTextAtPosition(document, line, character, length) {
  const start = document.positionAt(document.offsetAt({ line, character }));
  const end = document.positionAt(
    document.offsetAt({ line, character }) + length
  );
  return document.getText({ start, end });
}

// Test the actual function
async function testScriptHighlighting() {
  // Import the actual function from compiled output
  const { extractSemanticTokens } = require("../out/server.js");

  const content = "<script>const x = 42;</script>";
  console.log("Testing content:", content);

  const document = createTextDocument(content);
  const result = await extractSemanticTokens(document);
  const decoded = decodeSemanticTokens(result.data, document);

  console.log("\nAll tokens:");
  decoded.forEach((token, i) => {
    const text = getTextAtPosition(
      document,
      token.line,
      token.character,
      token.length
    );
    console.log(
      `  ${i + 1}: "${text}" (${token.tokenType}) at line ${token.line}, char ${
        token.character
      }`
    );
  });

  console.log("\nLooking for 'const' tokens:");
  const constTokens = decoded.filter((token) => {
    const text = getTextAtPosition(
      document,
      token.line,
      token.character,
      token.length
    );
    return text === "const";
  });
  console.log("Found const tokens:", constTokens.length);
}

testScriptHighlighting().catch(console.error);
