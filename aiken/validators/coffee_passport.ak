use veriviet/types.{CoffeePassportDatum, PassportAction}

validator coffee_passport {
  mint(action: PassportAction, _ctx) {
    when action is {
      Mint -> True
      Burn -> True
      _ -> False
    }
  }

  spend(datum: Option<CoffeePassportDatum>, action: PassportAction, _ctx) {
    expect Some(_d) = datum
    when action is {
      UpdateEvents -> True
      UpdateSustainability -> True
      UpdateLab -> True
      _ -> False
    }
  }
}
