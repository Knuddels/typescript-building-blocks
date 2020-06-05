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
I have {fmtNum {numCats}} cats.
```

### Number: Percent

Message Syntax:

```
Almost {pctBlack, number, percent} of them are black.
```

Format Syntax:

```
Almost {fmtNum {pctBlack} style: percent} of them are black.
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
{mapString {gender} {
    male: <He>
    female: <She>
    other: <They>
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
{mapStr {taxableArea} {
    yes: <An additional {fmtNum {taxRate} style: percent} tax will be collected.>
    other: <No taxes apply.>
}}
```

## Markup

Format Syntax:

```
Click {linkHere <here>} to get your {bold {italic <item>}}.
```

## Escaping

Format Syntax:

```
This is a {bold <ident<string, this is bold and \ident\:{italic <italic>}>ident>}.
```

## Grammar

See [here](https://github.com/hediet/geml/blob/36220b0f4db8177845ba3b231c599759b321f670/README.md), production `MultilineString`.
