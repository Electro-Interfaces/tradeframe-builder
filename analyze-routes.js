import fs from 'fs';

// Читаем App.tsx
const content = fs.readFileSync('src/App.tsx', 'utf8');

// Извлекаем все роуты и соответствующие компоненты
const routeMatches = content.match(/<Route path="([^"]*)" element={<([^}]+) \/>}/g) || [];

console.log('📊 АНАЛИЗ РЕАЛЬНЫХ РАЗДЕЛОВ МЕНЮ ПРИЛОЖЕНИЯ:\n');

const sections = [];

routeMatches.forEach(match => {
  const pathMatch = match.match(/path="([^"]*)"/);
  const componentMatch = match.match(/element={<([^}]+)/);
  
  if (pathMatch && componentMatch) {
    const path = pathMatch[1];
    const component = componentMatch[1].split(' ')[0]; // Убираем props
    
    // Исключаем технические роуты
    if (!path.includes('*') && !path.includes('login') && !path === '/') {
      sections.push({
        path: path,
        component: component,
        category: path.split('/')[1] || 'root'
      });
    }
  }
});

// Группируем по категориям
const categories = {
  admin: { title: '👑 Административные разделы', sections: [] },
  settings: { title: '⚙️ Настройки системы', sections: [] },
  network: { title: '🌐 Сетевые разделы', sections: [] },
  point: { title: '🏪 Торговые точки', sections: [] },
  profile: { title: '👤 Профиль', sections: [] }
};

sections.forEach(section => {
  const category = section.category;
  if (categories[category]) {
    categories[category].sections.push(section);
  } else if (section.path === '/profile') {
    categories.profile.sections.push(section);
  }
});

// Выводим результат
let totalSections = 0;
Object.entries(categories).forEach(([key, category]) => {
  if (category.sections.length > 0) {
    console.log(`${category.title} (${category.sections.length}):`);
    category.sections.forEach((section, i) => {
      console.log(`   ${i + 1}. ${section.path} → ${section.component}`);
      totalSections++;
    });
    console.log('');
  }
});

console.log(`🔢 ИТОГО РАЗДЕЛОВ МЕНЮ: ${totalSections}`);
console.log(`\n📋 СПИСОК ВСЕХ КОМПОНЕНТОВ:`);

const uniqueComponents = [...new Set(sections.map(s => s.component))].sort();
uniqueComponents.forEach((comp, i) => {
  console.log(`${i + 1}. ${comp}`);
});

console.log(`\n🔢 ИТОГО УНИКАЛЬНЫХ КОМПОНЕНТОВ: ${uniqueComponents.length}`);