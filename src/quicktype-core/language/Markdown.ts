import { Type, ArrayType, UnionType, ClassType, EnumType } from "../Type";
import { matchType } from "../TypeUtils";

import { Sourcelike, MultiWord, singleWord, parenIfNeeded } from "../Source";
import { Name } from "../Naming";
import { getOptionValues } from "../RendererOptions";
import { RenderContext } from "../Renderer";
import { TypeScriptFlowBaseTargetLanguage, TypeScriptRenderer, tsFlowOptions } from "./TypeScriptFlow";

export class MarkdownTargetLanguage extends TypeScriptFlowBaseTargetLanguage {
  constructor() {
    super("Markdown", ["md", "markdown"], "md");
  }

  protected makeRenderer(
    renderContext: RenderContext,
    untypedOptionValues: { [name: string]: any }
  ): TypeScriptRenderer {
    if (untypedOptionValues["just-types"] == undefined) {
      untypedOptionValues["just-types"] = true;
    }

    return new MarkdownRenderer(
      this,
      renderContext,
      getOptionValues(tsFlowOptions, untypedOptionValues)
    );
  }
}

export class MarkdownRenderer extends TypeScriptRenderer {
  protected splitDescription(descriptions: Iterable<string> | undefined): string[] | undefined {
    if (descriptions === undefined) return undefined;
    return Array.from(descriptions);
  }

  protected emitUsageComments(): void {
    this.emitLine("<!-- generated by quicktype, do not edit -->");
  }

  private emitTypeHeaderMarkdown(t: Type, name: Name) {
    this.emitLine("<a name='typedef-", name, "'></a>");
    this.emitLine("");
    this.emitLine("## ", name);
    this.emitLine("");
    this.emitDescription(this.descriptionForType(t));
    this.emitLine("");
  }

  private emitClassMarkdown(c: ClassType, className: Name) {
    this.emitTypeHeaderMarkdown(c, className);
    this.emitClassPropertiesMarkdown(c);
  }

  private emitEnumMarkdown(c: EnumType, enumName: Name) {
    this.emitTypeHeaderMarkdown(c, enumName);
    this.emitEnumVariantsMarkdown(c);
  }

  protected sourceFor(t: Type): MultiWord {
    // Change to TS impl: Add cross-references
    if (["class", "object", "enum"].indexOf(t.kind) >= 0) {
      const name = this.nameForNamedType(t);
      return singleWord(["<a href='#typedef-", name, "'>", name, "</a>"]);
    }

    return matchType<MultiWord>(
      t,
      // Those should all just be handled like in ts target
      (_anyType) => super.sourceFor(t),
      (_nullType) => super.sourceFor(t),
      (_boolType) => super.sourceFor(t),
      (_integerType) => super.sourceFor(t),
      (_doubleType) => super.sourceFor(t),
      (_stringType) => super.sourceFor(t),

      // Change to TS impl: HTML-escape Array<...>
      (arrayType) => {
        const itemType = this.sourceFor(arrayType.items);
        if (
          arrayType.items instanceof ArrayType ||
          arrayType.items instanceof UnionType
        ) {
          return singleWord(["Array&lt;", itemType.source, "&gt;"]);
        } else {
          return singleWord([parenIfNeeded(itemType), "[]"]);
        }
      },
      (_classType) => super.sourceFor(t),
      (_mapType) => super.sourceFor(t),
      (_enumType) => super.sourceFor(t),
      (_unionType) => super.sourceFor(t),
      (_transformedStringType) => super.sourceFor(t)
    );
  }

  protected emitClassPropertiesMarkdown(c: ClassType): void {
    this.emitLine("**Properties:**");
    this.emitLine("");

    this.forEachClassProperty(c, "none", (name, jsonName, p) => {
      const t = p.type;
      const description = this.descriptionForClassProperty(c, jsonName);
      this.emitLine(
        "* `",
        name,
        "`",
        p.isOptional ? " (optional)" : "",
        ": <code>",
        this.sourceFor(t).source,
        "</code>"
      );

      if (description !== undefined) {
        this.emitLine("");
        this.indent(() => {
          this.emitDescription(description);
        });
        this.emitLine("");
      }
    });
  }

  protected emitEnumVariantsMarkdown(e: EnumType): void {
    this.emitLine("**Variants:**");
    this.emitLine("");

    this.forEachEnumCase(e, "none", (_name, jsonName) => {
      this.emitLine('* `"', jsonName, '"`');
    });
  }

  protected emitDescription(description: Sourcelike[] | undefined): void {
    if (description === undefined) return;
    for (const descriptionPart of description) {
      this.emitLine(descriptionPart);
    }
  }

  protected emitTypes(): void {
    this.forEachNamedType(
      "leading-and-interposing",
      (c: ClassType, n: Name) => this.emitClassMarkdown(c, n),
      (e, n) => this.emitEnumMarkdown(e, n),
      () => {} // Never emit unions
    );
  }
}
