-- Seed data: sample farm + IoT devices
-- Run after setup.sql

INSERT INTO farms (id, name, province, altitude_m, gps_polygon) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bình Đông Farm', 'Lâm Đồng', 900, '{"type":"Polygon","coordinates":[[[107.811,11.544],[107.813,11.544],[107.813,11.546],[107.811,11.546],[107.811,11.544]]]}');

INSERT INTO iot_devices (farm_id, device_id, device_type, model, zone) VALUES
  ('00000000-0000-0000-0000-000000000001', 'teros12-block-A', 'soil', 'METER_TEROS_12', 'block-a'),
  ('00000000-0000-0000-0000-000000000001', 'weather-station-01', 'weather', 'ESP32_DIY_BME280', 'station'),
  ('00000000-0000-0000-0000-000000000001', 'cam-block-A', 'camera', 'ESP32_CAM', 'block-a');

INSERT INTO lots (farm_id, variety, processing, harvest_date, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Robusta', 'Honey', '2026-05-25', 'growing');
