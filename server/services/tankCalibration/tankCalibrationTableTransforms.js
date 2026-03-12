function toIsoDateTime(value) {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function toDateOnly(value) {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString().slice(0, 10);
}

function normalizeCalibrationTablePoints(points) {
  const byLevel = new Map();

  (Array.isArray(points) ? points : []).forEach((point) => {
    const levelMm = Number(point?.level_mm);
    const volumeLiters = Number(point?.volume_liters);

    if (!Number.isFinite(levelMm) || !Number.isFinite(volumeLiters)) {
      return;
    }

    if (levelMm < 0 || volumeLiters < 0) {
      return;
    }

    const normalizedLevelMm = Math.round(levelMm);
    byLevel.set(normalizedLevelMm, {
      level_mm: normalizedLevelMm,
      volume_liters: Number(volumeLiters.toFixed(6)),
    });
  });

  return Array.from(byLevel.values()).sort((left, right) => left.level_mm - right.level_mm);
}

function interpolateVolume(points, levelMm) {
  const normalizedPoints = normalizeCalibrationTablePoints(points);
  if (!normalizedPoints.length) {
    return null;
  }

  const minLevel = normalizedPoints[0].level_mm;
  const maxLevel = normalizedPoints[normalizedPoints.length - 1].level_mm;

  if (levelMm < minLevel || levelMm > maxLevel) {
    return null;
  }

  for (let index = 0; index < normalizedPoints.length; index += 1) {
    const currentPoint = normalizedPoints[index];
    if (currentPoint.level_mm === levelMm) {
      return currentPoint.volume_liters;
    }

    const nextPoint = normalizedPoints[index + 1];
    if (!nextPoint) {
      break;
    }

    if (levelMm > currentPoint.level_mm && levelMm < nextPoint.level_mm) {
      const range = nextPoint.level_mm - currentPoint.level_mm;
      if (range === 0) {
        return currentPoint.volume_liters;
      }

      const ratio = (levelMm - currentPoint.level_mm) / range;
      return currentPoint.volume_liters + ratio * (nextPoint.volume_liters - currentPoint.volume_liters);
    }
  }

  return null;
}

function buildComparisonWithPrevious(currentTable, previousTable) {
  const currentPoints = normalizeCalibrationTablePoints(currentTable);
  const previousPoints = normalizeCalibrationTablePoints(previousTable);

  if (!previousPoints.length) {
    return { has_previous: false };
  }

  let totalDifferencePercent = 0;
  let maxDifferencePercent = 0;
  let maxDifferenceLevelMm;
  let pointsWithSignificantChange = 0;
  let comparedPoints = 0;

  currentPoints.forEach((point) => {
    const previousVolume = interpolateVolume(previousPoints, point.level_mm);
    if (previousVolume === null || previousVolume <= 0) {
      return;
    }

    const differencePercent = Math.abs(((point.volume_liters - previousVolume) / previousVolume) * 100);
    totalDifferencePercent += differencePercent;
    comparedPoints += 1;

    if (differencePercent >= 0.5) {
      pointsWithSignificantChange += 1;
    }

    if (differencePercent > maxDifferencePercent) {
      maxDifferencePercent = differencePercent;
      maxDifferenceLevelMm = point.level_mm;
    }
  });

  if (comparedPoints === 0) {
    return { has_previous: true };
  }

  return {
    has_previous: true,
    average_difference_percent: Number((totalDifferencePercent / comparedPoints).toFixed(4)),
    max_difference_percent: Number(maxDifferencePercent.toFixed(4)),
    max_difference_level_mm: maxDifferenceLevelMm,
    points_with_significant_change: pointsWithSignificantChange,
  };
}

function normalizeOptionalObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return Object.keys(value).length > 0 ? value : undefined;
}

function normalizeCalibrationTable(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    tank_id: String(row.tank_id),
    version: Number(row.version) || 1,
    is_active: Boolean(row.is_active),
    status: row.status || 'draft',
    table: normalizeCalibrationTablePoints(row.table_points),
    analysis_start_date: toDateOnly(row.analysis_start_date),
    analysis_end_date: toDateOnly(row.analysis_end_date),
    calibration_settings_snapshot: normalizeOptionalObject(row.calibration_settings_snapshot),
    statistics: normalizeOptionalObject(row.statistics),
    diagnostics: normalizeOptionalObject(row.diagnostics),
    comparison_with_previous: normalizeOptionalObject(row.comparison_with_previous),
    created_by: row.created_by ? String(row.created_by) : undefined,
    created_at: toIsoDateTime(row.created_at),
    creation_notes: row.creation_notes || undefined,
    approved_by: row.approved_by ? String(row.approved_by) : undefined,
    approved_at: toIsoDateTime(row.approved_at),
    approval_notes: row.approval_notes || undefined,
    rejected_by: row.rejected_by ? String(row.rejected_by) : undefined,
    rejected_at: toIsoDateTime(row.rejected_at),
    rejection_reason: row.rejection_reason || undefined,
    applied_by: row.applied_by ? String(row.applied_by) : undefined,
    applied_at: toIsoDateTime(row.applied_at),
    updated_at: toIsoDateTime(row.updated_at),
  };
}

function buildCalibrationTableDownload(table, format) {
  const points = normalizeCalibrationTablePoints(table?.table);
  const filenameBase = `tank-${table?.tank_id || 'unknown'}-calibration-v${table?.version || 1}`;

  if (format === 'json') {
    return {
      content: JSON.stringify(points, null, 2),
      filename: `${filenameBase}.json`,
      mimeType: 'application/json; charset=utf-8',
    };
  }

  const header = 'level_mm,volume_liters';
  const rows = points.map((point) => `${point.level_mm},${point.volume_liters}`);

  return {
    content: [header, ...rows].join('\n'),
    filename: `${filenameBase}.csv`,
    mimeType: 'text/csv; charset=utf-8',
  };
}

module.exports = {
  buildCalibrationTableDownload,
  buildComparisonWithPrevious,
  normalizeCalibrationTable,
  normalizeCalibrationTablePoints,
};
