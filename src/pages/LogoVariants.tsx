export default function LogoVariants() {
  return (
    <div style={{
      fontFamily: 'system-ui',
      background: '#0f172a',
      color: 'white',
      padding: '40px 20px',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '32px' }}>
          🎨 TradeControl - Варианты логотипов
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px'
        }}>
          {/* Вариант 1: Топливная колонка */}
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#60a5fa' }}>
              1. Топливная колонка
            </div>
            <div style={{
              background: '#334155',
              borderRadius: '12px',
              padding: '40px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '200px'
            }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <rect x="30" y="70" width="40" height="6" rx="2" fill="#3b82f6"/>
                <rect x="33" y="30" width="34" height="40" rx="3" fill="#3b82f6"/>
                <rect x="37" y="37" width="26" height="16" rx="2" fill="#1e293b"/>
                <text x="50" y="48" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold">TF</text>
                <path d="M 67 45 Q 77 45 80 52 L 80 65" stroke="#3b82f6" strokeWidth="3" fill="none"/>
                <circle cx="80" cy="67" r="4" fill="#3b82f6"/>
                <circle cx="40" cy="62" r="2" fill="#60a5fa"/>
                <circle cx="50" cy="62" r="2" fill="#60a5fa"/>
                <circle cx="60" cy="62" r="2" fill="#60a5fa"/>
              </svg>
            </div>
            <div style={{ color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: '16px' }}>
              Классическая топливная колонка с современным дизайном. Прямая ассоциация с АЗС.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Узнаваемость</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>АЗС</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Простота</span>
            </div>
          </div>

          {/* Вариант 2: Сеть */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#60a5fa' }}>
              2. Сеть торговых точек
            </div>
            <div style={{ background: '#334155', borderRadius: '12px', padding: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <line x1="35" y1="35" x2="50" y2="28" stroke="#3b82f6" strokeWidth="2"/>
                <line x1="35" y1="35" x2="28" y2="50" stroke="#3b82f6" strokeWidth="2"/>
                <line x1="50" y1="28" x2="65" y2="35" stroke="#3b82f6" strokeWidth="2"/>
                <line x1="65" y1="35" x2="50" y2="50" stroke="#3b82f6" strokeWidth="2"/>
                <line x1="28" y1="50" x2="50" y2="50" stroke="#3b82f6" strokeWidth="2"/>
                <line x1="50" y1="50" x2="72" y2="50" stroke="#3b82f6" strokeWidth="2"/>
                <line x1="50" y1="50" x2="50" y2="65" stroke="#3b82f6" strokeWidth="2"/>
                <circle cx="35" cy="35" r="6" fill="#3b82f6"/>
                <circle cx="50" cy="28" r="6" fill="#3b82f6"/>
                <circle cx="65" cy="35" r="6" fill="#3b82f6"/>
                <circle cx="28" cy="50" r="6" fill="#3b82f6"/>
                <circle cx="50" cy="50" r="9" fill="#60a5fa"/>
                <circle cx="72" cy="50" r="6" fill="#3b82f6"/>
                <circle cx="50" cy="65" r="6" fill="#3b82f6"/>
              </svg>
            </div>
            <div style={{ color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: '16px' }}>
              Визуализация сети торговых точек. Центральный узел - система управления.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Сеть</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Технологии</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Связь</span>
            </div>
          </div>

          {/* Вариант 3: Капля + График */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#60a5fa' }}>
              3. Капля + Данные
            </div>
            <div style={{ background: '#334155', borderRadius: '12px', padding: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="drop-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#1e40af"/>
                  </linearGradient>
                </defs>
                <path d="M 50 20 C 42 32, 32 42, 32 53 C 32 63, 40 72, 50 72 C 60 72, 68 63, 68 53 C 68 42, 58 32, 50 20 Z"
                      fill="url(#drop-gradient)" stroke="#2563eb" strokeWidth="2"/>
                <path d="M 38 58 L 43 53 L 48 55 L 50 48 L 55 50 L 58 45 L 62 48"
                      stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <circle cx="43" cy="53" r="2" fill="#60a5fa"/>
                <circle cx="48" cy="55" r="2" fill="#60a5fa"/>
                <circle cx="50" cy="48" r="2" fill="#60a5fa"/>
                <circle cx="55" cy="50" r="2" fill="#60a5fa"/>
                <circle cx="58" cy="45" r="2" fill="#60a5fa"/>
                <ellipse cx="45" cy="32" rx="6" ry="9" fill="rgba(255,255,255,0.2)"/>
              </svg>
            </div>
            <div style={{ color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: '16px' }}>
              Капля топлива с графиком аналитики. Объединяет индустрию и данные.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Топливо</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Аналитика</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Инновации</span>
            </div>
          </div>

          {/* Вариант 4: Гексагон */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#60a5fa' }}>
              4. Гексагон Tech
            </div>
            <div style={{ background: '#334155', borderRadius: '12px', padding: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="hex-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#2563eb"/>
                  </linearGradient>
                </defs>
                <path d="M 50 25 L 70 37 L 70 63 L 50 75 L 30 63 L 30 37 Z"
                      fill="url(#hex-gradient)" stroke="#2563eb" strokeWidth="2"/>
                <path d="M 50 33 L 65 42 L 65 58 L 50 67 L 35 58 L 35 42 Z"
                      fill="rgba(30,41,59,0.8)"/>
                <text x="50" y="56" textAnchor="middle" fill="#60a5fa" fontSize="18" fontWeight="bold">TF</text>
                <line x1="30" y1="37" x2="35" y2="42" stroke="#60a5fa" strokeWidth="1.5"/>
                <line x1="70" y1="37" x2="65" y2="42" stroke="#60a5fa" strokeWidth="1.5"/>
                <line x1="30" y1="63" x2="35" y2="58" stroke="#60a5fa" strokeWidth="1.5"/>
                <line x1="70" y1="63" x2="65" y2="58" stroke="#60a5fa" strokeWidth="1.5"/>
              </svg>
            </div>
            <div style={{ color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: '16px' }}>
              Современный геометрический дизайн. Технологичный вид, хорошо масштабируется.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Минимализм</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Tech</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Профессионализм</span>
            </div>
          </div>

          {/* Вариант 5: Frame Dashboard */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#60a5fa' }}>
              5. Frame Dashboard
            </div>
            <div style={{ background: '#334155', borderRadius: '12px', padding: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="frame-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#60a5fa"/>
                  </linearGradient>
                </defs>
                <rect x="28" y="28" width="44" height="44" rx="6"
                      stroke="url(#frame-gradient)" strokeWidth="3" fill="none"/>
                <rect x="34" y="34" width="32" height="32" rx="3" fill="rgba(59,130,246,0.15)"/>
                <rect x="38" y="52" width="4" height="11" rx="1" fill="#60a5fa"/>
                <rect x="44" y="48" width="4" height="15" rx="1" fill="#60a5fa"/>
                <rect x="50" y="44" width="4" height="19" rx="1" fill="#3b82f6"/>
                <rect x="56" y="50" width="4" height="13" rx="1" fill="#60a5fa"/>
                <circle cx="38" cy="40" r="1.5" fill="#10b981"/>
                <circle cx="43" cy="40" r="1.5" fill="#10b981"/>
                <circle cx="48" cy="40" r="1.5" fill="#f59e0b"/>
                <circle cx="53" cy="40" r="1.5" fill="#10b981"/>
                <circle cx="58" cy="40" r="1.5" fill="#10b981"/>
                <text x="31" y="34" fill="#60a5fa" fontSize="6" fontWeight="bold">T</text>
                <text x="66" y="34" fill="#60a5fa" fontSize="6" fontWeight="bold">F</text>
              </svg>
            </div>
            <div style={{ color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: '16px' }}>
              Рамка (Frame) с элементами dashboard. Показывает аналитику и контроль.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Dashboard</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Аналитика</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Frame</span>
            </div>
          </div>

          {/* Вариант 6: Минимализм */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#60a5fa' }}>
              6. Минимализм: Капля
            </div>
            <div style={{ background: '#334155', borderRadius: '12px', padding: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="simple-drop" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa"/>
                    <stop offset="50%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#2563eb"/>
                  </linearGradient>
                </defs>
                <path d="M 50 15 C 40 30, 25 45, 25 60 C 25 73, 36 85, 50 85 C 64 85, 75 73, 75 60 C 75 45, 60 30, 50 15 Z"
                      fill="url(#simple-drop)"/>
                <ellipse cx="42" cy="35" rx="8" ry="12" fill="rgba(255,255,255,0.25)"/>
                <text x="50" y="63" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">TF</text>
              </svg>
            </div>
            <div style={{ color: 'hsl(var(--muted-foreground))', lineHeight: 1.6, marginBottom: '16px' }}>
              Чистый минимализм. Просто капля топлива с инициалами. Максимально понятно.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Минимализм</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Простота</span>
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 12px', borderRadius: '6px', fontSize: '12px' }}>Элегантность</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '60px', color: '#64748b' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>Какой вариант вам нравится больше?</p>
          <p>Можем доработать любой или скомбинировать элементы</p>
        </div>
      </div>
    </div>
  );
}
