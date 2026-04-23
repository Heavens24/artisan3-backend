export const getUserCurrency = async () => {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();

    const currencyMap = {
      ZA: 'ZAR',
      US: 'USD',
      GB: 'GBP',
      NG: 'NGN',
      KE: 'KES',
      GH: 'GHS'
    };

    return currencyMap[data.country_code] || 'USD';
  } catch {
    return 'ZAR';
  }
}

export const formatPrice = (amount, currency) => {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0
  }).format(amount);
}

export const getProPrice = (currency) => {
  const prices = { ZAR: 10, USD: 1, GBP: 1, NGN: 800, KES: 130, GHS: 12 };
  return prices[currency] || 1;
}