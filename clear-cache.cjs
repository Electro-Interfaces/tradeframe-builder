/**
 * Скрипт для очистки кеша операций в localStorage
 */

console.log('🧹 Очищаем кеш операций...');

// Создаем HTML страницу для очистки кеша в браузере
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Очистка кеша операций</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            background: #1a1a1a;
            color: #fff;
        }
        .status { 
            padding: 10px; 
            margin: 10px 0; 
            border-radius: 5px; 
        }
        .success { background: #4caf50; }
        .info { background: #2196f3; }
        button {
            background: #ff4444;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover { background: #cc3333; }
    </style>
</head>
<body>
    <h1>🧹 Очистка кеша операций</h1>
    
    <div class="status info">
        <strong>Цель:</strong> Загрузить новые транзакции с различными статусами:
        <ul>
            <li>2% ошибочных (failed)</li>
            <li>2% в ожидании (pending)</li> 
            <li>3% выполняется (in_progress)</li>
            <li>2% отменено (cancelled)</li>
        </ul>
    </div>
    
    <button onclick="clearOperationsCache()">Очистить кеш операций</button>
    <button onclick="clearAllCache()">Очистить весь кеш</button>
    
    <div id="result"></div>
    
    <script>
        function clearOperationsCache() {
            try {
                // Очищаем кеш операций
                localStorage.removeItem('tc:operations');
                
                document.getElementById('result').innerHTML = 
                    '<div class="status success">✅ Кеш операций очищен! Обновите страницу приложения.</div>';
                
                console.log('✅ Кеш операций очищен');
            } catch (error) {
                document.getElementById('result').innerHTML = 
                    '<div class="status error">❌ Ошибка: ' + error.message + '</div>';
            }
        }
        
        function clearAllCache() {
            try {
                // Очищаем весь localStorage с префиксом tc:
                const keys = Object.keys(localStorage);
                let cleared = 0;
                
                keys.forEach(key => {
                    if (key.startsWith('tc:')) {
                        localStorage.removeItem(key);
                        cleared++;
                    }
                });
                
                document.getElementById('result').innerHTML = 
                    '<div class="status success">✅ Очищено ' + cleared + ' записей кеша! Обновите страницу приложения.</div>';
                
                console.log('✅ Весь кеш очищен:', cleared, 'записей');
            } catch (error) {
                document.getElementById('result').innerHTML = 
                    '<div class="status error">❌ Ошибка: ' + error.message + '</div>';
            }
        }
        
        // Показываем информацию о текущем кеше
        window.onload = function() {
            const operations = localStorage.getItem('tc:operations');
            if (operations) {
                try {
                    const parsed = JSON.parse(operations);
                    document.getElementById('result').innerHTML = 
                        '<div class="status info">ℹ️ В кеше найдено ' + parsed.length + ' операций</div>';
                } catch (e) {
                    document.getElementById('result').innerHTML = 
                        '<div class="status info">ℹ️ Кеш операций существует, но не является валидным JSON</div>';
                }
            } else {
                document.getElementById('result').innerHTML = 
                    '<div class="status info">ℹ️ Кеш операций пуст</div>';
            }
        };
    </script>
</body>
</html>`;

require('fs').writeFileSync('clear-operations-cache.html', htmlContent, 'utf8');

console.log('✅ Создан файл clear-operations-cache.html');
console.log('📝 Откройте этот файл в браузере для очистки кеша операций');