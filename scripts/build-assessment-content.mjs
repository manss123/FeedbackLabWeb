// Reproduce the question bank from the PDF column extraction; no answer keys in client assets.
import fs from "node:fs";
const source = JSON.parse(fs.readFileSync("tmp/pdfs/columns.json", "utf8"));
function join(lines) {
  return lines
    .reduce(
      (a, b) =>
        a + (a && !(/[\u0E00-\u0E7F]$/.test(a) && /^[\u0E00-\u0E7F]/.test(b)) ? " " : "") + b,
      "",
    )
    .replace(/\u200b/g, "")
    .trim();
}
const bank = {};
const keys = {};
for (const [phase, prefix] of [
  ["pretest", "pre"],
  ["posttest", "post"],
]) {
  keys[phase] = {};
  bank[phase] = Object.entries(source).map(([id, row]) => {
    const questionLines = row[prefix + "Question"];
    const at = questionLines.findIndex((l) => l.startsWith("1 ="));
    if (at < 0) throw Error("Missing key " + phase + id);
    const order = questionLines
      .slice(at)
      .join(" ")
      .match(/[ABCD]/g);
    if (order?.length !== 4 || new Set(order).size !== 4) throw Error("Bad key " + phase + id);
    keys[phase][id] = Object.fromEntries(order.map((o, i) => [o, i + 1]));
    const choices = [];
    for (const line of row[prefix + "Choices"]) {
      if (/^[ABCD]\. /.test(line)) choices.push({ id: line[0], lines: [line.slice(3)] });
      else {
        if (!choices.length) throw Error("Orphan choice");
        choices.at(-1).lines.push(line);
      }
    }
    if (choices.map((c) => c.id).join("") !== "ABCD") throw Error("Missing choices " + phase + id);
    return {
      id,
      question: join(questionLines.slice(0, at)),
      options: choices.map((c) => ({ id: c.id, label: join(c.lines) })),
    };
  });
  if (bank[phase].length !== 20) throw Error("Expected 20 items");
}
fs.writeFileSync("src/lib/assessment-content.json", JSON.stringify(bank, null, 2) + "\n");
fs.writeFileSync("functions/src/assessment-keys.json", JSON.stringify(keys, null, 2) + "\n");
console.log(
  "Generated 40 questions, 160 options; server-only keys:",
  Object.fromEntries(
    Object.entries(keys).map(([p, k]) => [
      p,
      Object.entries(k)
        .filter(([, v]) => v.C !== 3)
        .map(([id]) => id),
    ]),
  ),
);
