(() => {
  const clone = value => {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  const asyncResult = producer => Promise.resolve().then(() => clone(producer()));

  const api = {
    version: "mock-api-v1",
    mode: "promise-adapter",
    meta: {
      source: "local-mock",
      production: false,
      note: "Synthetic data only; replace transport without changing page contracts."
    },
    finance: {
      summary: () => asyncResult(() => AFF.finance.summary()),
      configuration: () => asyncResult(() => AFF.finance.configuration),
      withdrawals: {
        list: () => asyncResult(() => AFF.finance.allWithdrawals()),
        create: (amount, method) => asyncResult(() => AFF.finance.createWithdrawal(amount, method)),
        approve: id => asyncResult(() => AFF.finance.approveWithdrawal(id)),
        status: (id, status) => asyncResult(() => AFF.finance.setWithdrawalStatus(id, status))
      },
      guarantee: {
        list: () => asyncResult(() => AFF.finance.guaranteeRecords),
        availableLots: () => asyncResult(() => AFF.finance.availableLots)
      },
      settlements: {
        list: () => asyncResult(() => AFF.finance.settlements),
        batches: () => asyncResult(() => AFF.finance.statementBatches)
      }
    },
    reports: {
      clients: () => asyncResult(() => AFF.reporting.rows),
      totals: rows => asyncResult(() => AFF.reporting.totals(rows || AFF.reporting.rows))
    },
    account: {
      current: () => asyncResult(() => AFF.state.account),
      onboarding: () => asyncResult(() => AFF.state.onboarding)
    }
  };

  AFF.api = api;
})();
