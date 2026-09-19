-- Migración 0015: licencia simple offline.
-- Reemplaza el sistema de Supabase por un botón offline.

CREATE TABLE IF NOT EXISTS licencia_local (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    vence_en TEXT NOT NULL,
    activada_en TEXT NOT NULL,
    activada_por TEXT NOT NULL
);

-- Primera activación: 30 días desde hoy
INSERT OR IGNORE INTO licencia_local (id, vence_en, activada_en, activada_por)
VALUES (
    1,
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days'),
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
    'instalacion'
);
