/**
 * Утилита для конвертации Markdown в HTML
 * Используется для генерации PDF версий документов
 */

export function convertMarkdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Заголовки
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Жирный текст
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  
  // Курсив
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  
  // Списки
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  
  // Группируем последовательные элементы списка
  html = html.replace(/(<li>.*?<\/li>\s*)+/gims, (match) => {
    return `<ul>${match}</ul>`;
  });
  
  // Параграфы
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      processedLines.push('');
      continue;
    }
    
    // Пропускаем строки, которые уже являются HTML элементами
    if (line.match(/^<(h[1-6]|ul|li|strong|em)/)) {
      processedLines.push(line);
      inList = line.includes('<ul>') || line.includes('<li>');
      continue;
    }
    
    // Обычный текст оборачиваем в параграфы
    if (!inList) {
      processedLines.push(`<p>${line}</p>`);
    } else {
      processedLines.push(line);
    }
    
    if (line.includes('</ul>')) {
      inList = false;
    }
  }
  
  return processedLines.join('\n');
}

export function createDocumentHtml(
  title: string, 
  content: string, 
  version: string, 
  publishedAt: string
): string {
  const htmlContent = convertMarkdownToHtml(content);
  
  return `
    <!DOCTYPE html>
    <html lang="ru">
      <head>
        <title>${title} v${version}</title>
        <meta charset="utf-8">
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          
          body {
            font-family: 'Times New Roman', 'Liberation Serif', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #3498db;
          }
          
          .document-title {
            font-size: 24px;
            color: #2c3e50;
            margin: 0 0 10px 0;
            font-weight: bold;
          }
          
          .version-info {
            font-size: 14px;
            color: #7f8c8d;
            margin: 0;
          }
          
          h1 {
            color: #2c3e50;
            font-size: 22px;
            margin: 30px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #bdc3c7;
          }
          
          h2 {
            color: #34495e;
            font-size: 18px;
            margin: 25px 0 12px 0;
          }
          
          h3 {
            color: #7f8c8d;
            font-size: 16px;
            margin: 20px 0 10px 0;
          }
          
          p {
            margin: 0 0 12px 0;
            text-align: justify;
            text-indent: 1.5em;
          }
          
          ul {
            margin: 12px 0 12px 20px;
            padding: 0;
          }
          
          li {
            margin-bottom: 6px;
          }
          
          strong {
            font-weight: bold;
            color: #2c3e50;
          }
          
          em {
            font-style: italic;
          }
          
          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #bdc3c7;
            font-size: 12px;
            color: #7f8c8d;
            text-align: center;
          }
          
          .footer p {
            margin: 5px 0;
            text-indent: 0;
          }
          
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            z-index: 1000;
          }
          
          .print-button:hover {
            background: #2980b9;
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">🖨️ Печать / Сохранить как PDF</button>
        
        <div class="header">
          <h1 class="document-title">${title}</h1>
          <p class="version-info">Версия ${version} от ${new Date(publishedAt).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })}</p>
        </div>
        
        <div class="content">
          ${htmlContent}
        </div>
        
        <div class="footer">
          <p><strong>Система управления торговыми сетями TradePoint</strong></p>
          <p>Документ сгенерирован: ${new Date().toLocaleString('ru-RU')}</p>
        </div>
        
        <script>
          // Автоматически открываем диалог печати через 1 секунду после загрузки
          window.addEventListener('load', function() {
            setTimeout(function() {
              // Только если страница была открыта из модального окна (содержит параметр auto=1)
              if (window.location.search.includes('auto=1')) {
                window.print();
              }
            }, 1000);
          });
        </script>
      </body>
    </html>
  `;
}