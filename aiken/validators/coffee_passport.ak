use aiken/collection/dict
use aiken/collection/list
use aiken/primitive/bytearray
use cardano/assets
use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference, Transaction, Output, Input, InlineDatum}
use veriviet/types.{
  CoffeePassportDatum,
  SpendAction, UpdateEvents, UpdateSustainability, UpdateLab,
  MintAction, MintPassport, BurnPassport,
}

// CIP-68 token label prefixes (first 4 bytes of token name)
const cip68_reference_label = #"000643b0"
const cip68_user_label = #"000de140"

validator coffee_passport {
  /// Spend handler: validates datum updates on the reference token UTxO.
  /// Only the owner can update, and lot_id / farm_id are immutable.
  spend(
    raw_datum: Option<Data>,
    raw_redeemer: Data,
    own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum_data) = raw_datum
    expect old_datum: CoffeePassportDatum = datum_data
    expect action: SpendAction = raw_redeemer

    // Owner must sign
    expect list.has(self.extra_signatories, old_datum.owner)

    // Find own input to get script address
    expect Some(own_input) =
      list.find(self.inputs, fn(i) { i.output_reference == own_ref })

    let own_address = own_input.output.address

    // Find continuing output at same address with inline datum
    expect Some(cont_output) =
      list.find(self.outputs, fn(o) { o.address == own_address })

    expect InlineDatum(new_datum_data) = cont_output.datum
    expect new_datum: CoffeePassportDatum = new_datum_data

    // Immutable fields must not change
    expect and {
      new_datum.farm_id == old_datum.farm_id,
      new_datum.lot_id == old_datum.lot_id,
      new_datum.owner == old_datum.owner,
    }

    // Validate which fields changed based on action
    when action is {
      UpdateEvents ->
        and {
          new_datum.variety == old_datum.variety,
          new_datum.processing == old_datum.processing,
          new_datum.harvest_timestamp == old_datum.harvest_timestamp,
          new_datum.sca_score == old_datum.sca_score,
          new_datum.metadata_version == old_datum.metadata_version,
        }
      UpdateSustainability ->
        and {
          new_datum.variety == old_datum.variety,
          new_datum.processing == old_datum.processing,
          new_datum.harvest_timestamp == old_datum.harvest_timestamp,
          new_datum.daily_events_merkle_root == old_datum.daily_events_merkle_root,
          new_datum.photos_hash == old_datum.photos_hash,
          new_datum.metadata_version == old_datum.metadata_version,
        }
      UpdateLab ->
        and {
          new_datum.variety == old_datum.variety,
          new_datum.processing == old_datum.processing,
          new_datum.harvest_timestamp == old_datum.harvest_timestamp,
          new_datum.daily_events_merkle_root == old_datum.daily_events_merkle_root,
          new_datum.photos_hash == old_datum.photos_hash,
          new_datum.gps_polygon_hash == old_datum.gps_polygon_hash,
          new_datum.metadata_version == old_datum.metadata_version,
        }
    }
  }

  /// Mint handler: controls minting and burning of CIP-68 token pairs.
  /// Mint: must produce both reference (100) and user (222) tokens.
  /// Burn: all quantities must be negative.
  mint(
    raw_redeemer: Data,
    policy_id: PolicyId,
    self: Transaction,
  ) {
    expect action: MintAction = raw_redeemer

    let minted_tokens =
      self.mint
        |> assets.tokens(policy_id)
        |> dict.to_pairs()

    when action is {
      MintPassport -> {
        // Must mint exactly 2 tokens
        expect list.length(minted_tokens) == 2

        let has_ref =
          list.any(
            minted_tokens,
            fn(pair) { bytearray.take(pair.1st, 4) == cip68_reference_label },
          )

        let has_user =
          list.any(
            minted_tokens,
            fn(pair) { bytearray.take(pair.1st, 4) == cip68_user_label },
          )

        let all_qty_one =
          list.all(minted_tokens, fn(pair) { pair.2nd == 1 })

        and {
          has_ref,
          has_user,
          all_qty_one,
        }
      }
      BurnPassport ->
        list.all(minted_tokens, fn(pair) { pair.2nd < 0 })
    }
  }
}
