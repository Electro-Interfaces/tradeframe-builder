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

interface LegalDocument {
  type: DocumentType;
  title: string;
  content: string;
  version: string;
}

const LoginPageWithLegal = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Legal documents states
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedPdn, setAcceptedPdn] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showPdnDialog, setShowPdnDialog] = useState(false);
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>([]);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Предустановленные учетные записи для демонстрации
  const demoAccounts = [
    { email: 'admin@tradeframe.com', password: 'admin123', role: 'System Admin', icon: '👨‍💼' },
    { email: 'network.admin@demo-azs.ru', password: 'admin123', role: 'Network Admin', icon: '🏢' },
    { email: 'manager@demo-azs.ru', password: 'admin123', role: 'Manager', icon: '📊' },
    { email: 'operator@demo-azs.ru', password: 'admin123', role: 'Operator', icon: '⛽' }
  ];

  // Загрузка правовых документов
  useEffect(() => {
    const loadLegalDocuments = async () => {
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
        
        setLegalDocuments(docs);
      } catch (error) {
        console.error('Ошибка загрузки правовых документов:', error);
      }
    };
    
    loadLegalDocuments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка согласия с правовыми документами
    if (!acceptedTerms || !acceptedPrivacy || !acceptedPdn) {
      setError('Необходимо принять все правовые документы для продолжения');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      // Login first to get authentication
      await login(email, password);
      
      // Сохраняем согласие пользователя после успешной авторизации
      if (email) {
        console.log('📋 Saving legal document acceptances for:', email);
        
        console.log('✍️ Accepting Terms of Service...');
        await legalDocumentsService.acceptDocument('tos', email, 'login');
        
        console.log('✍️ Accepting Privacy Policy...');
        await legalDocumentsService.acceptDocument('privacy', email, 'login');
        
        console.log('✍️ Accepting Personal Data Protection...');
        await legalDocumentsService.acceptDocument('pdn', email, 'login');
        
        console.log('✅ All legal documents accepted successfully');
      }
      
      // Сохраняем email если выбрано "Запомнить меня"
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Ошибка входа в систему');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setAcceptedTerms(true);
    setAcceptedPrivacy(true);
    setAcceptedPdn(true);
  };

  // Загружаем сохраненный email при загрузке страницы
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Логотип и заголовок */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">TradeFrame</h1>
          <p className="text-slate-400">Система управления торговой сетью АЗС</p>
        </div>

        {/* Форма входа */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Вход в систему</CardTitle>
            <CardDescription className="text-slate-400">
              Введите свои учетные данные для доступа
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Правовые документы */}
              <div className="space-y-3 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    className="mt-1 border-slate-500 data-[state=checked]:bg-blue-600"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="terms" className="text-sm text-slate-300 cursor-pointer">
                      Я принимаю{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-blue-400 hover:text-blue-300"
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
                    <Label htmlFor="privacy" className="text-sm text-slate-300 cursor-pointer">
                      Я согласен с{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-blue-400 hover:text-blue-300"
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
                    <Label htmlFor="pdn" className="text-sm text-slate-300 cursor-pointer">
                      Я ознакомлен с положением о{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-blue-400 hover:text-blue-300"
                        onClick={() => setShowPdnDialog(true)}
                      >
                        Защите персональных данных
                      </Button>
                    </Label>
                  </div>
                </div>
              </div>

              {/* Запомнить меня */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-slate-500 data-[state=checked]:bg-blue-600"
                />
                <Label htmlFor="remember" className="text-sm text-slate-300 cursor-pointer">
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
                className="w-full bg-blue-600 hover:bg-blue-700"
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

        {/* Демо учетные записи */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-300">Быстрый вход (Демо)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((account) => (
                <Button
                  key={account.email}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs h-auto py-2 px-3 bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  disabled={isLoading}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{account.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{account.role}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Информация о безопасности */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-4 text-xs text-slate-500">
            <div className="flex items-center space-x-1">
              <Lock className="h-3 w-3" />
              <span>SSL защищено</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="h-3 w-3" />
              <span>GDPR совместимо</span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>ISO 27001</span>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            © 2024 TradeFrame. Версия 1.0.0
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