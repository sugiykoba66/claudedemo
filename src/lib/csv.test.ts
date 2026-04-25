// CSV パース／生成の不変条件を検証する単体テスト。
// ピュアな関数なので DB やネットワークを使わずに実行できる。

import { describe, it, expect } from 'vitest';
import { parseCsv, buildCsv } from './csv';

describe('parseCsv', () => {
  it('カンマ区切りの素朴な CSV をパースできる', () => {
    expect(parseCsv('a,b,c\nd,e,f')).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
  });

  it('CRLF 改行を扱える', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('ダブルクォート囲みの中のカンマ・改行をセル区切りとみなさない', () => {
    expect(parseCsv('"a,b","c\nd"\nx,y')).toEqual([
      ['a,b', 'c\nd'],
      ['x', 'y'],
    ]);
  });

  it('連続する "" をエスケープされた " 1 文字として扱う', () => {
    expect(parseCsv('"a""b",c')).toEqual([['a"b', 'c']]);
  });

  it('先頭の BOM (U+FEFF) を取り除く', () => {
    expect(parseCsv('﻿a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('全セルが空白の行は除外する', () => {
    expect(parseCsv('a,b\n  ,  \nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('末尾に改行が無くても最終行を取りこぼさない', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('buildCsv', () => {
  it('特殊文字を含まないセルはそのまま結合する', () => {
    expect(buildCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d');
  });

  it('カンマを含むセルはダブルクォートで囲む', () => {
    expect(buildCsv([['a,b', 'c']])).toBe('"a,b",c');
  });

  it('ダブルクォートを含むセルは "" にエスケープしてクォートで囲む', () => {
    expect(buildCsv([['a"b', 'c']])).toBe('"a""b",c');
  });

  it('改行を含むセルはダブルクォートで囲む', () => {
    expect(buildCsv([['line1\nline2', 'c']])).toBe('"line1\nline2",c');
  });

  it('null と undefined は空文字に変換する', () => {
    expect(buildCsv([[null, undefined, 'x']])).toBe(',,x');
  });

  it('数値は文字列化される', () => {
    expect(buildCsv([[1, 2, 3]])).toBe('1,2,3');
  });

  it('行区切りは CRLF で出力される（Excel 互換）', () => {
    const csv = buildCsv([['a'], ['b']]);
    expect(csv).toBe('a\r\nb');
  });
});
