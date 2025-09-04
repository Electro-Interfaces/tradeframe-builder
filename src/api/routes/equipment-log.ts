/**
 * Equipment Log API Routes
 * Для раздела ОПЕРАЦИИ - Журнал оборудования
 */

import { Router, Request, Response } from 'express';
import { equipmentLogRepository } from '../database/repositories';
import { requireRole } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     EquipmentLogEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         equipment_id:
 *           type: string
 *           format: uuid
 *         trading_point_id:
 *           type: string
 *           format: uuid
 *         network_id:
 *           type: string
 *           format: uuid
 *         event_type:
 *           type: string
 *           enum: [maintenance, repair, calibration, inspection, fault, installation, removal, update]
 *         event_category:
 *           type: string
 *           enum: [scheduled, emergency, preventive, corrective]
 *         severity:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed, failed, cancelled]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         performed_by:
 *           type: string
 *         start_time:
 *           type: string
 *           format: date-time
 *         end_time:
 *           type: string
 *           format: date-time
 *         duration_minutes:
 *           type: integer
 *         cost:
 *           type: number
 *           format: decimal
 *         parts_used:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               part_name:
 *                 type: string
 *               part_number:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               cost:
 *                 type: number
 *         notes:
 *           type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *         next_scheduled_date:
 *           type: string
 *           format: date
 *         metadata:
 *           type: object
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /equipment-log:
 *   get:
 *     summary: Получить журнал оборудования с фильтрацией
 *     tags: [Equipment Log]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: equipmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по оборудованию
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по торговой точке
 *       - in: query
 *         name: networkId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Фильтр по сети
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [maintenance, repair, calibration, inspection, fault, installation, removal, update]
 *       - in: query
 *         name: eventCategory
 *         schema:
 *           type: string
 *           enum: [scheduled, emergency, preventive, corrective]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, failed, cancelled]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: performedBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Журнал оборудования
 */
router.get('/', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const {
      equipmentId,
      tradingPointId,
      networkId,
      eventType,
      eventCategory,
      severity,
      status,
      startDate,
      endDate,
      performedBy,
      page = 1,
      limit = 50
    } = req.query;

    const filters: any = {};
    
    if (equipmentId) filters.equipmentId = equipmentId;
    if (tradingPointId) filters.tradingPointId = tradingPointId;
    if (networkId) filters.networkId = networkId;
    if (eventType) filters.eventType = eventType;
    if (eventCategory) filters.eventCategory = eventCategory;
    if (severity) filters.severity = severity;
    if (status) filters.status = status;
    if (performedBy) filters.performedBy = performedBy;
    
    if (startDate || endDate) {
      filters.dateRange = {
        start: startDate ? new Date(startDate as string) : undefined,
        end: endDate ? new Date(endDate as string) : undefined
      };
    }

    // Ограничение доступа по ролям
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const result = await equipmentLogRepository.findAllWithFilters(filters, {
      page: Number(page),
      limit: Number(limit)
    });

    // Добавляем статистику
    const summary = {
      totalEntries: result.data.length,
      pendingTasks: result.data.filter(entry => entry.status === 'pending').length,
      inProgressTasks: result.data.filter(entry => entry.status === 'in_progress').length,
      completedTasks: result.data.filter(entry => entry.status === 'completed').length,
      criticalEvents: result.data.filter(entry => entry.severity === 'critical').length,
      totalCost: result.data.reduce((sum, entry) => sum + (entry.cost || 0), 0),
      averageDuration: result.data.length > 0 
        ? result.data.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) / result.data.length
        : 0
    };

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      summary,
      filters: {
        equipmentId,
        tradingPointId,
        networkId,
        eventType,
        eventCategory,
        severity,
        status,
        startDate,
        endDate,
        performedBy
      }
    });
  } catch (error: any) {
    console.error('GET /equipment-log error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch equipment log',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /equipment-log/{id}:
 *   get:
 *     summary: Получить запись журнала по ID
 *     tags: [Equipment Log]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Запись журнала
 *       404:
 *         description: Запись не найдена
 */
router.get('/:id', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const logEntry = await equipmentLogRepository.findById(id);
    
    if (!logEntry) {
      return res.status(404).json({
        success: false,
        error: 'Equipment log entry not found',
        entryId: id
      });
    }

    // Проверка доступа
    if (!req.user?.roles.includes('system_admin')) {
      const hasAccess = req.user?.tradingPoints?.includes(logEntry.trading_point_id || '') ||
                       logEntry.network_id === req.user?.networkId;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this equipment log entry'
        });
      }
    }
    
    res.json({
      success: true,
      data: logEntry
    });
  } catch (error: any) {
    console.error(`GET /equipment-log/${req.params.id} error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch equipment log entry',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /equipment-log:
 *   post:
 *     summary: Создать новую запись в журнале оборудования
 *     tags: [Equipment Log]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - equipment_id
 *               - trading_point_id
 *               - event_type
 *               - title
 *               - description
 *             properties:
 *               equipment_id:
 *                 type: string
 *                 format: uuid
 *               trading_point_id:
 *                 type: string
 *                 format: uuid
 *               event_type:
 *                 type: string
 *                 enum: [maintenance, repair, calibration, inspection, fault, installation, removal, update]
 *               event_category:
 *                 type: string
 *                 enum: [scheduled, emergency, preventive, corrective]
 *                 default: scheduled
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               cost:
 *                 type: number
 *                 format: decimal
 *               parts_used:
 *                 type: array
 *                 items:
 *                   type: object
 *               notes:
 *                 type: string
 *               next_scheduled_date:
 *                 type: string
 *                 format: date
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Запись создана
 *       400:
 *         description: Ошибка валидации
 */
router.post('/', requireRole(['operator', 'manager']), async (req: Request, res: Response) => {
  try {
    const {
      equipment_id,
      trading_point_id,
      event_type,
      event_category = 'scheduled',
      severity = 'medium',
      title,
      description,
      start_time,
      cost,
      parts_used,
      notes,
      next_scheduled_date,
      metadata
    } = req.body;

    // Валидация обязательных полей
    if (!equipment_id || !trading_point_id || !event_type || !title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: equipment_id, trading_point_id, event_type, title, description'
      });
    }

    // Валидация значений enum
    const validEventTypes = ['maintenance', 'repair', 'calibration', 'inspection', 'fault', 'installation', 'removal', 'update'];
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event_type',
        validValues: validEventTypes
      });
    }

    const logEntryData = {
      equipment_id,
      trading_point_id,
      network_id: req.user?.networkId,
      event_type,
      event_category,
      severity,
      status: 'pending',
      title: title.trim(),
      description: description.trim(),
      performed_by: req.user?.userId,
      start_time: start_time || new Date().toISOString(),
      cost: cost ? Number(cost) : undefined,
      parts_used: parts_used || [],
      notes: notes?.trim(),
      next_scheduled_date,
      metadata: metadata || {}
    };

    const logEntry = await equipmentLogRepository.create(logEntryData);
    
    res.status(201).json({
      success: true,
      data: logEntry,
      message: 'Equipment log entry created successfully'
    });
  } catch (error: any) {
    console.error('POST /equipment-log error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create equipment log entry',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /equipment-log/{id}/status:
 *   patch:
 *     summary: Обновить статус записи журнала
 *     tags: [Equipment Log]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, failed, cancelled]
 *               notes:
 *                 type: string
 *               cost:
 *                 type: number
 *               parts_used:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Статус обновлен
 *       404:
 *         description: Запись не найдена
 */
router.patch('/:id/status', requireRole(['operator', 'manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, cost, parts_used } = req.body;

    const existingEntry = await equipmentLogRepository.findById(id);
    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        error: 'Equipment log entry not found',
        entryId: id
      });
    }

    // Валидация статуса
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        validValues: validStatuses
      });
    }

    const updates: any = {
      status,
      updated_by: req.user?.userId
    };

    if (notes) updates.notes = notes;
    if (cost !== undefined) updates.cost = Number(cost);
    if (parts_used) updates.parts_used = parts_used;

    // Автоматически устанавливаем время завершения
    if (status === 'completed' && !existingEntry.end_time) {
      updates.end_time = new Date().toISOString();
      
      // Вычисляем продолжительность
      if (existingEntry.start_time) {
        const startTime = new Date(existingEntry.start_time).getTime();
        const endTime = new Date(updates.end_time).getTime();
        updates.duration_minutes = Math.round((endTime - startTime) / (1000 * 60));
      }
    }

    const updatedEntry = await equipmentLogRepository.update(id, updates);
    
    res.json({
      success: true,
      data: updatedEntry,
      message: 'Equipment log entry status updated successfully'
    });
  } catch (error: any) {
    console.error(`PATCH /equipment-log/${req.params.id}/status error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update equipment log entry status',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /equipment-log/scheduled:
 *   get:
 *     summary: Получить запланированные работы
 *     tags: [Equipment Log]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysAhead
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Количество дней для планирования
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: equipmentType
 *         schema:
 *           type: string
 *         description: Тип оборудования
 *     responses:
 *       200:
 *         description: Запланированные работы
 */
router.get('/scheduled', requireRole(['operator', 'manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { daysAhead = 30, tradingPointId, equipmentType } = req.query;

    const filters: any = {
      scheduled: true,
      daysAhead: Number(daysAhead)
    };
    
    if (tradingPointId) filters.tradingPointId = tradingPointId;
    if (equipmentType) filters.equipmentType = equipmentType;

    // Ограничение доступа
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const scheduledTasks = await equipmentLogRepository.getScheduledMaintenance(filters);
    
    res.json({
      success: true,
      data: scheduledTasks,
      summary: {
        total: scheduledTasks.length,
        overdue: scheduledTasks.filter(task => task.is_overdue).length,
        upcoming: scheduledTasks.filter(task => task.days_until <= 7).length,
        thisMonth: scheduledTasks.filter(task => task.days_until <= 30).length
      }
    });
  } catch (error: any) {
    console.error('GET /equipment-log/scheduled error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled maintenance',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /equipment-log/export:
 *   get:
 *     summary: Экспорт журнала оборудования
 *     tags: [Equipment Log]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, xlsx, json]
 *           default: csv
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *       - in: query
 *         name: tradingPointId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Экспортированные данные
 */
router.get('/export', requireRole(['manager', 'network_admin', 'system_admin']), async (req: Request, res: Response) => {
  try {
    const { format = 'csv', startDate, endDate, eventType, tradingPointId } = req.query;

    const filters: any = {};
    if (startDate || endDate) {
      filters.dateRange = {
        start: startDate ? new Date(startDate as string) : undefined,
        end: endDate ? new Date(endDate as string) : undefined
      };
    }
    if (eventType) filters.eventType = eventType;
    if (tradingPointId) filters.tradingPointId = tradingPointId;

    // Ограничение доступа
    if (!req.user?.roles.includes('system_admin')) {
      if (req.user?.tradingPoints?.length) {
        filters.tradingPointIds = req.user.tradingPoints;
      } else if (req.user?.networkId) {
        filters.networkId = req.user.networkId;
      }
    }

    const result = await equipmentLogRepository.exportLog(filters, {
      format: format as 'csv' | 'xlsx' | 'json'
    });

    // Установка заголовков для скачивания
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `equipment-log-${timestamp}.${format}`;
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    } else {
      res.setHeader('Content-Type', format === 'xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(result);
    }
    
  } catch (error: any) {
    console.error('GET /equipment-log/export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export equipment log',
      details: error.message
    });
  }
});

export { router as equipmentLogRouter };