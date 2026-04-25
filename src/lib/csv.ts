// CSV ユーティリティ: 文字列⇔2次元配列の相互変換を行う。
// RFC 4180 に概ね準拠（ダブルクォート囲み、エスケープ "" に対応）。

// CSV 形式の文字列を string[][] にパースする
// 例: 'a,b\n"c,d","e""f"' → [['a','b'],['c,d','e"f']]
export function parseCsv(text: string): string[][] {
  // 先頭の BOM (U+FEFF) を取り除く（Excel が出力する CSV によく付いてくる）
  const stripped = text.replace(/^﻿/, '');
  // 結果格納用。型注釈で「string の配列の配列」と明示
  const rows: string[][] = [];
  // 現在組み立て中のセル文字列
  let current = '';
  // 現在組み立て中の行（セルの配列）
  let row: string[] = [];
  // ダブルクォート内かどうかのフラグ（true のときは , や改行をセル区切りとみなさない）
  let inQuotes = false;

  // 文字を1つずつ走査する
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inQuotes) {
      // クォート区間内の処理
      if (ch === '"') {
        // 連続する "" はエスケープされた " 1文字として扱う
        if (stripped[i + 1] === '"') {
          current += '"';
          i++; // 次の " を消費
        } else {
          // 単独の " はクォート区間の終了
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }
    // クォート区間外の処理
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      // セル区切り
      row.push(current);
      current = '';
      continue;
    }
    // CRLF を扱うため \r は単独では無視
    if (ch === '\r') continue;
    if (ch === '\n') {
      // 行区切り: 現在のセルと行を確定して次の行へ
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }
    current += ch;
  }
  // 末尾に改行がない場合の最終行を取り込む
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  // 全セルが空白の行は無視する（trim() 後に長さ0なら除外）
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

// 1セル分の値を CSV 用にエスケープする
// " , 改行 を含むときだけダブルクォートで囲む
function escapeCsvCell(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    // 内部の " は "" に置換してからクォートで囲む
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// 2次元配列を CSV 文字列に変換する
// 値の型は string / number / null / undefined を許容（null/undefined は空文字に）
export function buildCsv(rows: (string | number | null | undefined)[][]): string {
  return rows
    // 各行: cell が null/undefined なら ''、それ以外は文字列化してエスケープ → カンマ結合
    .map((row) => row.map((cell) => escapeCsvCell(cell == null ? '' : String(cell))).join(','))
    // 行は CRLF で結合（Excel との互換性のため）
    .join('\r\n');
}
