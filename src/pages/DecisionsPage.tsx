import { Link } from "react-router";
import decisions from "../../DECISIONS.md?raw";

interface Block {
  type: "title" | "heading" | "paragraph";
  text: string;
}

function blocks(markdown: string): Block[] {
  const result: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) {
      result.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };

  for (const line of markdown.split("\n")) {
    if (line.startsWith("# ")) {
      flush();
      result.push({ type: "title", text: line.slice(2) });
    } else if (line.startsWith("## ")) {
      flush();
      result.push({ type: "heading", text: line.slice(3) });
    } else if (line.trim() === "") {
      flush();
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return result;
}

function linkedText(text: string) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return parts.map((part) =>
    part.startsWith("http") ? (
      <a key={part} href={part.replace(/[.,]$/, "")} rel="noreferrer" target="_blank">
        {part.replace(/[.,]$/, "")}
      </a>
    ) : (
      part
    ),
  );
}

export function DecisionsPage() {
  return (
    <main className="page-shell decisions-shell">
      <Link className="back-link" to="/">
        ← Sākums
      </Link>
      <article className="decisions-document">
        {blocks(decisions).map((block) => {
          if (block.type === "title") return <h1 key={block.text}>{block.text}</h1>;
          if (block.type === "heading") return <h2 key={block.text}>{block.text}</h2>;
          return <p key={`${block.type}-${block.text}`}>{linkedText(block.text)}</p>;
        })}
      </article>
    </main>
  );
}
