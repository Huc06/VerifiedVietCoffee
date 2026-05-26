pub type CoffeePassportDatum {
  farm_id: ByteArray,
  lot_id: ByteArray,
  variety: ByteArray,
  processing: ByteArray,
  harvest_timestamp: Int,
  daily_events_merkle_root: ByteArray,
  photos_hash: ByteArray,
  gps_polygon_hash: ByteArray,
  sca_score: Int,
  lab_cert_hash: ByteArray,
  sustainability: SustainabilityProof,
  metadata_version: Int,
  extra: Data,
}

pub type SustainabilityProof {
  forest_baseline_hash: ByteArray,
  eudr_dds_hash: ByteArray,
  deforestation_risk_score: Int,
  fertilizer_log_hash: ByteArray,
  organic_input_ratio_pct: Int,
  synthetic_n_kg_per_ha: Int,
  co2e_per_kg_int10: Int,
  co2_calc_method: ByteArray,
  water_l_per_kg: Int,
  wastewater_treated: Bool,
  som_pct_int10: Int,
  soil_test_lab_hash: ByteArray,
  shade_canopy_pct: Int,
  bird_species_count: Int,
  biodiversity_audit_hash: ByteArray,
  certifications: List<CertRef>,
}

pub type CertRef {
  cert_type: ByteArray,
  issuer: ByteArray,
  cert_hash: ByteArray,
  expires_at: Int,
}

pub type PassportAction {
  Mint
  UpdateEvents
  UpdateSustainability
  UpdateLab
  Burn
}
