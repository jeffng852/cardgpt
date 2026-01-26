const { parseTransaction } = require('./src/lib/parser/transactionParser.ts');

const result = parseTransaction("Dinner for $100");
console.log(JSON.stringify(result, null, 2));
