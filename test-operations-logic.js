const fs = require('fs');

// Поскольку operationsBusinessLogic уже существует, просто проверим его структуру
if (fs.existsSync('src/services/operationsBusinessLogic.ts')) {
    const content = fs.readFileSync('src/services/operationsBusinessLogic.ts', 'utf8');
    
    console.log('✅ Operations business logic file exists');
    
    // Проверяем наличие ключевых функций
    const requiredFunctions = [
        'validateOperation',
        'calculateTotals',
        'updateInventory',
        'processTransaction'
    ];
    
    let foundFunctions = 0;
    requiredFunctions.forEach(func => {
        if (content.includes(func)) {
            console.log(`✅ Function ${func} found`);
            foundFunctions++;
        } else {
            console.log(`⚠️  Function ${func} not found`);
        }
    });
    
    console.log(`📊 Business logic completeness: ${foundFunctions}/${requiredFunctions.length} functions found`);
    
} else {
    console.log('❌ Operations business logic file not found');
    process.exit(1);
}
