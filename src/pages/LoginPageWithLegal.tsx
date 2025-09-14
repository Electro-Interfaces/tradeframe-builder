import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle, FileText, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { legalDocumentsService } from '@/services/legalDocumentsService';
import { DocumentType } from '@/types/legal';
import { useMobile } from '@/hooks/useMobile';

interface LegalDocument {
  type: DocumentType;
  title: string;
  content: string;
  version: string;
}

// Шаблоны правовых документов для fallback
const getDefaultLegalDocuments = (): LegalDocument[] => [
  {
    type: 'tos',
    title: 'Пользовательское соглашение',
    version: '1.0.0',
    content: `
      <div class="legal-document">
        <h2>Пользовательское соглашение TradeFrame</h2>
        <p><strong>Дата вступления в силу:</strong> ${new Date().toLocaleDateString('ru-RU')}</p>

        <h3>1. Общие положения</h3>
        <p>Настоящее Пользовательское соглашение регулирует отношения между администрацией системы TradeFrame и пользователями системы.</p>

        <h3>2. Предмет соглашения</h3>
        <p>TradeFrame предоставляет пользователям доступ к системе управления торговыми сетями и АЗС, включая:</p>
        <ul>
          <li>Управление операциями и транзакциями</li>
          <li>Контроль цен на топливо</li>
          <li>Мониторинг резервуаров и оборудования</li>
          <li>Управление пользователями и ролями</li>
        </ul>

        <h3>3. Права и обязанности пользователей</h3>
        <p>Пользователи обязуются:</p>
        <ul>
          <li>Использовать систему только в законных целях</li>
          <li>Не разглашать данные авторизации третьим лицам</li>
          <li>Соблюдать требования информационной безопасности</li>
        </ul>

        <h3>4. Ответственность</h3>
        <p>Администрация TradeFrame не несет ответственности за убытки, возникшие вследствие неправильного использования системы.</p>

        <h3>5. Изменения соглашения</h3>
        <p>Администрация оставляет за собой право изменять настоящее соглашение с уведомлением пользователей.</p>
      </div>
    `
  },
  {
    type: 'privacy',
    title: 'Политика конфиденциальности',
    version: '1.0.0',
    content: `
      <div class="legal-document">
        <h2>Политика конфиденциальности TradeFrame</h2>
        <p><strong>Дата вступления в силу:</strong> ${new Date().toLocaleDateString('ru-RU')}</p>

        <h3>1. Общие положения</h3>
        <p>Настоящая Политика конфиденциальности описывает, как мы собираем, используем и защищаем вашу персональную информацию.</p>

        <h3>2. Сбор информации</h3>
        <p>Мы собираем следующую информацию:</p>
        <ul>
          <li>Имя, фамилия, электронная почта</li>
          <li>Данные об использовании системы</li>
          <li>Технические данные (IP-адрес, браузер)</li>
        </ul>

        <h3>3. Использование информации</h3>
        <p>Собранная информация используется для:</p>
        <ul>
          <li>Предоставления доступа к системе</li>
          <li>Улучшения функциональности</li>
          <li>Обеспечения безопасности</li>
        </ul>

        <h3>4. Защита информации</h3>
        <p>Мы применяем современные методы защиты данных:</p>
        <ul>
          <li>Шифрование данных при передаче</li>
          <li>Контроль доступа к базам данных</li>
          <li>Регулярное обновление систем безопасности</li>
        </ul>

        <h3>5. Передача третьим лицам</h3>
        <p>Мы не передаем вашу персональную информацию третьим лицам без вашего согласия, за исключением случаев, предусмотренных законом.</p>

        <h3>6. Ваши права</h3>
        <p>У вас есть право:</p>
        <ul>
          <li>Запросить доступ к своим данным</li>
          <li>Потребовать исправления неточных данных</li>
          <li>Запросить удаление своих данных</li>
        </ul>
      </div>
    `
  },
  {
    type: 'pdn',
    title: 'Согласие на обработку персональных данных',
    version: '1.0.0',
    content: `
      <div class="legal-document">
        <h2>Согласие на обработку персональных данных</h2>
        <p><strong>Дата:</strong> ${new Date().toLocaleDateString('ru-RU')}</p>

        <h3>Согласие субъекта персональных данных</h3>
        <p>В соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» даю согласие на обработку своих персональных данных.</p>

        <h3>Перечень персональных данных</h3>
        <p>Согласие дается на обработку следующих персональных данных:</p>
        <ul>
          <li>Фамилия, имя, отчество</li>
          <li>Адрес электронной почты</li>
          <li>Номер телефона</li>
          <li>Должность и место работы</li>
        </ul>

        <h3>Цели обработки</h3>
        <p>Персональные данные обрабатываются в следующих целях:</p>
        <ul>
          <li>Предоставление доступа к системе TradeFrame</li>
          <li>Ведение учета пользователей</li>
          <li>Обеспечение обратной связи</li>
          <li>Выполнение договорных обязательств</li>
        </ul>

        <h3>Способы обработки</h3>
        <p>Обработка персональных данных осуществляется:</p>
        <ul>
          <li>С использованием средств автоматизации</li>
          <li>Без использования средств автоматизации</li>
          <li>Смешанным способом</li>
        </ul>

        <h3>Срок действия согласия</h3>
        <p>Настоящее согласие действует до его отзыва субъектом персональных данных.</p>

        <h3>Право отзыва</h3>
        <p>Субъект персональных данных имеет право отозвать настоящее согласие путем направления письменного заявления оператору.</p>
      </div>
    `
  }
];

const getMobileLegalDocuments = (): LegalDocument[] => [
  {
    type: 'tos',
    title: 'Пользовательское соглашение',
    version: '1.0.0-mobile',
    content: '<p>Краткая версия пользовательского соглашения для мобильных устройств. Используя TradeFrame, вы соглашаетесь с условиями использования системы управления торговыми сетями.</p>'
  },
  {
    type: 'privacy',
    title: 'Политика конфиденциальности',
    version: '1.0.0-mobile',
    content: '<p>Мы защищаем вашу конфиденциальность. Ваши данные используются только для работы с системой и не передаются третьим лицам.</p>'
  },
  {
    type: 'pdn',
    title: 'Согласие на обработку ПДн',
    version: '1.0.0-mobile',
    content: '<p>Даю согласие на обработку персональных данных в соответствии с ФЗ-152 для использования системы TradeFrame.</p>'
  }
];

const LoginPageWithLegal = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Legal documents states - согласия по умолчанию
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(true);
  const [acceptedPdn, setAcceptedPdn] = useState(true);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showPdnDialog, setShowPdnDialog] = useState(false);
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>([]);
  
  // Mobile state
  const mobileInfo = useMobile();
  const isMobile = mobileInfo.isMobile;
  const { login } = useAuth();
  const navigate = useNavigate();


  // Загрузка правовых документов с fallback шаблонами
  useEffect(() => {
    const loadLegalDocuments = async () => {
      try {
        // На мобильных устройствах используем упрощенные шаблоны
        if (isMobile) {
          setLegalDocuments(getMobileLegalDocuments());
          return;
        }

        // Пробуем загрузить из сервиса, но используем fallback если не получается
        try {
          const tosVersion = await legalDocumentsService.getLatestVersion('tos');
          const privacyVersion = await legalDocumentsService.getLatestVersion('privacy');
          const pdnVersion = await legalDocumentsService.getLatestVersion('pdn');
        
        const docs: LegalDocument[] = [];
        
        if (tosVersion) {
          docs.push({
            type: 'tos',
            title: 'Пользовательское соглашение',
            content: tosVersion.content_html || tosVersion.content_md || '',
            version: tosVersion.version
          });
        }
        
        if (privacyVersion) {
          docs.push({
            type: 'privacy',
            title: 'Политика конфиденциальности',
            content: privacyVersion.content_html || privacyVersion.content_md || '',
            version: privacyVersion.version
          });
        }
        
        if (pdnVersion) {
          docs.push({
            type: 'pdn',
            title: 'Защита персональных данных',
            content: pdnVersion.content_html || pdnVersion.content_md || '',
            version: pdnVersion.version
          });
        }
        
        // Если загрузили документы из сервиса - используем их
        if (docs.length > 0) {
          setLegalDocuments(docs);
        } else {
          // Fallback к шаблонам
          console.log('📝 Using default legal document templates');
          setLegalDocuments(getDefaultLegalDocuments());
        }

        } catch (serviceError) {
          console.warn('⚠️ Legal documents service failed, using default templates:', serviceError);
          setLegalDocuments(getDefaultLegalDocuments());
        }
      } catch (error) {
        console.error('❌ Error loading legal documents:', error);
        setLegalDocuments(getDefaultLegalDocuments());
      }
    };

    loadLegalDocuments();
  }, [isMobile]);

  const handleRefresh = async () => {
    // Простое обновление страницы для логин страницы
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // На мобильных устройствах пропускаем проверку legal documents
    if (!isMobile) {
      // Проверка согласия с правовыми документами только на desktop
      if (!acceptedTerms || !acceptedPrivacy || !acceptedPdn) {
        setError('Необходимо принять все правовые документы для продолжения');
        return;
      }
    }
    
    setIsLoading(true);
    setError('');

    try {
      // Login first to get authentication
      const loginResult = await login(email, password);
      
      // Пропускаем юридические документы для мобильных, МенеджерБТО и системных ролей
      const skipLegalDocs = isMobile ||
                           email.includes('bto.manager') || 
                           email.includes('admin@') ||
                           (loginResult && loginResult.role === 'bto_manager');
      
      if (!skipLegalDocs && email) {
        
        try {
          await legalDocumentsService.acceptDocument('tos', email, 'login');
          
          await legalDocumentsService.acceptDocument('privacy', email, 'login');
          
          await legalDocumentsService.acceptDocument('pdn', email, 'login');
          
        } catch (legalError) {
          // Не блокируем логин если юридические документы недоступны
        }
      } else {
      }
      
      // Сохраняем email если выбрано "Запомнить меня"
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Очищаем временное состояние формы при успешной авторизации
      sessionStorage.removeItem('loginFormState');
      
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Ошибка входа в систему');
    } finally {
      setIsLoading(false);
    }
  };


  // Автосохранение состояния формы
  useEffect(() => {
    const savedState = sessionStorage.getItem('loginFormState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setEmail(state.email || '');
        setPassword(state.password || '');
        setRememberMe(state.rememberMe || false);
        setAcceptedTerms(state.acceptedTerms !== undefined ? state.acceptedTerms : true);
        setAcceptedPrivacy(state.acceptedPrivacy !== undefined ? state.acceptedPrivacy : true);
        setAcceptedPdn(state.acceptedPdn !== undefined ? state.acceptedPdn : true);
      } catch (error) {
      }
    }

    // Загружаем сохраненный email при загрузке страницы
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail && !email) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Сохраняем состояние формы при каждом изменении
  useEffect(() => {
    const formState = {
      email,
      password,
      rememberMe,
      acceptedTerms,
      acceptedPrivacy,
      acceptedPdn
    };
    sessionStorage.setItem('loginFormState', JSON.stringify(formState));
  }, [email, password, rememberMe, acceptedTerms, acceptedPrivacy, acceptedPdn]);

  const getTermsContent = () => {
    const doc = legalDocuments.find(d => d.type === 'tos');
    return doc?.content || 'Загрузка...';
  };

  const getPrivacyContent = () => {
    const doc = legalDocuments.find(d => d.type === 'privacy');
    return doc?.content || 'Загрузка...';
  };

  const getPdnContent = () => {
    const doc = legalDocuments.find(d => d.type === 'pdn');
    return doc?.content || 'Загрузка...';
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 ${
      mobileInfo.isMobile ? 'mobile-no-select mobile-scroll mobile-safe-top mobile-safe-bottom flex flex-col' : 'flex items-center justify-center'
    }`} style={mobileInfo.isMobile ? { height: 'var(--vh, 100vh)' } : {}}>
      <div className={`w-full space-y-2 ${
        isMobile ? 'max-w-full px-1 flex-1 flex flex-col justify-center min-h-0' : 'max-w-md'
      }`}>
        {/* Логотип и заголовок - супер компактная версия */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full mb-1">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-0.5">TradeFrame</h1>
          <p className="text-xs text-slate-400">Система управления АЗС</p>
        </div>

        {/* Форма входа */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">Вход в систему</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div>
                <Label htmlFor="email" className="text-xs text-slate-200">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 text-sm mt-1"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-xs text-slate-200">Пароль</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10 h-8 text-sm"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-1.5 hover:bg-transparent text-slate-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              {/* Правовые документы */}
              <div className="space-y-1 p-2 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    className="mt-1 border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="terms" className="text-xs text-slate-300 cursor-pointer">
                      Я принимаю{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-xs text-blue-400 hover:text-blue-300"
                        onClick={() => setShowTermsDialog(true)}
                      >
                        Пользовательское соглашение
                      </Button>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="privacy"
                    checked={acceptedPrivacy}
                    onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                    className="mt-1 border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="privacy" className="text-xs text-slate-300 cursor-pointer">
                      Я согласен с{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-xs text-blue-400 hover:text-blue-300"
                        onClick={() => setShowPrivacyDialog(true)}
                      >
                        Политикой конфиденциальности
                      </Button>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="pdn"
                    checked={acceptedPdn}
                    onCheckedChange={(checked) => setAcceptedPdn(checked as boolean)}
                    className="mt-1 border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="pdn" className="text-xs text-slate-300 cursor-pointer">
                      Я ознакомлен с положением о{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-xs text-blue-400 hover:text-blue-300"
                        onClick={() => setShowPdnDialog(true)}
                      >
                        Защите персональных данных
                      </Button>
                    </Label>
                  </div>
                </div>
              </div>

              {/* Запомнить меня */}
              <div className="flex items-center space-x-2 mt-1">
                <Checkbox 
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-slate-500 data-[state=checked]:bg-blue-600 h-3 w-3"
                />
                <Label htmlFor="remember" className="text-xs text-slate-300 cursor-pointer">
                  Запомнить меня
                </Label>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-900/50 border-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-sm mt-2"
                disabled={isLoading || !acceptedTerms || !acceptedPrivacy || !acceptedPdn}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Войти в систему
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>


        {/* Информация о безопасности - супер компактная */}
        <div className="text-center">
          <p className="text-xs text-slate-600">
            © 2024 TradeFrame v1.5.11
          </p>
        </div>
      </div>

      {/* Диалог пользовательского соглашения */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Пользовательское соглашение</DialogTitle>
            <DialogDescription className="text-slate-400">
              Версия: {legalDocuments.find(d => d.type === 'tos')?.version || '1.0.0'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full rounded-md border border-slate-700 p-4">
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: getTermsContent() }}
            />
          </ScrollArea>
          <DialogFooter>
            <Button 
              onClick={() => {
                setAcceptedTerms(true);
                setShowTermsDialog(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Принять соглашение
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог политики конфиденциальности */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Политика конфиденциальности</DialogTitle>
            <DialogDescription className="text-slate-400">
              Версия: {legalDocuments.find(d => d.type === 'privacy')?.version || '1.0.0'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full rounded-md border border-slate-700 p-4">
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: getPrivacyContent() }}
            />
          </ScrollArea>
          <DialogFooter>
            <Button 
              onClick={() => {
                setAcceptedPrivacy(true);
                setShowPrivacyDialog(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Принять политику
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог защиты персональных данных */}
      <Dialog open={showPdnDialog} onOpenChange={setShowPdnDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Положение о защите персональных данных</DialogTitle>
            <DialogDescription className="text-slate-400">
              Версия: {legalDocuments.find(d => d.type === 'pdn')?.version || '1.0.0'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full rounded-md border border-slate-700 p-4">
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: getPdnContent() }}
            />
          </ScrollArea>
          <DialogFooter>
            <Button 
              onClick={() => {
                setAcceptedPdn(true);
                setShowPdnDialog(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Принять положение
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPageWithLegal;