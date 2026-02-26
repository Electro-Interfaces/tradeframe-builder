/**
 * Утилита для санитизации HTML через DOMPurify
 * Защищает от XSS при использовании dangerouslySetInnerHTML
 */
import DOMPurify from 'dompurify';

/**
 * Очищает HTML от XSS-опасных элементов
 * Разрешает безопасные теги: форматирование, списки, таблицы, ссылки
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'blockquote', 'pre', 'code',
      'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'sub', 'sup', 'small',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
      'a', 'img', 'figure', 'figcaption',
      'div', 'span', 'section', 'article', 'header', 'footer', 'nav', 'aside',
      'details', 'summary',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height',
      'class', 'id', 'style', 'colspan', 'rowspan', 'scope',
    ],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Возвращает объект для dangerouslySetInnerHTML с санитизацией
 */
export function createSafeHtml(dirty: string): { __html: string } {
  return { __html: sanitizeHtml(dirty) };
}
