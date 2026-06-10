// Типизация raw-импорта markdown-инструкций (Vite ?raw).
declare module '*.md?raw' {
  const content: string;
  export default content;
}
