import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { directDb } from "../src/server/direct-db";
import { translationIssues, titleHash } from "../src/server/enrichment/title-quality";
import type { Prisma } from "../src/generated/prisma/client";
const since = new Date("2026-11-26T00:48:00Z");
async function main() {
 const db = directDb();
 try {
 mkdirSync(".data",{recursive:true});
 if(process.argv[2]==="export") {
 const rows=await db.regulation.findMany({where:{is_mock:false,first_detected_at:{gte:since},official_summary:{not:null}},select:{id:true,official_summary:true,summary_zh:true,source_metadata:true},orderBy:{first_detected_at:"asc"}});
 const pending=rows.filter(r=>r.official_summary && /[a-z]{3}/i.test(r.official_summary) && !/[\u3400-\u9fff]/u.test(r.official_summary) && (!r.summary_zh || !!(r.source_metadata as Record<string,unknown>)?.bioreg_summary_translation) && ((r.source_metadata as Record<string,unknown>)?.bioreg_summary_translation as Record<string,unknown>)?.original !== r.official_summary).slice(0,16).map(r=>({id:r.id,title_original:r.official_summary,title_zh:""}));
 writeFileSync(".data/summary-input.json",JSON.stringify(pending));console.log(JSON.stringify({pending:pending.length}));
 } else if(process.argv[2]==="import") {
 const rows=JSON.parse(readFileSync(".data/summary-output.json","utf8")) as {id:string;title_original:string;translation:string;issues:string[];model:string;revision:string}[];
 let applied=0,rejected=0;
 for(const row of rows) {
 if(row.issues.length || translationIssues(row.title_original,row.translation).length){rejected++;continue;}
 await db.$transaction(async tx=>{
 const r=await tx.regulation.findUnique({where:{id:row.id}});
 if(!r || r.is_mock || r.first_detected_at<since || r.official_summary!==row.title_original)return;
 const meta=(r.source_metadata||{}) as Record<string,Prisma.InputJsonValue>;
 if(r.summary_zh && !meta.bioreg_summary_translation)return;
 const result=await tx.regulation.updateMany({where:{id:r.id,updated_at:r.updated_at,official_summary:row.title_original},data:{summary_zh:row.translation,source_metadata:{...meta,bioreg_summary_translation:{original:row.title_original,original_sha256:titleHash(row.title_original),model:row.model,revision:row.revision,translated_at:new Date().toISOString(),method:"local_model_quality_checked",previous_summary:r.summary_zh,previous_provenance:meta.bioreg_summary_translation||null}},updated_at:r.updated_at}});applied+=result.count;
 });
 }
 console.log(JSON.stringify({applied,rejected}));
 } else throw Error("Invalid mode");
 }finally{await db.$disconnect();}
}
main().catch(()=>{console.error("SUMMARY_TRANSLATION_FAILED (credentials suppressed)");process.exitCode=1;});
