use aiken/crypto.{VerificationKeyHash}

/// Third-party certification reference (EU Organic, Rainforest Alliance, etc.)
pub type CertRef {
  cert_type: ByteArray,
  issuer: ByteArray,
  cert_hash: ByteArray,
  expires_at: Int,
}

/// On-chain sustainability metrics — all verified via IoT + lab data hashes
pub type SustainabilityProof {
  /// EUDR compliance
  forest_baseline_hash: ByteArray,
  eudr_dds_hash: ByteArray,
  deforestation_risk_score: Int,
  /// Fertilizer "4 đúng" tracking
  fertilizer_log_hash: ByteArray,
  organic_input_ratio_pct: Int,
  synthetic_n_kg_per_ha: Int,
  /// Carbon footprint (ISO 14067), value × 10 for fixed-point
  co2e_per_kg_int10: Int,
  co2_calc_method: ByteArray,
  /// Water usage
  water_l_per_kg: Int,
  wastewater_treated: Bool,
  /// Soil health, SOM% × 10
  som_pct_int10: Int,
  soil_test_lab_hash: ByteArray,
  /// Biodiversity
  shade_canopy_pct: Int,
  bird_species_count: Int,
  biodiversity_audit_hash: ByteArray,
  /// Third-party certifications
  certifications: List<CertRef>,
}

/// The CIP-68 reference datum for a coffee lot passport.
/// Stored inline at the script address alongside the reference token (100 label).
pub type CoffeePassportDatum {
  farm_id: ByteArray,
  lot_id: ByteArray,
  variety: ByteArray,
  processing: ByteArray,
  harvest_timestamp: Int,
  /// Merkle root of all IoT events for the day (Tier 1 anchor)
  daily_events_merkle_root: ByteArray,
  /// SHA-256 of photo bundle
  photos_hash: ByteArray,
  /// SHA-256 of GPS polygon GeoJSON
  gps_polygon_hash: ByteArray,
  /// Lab results (0 = not yet available)
  sca_score: Int,
  lab_cert_hash: ByteArray,
  /// Sustainability proof (updatable per-season)
  sustainability: SustainabilityProof,
  /// Schema version for forward compatibility
  metadata_version: Int,
  /// Authorized updater (farm owner pubkey hash)
  owner: VerificationKeyHash,
}

/// Redeemer actions for the spend handler (datum updates)
pub type SpendAction {
  UpdateEvents
  UpdateSustainability
  UpdateLab
}

/// Redeemer actions for the mint handler
pub type MintAction {
  MintPassport
  BurnPassport
}
