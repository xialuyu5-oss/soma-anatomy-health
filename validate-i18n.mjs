import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const sandbox={};vm.createContext(sandbox);
vm.runInContext(read('i18n-catalog.js'),sandbox);vm.runInContext(read('i18n.js'),sandbox);
const rows=sandbox.SOMA_MESSAGES,i18n=sandbox.SomaI18n;
assert.equal(new Set(rows.map(r=>r[0])).size,rows.length,'Duplicate source keys');
for(const row of rows){assert.equal(row.length,3);for(const value of row){assert.equal(typeof value,'string');assert.ok(value.trim());assert.deepEqual([...value.matchAll(/\{\w+\}/g)].map(x=>x[0]).sort(),[...row[0].matchAll(/\{\w+\}/g)].map(x=>x[0]).sort());}}
const html=read('body-composition.html').replace(/<script[\s\S]*?<\/script>/g,'');
const sourceTexts=[...html.matchAll(/>([^<>]+)</g)].map(m=>m[1].trim()).filter(t=>/[\u4e00-\u9fff]/.test(t)&&!['简体中文','日本語'].includes(t));
const attributes=[...html.matchAll(/(?:aria-label|placeholder|content)="([^"]*)"/g)].map(m=>m[1]).filter(t=>/[\u4e00-\u9fff]/.test(t));
for(const locale of ['en','ja']){
 i18n.setLocale(locale);
 for(const source of [...sourceTexts,...attributes])assert.ok(rows.some(row=>row[0]===source),'Missing '+locale+': '+source);
 for(const source of ['已更新 · 123 ms · 真实人体与独立服装网格','人体资源读取失败（404）','已导入 12 个真实网格。点击结构高亮；名称来自原文件。','未读取文件：参数超出允许范围：height','肌肉量指骨骼肌质量；数值驱动近似外形，不是身体测量或训练效果预测。 当前模型在此身高下仅能表现约 12.2–46.5 kg，已显示最接近的外形，输入值仍保留。'])assert.notEqual(i18n.text(source),source);
 const imported=i18n.text('已选择来源结构：体脂率。来源术语未翻译；未据此生成医学结论。');assert.ok(imported.includes('体脂率'),'Imported names must be unchanged');
 assert.equal(i18n.text('UNKNOWN_ASSET_123'),'UNKNOWN_ASSET_123');
 assert.equal(i18n.text('  身高 '),'  '+i18n.message('身高')+' ');
}
i18n.setLocale('unsupported');assert.equal(i18n.locale,'zh-CN');assert.equal(i18n.text('身高'),'身高');
const result={catalogEntries:rows.length,locales:Object.keys(i18n.locales),staticTextAndAttributes:sourceTexts.length+attributes.length,placeholders:'PASS',dynamicMessages:'PASS',sourceNames:'PASS',fallback:'PASS'};
fs.writeFileSync(new URL('validation/i18n-catalog-validation.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
