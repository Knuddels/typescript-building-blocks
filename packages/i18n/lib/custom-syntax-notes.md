# Notes for a custom Syntax

This syntax aims to replace `intl-messageformat`.

## Basic Principles

Message Syntax / Format Syntax:

```
Hello everyone
```

## Simple Argument

Message Syntax / Format Syntax:

```
Hello {who}
```

## Formatted Argument

Message Syntax:

```
I have {numCats, number} cats.
```

Format Syntax:

```
I have {number: numCats} cats.
```

### Number: Percent

Message Syntax:

```
Almost {pctBlack, number, percent} of them are black.
```

Format Syntax:

```
Almost {number: pctBlack, { "style": "percent" }} of them are black.
```

## select Format

Message Syntax:

```
{gender, select,
    male {He}
    female {She}
    other {They}
} will respond shortly.
```

Format Syntax:

```
{mapString: gender, {
    "male": <He>,
    "female": <She>,
    "other": <They>
}} will respond shortly.
```

### Nested

Message Syntax:

```

{taxableArea, select,
    yes {An additional {taxRate, number, percent} tax will be collected.}
    other {No taxes apply.}
}
```

Format Syntax:

```
{mapString: taxableArea, {
    "yes": <An additional {number: taxRate, { "style": "percent" }} tax will be collected.>,
    "other": <No taxes apply.>
}}
```

## Markup

Format Syntax:

```
Click {linkHere: <here>} to get your {bold: <item>}.
```

# Grammar

```
sym S ::= StructuredText.
sym StructuredText ::= (StructuredTextText | StructuredTextValue)*.
sym StructuredTextText ::= (char | "{{" | "}}" | ">>" | "<<")*.
sym StructuredTextValue ::= "{" Value "}".

sym Value ::= Json | NestedStructuredText | FunctionInvocation.
sym NestedStructuredText ::= "<" StructuredText ">".
sym FunctionInvocation ::= Identifier ":" FunctionInvocationArgs.
sym FunctionInvocationArgs ::= ((Value ",")* Value ","?)?


sym Json ::= Object | Array | string | number | "true" | "false" | "null"

sym Object ::= '{' ObjectMembers '}'
sym ObjectMembers ::= ((ObjectMember ",")* ObjectMember ","?)?
sym ObjectMember ::= String ':' Json

sym array ::= '[' elements ']'
sym elements ::= ((Json ",")* Json ","?)?

sym string ::= '"' characters '"'
sym characters ::=  "" | character characters
sym character ::= '0020' . '10ffff' - '"' - '\' | '\' escape
sym escape ::= '"' | '\' | '/' | 'b' | 'f' | 'n' | 'r' | 't' | 'u' hex hex hex hex
sym hex ::= digit | 'A' . 'F' | 'a' . 'f'

sym number ::= integer fraction exponent
sym integer ::= digit | onenine digits | '-' digit | '-' onenine digits
sym digits ::= digit | digit digits
sym digit ::= '0' | onenine
sym onenine ::= '1' .. '9'
sym fraction ::= "" | '.' digits
sym exponent ::= "" | 'E' sign digits | 'e' sign digits
sym sign ::= "" | '+' | '-'

sym ws ::= "" | '0020' ws | '000D' ws | '000A' ws | '0009' ws

```
