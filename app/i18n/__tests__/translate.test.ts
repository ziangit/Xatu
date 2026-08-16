import { describe, expect, it } from "vitest";
import {
  count,
  englishOf,
  htmlLang,
  joinList,
  readLang,
  translate,
} from "../translate";
import { ZH } from "../zh";

describe("translate", () => {
  it("returns the key itself in English — the key is the copy", () => {
    expect(translate("en", "Open the matchup builder")).toBe(
      "Open the matchup builder",
    );
  });

  it("falls back to readable English when Chinese is missing", () => {
    const missing = "a sentence nobody has translated yet";
    expect(translate("zh", missing)).toBe(missing);
  });

  it("looks up Chinese when it exists", () => {
    expect(translate("zh", "home")).toBe("首页");
  });

  it("strips the disambiguating context from the English fallback", () => {
    // "back" is the nav's leave-this-page and also the two Pokémon behind your
    // leads; they need different Chinese but the same English.
    expect(translate("en", "nav|← back")).toBe("← back");
    expect(translate("en", "slot|back")).toBe("back");
    expect(translate("zh", "nav|← back")).toBe("← 返回");
    expect(translate("zh", "slot|back")).toBe("后备");
  });

  it("substitutes named placeholders", () => {
    expect(translate("en", "open {name}", { name: "Sand" })).toBe("open Sand");
  });

  it("leaves an unknown placeholder visible rather than blanking it", () => {
    // A typo should show up on screen, not silently delete the value.
    expect(translate("en", "open {nmae}", { name: "Sand" })).toBe(
      "open {nmae}",
    );
  });

  it("does not touch braces when no params are given", () => {
    expect(translate("en", "{n} matchups")).toBe("{n} matchups");
  });

  it("accepts numbers as parameters", () => {
    expect(translate("en", "{n} new", { n: 3 })).toBe("3 new");
  });
});

describe("count", () => {
  it("inflects in English", () => {
    expect(count("en", 1, "matchup", "matchups")).toBe("1 matchup");
    expect(count("en", 2, "matchup", "matchups")).toBe("2 matchups");
    expect(count("en", 0, "matchup", "matchups")).toBe("0 matchups");
  });

  it("does not inflect in Chinese — both forms give the same string", () => {
    expect(count("zh", 1, "matchup", "matchups")).toBe("1 个对阵");
    expect(count("zh", 3, "matchup", "matchups")).toBe("3 个对阵");
  });

  it("still inflects correctly when the Chinese entry is missing", () => {
    expect(count("zh", 2, "widget", "widgets")).toBe("2 widgets");
  });
});

describe("joinList", () => {
  it("joins the way each language does", () => {
    expect(joinList("en", ["this browser", "your account"])).toBe(
      "this browser and your account",
    );
    expect(joinList("zh", ["此浏览器", "你的账号"])).toBe("此浏览器、你的账号");
  });

  it("drops empties and returns a lone item unadorned", () => {
    expect(joinList("en", ["this browser", ""])).toBe("this browser");
    expect(joinList("en", [])).toBe("");
  });
});

describe("lang plumbing", () => {
  it("only accepts what we write; anything else is English", () => {
    // The cookie is user-editable, so garbage must not become a locale.
    expect(readLang("zh")).toBe("zh");
    expect(readLang("en")).toBe("en");
    expect(readLang(undefined)).toBe("en");
    expect(readLang("zh-TW; drop table")).toBe("en");
  });

  it("uses a script subtag for <html lang> — it drives font fallback", () => {
    expect(htmlLang("zh")).toBe("zh-Hans");
    expect(htmlLang("en")).toBe("en");
  });
});

describe("the dictionary itself", () => {
  const entries = Object.entries(ZH);
  const placeholders = (s: string) =>
    [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it("has no empty translations", () => {
    for (const [key, value] of entries) {
      expect(value.trim(), `empty translation for "${key}"`).not.toBe("");
    }
  });

  /**
   * The most damaging translation bug there is: a dropped `{n}` silently loses
   * the number, and nothing fails until someone reads a sentence missing its
   * count. Cheap to check, so check every entry.
   */
  it("keeps every placeholder from the English in the Chinese", () => {
    for (const [key, value] of entries) {
      expect(placeholders(value), `placeholders differ for "${key}"`).toEqual(
        placeholders(englishOf(key)),
      );
    }
  });

  it("keeps every numbered slot used by <T>", () => {
    const slots = (s: string) =>
      [...s.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort();
    for (const [key, value] of entries) {
      expect(slots(value), `slots differ for "${key}"`).toEqual(
        slots(englishOf(key)),
      );
    }
  });
});
