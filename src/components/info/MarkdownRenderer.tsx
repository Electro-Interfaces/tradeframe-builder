/**
 * Единый рендер markdown для раздела «Инфо» (часть A; часть B — позже тем же компонентом).
 * react-markdown без rehype-raw → сырой HTML из тела не вставляется (XSS закрыт).
 * Внешние ссылки — target=_blank + rel=noopener noreferrer; таблицы — горизонтальный скролл.
 *
 * Импортируется ТОЛЬКО внутри ленивого InfoCenter — react-markdown/remark уходят в чанк
 * 'info-vendor' (manualChunks в vite.config), не раздувая стартовый бандл PWA.
 */
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  a: (props) => (
    <a href={props.href} target="_blank" rel="noopener noreferrer">
      {props.children}
    </a>
  ),
  table: (props) => (
    <div className="overflow-x-auto">
      <table>{props.children}</table>
    </div>
  ),
  img: (props) => (
    <img
      src={props.src}
      alt={props.alt ?? ''}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="my-5 w-full h-auto rounded-lg border border-border/60 shadow-sm"
    />
  ),
};

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
