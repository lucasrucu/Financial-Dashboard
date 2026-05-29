import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";

function getPlaidEnvironment() {
  const env = process.env.PLAID_ENV ?? "sandbox";

  if (env === "production") {
    return PlaidEnvironments.production;
  }

  if (env === "development") {
    return PlaidEnvironments.development;
  }

  return PlaidEnvironments.sandbox;
}

function getPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId || !secret) {
    throw new Error("Missing Plaid environment variables");
  }

  const configuration = new Configuration({
    basePath: getPlaidEnvironment(),
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export async function createLinkToken(userId = "single-user") {
  const client = getPlaidClient();

  const response = await client.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "Financial Dashboard",
    products: [Products.Transactions, Products.Balance],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return response.data.link_token;
}

export async function exchangePublicToken(publicToken: string) {
  const client = getPlaidClient();
  const response = await client.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

export async function getInstitutionName(accessToken: string) {
  const client = getPlaidClient();

  const itemResponse = await client.itemGet({ access_token: accessToken });
  const institutionId = itemResponse.data.item.institution_id;

  if (!institutionId) {
    return "Connected Bank";
  }

  const institutionResponse = await client.institutionsGetById({
    institution_id: institutionId,
    country_codes: [CountryCode.Us],
  });

  return institutionResponse.data.institution.name;
}

function mapPlaidAccount(account: {
  account_id: string;
  name: string;
  mask: string | null;
  subtype: string | null;
  balances: {
    current: number | null;
    available: number | null;
  };
}) {
  return {
    plaid_account_id: account.account_id,
    name: account.name,
    balance_usd: account.balances.current ?? account.balances.available ?? 0,
    mask: account.mask ?? null,
    subtype: account.subtype ?? null,
  };
}

export async function fetchAccounts(accessToken: string) {
  const client = getPlaidClient();

  try {
    const response = await client.accountsBalanceGet({ access_token: accessToken });
    return response.data.accounts.map(mapPlaidAccount);
  } catch {
    const response = await client.accountsGet({ access_token: accessToken });
    return response.data.accounts.map(mapPlaidAccount);
  }
}

export async function fetchTransactions(accessToken: string, days = 90) {
  const client = getPlaidClient();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const formatDate = (date: Date) => date.toISOString().slice(0, 10);

  const transactions: Array<{
    plaid_transaction_id: string;
    plaid_account_id: string;
    date: string;
    name: string;
    amount_usd: number;
    plaid_category: string[] | null;
  }> = [];

  let offset = 0;
  const count = 500;
  let total = Infinity;

  while (offset < total) {
    const response = await client.transactionsGet({
      access_token: accessToken,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      options: {
        count,
        offset,
      },
    });

    total = response.data.total_transactions;

    for (const transaction of response.data.transactions) {
      transactions.push({
        plaid_transaction_id: transaction.transaction_id,
        plaid_account_id: transaction.account_id,
        date: transaction.date,
        name: transaction.name,
        amount_usd: transaction.amount,
        plaid_category: transaction.category ?? null,
      });
    }

    offset += response.data.transactions.length;

    if (response.data.transactions.length === 0) {
      break;
    }
  }

  return transactions;
}
