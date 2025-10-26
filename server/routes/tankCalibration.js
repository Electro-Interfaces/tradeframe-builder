/**
 * API эндпоинты для управления настройками автокалибровки резервуаров
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/tank-calibration/:tankId
 * Получить настройки калибровки для резервуара
 */
router.get('/:tankId', async (req, res) => {
  try {
    const { tankId } = req.params;

    const { data, error } = await supabase
      .from('tank_calibration_settings')
      .select('*')
      .eq('tank_id', tankId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching calibration settings:', error);
      return res.status(500).json({ error: error.message });
    }

    // Если настроек нет, вернем null
    res.json(data || null);
  } catch (error) {
    console.error('Error in GET /api/tank-calibration/:tankId:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tank-calibration
 * Сохранить/обновить настройки калибровки резервуара
 */
router.post('/', async (req, res) => {
  try {
    const settings = req.body;

    if (!settings.tank_id) {
      return res.status(400).json({ error: 'tank_id is required' });
    }

    // Проверяем, существуют ли настройки для этого резервуара
    const { data: existing } = await supabase
      .from('tank_calibration_settings')
      .select('id')
      .eq('tank_id', settings.tank_id)
      .single();

    let result;
    if (existing) {
      // Обновление существующих настроек
      const { data, error } = await supabase
        .from('tank_calibration_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('tank_id', settings.tank_id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Создание новых настроек
      const { data, error } = await supabase
        .from('tank_calibration_settings')
        .insert({
          ...settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.json(result);
  } catch (error) {
    console.error('Error in POST /api/tank-calibration:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/tank-calibration/:tankId
 * Удалить настройки калибровки резервуара
 */
router.delete('/:tankId', async (req, res) => {
  try {
    const { tankId } = req.params;

    const { error } = await supabase
      .from('tank_calibration_settings')
      .delete()
      .eq('tank_id', tankId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/tank-calibration/:tankId:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tank-calibration/:tankId/run
 * Запустить процесс калибровки для резервуара
 */
router.post('/:tankId/run', async (req, res) => {
  try {
    const { tankId } = req.params;

    // Получаем настройки калибровки
    const { data: settings, error: settingsError } = await supabase
      .from('tank_calibration_settings')
      .select('*')
      .eq('tank_id', tankId)
      .single();

    if (settingsError || !settings) {
      return res.status(404).json({ error: 'Calibration settings not found' });
    }

    // Обновляем статус на "в процессе"
    await supabase
      .from('tank_calibration_settings')
      .update({
        calibration_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('tank_id', tankId);

    // TODO: Реализовать алгоритм калибровки
    // Это будет отдельный сервис, который:
    // 1. Получает исторические данные резервуара
    // 2. Применяет фильтры (исключение периодов слива, выбросов и т.д.)
    // 3. Вычисляет калибровочные коэффициенты
    // 4. Сохраняет результаты

    // Пока просто имитируем успешную калибровку
    setTimeout(async () => {
      await supabase
        .from('tank_calibration_settings')
        .update({
          calibration_status: 'completed',
          last_calibration_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('tank_id', tankId);
    }, 5000);

    res.json({
      success: true,
      message: 'Calibration started',
      tankId
    });
  } catch (error) {
    console.error('Error in POST /api/tank-calibration/:tankId/run:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
