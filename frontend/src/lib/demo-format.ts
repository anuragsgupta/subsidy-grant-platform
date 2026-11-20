export const formatCurrency = (amount: number, decimals = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));

export const formatDateTime = (value: string) => {
  const date = new Date(value);
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}`;
};

export const maskIdentity = (value: string) => `****${value.slice(-4)}`;
