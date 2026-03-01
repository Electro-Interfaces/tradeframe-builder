import { describe, it, expect } from 'vitest';
import { sanitizeHtml, createSafeHtml } from '../sanitize';

// =============================================================================
// sanitizeHtml — XSS блокируется
// =============================================================================
describe('sanitizeHtml — XSS', () => {
  it('удаляет <script> теги', () => {
    const result = sanitizeHtml('<script>alert(1)</script>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert');
  });

  it('удаляет onerror handler', () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('удаляет javascript: в href', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('удаляет onclick handler', () => {
    const result = sanitizeHtml('<div onclick="alert(1)">test</div>');
    expect(result).not.toContain('onclick');
  });

  it('удаляет iframe', () => {
    const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
    expect(result).not.toContain('<iframe');
  });

  it('удаляет data- атрибуты (ALLOW_DATA_ATTR = false)', () => {
    const result = sanitizeHtml('<div data-evil="payload">text</div>');
    expect(result).not.toContain('data-evil');
  });
});

// =============================================================================
// sanitizeHtml — разрешённые теги сохраняются
// =============================================================================
describe('sanitizeHtml — allowed tags', () => {
  it('сохраняет <b>bold</b>', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('<b>bold</b>');
  });

  it('сохраняет <strong>, <em>, <i>', () => {
    const html = '<strong>strong</strong><em>em</em><i>i</i>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('сохраняет <a href="https://...">', () => {
    const html = '<a href="https://example.com">link</a>';
    expect(sanitizeHtml(html)).toContain('href="https://example.com"');
  });

  it('сохраняет <table><tr><td>', () => {
    const html = '<table><tr><td>cell</td></tr></table>';
    expect(sanitizeHtml(html)).toContain('<table>');
    expect(sanitizeHtml(html)).toContain('<td>');
  });

  it('сохраняет <ul><li>', () => {
    const html = '<ul><li>item</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('сохраняет <h1>-<h6>', () => {
    expect(sanitizeHtml('<h1>Title</h1>')).toBe('<h1>Title</h1>');
    expect(sanitizeHtml('<h3>Sub</h3>')).toBe('<h3>Sub</h3>');
  });

  it('сохраняет class и id атрибуты', () => {
    const html = '<div class="container" id="main">text</div>';
    const result = sanitizeHtml(html);
    expect(result).toContain('class="container"');
    expect(result).toContain('id="main"');
  });
});

// =============================================================================
// createSafeHtml
// =============================================================================
describe('createSafeHtml', () => {
  it('возвращает объект с __html', () => {
    const result = createSafeHtml('<b>bold</b>');
    expect(result).toHaveProperty('__html');
    expect(result.__html).toBe('<b>bold</b>');
  });

  it('санитизирует XSS в __html', () => {
    const result = createSafeHtml('<script>alert(1)</script><b>ok</b>');
    expect(result.__html).not.toContain('<script');
    expect(result.__html).toContain('<b>ok</b>');
  });
});
