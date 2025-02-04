export const gbnf = `root ::= (item | comment)*

item ::= ident "::=" expr

comment ::= "#" [^\\n]* "\\n"

expr ::= seq ("|" seq)*

seq ::= (term quant?)+

term ::= ref | string | range | group

ref ::= [a-zA-Z][a-zA-Z0-9]*

string ::= "\\"" ("\\\\" ([\\\\nrt"] | "x" [0-9a-fA-F][0-9a-fA-F] | "u" [0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]) | [^"\\\\])* "\\""

range ::= "[" "^"? ("\\\\" ([\\\\nrt\\[\\]-] | "x" [0-9a-fA-F][0-9a-fA-F]) | [^\\]\\\\-])+ "]"

group ::= "(" expr ")"

quant ::= [*+?] | "{" [0-9]+ ("," [0-9]*)? "}"

ident ::= [a-zA-Z][a-zA-Z0-9]*`;
