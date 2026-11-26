import test from 'node:test';
import assert from 'node:assert/strict';
import { translationIssues } from '../src/server/enrichment/title-quality';
test('summary translation gates retain numbers and biologics terminology',()=>{
 const source='Biosimilar products require immunogenicity assessment in 2 studies.';
 assert.deepEqual(translationIssues(source,'生物类似药产品需要在 2 项研究中进行免疫原性评估。'),[]);
 assert.ok(translationIssues(source,'生物类似药产品需要进行免疫原性评估。').includes('number_mismatch'));
 assert.ok(translationIssues(source,'该产品需要在 2 项研究中评估。').some(i=>i.startsWith('terminology:')));
 assert.ok(translationIssues(source,source).includes('no_chinese'));
});
