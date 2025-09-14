// Временный скрипт для обновления данных оборудования в браузере
// Выполнить в консоли браузера для сброса localStorage

console.log('Очистка старых данных оборудования...');
localStorage.removeItem('equipment_data');
console.log('Данные оборудования очищены. Перезагрузите страницу.');

// Или можно напрямую установить новые данные:
const newEquipmentData = [
  // АЗС №001 - Центральная (point1)
  {
    id: "tank_p1_92", trading_point_id: "point1", name: "Резервуар", system_type: "fuel_tank",
    display_name: "АИ-92 - Резервуар №1", serial_number: "TANK-001-92", external_id: "TANK_P1_92",
    status: "online", installation_date: "2024-01-15T00:00:00Z",
    params: { id: 1, name: "АИ-92 - Резервуар №1", fuelType: "АИ-92", currentLevelLiters: 38000, capacityLiters: 50000, minLevelPercent: 20, criticalLevelPercent: 10, volume: 50000, temperature: 15.2, waterLevelMm: 1, material: "steel", thresholds: { criticalTemp: { min: -10, max: 40 }, maxWaterLevel: 15 } },
    created_at: "2024-01-15T12:00:00Z", updated_at: "2024-12-08T10:30:00Z", created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"], components: []
  },
  {
    id: "tank_p1_95", trading_point_id: "point1", name: "Резервуар", system_type: "fuel_tank",
    display_name: "АИ-95 - Резервуар №2", serial_number: "TANK-001-95", external_id: "TANK_P1_95",
    status: "online", installation_date: "2024-01-15T00:00:00Z",
    params: { id: 2, name: "АИ-95 - Резервуар №2", fuelType: "АИ-95", currentLevelLiters: 42000, capacityLiters: 50000, minLevelPercent: 20, criticalLevelPercent: 10, volume: 50000, temperature: 15.8, waterLevelMm: 2, material: "steel", thresholds: { criticalTemp: { min: -10, max: 40 }, maxWaterLevel: 15 } },
    created_at: "2024-01-15T12:00:00Z", updated_at: "2024-12-08T09:15:00Z", created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"], components: []
  },
  {
    id: "tank_p1_dt", trading_point_id: "point1", name: "Резервуар", system_type: "fuel_tank",
    display_name: "ДТ - Резервуар №3", serial_number: "TANK-001-DT", external_id: "TANK_P1_DT",
    status: "online", installation_date: "2024-01-15T00:00:00Z",
    params: { id: 3, name: "ДТ - Резервуар №3", fuelType: "ДТ", currentLevelLiters: 28000, capacityLiters: 40000, minLevelPercent: 25, criticalLevelPercent: 12, volume: 40000, temperature: 16.5, waterLevelMm: 1, material: "steel", thresholds: { criticalTemp: { min: -10, max: 40 }, maxWaterLevel: 15 } },
    created_at: "2024-01-15T12:00:00Z", updated_at: "2024-12-08T11:45:00Z", created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"], components: []
  },
  {
    id: "tank_p1_98", trading_point_id: "point1", name: "Резервуар", system_type: "fuel_tank",
    display_name: "АИ-98 - Резервуар №4", serial_number: "TANK-001-98", external_id: "TANK_P1_98",
    status: "online", installation_date: "2024-01-15T00:00:00Z",
    params: { id: 4, name: "АИ-98 - Резервуар №4", fuelType: "АИ-98", currentLevelLiters: 18500, capacityLiters: 25000, minLevelPercent: 18, criticalLevelPercent: 9, volume: 25000, temperature: 16.1, waterLevelMm: 0.5, material: "steel", thresholds: { criticalTemp: { min: -10, max: 40 }, maxWaterLevel: 15 } },
    created_at: "2024-01-15T12:00:00Z", updated_at: "2024-12-08T08:30:00Z", created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"], components: []
  },
  // АЗС №002 - Северная (point2)
  {
    id: "tank_p2_92", trading_point_id: "point2", name: "Резервуар", system_type: "fuel_tank",
    display_name: "АИ-92 - Резервуар №1", serial_number: "TANK-002-92", external_id: "TANK_P2_92",
    status: "online", installation_date: "2024-02-01T00:00:00Z",
    params: { id: 5, name: "АИ-92 - Резервуар №1", fuelType: "АИ-92", currentLevelLiters: 35000, capacityLiters: 50000, minLevelPercent: 20, criticalLevelPercent: 10, volume: 50000, temperature: 14.8, waterLevelMm: 1, material: "steel", thresholds: { criticalTemp: { min: -10, max: 40 }, maxWaterLevel: 15 } },
    created_at: "2024-02-01T12:00:00Z", updated_at: "2024-12-08T09:20:00Z", created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"], components: []
  },
  {
    id: "tank_p2_dt", trading_point_id: "point2", name: "Резервуар", system_type: "fuel_tank",
    display_name: "ДТ - Резервуар №2", serial_number: "TANK-002-DT", external_id: "TANK_P2_DT",
    status: "online", installation_date: "2024-02-01T00:00:00Z",
    params: { id: 6, name: "ДТ - Резервуар №2", fuelType: "ДТ", currentLevelLiters: 45000, capacityLiters: 60000, minLevelPercent: 25, criticalLevelPercent: 12, volume: 60000, temperature: 15.2, waterLevelMm: 2, material: "steel", thresholds: { criticalTemp: { min: -10, max: 40 }, maxWaterLevel: 15 } },
    created_at: "2024-02-01T12:00:00Z", updated_at: "2024-12-08T10:15:00Z", created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"], components: []
  },
  {
    id: "tank_p2_100", trading_point_id: "point2", name: "Резервуар", system_type: "fuel_tank",
    display_name: "АИ-100 - Резервуар №3", serial_number: "TANK-002-100", external_id: "TANK_P2_100",
    status: "online", installation_date: "2024-02-01T00:00:00Z",
    params: { id: 7, name: "АИ-100 - Резервуар №3", fuelType: "АИ-100", currentLevelLiters: 12000, capacityLiters: 20000, minLevelPercent: 15, criticalLevelPercent: 8, volume: 20000, temperature: 15.5, waterLevelMm: 0.5, material: "steel", thresholds: { criticalTemp: { min: -10, max: 40 }, maxWaterLevel: 15 } },
    created_at: "2024-02-01T12:00:00Z", updated_at: "2024-12-08T11:00:00Z", created_from_template: "1",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"], components: []
  },
  // Системы управления
  {
    id: "control_p1", trading_point_id: "point1", name: "Система управления", system_type: "control_system",
    display_name: "Система управления АЗС №001", serial_number: "CTRL-001", external_id: "CTRL_P1",
    status: "online", installation_date: "2024-01-10T00:00:00Z",
    params: { server_type: "industrial", redundancy: true, uptime: 99.98, load: 45, connections: 12 },
    created_at: "2024-01-10T12:00:00Z", updated_at: "2024-12-08T11:00:00Z", created_from_template: "3",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"], components: []
  },
  {
    id: "control_p2", trading_point_id: "point2", name: "Система управления", system_type: "control_system",
    display_name: "Система управления АЗС №002", serial_number: "CTRL-002", external_id: "CTRL_P2",
    status: "online", installation_date: "2024-02-10T00:00:00Z",
    params: { server_type: "industrial", redundancy: true, uptime: 99.95, load: 38, connections: 8 },
    created_at: "2024-02-10T12:00:00Z", updated_at: "2024-12-08T10:45:00Z", created_from_template: "3",
    availableCommandIds: ["autooplata_restart_terminal", "autooplata_equipment_status", "autooplata_login"], components: []
  }
];

localStorage.setItem('equipment_data', JSON.stringify(newEquipmentData));
console.log('Новые данные оборудования установлены. Перезагрузите страницу.');