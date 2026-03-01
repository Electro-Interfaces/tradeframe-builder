import { describe, it, expect } from 'vitest';
import { utf8ToBase64, base64ToUtf8, jsonToBase64, base64ToJson } from '../base64';

// =============================================================================
// utf8ToBase64 / base64ToUtf8 — round-trip
// =============================================================================
describe('utf8ToBase64 / base64ToUtf8', () => {
  it('ASCII строка', () => {
    const input = 'Hello World';
    expect(base64ToUtf8(utf8ToBase64(input))).toBe(input);
  });

  it('кириллица "Привет мир"', () => {
    const input = 'Привет мир';
    expect(base64ToUtf8(utf8ToBase64(input))).toBe(input);
  });

  it('emoji', () => {
    const input = '🔥🚀💡';
    expect(base64ToUtf8(utf8ToBase64(input))).toBe(input);
  });

  it('спецсимволы', () => {
    const input = '<script>alert("XSS")</script>&amp;\n\t';
    expect(base64ToUtf8(utf8ToBase64(input))).toBe(input);
  });

  it('пустая строка', () => {
    expect(base64ToUtf8(utf8ToBase64(''))).toBe('');
  });

  it('длинная строка (1000 символов)', () => {
    const input = 'A'.repeat(1000);
    expect(base64ToUtf8(utf8ToBase64(input))).toBe(input);
  });
});

// =============================================================================
// jsonToBase64 / base64ToJson
// =============================================================================
describe('jsonToBase64 / base64ToJson', () => {
  it('простой объект', () => {
    const obj = { key: 'value', num: 42 };
    expect(base64ToJson(jsonToBase64(obj))).toEqual(obj);
  });

  it('массив', () => {
    const arr = [1, 2, 3, 'test'];
    expect(base64ToJson(jsonToBase64(arr))).toEqual(arr);
  });

  it('вложенные объекты', () => {
    const obj = { a: { b: { c: [1, 2] } } };
    expect(base64ToJson(jsonToBase64(obj))).toEqual(obj);
  });

  it('null', () => {
    expect(base64ToJson(jsonToBase64(null))).toBeNull();
  });

  it('кириллица в значениях', () => {
    const obj = { name: 'Андрей', city: 'Москва' };
    expect(base64ToJson(jsonToBase64(obj))).toEqual(obj);
  });

  it('boolean и числа', () => {
    const obj = { active: true, count: 0, negative: -5.5 };
    expect(base64ToJson(jsonToBase64(obj))).toEqual(obj);
  });
});
