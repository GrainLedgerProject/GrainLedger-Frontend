import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import en from "@/app/i18n/locales/en.json";
import vi from "@/app/i18n/locales/vi.json";
const lookup = (dictionary: object, key: string): unknown =>
  key
    .split(".")
    .reduce<unknown>(
      (value, part) =>
        value && typeof value === "object"
          ? (value as Record<string, unknown>)[part]
          : undefined,
      dictionary,
    );
function files(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : /\.tsx?$/.test(entry.name)
          ? [path.join(dir, entry.name)]
          : [],
    );
}
describe("Translation coverage", () => {
  it("resolves every literal translation key used by the application in both languages", () => {
    const missing: string[] = [];
    for (const filename of files("src")) {
      const source = ts.createSourceFile(
        filename,
        fs.readFileSync(filename, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node: ts.Node) => {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(source) === "t" &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          const key = node.arguments[0].text;
          for (const [lang, dict] of [
            ["en", en],
            ["vi", vi],
          ] as const)
            if (!lookup(dict, key)) missing.push(`${filename}: ${lang}:${key}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(missing).toEqual([]);
  });
  it("preserves interpolation parameters in both languages", () => {
    const walk = (obj: object, prefix = "") => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "object") walk(value, `${prefix}${key}.`);
        else {
          const translated = lookup(vi, `${prefix}${key}`);
          expect(
            String(translated)
              .match(/{{[^}]+}}/g)
              ?.sort() ?? [],
            `${prefix}${key}`,
          ).toEqual(
            String(value)
              .match(/{{[^}]+}}/g)
              ?.sort() ?? [],
          );
        }
      }
    };
    walk(en);
  });
});
