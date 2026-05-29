export interface PlaidItem {
  access_token: string;
  item_id: string;
  institution_name: string;
  last_synced_at: string | null;
}

export interface PlaidAccount {
  plaid_account_id: string;
  name: string;
  balance_usd: number;
  mask: string | null;
  subtype: string | null;
}

export interface LinkTokenResponse {
  link_token: string;
}

export interface ExchangeTokenRequest {
  public_token: string;
}

export interface ExchangeTokenResponse {
  item_id: string;
  institution_name: string;
}
