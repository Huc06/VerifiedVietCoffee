export const mockLotData = {
  lot_id: "LD-2026-0527",
  script_address: "addr_test1wp3nngu6mwwf5x0n4q5g7msc2r9qndnkhwsc6kqu3a9w8qs7g9a8m",
  ref_utxo: {
    tx_hash: "a8d3b8c9d2f0011e4aa98231dbccb49e8a011a8bc8a9b231ddcc1234abcd5678",
    output_index: 0,
  },
  passport: {
    farm_id: "Binh Dong Farm",
    lot_id: "LD-2026-0527",
    variety: "Yellow Bourbon",
    processing: "Honey",
    harvest_timestamp: 1729900800, // example timestamp
    daily_events_merkle_root: "sha256:9c4a1f308a3b5c4de42f1a23b34c56d7e8f90123a4b5c6d7e8f9a0b1c2d3e4f5",
    photos_hash: "sha256:21be907c8d8b2e3f4a5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
    gps_polygon_hash: "sha256:d47e082f3c4b5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    sca_score: 84.5,
    lab_cert_hash: "sha256:5f4dcc3b5aa765d61d8327deb882cf992b3bc361dc481358c27f6bb547d3c90f",
    sustainability: {
      forest_baseline_hash: "sha256:b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
      eudr_dds_hash: "sha256:c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
      deforestation_risk_score: 0,
      fertilizer_log_hash: "sha256:d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
      organic_input_ratio_pct: 65,
      synthetic_n_kg_per_ha: 15,
      co2e_per_kg_int10: 24, // 2.4 kg CO2e
      co2_calc_method: "ISO 14067",
      water_l_per_kg: 180,
      wastewater_treated: 1, // true/yes
      som_pct_int10: 35, // 3.5%
      soil_test_lab_hash: "sha256:e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
      shade_canopy_pct: 42,
      bird_species_count: 23,
      biodiversity_audit_hash: "sha256:f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a",
      certifications: ["Rainforest Alliance 2024", "EU Organic", "EUDR-compliant"],
    },
    metadata_version: 1,
    owner: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  },
  days: [
    {
      date: "2026-05-27",
      event_count: 96,
      merkle_root_offchain: "sha256:9c4a1f308a3b5c4de42f1a23b34c56d7e8f90123a4b5c6d7e8f9a0b1c2d3e4f5",
      merkle_root_onchain: "sha256:9c4a1f308a3b5c4de42f1a23b34c56d7e8f90123a4b5c6d7e8f9a0b1c2d3e4f5",
      tx_hash: "b8c9d2f0011e4aa98231dbccb49e8a011a8bc8a9b231ddcc1234abcd5678a8d3",
      status: "anchored",
      verified: true,
      current_root_match: true,
      events: [
        {
          event_type: "weather",
          data: { air_temp_c: 24.5, humidity_pct: 72.3, rain_mm: 0 }
        },
        {
          event_type: "soil",
          data: { soil_moisture_pct: 45.1, soil_temp_c: 22.3 }
        },
        {
          event_type: "photo",
          data: { photo_url: "https://images.unsplash.com/photo-1620959404289-0d32f5d72f91?auto=format&fit=crop&q=80&w=200&h=200" } // Example coffee cherry
        }
      ]
    },
    {
      date: "2026-05-26",
      event_count: 96,
      merkle_root_offchain: "sha256:8b3a0e2f792a4b3cd31e0912a23b45c6d7e8f90123a4b5c6d7e8f9a0b1c2d3e4",
      merkle_root_onchain: "sha256:8b3a0e2f792a4b3cd31e0912a23b45c6d7e8f90123a4b5c6d7e8f9a0b1c2d3e4",
      tx_hash: "c9d2f0011e4aa98231dbccb49e8a011a8bc8a9b231ddcc1234abcd5678a8d3b8",
      status: "anchored",
      verified: true,
      current_root_match: false,
      events: [
        {
          event_type: "weather",
          data: { air_temp_c: 23.8, humidity_pct: 75.1, rain_mm: 1.2 }
        },
        {
          event_type: "soil",
          data: { soil_moisture_pct: 46.8, soil_temp_c: 21.9 }
        },
        {
          event_type: "photo",
          data: { photo_url: "https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?auto=format&fit=crop&q=80&w=200&h=200" }
        }
      ]
    },
    {
      date: "2026-05-25",
      event_count: 94,
      merkle_root_offchain: "sha256:7a29df1e68193a2bc20d9801912a34b5c6d7e8f90123a4b5c6d7e8f9a0b1c2d3",
      merkle_root_onchain: "sha256:7a29df1e68193a2bc20d9801912a34b5c6d7e8f90123a4b5c6d7e8f9a0b1c2d3",
      tx_hash: "d2f0011e4aa98231dbccb49e8a011a8bc8a9b231ddcc1234abcd5678a8d3b8c9",
      status: "anchored",
      verified: true,
      current_root_match: false,
      events: [
        {
          event_type: "weather",
          data: { air_temp_c: 25.1, humidity_pct: 68.4, rain_mm: 0 }
        },
        {
          event_type: "soil",
          data: { soil_moisture_pct: 43.5, soil_temp_c: 22.8 }
        },
        {
          event_type: "photo",
          data: { photo_url: "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&q=80&w=200&h=200" }
        }
      ]
    }
  ]
};
