/**
 * Криптографические утилиты для хеширования паролей
 * Использует WebCrypto API с PBKDF2 для безопасного хранения паролей
 */

export interface PasswordHash {
  hash: string      // Base64 encoded hash
  salt: string      // Base64 encoded salt
  iterations: number
}

export interface SessionTokenData {
  user_id: string
  tenant_id: string
  issued_at: number
  expires_at: number
}

export class CryptoUtils {
  private static readonly ITERATIONS = 100000  // PBKDF2 iterations
  private static readonly HASH_LENGTH = 32     // SHA-256 hash length
  private static readonly SALT_LENGTH = 16     // Salt length in bytes

  /**
   * Сгенерировать криптографически стойкую соль
   */
  static generateSalt(): string {
    const salt = new Uint8Array(this.SALT_LENGTH)
    crypto.getRandomValues(salt)
    return this.arrayBufferToBase64(salt)
  }

  /**
   * Хешировать пароль с солью
   */
  static async hashPassword(password: string, salt?: string): Promise<PasswordHash> {
    if (!password) {
      throw new Error('Пароль не может быть пустым')
    }

    const passwordSalt = salt || this.generateSalt()
    const saltBytes = this.base64ToArrayBuffer(passwordSalt)
    const encoder = new TextEncoder()
    const passwordBytes = encoder.encode(password)

    // Импортируем пароль как ключ для PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )

    // Выполняем PBKDF2 хеширование
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      this.HASH_LENGTH * 8  // в битах
    )

    return {
      hash: this.arrayBufferToBase64(hashBuffer),
      salt: passwordSalt,
      iterations: this.ITERATIONS
    }
  }

  /**
   * Проверить пароль против хеша
   */
  static async verifyPassword(
    password: string, 
    storedHash: string, 
    storedSalt: string,
    iterations: number = this.ITERATIONS
  ): Promise<boolean> {
    try {
      const computed = await this.hashPassword(password, storedSalt)
      
      // Используем constant-time сравнение для предотвращения timing attacks
      return this.constantTimeEquals(computed.hash, storedHash) && 
             computed.iterations === iterations
    } catch (error) {
      console.error('Ошибка верификации пароля:', error)
      return false
    }
  }

  /**
   * Генерировать безопасный случайный ID
   */
  static generateSecureId(length: number = 16): string {
    const randomBytes = new Uint8Array(length)
    crypto.getRandomValues(randomBytes)
    
    // Конвертируем в hex строку
    return Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Генерировать session token
   */
  static generateSessionToken(): string {
    return this.generateSecureId(32)
  }

  /**
   * Создать JWT-подобный токен (для localStorage)
   * ВНИМАНИЕ: Это не настоящий JWT, а простая Base64 кодировка для localStorage
   */
  static createSessionData(data: SessionTokenData): string {
    const jsonStr = JSON.stringify(data)
    return btoa(jsonStr)  // Base64 encode
  }

  /**
   * Декодировать session данные
   */
  static parseSessionData(token: string): SessionTokenData | null {
    try {
      const jsonStr = atob(token)  // Base64 decode
      const data = JSON.parse(jsonStr)
      
      // Валидация структуры
      if (!data.user_id || !data.tenant_id || !data.issued_at || !data.expires_at) {
        return null
      }

      return data
    } catch (error) {
      console.error('Ошибка парсинга session токена:', error)
      return null
    }
  }

  /**
   * Проверить валидность сессии
   */
  static isSessionValid(token: string): boolean {
    const data = this.parseSessionData(token)
    if (!data) return false

    const now = Date.now()
    return now >= data.issued_at && now <= data.expires_at
  }

  /**
   * Валидация силы пароля
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean
    errors: string[]
    score: number  // 0-100
  } {
    const errors: string[] = []
    let score = 0

    if (password.length < 8) {
      errors.push('Пароль должен содержать минимум 8 символов')
    } else {
      score += Math.min(password.length * 2, 20)  // до 20 баллов за длину
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Пароль должен содержать строчные буквы')
    } else {
      score += 15
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Пароль должен содержать заглавные буквы')
    } else {
      score += 15
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Пароль должен содержать цифры')
    } else {
      score += 15
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Пароль должен содержать специальные символы')
    } else {
      score += 20
    }

    // Проверка на общие пароли
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'root']
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Пароль слишком простой')
      score = Math.min(score, 20)
    }

    // Проверка на повторяющиеся символы
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Пароль содержит много повторяющихся символов')
      score -= 10
    }

    score = Math.max(0, Math.min(100, score))

    return {
      isValid: errors.length === 0,
      errors,
      score
    }
  }

  /**
   * Конвертировать ArrayBuffer в Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Конвертировать Base64 в ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Constant-time сравнение строк для предотвращения timing attacks
   */
  private static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }

  /**
   * Генерировать OTP код (для будущего 2FA)
   */
  static generateOTP(length: number = 6): string {
    const digits = '0123456789'
    let result = ''
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * digits.length)
      result += digits[randomIndex]
    }
    
    return result
  }

  /**
   * Хешировать данные для integrity check
   */
  static async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBytes = encoder.encode(data)
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes)
    return this.arrayBufferToBase64(hashBuffer)
  }
}

/**
 * Тестирование криптографических функций
 */
export class CryptoTesting {
  /**
   * Тест базового хеширования паролей
   */
  static async testPasswordHashing(): Promise<boolean> {
    try {
      const password = 'TestPassword123!'
      
      // Хешируем пароль
      const hash1 = await CryptoUtils.hashPassword(password)
      const hash2 = await CryptoUtils.hashPassword(password)
      
      // Хеши должны быть разными (из-за разных солей)
      if (hash1.hash === hash2.hash) {
        console.error('❌ Хеши идентичны - проблема с генерацией соли')
        return false
      }

      // Верификация должна работать
      const isValid1 = await CryptoUtils.verifyPassword(password, hash1.hash, hash1.salt)
      const isValid2 = await CryptoUtils.verifyPassword('WrongPassword', hash1.hash, hash1.salt)
      
      if (!isValid1) {
        console.error('❌ Верификация корректного пароля не прошла')
        return false
      }

      if (isValid2) {
        console.error('❌ Верификация неправильного пароля прошла')
        return false
      }

      console.log('✅ Тест хеширования паролей прошел успешно')
      return true

    } catch (error) {
      console.error('❌ Ошибка в тестировании криптографии:', error)
      return false
    }
  }

  /**
   * Тест генерации безопасных ID
   */
  static testSecureIdGeneration(): boolean {
    try {
      const id1 = CryptoUtils.generateSecureId(16)
      const id2 = CryptoUtils.generateSecureId(16)
      
      if (id1 === id2) {
        console.error('❌ Сгенерированы одинаковые ID')
        return false
      }

      if (id1.length !== 32 || id2.length !== 32) {
        console.error('❌ Неправильная длина ID')
        return false
      }

      if (!/^[0-9a-f]+$/.test(id1) || !/^[0-9a-f]+$/.test(id2)) {
        console.error('❌ ID содержат недопустимые символы')
        return false
      }

      console.log('✅ Тест генерации ID прошел успешно')
      return true

    } catch (error) {
      console.error('❌ Ошибка в тестировании ID генерации:', error)
      return false
    }
  }
}

// Автоматический тест при загрузке модуля в development
if (process.env.NODE_ENV === 'development') {
  setTimeout(async () => {
    await CryptoTesting.testPasswordHashing()
    CryptoTesting.testSecureIdGeneration()
  }, 1000)
}