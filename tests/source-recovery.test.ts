import test from 'node:test';
import assert from 'node:assert/strict';
import {parseList as emaList} from '../src/server/connectors/ema/parser';
import {parseList as cdeList,directoryLinks,parseDetail as cdeDetail} from '../src/server/connectors/cde/parser';
import {pharmacopoeiaAdapter} from '../src/server/connectors/pharmacopoeia';
import {OfficialClient} from '../src/server/connectors/shared/client';
const catalog='https://www.ema.europa.eu/en/documents/report/scientific-guidelines-output-json-report_en.json';
test('EMA catalog admits specific human guidelines without inventing document dates or body',()=>{
 const rows=[{title:'Biological vaccine guideline',category:'Human',url:'https://www.ema.europa.eu/en/scientific-guidelines/vaccine',first_published_date:'01/01/2000'},{title:'Veterinary vaccine',category:'Veterinary',url:'https://www.ema.europa.eu/en/scientific-guidelines/vet'},{title:'Biological portal',category:'Human',url:'https://www.ema.europa.eu/en'}];
 const result=emaList(JSON.stringify({meta:{total_records:3},data:rows}),catalog);
 assert.equal(result.length,1);assert.equal(result[0].fallbackDocument?.date,undefined);assert.equal(result[0].fallbackDocument?.content,undefined);
 assert.throws(()=>emaList(JSON.stringify({meta:{total_records:4},data:rows}),catalog),/Incomplete/);
});
test('CDE official search pages are discovery only and paginate without indexing search links',()=>{
 const u='https://www.ydcdei.org.cn/search?keyword=指导原则';const h='<script>total: 3</script><a title="细胞治疗技术指导原则" href="/news/show/123">原文</a><a title="细胞治疗技术指导原则" href="/search">搜索</a>';
 assert.equal(cdeList(h,u).length,1);assert.equal(cdeList(h,u)[0].document,undefined);assert.equal(directoryLinks(h,u).length,2);assert.equal(directoryLinks(h,directoryLinks(h,u)[0]).length,0);
});
test('EDQM chapter FAQ without a trailing question mark is not lost',()=>{
 const a=pharmacopoeiaAdapter('EDQM');const u='https://faq.edqm.eu/display/FAQS/MICROBIOLOGY';const h='<ul class="childpages-macro"><a href="/display/FAQS/chapters">Other questions on general chapters 2.6.12</a></ul>';
 assert.equal(a.directoryLinks!(h,u).length,1);assert.deepEqual(a.parseList(h,u),[]);
 assert.equal(a.parseList('<h1 id="title-text">Other questions on general chapters 2.6.12</h1><div class="wiki-content">Answer: consult the official chapter formulary in the knowledge database.</div>','https://faq.edqm.eu/display/FAQS/chapters').length,1);
});
test('Retry-After defers same-host requests rather than hammering a limited agency',async(t)=>{
 const mock=t.mock.method(globalThis,'fetch',async()=>new Response('Limited',{status:429,headers:{'Retry-After':'120'}}));const client=new OfficialClient(u=>u,0,1000,2);
 await assert.rejects(client.get('https://www.ema.europa.eu/one'),/429/);await assert.rejects(client.get('https://www.ema.europa.eu/two'),/deferred/);assert.equal(mock.mock.callCount(),1);
});

 test('CDE verifies alternate official attribution and ICH titles outside guideline suffix',()=>{
 const url='https://www.ydcdei.org.cn/news/show/123';
 const html='<div class="detailBox"><div class="title">关于公开征求ICH《Q5A(R2)：病毒安全性评价》指导原则草案意见的通知</div><div class="pull-right">来源：国家局药审中心网站</div><div class="content">'+ '官方公告内容'.repeat(20)+'</div></div>';
 const d=cdeDetail(html,url,{url,title:'',context:''},url);assert.equal(d.title,'Q5A(R2)：病毒安全性评价');assert.equal(d.status,'征求意见');
 assert.throws(()=>cdeDetail(html.replace('国家局药审中心网站','未知转载网站'),url,{url,title:'',context:''},url),/Unverified/);
 assert.equal(cdeList('<a title="细胞治疗技术指导原则线上培训成功举办" href="/news/show/123">培训</a>','https://www.ydcdei.org.cn/search').length,0);
 });
