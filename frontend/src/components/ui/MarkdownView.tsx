"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface Props {
  content: string;
}

export default function MarkdownView({ content }: Props) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div>
      <div className="flex-between mb-2">
        <span className="text-sm text-muted">{content.length}자</span>
        <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
          복사
        </button>
      </div>
      <div className="md-content card">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
