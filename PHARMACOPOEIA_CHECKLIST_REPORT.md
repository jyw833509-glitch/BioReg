# USP / EP 关注清单收录核对

状态：清单补录、译名校订、重复同步、CI、正式部署及线上验收完成。

核对日期：2026-11-19（北京时间）。

## 核对范围

依据用户提供的《创新生物药与生物类似药_USP_EP关注清单 (1).pdf》，创新生物药和生物类似药两部分合并去重。

- USP：73 个明确章节及 General Notices，共 74 个具体条目。
- EP / EDQM：67 个明确章节／专论及凡例，共 68 个具体条目。
- USP 1000–1999 是章节编号范围；EP 3.1 是材料章节系列，均不作为独立文件入库。
- 附录 FDA 比较分析指南和 EMA 生物药问答分别核对收录。
- 培训幻灯片、机构主页、主题目录和通用检索入口不计为法规文件。

## 官方证据与限制

USP 逐一核对 doi.usp.org 的章节标题与编号，保存公开预览和 DOI。EDQM 逐一核对官方 Knowledge 数据库的 Monograph Number、English Name、发布状态和版本字段。两者均未下载订阅正文，页面保留正文需订阅提示。

“Knowledge In Use”仅表示已发布；药典版次、未来删除计划和生效日期分别保留，不推断当前生效或产品适用性。缺少官方确证的日期保持空值。原有 PDG 协调文件及 FAQ 与章节本身属于不同文件，保留各自记录。

## 既有 ICH 配套文件

|系列|已存在记录数|代表性官方链接|
|---|---:|---|
|Q5A|1|https://database.ich.org/sites/default/files/ICH_Q5A%28R2%29_Guideline_2023_1101.pdf|
|Q5B|1|https://database.ich.org/sites/default/files/Q5B%20Guideline.pdf|
|Q5C|2|https://www.ich.org/page/quality-guidelines|
|Q5D|1|https://database.ich.org/sites/default/files/Q5D%20Guideline.pdf|
|Q5E|2|https://database.ich.org/sites/default/files/Q5E%20Guideline.pdf|
|Q6B|1|https://database.ich.org/sites/default/files/Q6B%20Guideline.pdf|
|Q8|5|https://database.ich.org/sites/default/files/Q8%28R2%29%20Guideline.pdf|
|Q9|6|https://www.ich.org/page/quality-guidelines|
|Q10|5|https://www.ich.org/page/quality-guidelines|
|Q11|2|https://database.ich.org/sites/default/files/Q11%20Guideline.pdf|

## 生产执行结果

- 首轮 Actions：44332325656（2026-11-18 UTC），USP +74、EDQM +68，已有版本更新 0。
- 原有 593 条全部保留；药典补录后 735 条；FDA 附录指南补录后 736 条。
- EDQM 两个原有目录返回 403，继续报告 DEGRADED；142 个清单目标均成功索引，不用其他页面成功掩盖这两项失败。
- 首轮和后续 FDA 任务最终失败原因为 USP 〈791〉pH 没有中文字符，完整性检查通过。没有将失败任务描述为成功。
- 已审阅 143 个本地模型候选译名，修正 67 处术语或表达；保留原题、模型版本、哈希及现有回滚凭据机制。修订为 BioReg Translation，不是官方译名。
- 本地 lint、typecheck、197 项测试、production build、HTTP smoke 通过；CI 44427078526 通过。
- 修复后重复同步 44427437943：workflow success；USP/EDQM 均新增 0、更新 0；736 条法规、755 个版本、717 个变更记录、53 个摘要，Mock 0，中文缺失 0，integrity passed。
- EMA 附录问答同步 44427493023：workflow success；新增 1、更新 0、失败 0；最终 737 条法规、756 个版本、718 个变更记录、53 个摘要，Mock 0，中文缺失 0，integrity passed。译名“生物药产品问题与解答”通过检查。
- 所有 142 个药典目标均恰有一条对应记录；原有 593 条记录全部保留。修订译名未生成法规版本。

|来源|本次新增|最终来源总数|范围|
|---|---:|---:|---|
|USP|74|105|73 个明确章节及凡例；公开预览，正文需订阅|
|EP / EDQM|68|72|67 个章节／专论及凡例；Knowledge 公开元数据|
|FDA|1|136|治疗性蛋白生物类似药比较分析及质量考虑指南|
|EMA|1|112|生物药产品问答|
|合计|144|737（全库）|不宣称药典全量或当前全部生效文本|

## Actions 证据

- [修订 CI 44427078526](https://github.com/jyw833509-glitch/BioReg/actions/runs/44427078526)：success，代码版本 6a3bf3fa4b64a644b2ed9c8b4419898d742d9598。
- [药典初次补录 44332325656](https://github.com/jyw833509-glitch/BioReg/actions/runs/44332325656)：抓取完成，因 pH 中文质量门槛最终 failure。
- [FDA 补录 44333902329](https://github.com/jyw833509-glitch/BioReg/actions/runs/44333902329)：新增指南成功，同一 pH 门槛导致最终 failure。
- [药典重复同步及译名修正 44427437943](https://github.com/jyw833509-glitch/BioReg/actions/runs/44427437943)：success。
- [EMA 补录及最终完整性检查 44427493023](https://github.com/jyw833509-glitch/BioReg/actions/runs/44427493023)：success。
- 原有 regulatory-sync-summary 与 field-enrichment-summary artifacts 均已下载核验。

## 剩余限制

- EDQM technical-guides 与 harmonisation-status-for-general-texts-pdg 两个旧目录仍 HTTP 403；保留 DEGRADED 和实际原因。本次 Knowledge 章节成功不等于这两个目录恢复。
- 订阅正文未获取，未把公开摘要／元数据冒称完整正文。USP 预览中的引用年份不是完整发布日期；DOI 内部编号不是官方版次。
- 清单中的适用品种专论、EP 3.1 材料系列及 USP 1000–1999 范围需结合具体产品继续核对，不能由本次明确列举条目推导全量覆盖。
- 一般培训文件、主题目录、官方主页与检索入口不作为独立法规结果；具体章节与 2 份配套文件已分开收录。

## 两份配套资料

- FDA：[官方指南](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/development-therapeutic-protein-biosimilars-comparative-analytical-assessment-and-other-quality)；[站内记录](https://bioreg-global.netlify.app/regulations/cmwmazs2a00020tp0sgnef5pn)。
- EMA：[官方问答](https://www.ema.europa.eu/en/human-regulatory-overview/research-and-development/scientific-guidelines/biological-guidelines/questions-answers-biological-medicinal-products)；[站内记录](https://bioreg-global.netlify.app/regulations/cmwmu1rzw00022t1qc45jifkf)。

## 发布

无需 schema 迁移；未删除生产数据；沿用现有 GitHub Actions、Supabase、Netlify，无新增工作流或定时任务。正式站点已运行提交 `aca6b248ad133a4f2e8f4048ea4b3d54808414ea`，通过生产域名 /api/health 的 X-BioReg-Commit 响应头核实。

- 发布 CI：[44527571028](https://github.com/jyw833509-glitch/BioReg/actions/runs/44527571028)，success；lint、typecheck、197 项测试、production build、production-mode smoke 全部通过。
- 发布后验收时间：2026-11-19T12:53:54.970Z（UTC）。
- 最终全库 737 条，原有 593 条全部保留；142 个药典清单条目均存在且有中文标题，FDA 与 EMA 配套文件均存在且有中文标题。
- 页面 /、/today、/regulations、/agencies、/updates 以及 /api/health、/api/dashboard、/api/sources 均返回 200；两轮三页面并发访问均返回 200。
- 已验证各详情页“查看官方原文”按钮精确指向对应官方文件页面，包括无订阅正文的 USP 和 EDQM 条目。真实云端同步已经读取这些官方页面并核实身份。

### 发布后搜索验收

|查询|结果数|额外核对|
|---|---:|---|
|<129>|2|存在匹配结果|
|<1119.1>|1|存在匹配结果|
|2.6.41|2|存在匹配结果|
|0784|1|存在匹配结果|
|内毒素|11|存在匹配结果|
|单克隆抗体|16|存在匹配结果|
|ICH Q5A|5|存在匹配结果|
|Q5A(R2)|5|存在匹配结果|
|BioRegNoSuch987654|0|无结果场景正常|

此外，按 USP／EDQM 来源限定查询 <129>、<1119.1>、2.6.41、0784、内毒素，逐项确认命中预期新记录 ID，而非仅依据总数判断成功。

本次不宣称全量药典覆盖，也不宣称获取了订阅正文或核实了所有条目的当前法律效力。

## 清单条目（已核实官方页面）

中文标题为 BioReg 参考译名，英文原题和官方链接保留。

|来源|章节／编号|中文参考标题|官方原题|链接|
|---|---|---|---|---|
|USP|51|〈51〉抑菌效力检查|〈51〉 Antimicrobial Effectiveness Testing|[官方原文](https://doi.usp.org/USPNF/USPNF_M98790_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9g8j200024z4yt7f23s7v)|
|USP|61|〈61〉 非无菌产品微生物学检查：微生物计数试验|〈61〉 Microbiological Examination of Nonsterile Products: Microbial Enumeration Tests|[官方原文](https://doi.usp.org/USPNF/USPNF_M98800_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9g9g500054z4y49yq5b1v)|
|USP|62|〈62〉非无菌产品微生物学检查：控制菌检查|〈62〉 Microbiological Examination of Nonsterile Products: Tests for Specified Microorganisms|[官方原文](https://doi.usp.org/USPNF/USPNF_M98802_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gaa200084z4y9lgnjlbg)|
|USP|63|〈63〉支原体检测|〈63〉 Mycoplasma Tests|[官方原文](https://doi.usp.org/USPNF/USPNF_M3687_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gb47000b4z4yijcpprye)|
|USP|71|〈71〉 无菌检查法|〈71〉 Sterility Tests|[官方原文](https://doi.usp.org/USPNF/USPNF_M98810_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gbyc000e4z4yc1h99xcz)|
|USP|85|〈85〉细菌内毒素试验|〈85〉 Bacterial Endotoxins Test|[官方原文](https://doi.usp.org/USPNF/USPNF_M98830_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gcsc000h4z4yg59ub76z)|
|USP|86|〈86〉采用重组试剂的细菌内毒素检查|〈86〉 Bacterial Endotoxins Test Using Recombinant Reagents|[官方原文](https://doi.usp.org/USPNF/USPNF_M16015_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gdmc000k4z4y9179bqzu)|
|USP|87|〈87〉体外生物反应性试验|〈87〉 Biological Reactivity Tests, In Vitro|[官方原文](https://doi.usp.org/USPNF/USPNF_M98833_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gega000n4z4yr30pqe4d)|
|USP|88|〈88〉体内生物反应性试验|〈88〉 Biological Reactivity Tests, In Vivo|[官方原文](https://doi.usp.org/USPNF/USPNF_M98834_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gfa7000q4z4yfsk80ksr)|
|USP|129|〈129〉重组治疗性单克隆抗体的分析方法|〈129〉 Analytical Procedures for Recombinant Therapeutic Monoclonal Antibodies|[官方原文](https://doi.usp.org/USPNF/USPNF_M6297_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gg46000t4z4ym5uw5lns)|
|USP|212|〈212〉寡糖分析|〈212〉 Oligosaccharide Analysis|[官方原文](https://doi.usp.org/USPNF/USPNF_M5879_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ggy2000w4z4yqc9crxbx)|
|USP|232|〈232〉元素杂质—限值|〈232〉 Elemental Impurities—Limits|[官方原文](https://doi.usp.org/USPNF/USPNF_M5192_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ghs2000z4z4ykzkjxqb2)|
|USP|233|〈233〉元素杂质测定方法|〈233〉 Elemental Impurities—Procedures|[官方原文](https://doi.usp.org/USPNF/USPNF_M5193_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gily00124z4yz1jzfen8)|
|USP|381|〈381〉注射用药品包装／给药系统中的弹性体组件|〈381〉 Elastomeric Components in Injectable Pharmaceutical Product Packaging/Delivery Systems|[官方原文](https://doi.usp.org/USPNF/USPNF_M99140_10_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gjfy00154z4ytggwpexs)|
|USP|382|〈382〉注射剂包装／给药系统中弹性体组件的功能适用性|〈382〉 Elastomeric Component Functional Suitability in Parenteral Product Packaging/Delivery Systems|[官方原文](https://doi.usp.org/USPNF/USPNF_M11355_06_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gk9t00184z4ywe8kt8ez)|
|USP|467|〈467〉残留溶剂|〈467〉 Residual Solvents|[官方原文](https://doi.usp.org/USPNF/USPNF_M99226_09_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gl3q001b4z4y8qdw3pwv)|
|USP|507|〈507〉 蛋白质测定方法|〈507〉 Protein Determination Procedures|[官方原文](https://doi.usp.org/USPNF/USPNF_M7147_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9glxp001e4z4y3tkhxl4s)|
|USP|509|〈509〉 残留DNA检测|〈509〉 Residual DNA Testing|[官方原文](https://doi.usp.org/USPNF/USPNF_M7146_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gmrn001h4z4yg348qvc0)|
|USP|621|〈621〉 色谱法|〈621〉 Chromatography|[官方原文](https://doi.usp.org/USPNF/USPNF_M99380_10_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gnlk001k4z4ydt88p1f2)|
|USP|643|〈643〉 总有机碳|〈643〉 Total Organic Carbon|[官方原文](https://doi.usp.org/USPNF/USPNF_M99403_05_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gofh001n4z4yjpo51syl)|
|USP|645|〈645〉 水的电导率|〈645〉 Water Conductivity|[官方原文](https://doi.usp.org/USPNF/USPNF_M99405_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gp9e001q4z4y2ckwds0v)|
|USP|660|〈660〉玻璃容器|〈660〉 Containers—Glass|[官方原文](https://doi.usp.org/USPNF/USPNF_M1757_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gq3d001t4z4y42mj1u3x)|
|USP|665|〈665〉用于制造药物制剂、生物药原料药及制剂的塑料组件和系统|〈665〉 Plastic Components and Systems Used to Manufacture Pharmaceutical Drug Products and Biopharmaceutical Drug Substances and Products|[官方原文](https://doi.usp.org/USPNF/USPNF_M11135_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gqx8001w4z4yj9d100tz)|
|USP|785|〈785〉质量摩尔渗透浓度与体积摩尔渗透浓度|〈785〉 Osmolality and Osmolarity|[官方原文](https://doi.usp.org/USPNF/USPNF_M99580_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9grr2001z4z4yp7da5038)|
|USP|787|〈787〉治疗性蛋白注射剂中的亚可见微粒|〈787〉 Subvisible Particulate Matter in Therapeutic Protein Injections|[官方原文](https://doi.usp.org/USPNF/USPNF_M6497_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gsky00224z4y3spp3qva)|
|USP|788|〈788〉注射剂中的微粒|〈788〉 Particulate Matter in Injections|[官方原文](https://doi.usp.org/USPNF/USPNF_M99586_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gtev00254z4y1arao00v)|
|USP|790|〈790〉 注射剂中的可见异物|〈790〉 Visible Particulates in Injections|[官方原文](https://doi.usp.org/USPNF/USPNF_M7197_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gu8q00284z4ybcdzj311)|
|USP|791|〈791〉pH 值|〈791〉 pH|[官方原文](https://doi.usp.org/USPNF/USPNF_M99590_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gv2n002b4z4yhd9e3o3t)|
|USP|921|〈921〉 水分测定|〈921〉 Water Determination|[官方原文](https://doi.usp.org/USPNF/USPNF_M99710_05_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gvwi002e4z4y58guw93u)|
|USP|1032|〈1032〉生物检定的设计与开发|〈1032〉 Design and Development of Biological Assays|[官方原文](https://doi.usp.org/USPNF/USPNF_M1354_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gwqd002h4z4ywhcc4ur1)|
|USP|1033|〈1033〉 生物检定验证|〈1033〉 Biological Assay Validation|[官方原文](https://doi.usp.org/USPNF/USPNF_M912_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gxka002k4z4ymdvpvaxj)|
|USP|1034|〈1034〉 生物检定分析|〈1034〉 Analysis of Biological Assays|[官方原文](https://doi.usp.org/USPNF/USPNF_M5677_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gye5002n4z4ytj66u2gw)|
|USP|1050|〈1050〉人或动物细胞系来源生物技术产品的病毒安全性评价|〈1050〉 Viral Safety Evaluation of Biotechnology Products Derived from Cell Lines of Human or Animal Origin|[官方原文](https://doi.usp.org/USPNF/USPNF_M99774_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9gz80002q4z4yajobmads)|
|USP|1051|〈1051〉玻璃仪器的清洗|〈1051〉 Cleaning Glass Apparatus|[官方原文](https://doi.usp.org/USPNF/USPNF_M99776_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h01v002t4z4yay9u95tu)|
|USP|1052|〈1052〉生物技术来源产品—氨基酸分析|〈1052〉 Biotechnology-Derived Articles—Amino Acid Analysis|[官方原文](https://doi.usp.org/USPNF/USPNF_M858_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h0vt002w4z4yzkwzfkec)|
|USP|1053|〈1053〉毛细管电泳|〈1053〉 Capillary Electrophoresis|[官方原文](https://doi.usp.org/USPNF/USPNF_M859_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h1pp002z4z4ymdyau5vb)|
|USP|1054|〈1054〉生物技术衍生产品——等电聚焦|〈1054〉 Biotechnology-Derived Articles—Isoelectric Focusing|[官方原文](https://doi.usp.org/USPNF/USPNF_M860_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h2jm00324z4yvfwyitkt)|
|USP|1055|〈1055〉生物技术来源产品—肽图分析|〈1055〉 Biotechnology-Derived Articles—Peptide Mapping|[官方原文](https://doi.usp.org/USPNF/USPNF_M861_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h3dh00354z4yze93ws5f)|
|USP|1056|〈1056〉生物技术来源产品——聚丙烯酰胺凝胶电泳|〈1056〉 Biotechnology-Derived Articles—Polyacrylamide Gel Electrophoresis|[官方原文](https://doi.usp.org/USPNF/USPNF_M862_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h47d00384z4y0uctfj7d)|
|USP|1057|〈1057〉生物技术来源产品—总蛋白测定|〈1057〉 Biotechnology-Derived Articles—Total Protein Assay|[官方原文](https://doi.usp.org/USPNF/USPNF_M863_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h517003b4z4yi5r07szn)|
|USP|1058|〈1058〉 分析仪器确认|〈1058〉 Analytical Instrument Qualification|[官方原文](https://doi.usp.org/USPNF/USPNF_M1124_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h5v3003e4z4yam4bfkuo)|
|USP|1084|〈1084〉糖蛋白和糖链分析—一般考虑|〈1084〉 Glycoprotein and Glycan Analysis—General Considerations|[官方原文](https://doi.usp.org/USPNF/USPNF_M916_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h6p0003h4z4yclm9clg5)|
|USP|1111|〈1111〉非无菌产品微生物学检查：药物制剂和药用物质的可接受标准|〈1111〉 Microbiological Examination of Nonsterile Products: Acceptance Criteria for Pharmaceutical Preparations and Substances for Pharmaceutical Use|[官方原文](https://doi.usp.org/USPNF/USPNF_M99830_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h7iy003k4z4yiw3iyh5v)|
|USP|1116|〈1116〉无菌工艺环境的微生物控制与监测|〈1116〉 Microbiological Control and Monitoring of Aseptic Processing Environments|[官方原文](https://doi.usp.org/USPNF/USPNF_M99835_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h8ct003n4z4yxrv9d06h)|
|USP|1119|〈1119〉生物负载监测|〈1119〉 Bioburden Monitoring|[官方原文](https://doi.usp.org/USPNF/USPNF_M18255_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9h96q003q4z4ykdhyaqk9)|
|USP|1130|〈1130〉基于核酸的技术：痕量核酸检测方法（残留 DNA 检测）|〈1130〉 Nucleic Acid-Based Techniques—Approaches for Detecting Trace Nucleic Acids (Residual DNA Testing)|[官方原文](https://doi.usp.org/USPNF/USPNF_M2744_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ha0n003t4z4y2394dj0l)|
|USP|1132|〈1132〉生物药中残留宿主细胞蛋白的测定|〈1132〉 Residual Host Cell Protein Measurement in Biopharmaceuticals|[官方原文](https://doi.usp.org/USPNF/USPNF_M8647_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9haui003w4z4yxq5zfjmm)|
|USP|1207|〈1207〉包装完整性评估—无菌产品|〈1207〉 Package Integrity Evaluation—Sterile Products|[官方原文](https://doi.usp.org/USPNF/USPNF_M99926_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hbod003z4z4yq85k525r)|
|USP|1211|〈1211〉 无菌保证|〈1211〉 Sterility Assurance|[官方原文](https://doi.usp.org/USPNF/USPNF_M99930_05_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hcia00424z4ytut19ue1)|
|USP|1220|〈1220〉分析方法生命周期|〈1220〉 Analytical Procedure Life Cycle|[官方原文](https://doi.usp.org/USPNF/USPNF_M10975_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hdc600454z4y25jxvamu)|
|USP|1223|〈1223〉替代微生物学方法的验证|〈1223〉 Validation of Alternative Microbiological Methods|[官方原文](https://doi.usp.org/USPNF/USPNF_M99943_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9he6300484z4ybn10in4b)|
|USP|1224|〈1224〉 分析方法的转移|〈1224〉 Transfer of Analytical Procedures|[官方原文](https://doi.usp.org/USPNF/USPNF_M5511_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hezz004b4z4y268qgnjz)|
|USP|1225|〈1225〉药典方法的验证|〈1225〉 Validation of Compendial Procedures|[官方原文](https://doi.usp.org/USPNF/USPNF_M99945_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hftw004e4z4y9n4c42yh)|
|USP|1226|〈1226〉药典方法的确认|〈1226〉 Verification of Compendial Procedures|[官方原文](https://doi.usp.org/USPNF/USPNF_M870_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hgnr004h4z4yw1bz5zcc)|
|USP|1227|〈1227〉药典收载品中微生物回收方法的验证|〈1227〉 Validation of Microbial Recovery from Pharmacopeial Articles|[官方原文](https://doi.usp.org/USPNF/USPNF_M99947_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hhhm004k4z4yooqpctul)|
|USP|1228|〈1228〉去热原|〈1228〉 Depyrogenation|[官方原文](https://doi.usp.org/USPNF/USPNF_M8097_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hibj004n4z4yajtx9req)|
|USP|1229|〈1229〉药典收载品的灭菌|〈1229〉 Sterilization of Compendial Articles|[官方原文](https://doi.usp.org/USPNF/USPNF_M7408_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hj5d004q4z4yljl01syt)|
|USP|1231|〈1231〉 药用用水|〈1231〉 Water for Pharmaceutical Purposes|[官方原文](https://doi.usp.org/USPNF/USPNF_M99956_08_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hjz6004t4z4yh1mrmnl3)|
|USP|1237|〈1237〉病毒学检测方法|〈1237〉 Virology Test Methods|[官方原文](https://doi.usp.org/USPNF/USPNF_M915_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hkt4004w4z4yb1etnvqf)|
|USP|1663|〈1663〉药品包装/给药系统相关可提取物的评估|〈1663〉 Assessment of Extractables Associated with Pharmaceutical Packaging/Delivery Systems|[官方原文](https://doi.usp.org/USPNF/USPNF_M7126_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hln1004z4z4ywa15wo2m)|
|USP|1664|〈1664〉药品包装／给药系统相关制剂浸出物的评估|〈1664〉 Assessment of Drug Product Leachables Associated with Pharmaceutical Packaging/Delivery Systems|[官方原文](https://doi.usp.org/USPNF/USPNF_M7127_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hmh100524z4yjaahltku)|
|USP|1665|〈1665〉用于制造药物制剂、生物药原料药及制剂的塑料组件和系统的表征与确认|〈1665〉 Characterization and Qualification of Plastic Components and Systems Used to Manufacture Pharmaceutical Drug Products and Biopharmaceutical Drug Substances and Products|[官方原文](https://doi.usp.org/USPNF/USPNF_M11136_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hnay00554z4y88hpjgk9)|
|USP|1787|〈1787〉治疗性蛋白注射剂中亚可见微粒的测定|〈1787〉 Measurement of Subvisible Particulate Matter in Therapeutic Protein Injections|[官方原文](https://doi.usp.org/USPNF/USPNF_M7866_04_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ho4t00584z4yvthcwxf0)|
|USP|1788|〈1788〉亚可见微粒的测定方法|〈1788〉 Methods for the Determination of Subvisible Particulate Matter|[官方原文](https://doi.usp.org/USPNF/USPNF_M3023_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hoyp005b4z4yu3rx08f3)|
|USP|1790|〈1790〉 注射剂的目视检查|〈1790〉 Visual Inspection of Injections|[官方原文](https://doi.usp.org/USPNF/USPNF_M7198_07_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hpsm005e4z4yqf388je9)|
|USP|1050.1|〈1050.1〉 病毒清除工艺的设计、评估和表征|〈1050.1〉 Design, Evaluation, and Characterization of Viral Clearance Procedures|[官方原文](https://doi.usp.org/USPNF/USPNF_M7187_01_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hqmg005h4z4yw23vwbi5)|
|USP|1788.3|〈1788.3〉测定亚可见微粒的流动成像法|〈1788.3〉 Flow Imaging Method for the Determination of Subvisible Particulate Matter|[官方原文](https://doi.usp.org/USPNF/USPNF_M12537_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hrgd005k4z4y4q2pvzgq)|
|USP|1119.1|〈1119.1〉生物负载检查|〈1119.1〉 Bioburden Test|[官方原文](https://doi.usp.org/USPNF/USPNF_M18395_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hsa9005n4z4ysj7wag6z)|
|USP|1132.1|〈1132.1〉采用液相色谱－质谱法测定生物药中残留宿主细胞蛋白|〈1132.1〉 Residual Host Cell Protein Measurement in Biopharmaceuticals by Liquid Chromatography-Mass Spectrometry|[官方原文](https://doi.usp.org/USPNF/USPNF_M17756_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ht44005q4z4ywu2e295k)|
|USP|661.1|〈661.1〉包装用塑料材料|〈661.1〉 Plastic Materials of Construction|[官方原文](https://doi.usp.org/USPNF/USPNF_M8008_14_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hty3005t4z4y8dkmnhgn)|
|USP|661.2|〈661.2〉药用塑料包装系统|〈661.2〉 Plastic Packaging Systems for Pharmaceutical Use|[官方原文](https://doi.usp.org/USPNF/USPNF_M8009_06_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hury005w4z4y06op5knz)|
|USP|1229.18|〈1229.18〉 病毒清除方法|〈1229.18〉 Viral Clearance Methods|[官方原文](https://doi.usp.org/USPNF/USPNF_M13516_02_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hvlt005z4z4yrjpt3lom)|
|USP|1229.4|〈1229.4〉液体的灭菌过滤|〈1229.4〉 Sterilizing Filtration of Liquids|[官方原文](https://doi.usp.org/USPNF/USPNF_M7413_03_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hwft00624z4ykxgwb8z6)|
|EDQM|2.2.1|液体的澄清度与乳光程度（2.2.1.）|Clarity and degree of opalescence of liquids (2.2.1.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20201) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kl8200694z4y7gwazecg)|
|EDQM|2.2.2|液体的颜色程度（2.2.2.）|Degree of coloration of liquids (2.2.2.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20202) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9km21006c4z4y9n75s6wp)|
|EDQM|2.2.25|紫外－可见吸收分光光度法（2.2.25.）|Absorption spectrophotometry, ultraviolet and visible (2.2.25.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20225) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kmvu006f4z4y2cvfga6w)|
|EDQM|2.2.29|液相色谱法 (2.2.29.)|Liquid chromatography (2.2.29.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20229) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9knpm006i4z4yj9cpddq0)|
|EDQM|2.2.3|电位法测定pH值 (2.2.3.)|Potentiometric determination of pH (2.2.3.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20203) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kojf006l4z4yhvwagh2e)|
|EDQM|2.2.30|尺寸排阻色谱法（2.2.30.）|Size-exclusion chromatography (2.2.30.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20230) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kpd9006o4z4yu4kxs6k7)|
|EDQM|2.2.31|电泳 (2.2.31.)|Electrophoresis (2.2.31.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20231) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kq73006r4z4yh2tzpyby)|
|EDQM|2.2.35|质量摩尔渗透浓度（2.2.35.）|Osmolality (2.2.35.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20235) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kr0u006u4z4yspm2ksb7)|
|EDQM|2.2.41|圆二色性（2.2.41.）|Circular dichroism (2.2.41.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20241) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9krum006x4z4y7ff8mgqw)|
|EDQM|2.2.43|质谱分析（2.2.43.）|Mass spectrometry (2.2.43.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20243) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ksoe00704z4yzoulku0z)|
|EDQM|2.2.44|药用用水中的总有机碳 (2.2.44.)|Total organic carbon in water for pharmaceutical use (2.2.44.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20244) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kti600734z4yx1dvu89x)|
|EDQM|2.2.46|色谱分离技术 (2.2.46.)|Chromatographic separation techniques (2.2.46.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20246) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kuby00764z4ye9abit0z)|
|EDQM|2.2.47|毛细管电泳 (2.2.47.)|Capillary electrophoresis (2.2.47.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20247) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kv5q00794z4ys93u34ht)|
|EDQM|2.2.54|等电聚焦 (2.2.54.)|Isoelectric focusing (2.2.54.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20254) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kvzi007c4z4y625utr02)|
|EDQM|2.2.55|肽图分析（2.2.55.）|Peptide mapping (2.2.55.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20255) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kwt9007f4z4yxsl0rvzk)|
|EDQM|2.2.56|氨基酸分析 (2.2.56.)|Amino acid analysis (2.2.56.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20256) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kxn1007i4z4y1qq7dro7)|
|EDQM|2.2.59|糖蛋白的糖链分析（2.2.59.）|Glycan analysis of glycoproteins (2.2.59.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20259) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kygt007l4z4y2agzxh4w)|
|EDQM|2.4.20|元素杂质测定（2.4.20.）|Determination of elemental impurities (2.4.20.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20420) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9kzak007o4z4yw9r8kn7z)|
|EDQM|2.4.24|残留溶剂的识别与控制 (2.4.24.)|Identification and control of residual solvents (2.4.24.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20424) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l04c007r4z4yxrppohax)|
|EDQM|2.5.12|水：半微量测定（2.5.12.）|Water: semi-micro determination (2.5.12.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20512) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l0y2007u4z4yqi8xjpdl)|
|EDQM|2.5.32|水分：微量测定 (2.5.32.)|Water: micro determination (2.5.32.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20532) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l1ru007x4z4y1s0mzwp7)|
|EDQM|2.5.33|总蛋白（2.5.33.）|Total protein (2.5.33.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20533) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l2ll00804z4yg2w2k1tr)|
|EDQM|2.5.43|重组治疗性单克隆抗体的体积排阻色谱法（2.5.43.）|Size-exclusion chromatography for recombinant therapeutic monoclonal antibodies (2.5.43.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20543) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l3fe00834z4y36bctyx1)|
|EDQM|2.5.44|重组治疗性单克隆抗体的毛细管等电聚焦法（2.5.44.）|Capillary isoelectric focusing for recombinant therapeutic monoclonal antibodies (2.5.44.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20544) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l49700864z4yi28zvl9k)|
|EDQM|2.6.1|无菌 (2.6.1.)|Sterility (2.6.1.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20601) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l52x00894z4yq24jv1q4)|
|EDQM|2.6.12|非无菌产品微生物学检查：微生物计数试验 (2.6.12.)|Microbiological examination of non-sterile products: microbial enumeration tests (2.6.12.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20612) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l5wq008c4z4y4jz8328m)|
|EDQM|2.6.13|非无菌产品微生物学检查：控制菌检查（2.6.13.）|Microbiological examination of non-sterile products: test for specified micro-organisms (2.6.13.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20613) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l6qh008f4z4ywd82zifg)|
|EDQM|2.6.14|细菌内毒素 (2.6.14.)|Bacterial endotoxins (2.6.14.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20614) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l7k8008i4z4yisc67i1t)|
|EDQM|2.6.21|核酸扩增技术 (2.6.21.)|Nucleic acid amplification techniques (2.6.21.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20621) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l8dy008l4z4y2utiy0ca)|
|EDQM|2.6.30|单核细胞激活试验 (2.6.30.)|Monocyte-activation test (2.6.30.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20630) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9l97p008o4z4ybix1p86d)|
|EDQM|2.6.32|采用重组因子 C 的细菌内毒素检查（2.6.32.）|Test for bacterial endotoxins using recombinant factor C (2.6.32.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20632) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9la1g008r4z4y190zm2oh)|
|EDQM|2.6.34|宿主细胞蛋白检测法（2.6.34.）|Host-cell protein assays (2.6.34.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20634) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lav7008u4z4ym4ppap3x)|
|EDQM|2.6.35|残留宿主细胞 DNA 的定量与表征（2.6.35.）|Quantification and characterisation of residual host-cell DNA (2.6.35.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20635) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lbox008x4z4yrhpethp0)|
|EDQM|2.6.41|用于检测外源病毒因子的高通量测序（2.6.41.）|High-throughput sequencing for the detection of viral extraneous agents (2.6.41.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20641) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lcio00904z4yimwx9xar)|
|EDQM|2.6.7|支原体 (2.6.7.)|Mycoplasmas (2.6.7.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20607) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ldce00934z4yn9efkodi)|
|EDQM|2.7.1|免疫化学方法 (2.7.1.)|Immunochemical methods (2.7.1.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20701) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9le6400964z4yhumeh1z4)|
|EDQM|2.7.26|基于细胞的TNF-α拮抗剂效价测定试验（2.7.26.）|Cell-based assays for potency determination of TNF-alpha antagonists (2.7.26.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20726) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lezy00994z4yzayps10r)|
|EDQM|2.9.17|注射剂可抽取体积检查（2.9.17.）|Test for extractable volume of parenteral preparations (2.9.17.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20917) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lftp009c4z4y0asgv8cu)|
|EDQM|2.9.19|颗粒污染：亚可见颗粒（2.9.19.）|Particulate contamination: sub-visible particles (2.9.19.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20919) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lgng009f4z4yr81u3t5o)|
|EDQM|2.9.20|颗粒污染：可见颗粒（2.9.20.）|Particulate contamination: visible particles (2.9.20.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/20920) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lhh7009i4z4yx0dvfvyq)|
|EDQM|3.2.1|药用玻璃容器（3.2.1.）|Glass containers for pharmaceutical use (3.2.1.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/30201) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9liax009l4z4ylbmfeksa)|
|EDQM|3.2.2|药用塑料容器和密封件（3.2.2.）|Plastic containers and closures for pharmaceutical use (3.2.2.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/30202) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lj4p009o4z4ypd8uugqg)|
|EDQM|3.2.9|水性注射剂、粉末及冻干粉末容器用橡胶密封件（3.2.9.）|Rubber closures for containers for aqueous parenteral preparations, for powders and for freeze-dried powders (3.2.9.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/30209) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ljyh009r4z4yl1urn3od)|
|EDQM|5.1.1|无菌产品制备方法 (5.1.1.)|Methods of preparation of sterile products (5.1.1.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50101) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lks8009u4z4yryn3wr6k)|
|EDQM|5.1.10|细菌内毒素检测试验使用指南（5.1.10.）|Guidelines for using the test for bacterial endotoxins (5.1.10.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50110) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lllz009x4z4yk7f1g9ax)|
|EDQM|5.1.13|热原性（5.1.13.）|Pyrogenicity (5.1.13.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50113) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lmfq00a04z4ybqm3ts8s)|
|EDQM|5.1.2|无菌产品制造用生物指示剂及相关微生物制剂（5.1.2.）|Biological indicators and related microbial preparations used in the manufacture of sterile products (5.1.2.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50102) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ln9h00a34z4yv1kng8jl)|
|EDQM|5.1.3|抑菌防腐效力（5.1.3.）|Efficacy of antimicrobial preservation (5.1.3.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50103) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lo3800a64z4yy6m9b5x5)|
|EDQM|5.1.4|非无菌药品制剂和药用物质的微生物学质量（5.1.4.）|Microbiological quality of non-sterile pharmaceutical preparations and substances for pharmaceutical use (5.1.4.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50104) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lox100a94z4yz3ib8bh4)|
|EDQM|5.1.6|微生物学质量控制的替代方法 (5.1.6.)|Alternative methods for control of microbiological quality (5.1.6.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50106) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lpqt00ac4z4yn7pnbpt8)|
|EDQM|5.1.7|病毒安全性 (5.1.7.)|Viral safety (5.1.7.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50107) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lqkk00af4z4yn4mfh9z3)|
|EDQM|5.12|对照品（5.12.）|Reference standards (5.12.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/51200) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lrea00ai4z4yfm7t2ynx)|
|EDQM|5.17.2|关于颗粒污染检测的建议：可见颗粒（5.17.2.）|Recommendations on testing of particulate contamination: visible particles (5.17.2.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/51702) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ls8200al4z4y01ton5y3)|
|EDQM|5.20|元素杂质 (5.20.)|Elemental impurities (5.20.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/52000) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lt1s00ao4z4y33jmowcz)|
|EDQM|5.26|药典方法的实施（5.26.）|Implementation of pharmacopoeial procedures (5.26.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/52600) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ltvi00ar4z4ycjh79uol)|
|EDQM|5.27|替代分析方法的可比性 (5.27.)|Comparability of alternative analytical procedures (5.27.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/52700) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lup800au4z4ydy25yhes)|
|EDQM|5.3|生物检定和试验结果的统计分析 (5.3.)|Statistical analysis of results of biological assays and tests (5.3.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50300) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lviy00ax4z4y4vnpdnv0)|
|EDQM|5.4|残留溶剂（5.4.）|Residual solvents (5.4.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/50400) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lwco00b04z4yel9w55ju)|
|EDQM|0784|重组 DNA 技术产品|Recombinant DNA technology, products of|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/784) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lx6e00b34z4yj9exk10m)|
|EDQM|2031|人用单克隆抗体|Monoclonal antibodies for human use|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/2031) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9ly0500b64z4ywdls58qi)|
|EDQM|2619|药品制剂|Pharmaceutical preparations|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/2619) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lytv00b94z4ylfaq2urx)|
|EDQM|0520|注射用制剂|Parenteral preparations|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/520) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9lznm00bc4z4yb1idvdvr)|
|EDQM|2928|英夫利西单抗浓缩液|Infliximab concentrated solution|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/2928) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9m0hd00bf4z4ydov17jji)|
|EDQM|3103|戈利木单抗浓缩液|Golimumab concentrated solution|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/3103) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9m1b300bi4z4y6rpbt34y)|
|EDQM|3187|戈利木单抗注射液|Golimumab injection|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/3187) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9m24t00bl4z4y1luvo2wc)|
|EDQM|0169|注射用水|Water for injections|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/169) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9m2yj00bo4z4y2mt2uwl0)|
|EDQM|0008|纯化水|Water, purified|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/8) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9m3s900br4z4y6xikvd8n)|
|USP|General Notices|凡例与通则|General Notices and Requirements|[官方原文](https://doi.usp.org/USPNF/USPNF_M99989_11_01.html) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9hx9s00654z4ys7vbvy5o)|
|EDQM|1|凡例（1.）|General notices (1.)|[官方原文](https://extranet.edqm.eu/4DLink1/4DCGI/Web_View/mono/10000) · [站内](https://bioreg-global.netlify.app/regulations/cmwm9m4m200bu4z4yk2e48dhe)|
