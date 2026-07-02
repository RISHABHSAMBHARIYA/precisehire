import xlsx from 'xlsx';
import { mapExcelData } from '../utils/excelMapper.js';

export function parseExcel(buffer) {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      console.warn('[PARSER] Excel file has no sheets');
      return [];
    }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      console.warn('[PARSER] First sheet is empty or invalid');
      return [];
    }
    const data = xlsx.utils.sheet_to_json(sheet);
    return mapExcelData(data);
  } catch (error) {
    console.error('[PARSER] Failed to parse Excel file:', error.message);
    return [];
  }
}
