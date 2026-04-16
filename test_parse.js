const xlsx = require('xlsx');
const wb = xlsx.readFile('testcont(Sheet1).csv');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);
console.log(rows[0]);
console.log(Object.keys(rows[0]));
