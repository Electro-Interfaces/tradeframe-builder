/**
 * Swagger API Documentation Setup
 * Для АГЕНТА 3: API Endpoints
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tradeframe API',
      version: '1.0.0',
      description: `
        API для системы управления торговыми сетями Tradeframe.
        
        Система предоставляет возможности для:
        - Управления торговыми сетями и точками
        - Работы с пользователями и ролями
        - Управления ценами на топливо
        - Мониторинга операций и транзакций
        - Контроля резервуаров и оборудования
        
        ## Аутентификация
        API использует JWT токены для аутентификации. 
        Добавьте заголовок: \`Authorization: Bearer YOUR_JWT_TOKEN\`
        
        ## Коды ошибок
        - 400: Ошибка валидации данных
        - 401: Требуется аутентификация
        - 403: Недостаточно прав доступа
        - 404: Ресурс не найден
        - 409: Конфликт (дублирование данных)
        - 500: Внутренняя ошибка сервера
      `,
      contact: {
        name: 'Tradeframe Support',
        email: 'support@tradeframe.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.tradeframe.production.com/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /auth/login endpoint'
        }
      },
      schemas: {
        // Общие схемы
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Описание ошибки'
            },
            code: {
              type: 'string',
              description: 'Код ошибки'
            },
            details: {
              type: 'string',
              description: 'Дополнительные детали ошибки'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Сообщение об успешной операции'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        PaginationParams: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
              description: 'Номер страницы'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10,
              description: 'Количество записей на странице'
            },
            orderBy: {
              type: 'string',
              description: 'Поле для сортировки'
            },
            ascending: {
              type: 'boolean',
              default: false,
              description: 'Порядок сортировки (true = по возрастанию)'
            }
          }
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Общее количество записей'
            },
            page: {
              type: 'integer',
              description: 'Текущая страница'
            },
            limit: {
              type: 'integer',
              description: 'Записей на странице'
            },
            pages: {
              type: 'integer',
              description: 'Общее количество страниц'
            }
          }
        },
        // Модели данных
        Network: {
          type: 'object',
          required: ['name', 'code'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Уникальный идентификатор сети'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 255,
              description: 'Название торговой сети',
              example: 'Сеть АЗС Север'
            },
            code: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Уникальный код сети',
              example: 'NORTH_NET'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              description: 'Описание сети',
              example: 'Сеть АЗС в северном регионе'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'maintenance'],
              default: 'active',
              description: 'Статус сети'
            },
            settings: {
              type: 'object',
              description: 'Дополнительные настройки сети',
              example: {
                timezone: 'Europe/Moscow',
                currency: 'RUB',
                workingHours: '24/7'
              }
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Дата создания'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Дата последнего обновления'
            }
          }
        },
        FuelType: {
          type: 'object',
          required: ['name', 'code', 'category'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Уникальный идентификатор типа топлива'
            },
            name: {
              type: 'string',
              description: 'Название типа топлива',
              example: 'Бензин АИ-95'
            },
            code: {
              type: 'string',
              description: 'Код типа топлива',
              example: 'AI95'
            },
            category: {
              type: 'string',
              enum: ['gasoline', 'diesel', 'gas', 'other'],
              description: 'Категория топлива'
            },
            octane_number: {
              type: 'integer',
              minimum: 80,
              maximum: 110,
              description: 'Октановое число (для бензина)',
              example: 95
            },
            density: {
              type: 'number',
              description: 'Плотность топлива (кг/м³)',
              example: 755.5
            },
            unit: {
              type: 'string',
              default: 'L',
              description: 'Единица измерения',
              example: 'L'
            },
            is_active: {
              type: 'boolean',
              default: true,
              description: 'Активен ли тип топлива'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            email: {
              type: 'string',
              format: 'email'
            },
            username: {
              type: 'string'
            },
            first_name: {
              type: 'string'
            },
            last_name: {
              type: 'string'
            },
            phone: {
              type: 'string'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended', 'deleted']
            },
            roles: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        JWTTokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token'
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token'
            },
            expiresIn: {
              type: 'integer',
              description: 'Время жизни access token в секундах'
            },
            tokenType: {
              type: 'string',
              example: 'Bearer'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Требуется аутентификация',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Access token required',
                code: 'NO_TOKEN'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Недостаточно прав доступа',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Ресурс не найден',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Resource not found',
                code: 'NOT_FOUND'
              }
            }
          }
        },
        ValidationError: {
          description: 'Ошибка валидации данных',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: 'Name is required and must be at least 2 characters'
              }
            }
          }
        },
        ConflictError: {
          description: 'Конфликт данных',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Record with this value already exists',
                code: 'DUPLICATE_RECORD'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Аутентификация и авторизация пользователей'
      },
      {
        name: 'Networks',
        description: 'Управление торговыми сетями'
      },
      {
        name: 'Fuel Types',
        description: 'Управление типами топлива'
      },
      {
        name: 'Trading Points',
        description: 'Управление торговыми точками'
      },
      {
        name: 'Users',
        description: 'Управление пользователями'
      },
      {
        name: 'Operations',
        description: 'Операции и транзакции'
      },
      {
        name: 'Prices',
        description: 'Управление ценами'
      },
      {
        name: 'Tanks',
        description: 'Мониторинг резервуаров'
      }
    ]
  },
  apis: [
    './src/api/routes/*.ts',
    './src/api/auth/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

/**
 * Настройка Swagger UI
 */
export const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { 
      background-color: #1e40af; 
    }
    .swagger-ui .topbar .download-url-wrapper { 
      display: none; 
    }
    .swagger-ui .info .title {
      color: #1e40af;
    }
  `,
  customSiteTitle: 'Tradeframe API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    requestInterceptor: (req: any) => {
      // Добавляем базовую информацию в заголовки
      req.headers['X-API-Client'] = 'Swagger-UI';
      return req;
    }
  }
};

/**
 * Подключение Swagger к Express приложению
 */
export function setupSwagger(app: Express) {
  // API Documentation endpoint
  app.use('/api/docs', swaggerUi.serve);
  app.get('/api/docs', swaggerUi.setup(specs, swaggerOptions));
  
  // OpenAPI JSON endpoint
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
  
  console.log('📖 Swagger documentation available at:');
  console.log('   - UI: http://localhost:3001/api/docs');
  console.log('   - JSON: http://localhost:3001/api/docs.json');
}

export { specs };