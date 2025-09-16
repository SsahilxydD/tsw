const querystring = require('querystring');

function formatRupees(paise) {
  return (paise / 100).toFixed(2);
}

function buildUpiLink({ pa, pn, amountPaise, orderId }) {
  const params = {
    pa,
    pn,
    am: formatRupees(amountPaise),
    cu: 'INR',
    tn: String(orderId || '').slice(0, 35),
    tr: String(orderId || '').slice(0, 35),
  };
  return 'upi://pay?' + querystring.stringify(params);
}

module.exports = {
  buildUpiLink,
  formatRupees,
};
